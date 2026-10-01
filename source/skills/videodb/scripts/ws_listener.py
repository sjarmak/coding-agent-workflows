#!/usr/bin/env python3
import asyncio
import contextlib
import inspect
import json
import logging
import os
import signal
import sys
from datetime import datetime, timezone
from pathlib import Path


MAX_RETRIES = 10
INITIAL_BACKOFF = 1
MAX_BACKOFF = 60
RETRYABLE_ERRORS = (ConnectionError, TimeoutError)
LOGGER = logging.getLogger(__name__)
OUTPUT_DIR: Path | None = None
EVENTS_FILE: Path | None = None
WS_ID_FILE: Path | None = None
PID_FILE: Path | None = None
CLEAR_EVENTS = False
_PROVIDER = None
_AUTH_ERROR_TYPES: tuple[type[Exception], ...] = ()


def default_output_dir() -> Path:
    xdg_state_home = os.environ.get("XDG_STATE_HOME")
    if xdg_state_home:
        return Path(xdg_state_home) / "videodb"
    return Path.home() / ".local" / "state" / "videodb"


def ensure_private_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True, mode=0o700)
    path.chmod(0o700)
    return path


def configure(clear: bool = False, output_dir: Path | None = None) -> None:
    global CLEAR_EVENTS, OUTPUT_DIR, EVENTS_FILE, WS_ID_FILE, PID_FILE
    CLEAR_EVENTS = clear
    OUTPUT_DIR = ensure_private_dir(output_dir or default_output_dir())
    EVENTS_FILE = OUTPUT_DIR / "videodb_events.jsonl"
    WS_ID_FILE = OUTPUT_DIR / "videodb_ws_id"
    PID_FILE = OUTPUT_DIR / "videodb_ws_pid"


def parse_args(args: list[str] | None = None) -> tuple[bool, Path | None]:
    clear = False
    output_dir: Path | None = None
    for arg in sys.argv[1:] if args is None else args:
        if arg == "--clear":
            clear = True
        elif arg.startswith("-"):
            raise SystemExit(f"Unknown flag: {arg}")
        else:
            output_dir = Path(arg)
    if output_dir is None:
        events_dir = os.environ.get("VIDEODB_EVENTS_DIR")
        output_dir = Path(events_dir) if events_dir else None
    return clear, output_dir


def load_provider():
    global _AUTH_ERROR_TYPES, _PROVIDER
    if _PROVIDER is not None:
        return _PROVIDER
    try:
        from dotenv import load_dotenv
    except ImportError:
        pass
    else:
        load_dotenv()
    import videodb
    from videodb.exceptions import AuthenticationError

    _PROVIDER = videodb
    _AUTH_ERROR_TYPES = (AuthenticationError,)
    return _PROVIDER


def log(message: str) -> None:
    LOGGER.info("%s", message)


def append_event(event: dict) -> None:
    if EVENTS_FILE is None:
        raise RuntimeError("listener is not configured")
    now = datetime.now(timezone.utc)
    event_with_timestamp = dict(event)
    event_with_timestamp.update(ts=now.isoformat(), unix_ts=now.timestamp())
    with EVENTS_FILE.open("a", encoding="utf-8") as event_file:
        os.chmod(EVENTS_FILE, 0o600)
        event_file.write(json.dumps(event_with_timestamp) + "\n")


def write_pid() -> None:
    if OUTPUT_DIR is None or PID_FILE is None:
        raise RuntimeError("listener is not configured")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True, mode=0o700)
    PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    os.chmod(PID_FILE, 0o600)


def cleanup_pid() -> None:
    if PID_FILE is None:
        return
    try:
        PID_FILE.unlink(missing_ok=True)
    except OSError as exc:
        LOGGER.debug("Failed to remove PID file %s: %s", PID_FILE, exc)


def is_fatal_error(exc: Exception) -> bool:
    if isinstance(exc, _AUTH_ERROR_TYPES + (PermissionError,)):
        return True
    status = getattr(exc, "status_code", None)
    if status in {401, 403}:
        return True
    message = str(exc).lower()
    return "401" in message or "403" in message or "auth" in message


async def maybe_await(value):
    if inspect.isawaitable(value):
        return await value
    return value


async def listen_with_retry(connect=None, max_retries: int = MAX_RETRIES, sleep=asyncio.sleep):
    if OUTPUT_DIR is None:
        configure()
    provider_connect = connect or load_provider().connect
    failures = 0
    backoff = INITIAL_BACKOFF
    first_connection = True
    printed_ws_id = False

    while True:
        try:
            conn = await maybe_await(provider_connect())
            ws_wrapper = await maybe_await(conn.connect_websocket())
            ws = await maybe_await(ws_wrapper.connect())
            ws_id = ws.connection_id
        except asyncio.CancelledError:
            log("Shutdown requested")
            raise
        except Exception as exc:
            if is_fatal_error(exc) or not isinstance(exc, RETRYABLE_ERRORS):
                raise
            failures += 1
            log(f"Connection error: {exc}")
            if failures >= max_retries:
                raise
            await sleep(backoff)
            backoff = min(backoff * 2, MAX_BACKOFF)
            continue

        if first_connection and CLEAR_EVENTS and EVENTS_FILE is not None:
            EVENTS_FILE.unlink(missing_ok=True)
            log("Cleared events file")
        first_connection = False
        if WS_ID_FILE is None:
            raise RuntimeError("listener is not configured")
        WS_ID_FILE.write_text(ws_id, encoding="utf-8")
        os.chmod(WS_ID_FILE, 0o600)
        if not printed_ws_id:
            print(f"WS_ID={ws_id}", flush=True)
            printed_ws_id = True
        log(f"Connected (ws_id={ws_id})")

        receiver = ws.receive().__aiter__()
        while True:
            try:
                msg = await anext(receiver)
            except StopAsyncIteration as exc:
                failure = ConnectionError("WebSocket closed")
                failures += 1
                if failures >= max_retries:
                    raise failure from exc
                await sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)
                break
            except asyncio.CancelledError:
                log("Shutdown requested")
                raise
            except Exception as exc:
                if is_fatal_error(exc) or not isinstance(exc, RETRYABLE_ERRORS):
                    raise
                failures += 1
                log(f"Connection error: {exc}")
                if failures >= max_retries:
                    raise
                await sleep(backoff)
                backoff = min(backoff * 2, MAX_BACKOFF)
                break

            append_event(msg)
            failures = 0
            backoff = INITIAL_BACKOFF
            channel = msg.get("channel", msg.get("event", "unknown"))
            text = msg.get("data", {}).get("text", "")
            if text:
                print(f"[{channel}] {text[:80]}", flush=True)


async def main_async() -> None:
    loop = asyncio.get_running_loop()
    shutdown_event = asyncio.Event()

    def handle_signal():
        log("Received shutdown signal")
        shutdown_event.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.add_signal_handler(sig, handle_signal)
    listen_task = asyncio.create_task(listen_with_retry())
    shutdown_task = asyncio.create_task(shutdown_event.wait())
    _done, pending = await asyncio.wait(
        [listen_task, shutdown_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    if listen_task.done():
        await listen_task
    for task in pending:
        task.cancel()
        with contextlib.suppress(asyncio.CancelledError):
            await task
    for sig in (signal.SIGINT, signal.SIGTERM):
        with contextlib.suppress(NotImplementedError):
            loop.remove_signal_handler(sig)
    log("Shutdown complete")


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(message)s", datefmt="%H:%M:%S")
    clear, output_dir = parse_args()
    configure(clear=clear, output_dir=output_dir)
    load_provider()
    write_pid()
    try:
        asyncio.run(main_async())
    finally:
        cleanup_pid()


if __name__ == "__main__":
    main()
