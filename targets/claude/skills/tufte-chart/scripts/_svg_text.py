




import math
from html import escape


def svg_text(value: object) -> str:





    return escape("" if value is None else str(value), quote=True)


def require_numeric(values, what: str) -> None:





    for v in values:
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise ValueError(f"{what} must be finite numbers, got {v!r}")
