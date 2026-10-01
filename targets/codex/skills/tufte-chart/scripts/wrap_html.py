#!/usr/bin/env python3


























import argparse, re, shutil, sys
from html import escape, unescape
from pathlib import Path








_NS_PREFIX = r"(?:[A-Za-z][\w.-]*:)?"






_EVENT_HANDLER_NAMES = (
    "abort activate afterprint animationcancel animationend animationiteration "
    "animationstart auxclick beforecopy beforecut beforeinput beforepaste "
    "beforeprint beforeunload begin blur cancel canplay canplaythrough change "
    "click close contextmenu copy cuechange cut dblclick drag dragend "
    "dragenter dragleave dragover dragstart drop durationchange emptied end "
    "ended error focus focusin focusout formdata fullscreenchange "
    "fullscreenerror gotpointercapture hashchange input invalid keydown "
    "keypress keyup load loadeddata loadedmetadata loadstart "
    "lostpointercapture message mousedown mouseenter mouseleave mousemove "
    "mouseout mouseover mouseup mousewheel offline online open pagehide "
    "pageshow paste pause play playing pointercancel pointerdown "
    "pointerenter pointerleave pointermove pointerout pointerover pointerup "
    "popstate progress ratechange repeat reset resize scroll scrollend "
    "securitypolicyviolation seeked seeking select selectionchange "
    "selectstart slotchange stalled storage submit suspend timeupdate "
    "toggle touchcancel touchend touchmove touchstart transitioncancel "
    "transitionend transitionrun transitionstart unhandledrejection unload "
    "volumechange waiting webkitanimationend webkitanimationiteration "
    "webkitanimationstart webkittransitionend wheel"
).split()







_URL_ATTRS = r"(?:href|xlink:href|src|data|action|formaction|poster|background)"

_ACTIVE_SVG_PATTERNS = [
    (re.compile(r"<!DOCTYPE", re.IGNORECASE),
     "<!DOCTYPE declaration (possible XXE/entity injection)"),
    (re.compile(rf"<\s*{_NS_PREFIX}script\b", re.IGNORECASE),
     "<script> element"),
    (re.compile(rf"<\s*{_NS_PREFIX}foreignObject\b", re.IGNORECASE),
     "<foreignObject> element"),



    (re.compile(r"<\s*(?:iframe|embed|object|img|meta|link|base|style)\b", re.IGNORECASE),
     "HTML embedding/active-content element (iframe/embed/object/img/meta/link/base/style)"),
    (re.compile(rf"<\s*{_NS_PREFIX}(?:animate(?:Transform|Motion)?|set)\b",
                re.IGNORECASE),
     "SMIL animation element (<animate>/<set>)"),




    (re.compile(rf"<\s*{_NS_PREFIX}(?:use|image)\b[^>]*?\b(?:xlink:)?href\s*=(?!\s*['\"]?\s*#)",
                re.IGNORECASE),
     "<use>/<image> with non-fragment href"),
    (re.compile(r"\bon(?:" + "|".join(_EVENT_HANDLER_NAMES) + r")\s*=", re.IGNORECASE),
     "event-handler attribute (on*=)"),
]











_URL_ATTR_VALUE_PATTERN = re.compile(
    rf"\b{_URL_ATTRS}\s*=\s*(['\"])(.*?)\1", re.IGNORECASE | re.DOTALL)







_UNQUOTED_URL_ATTR_VALUE_PATTERN = re.compile(
    rf"<[^>]*?\b{_URL_ATTRS}\s*=\s*(?!['\"])([^\s>/]+)", re.IGNORECASE)
_JAVASCRIPT_SCHEME_PATTERN = re.compile(r"^\s*javascript:", re.IGNORECASE)


def _strip_url_whitespace(s: str) -> str:



    return s.translate({0x09: None, 0x0A: None, 0x0D: None})


def _refuse(label: str) -> None:
    raise ValueError(
        f"SVG contains {label}; refusing to wrap. "
        "Produce inert SVG — the local renderers (render_line_svg.py, "
        "small_multiples.py, quartile_plot.py, range_frame.py) always do."
    )


def reject_active_svg(svg: str) -> None:








    for pattern, label in _ACTIVE_SVG_PATTERNS:
        if pattern.search(svg):
            _refuse(label)

    for match in _URL_ATTR_VALUE_PATTERN.finditer(svg):
        raw_value = match.group(2)
        candidates = {raw_value, unescape(raw_value)}
        candidates |= {_strip_url_whitespace(c) for c in list(candidates)}
        if any(_JAVASCRIPT_SCHEME_PATTERN.search(c) for c in candidates):
            _refuse("javascript: URL")

    for match in _UNQUOTED_URL_ATTR_VALUE_PATTERN.finditer(svg):
        raw_value = match.group(1)
        candidates = {raw_value, unescape(raw_value)}
        candidates |= {_strip_url_whitespace(c) for c in list(candidates)}
        if any(_JAVASCRIPT_SCHEME_PATTERN.search(c) for c in candidates):
            _refuse("javascript: URL (unquoted attribute)")




    trimmed = strip_xml_decl(svg).strip()
    if not (re.match(rf"<{_NS_PREFIX}svg\b", trimmed, re.IGNORECASE)
            and re.search(r"</svg\s*>\s*\Z", trimmed, re.IGNORECASE)):
        raise ValueError(
            "SVG must be a single <svg>...</svg> document with nothing before "
            "or after it; refusing to wrap. Produce inert SVG — the local "
            "renderers (render_line_svg.py, small_multiples.py, quartile_plot.py, "
            "range_frame.py) always do."
        )


SCRIPT_DIR = Path(__file__).resolve().parent
VENDORED_CSS_DIR = SCRIPT_DIR.parent / "assets" / "tufte-css"
ASSETS_SUBDIR = "tufte-assets"


def ensure_assets(out_html: Path) -> str:


    dest = out_html.parent / ASSETS_SUBDIR
    dest.mkdir(parents=True, exist_ok=True)
    css_src = VENDORED_CSS_DIR / "tufte.css"
    fonts_src = VENDORED_CSS_DIR / "et-book"
    if not css_src.exists() or not fonts_src.exists():
        raise FileNotFoundError(
            f"Vendored tufte-css not found at {VENDORED_CSS_DIR}. "
            "The skill ships these assets — reinstall the plugin or restore them.")
    css_dest = dest / "tufte.css"
    if not css_dest.exists():
        shutil.copy2(css_src, css_dest)
    fonts_dest = dest / "et-book"
    if not fonts_dest.exists():
        shutil.copytree(fonts_src, fonts_dest)
    return f"{ASSETS_SUBDIR}/tufte.css"


def strip_xml_decl(svg: str) -> str:

    s = svg.lstrip()
    if s.startswith("<?xml"):
        end = s.find("?>")
        if end != -1:
            s = s[end + 2:].lstrip()
    return s


def build_html(title: str, intro: str, svg: str, caption: str, css_href: str) -> str:


    reject_active_svg(svg)
    intro_html = f'<p>{escape(intro)}</p>' if intro else ""
    caption_html = f'<figcaption>{escape(caption)}</figcaption>' if caption else ""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title) if title else 'Tufte chart'}</title>
<link rel="stylesheet" href="{escape(css_href)}">
<style>
  figure.fullwidth svg {{ display: block; width: 100%; height: auto; }}
</style>
</head>
<body>
<article>
{f'<h1>{escape(title)}</h1>' if title else ''}
{intro_html}
<figure class="fullwidth">
{svg}
{caption_html}
</figure>
</article>
</body>
</html>
"""


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--svg", required=True, help="path to the SVG to wrap")
    p.add_argument("--out", required=True, help="path to write the .html file")
    p.add_argument("--title", default="", help="page title and <h1>")
    p.add_argument("--caption", default="", help="figcaption text under the chart")
    p.add_argument("--intro", default="", help="optional lede paragraph above the figure")
    p.add_argument("--no-assets", action="store_true",
                   help="skip copying tufte.css and et-book/ next to the output")
    a = p.parse_args()

    try:
        svg_text_content = Path(a.svg).read_text(encoding="utf-8")
    except OSError as e:
        print(f"ERROR[svg-read]: cannot read SVG {a.svg}: {e}", file=sys.stderr)
        sys.exit(1)



    try:
        reject_active_svg(svg_text_content)
    except ValueError as e:
        print(f"ERROR[active-svg]: {e}", file=sys.stderr)
        sys.exit(1)

    out_html = Path(a.out)
    out_html.parent.mkdir(parents=True, exist_ok=True)
    try:
        css_href = (f"{ASSETS_SUBDIR}/tufte.css" if a.no_assets
                    else ensure_assets(out_html))
    except (OSError, FileNotFoundError) as e:
        print(f"ERROR[missing-assets]: {e}", file=sys.stderr)
        sys.exit(1)

    try:
        html = build_html(a.title, a.intro, strip_xml_decl(svg_text_content),
                          a.caption, css_href)
    except ValueError as e:
        print(f"ERROR[active-svg]: {e}", file=sys.stderr)
        sys.exit(1)

    out_html.write_text(html, encoding="utf-8")
    print(f"wrote {out_html} ({len(html)} bytes)")
    if not a.no_assets:
        print(f"assets at {out_html.parent / ASSETS_SUBDIR}/  (open the HTML in any browser)")


if __name__ == "__main__":
    main()
