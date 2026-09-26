---
paths:
  - "**/*.py"
  - "**/*.pyi"
---
# Python Testing

> This file extends [common/testing.md](../common/testing.md) with Python specific content.

## Framework

Use **pytest** as the testing framework.

## Coverage

```bash
pytest --cov=src --cov-report=term-missing
```

## Property-Based Testing

Hypothesis for pure logic: `@given` with strategies, `assume` for rejection,
`@example` to pin a shrunk failure as a regression. `.hypothesis/` is
gitignored. See the `property-testing` skill for the catalog and
`common/testing.md` for when a property test is required.

## Test Organization

Use `pytest.mark` for test categorization:

```python
import pytest

@pytest.mark.unit
def test_calculate_total():
    ...

@pytest.mark.integration
def test_database_connection():
    ...
```

## Reference

See skill: `python-testing` for detailed pytest patterns and fixtures.
