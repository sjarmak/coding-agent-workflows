---
paths:
  - "**/*.py"
  - "**/*.pyi"
---

# Python Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with Python specific content.

## Standards

- Follow **PEP 8** conventions
- Use **type annotations** on all function signatures

## Immutability

Prefer immutable data structures:

```python
from dataclasses import dataclass

@dataclass(frozen=True)
class User:
    name: str
    email: str

from typing import NamedTuple

class Point(NamedTuple):
    x: float
    y: float
```

## Formatting

- **black** for code formatting
- **isort** for import sorting
- **ruff** for linting

## Project Layout

> See [common/architecture.md §Arrange Project Idiomatically](../common/architecture.md).

- **Scaffold**: prefer `uv init` for new projects; `poetry new` or `hatch new` are acceptable. Avoid hand-rolled `setup.py`.
- **Layout**: use the `src/` layout, `src/<package>/` + `tests/` at repo root. Flat layout only for single-file scripts.
- **Static analysis**: **Mypy** or **Pyright** in strict mode on top of the ruff/black formatting already configured above. **pytest** with coverage is the default runner. Wire everything through `pre-commit` so local and CI run the same checks.
- **.gitignore essentials**: `__pycache__/`, `*.pyc`, `.venv/`, `.pytest_cache/`, `.ruff_cache/`, `.mypy_cache/`, `dist/`, `build/`, `*.egg-info/`, `.env`, `.coverage`, `htmlcov/`

## Reference

See skill: `python-patterns` for comprehensive Python idioms and patterns.
