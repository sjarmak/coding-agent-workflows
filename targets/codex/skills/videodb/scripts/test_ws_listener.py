import asyncio
import importlib.util
import stat
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock


MODULE_PATH = Path(__file__).with_name("ws_listener.py")
SPEC = importlib.util.spec_from_file_location("ws_listener", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class WebSocketListenerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        MODULE.configure(output_dir=Path(self.temp_dir.name))

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_connect_exhaustion_propagates_last_error(self):
        connect = Mock(side_effect=ConnectionError("connect failed"))

        with self.assertRaisesRegex(ConnectionError, "connect failed"):
            asyncio.run(MODULE.listen_with_retry(connect=connect, sleep=lambda _: asyncio.sleep(0)))

        self.assertEqual(connect.call_count, MODULE.MAX_RETRIES)

    def test_receive_exhaustion_propagates_last_error(self):
        class FailingSocket:
            connection_id = "failing"

            def receive(self):
                async def messages():
                    raise ConnectionError("receive failed")
                    yield {}

                return messages()

        class Connection:
            def connect_websocket(self):
                return self

            async def connect(self):
                return FailingSocket()

        connect = Mock(return_value=Connection())

        with self.assertRaisesRegex(ConnectionError, "receive failed"):
            asyncio.run(MODULE.listen_with_retry(connect=connect, sleep=lambda _: asyncio.sleep(0)))

        self.assertEqual(connect.call_count, MODULE.MAX_RETRIES)

    def test_only_received_events_reset_failure_budget(self):
        class EventSocket:
            connection_id = "event"

            def receive(self):
                async def messages():
                    yield {"data": {"text": "received"}}
                    raise ConnectionError("after event")

                return messages()

        class FailingSocket:
            connection_id = "failure"

            def receive(self):
                async def messages():
                    raise ConnectionError("after reconnect")
                    yield {}

                return messages()

        class Connection:
            def __init__(self, socket):
                self.socket = socket

            def connect_websocket(self):
                return self

            async def connect(self):
                return self.socket

        connect = Mock(side_effect=[Connection(EventSocket()), Connection(FailingSocket()), Connection(FailingSocket())])

        with self.assertRaisesRegex(ConnectionError, "after reconnect"):
            asyncio.run(
                MODULE.listen_with_retry(
                    connect=connect,
                    max_retries=2,
                    sleep=lambda _: asyncio.sleep(0),
                )
            )

        self.assertEqual(connect.call_count, 2)

    def test_clean_close_is_bounded(self):
        class ClosedSocket:
            connection_id = "closed"

            def receive(self):
                async def messages():
                    return
                    yield {}

                return messages()

        class Connection:
            def connect_websocket(self):
                return self

            async def connect(self):
                return ClosedSocket()

        connect = Mock(return_value=Connection())

        with self.assertRaisesRegex(ConnectionError, "closed"):
            asyncio.run(MODULE.listen_with_retry(connect=connect, sleep=lambda _: asyncio.sleep(0)))

        self.assertEqual(connect.call_count, MODULE.MAX_RETRIES)

    def test_permission_error_is_not_retried(self):
        connect = Mock(side_effect=PermissionError("denied"))
        async def sleep(_):
            return None

        sleep = Mock(side_effect=sleep)

        with self.assertRaisesRegex(PermissionError, "denied"):
            asyncio.run(MODULE.listen_with_retry(connect=connect, sleep=sleep))

        connect.assert_called_once_with()
        sleep.assert_not_called()

    def test_event_append_preserves_input_and_restricts_file(self):
        event = {"data": {"text": "hello"}}
        original = {"data": {"text": "hello"}}

        MODULE.append_event(event)

        self.assertEqual(event, original)
        mode = stat.S_IMODE(MODULE.EVENTS_FILE.stat().st_mode)
        self.assertEqual(mode, 0o600)


if __name__ == "__main__":
    unittest.main()
