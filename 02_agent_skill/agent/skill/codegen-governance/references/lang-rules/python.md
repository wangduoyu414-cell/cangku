# Language Rules: Python

Target language: Python (3.8+)

---

## Python Idioms

These patterns are idiomatic in Python and should be used instead of patterns borrowed from other languages.

### Falsy Checks

In Python, `0`, `False`, `""`, `[]`, `{}`, `None` are all falsy. This is idiomatic Python.

[FATAL] Do NOT force distinction between falsy values unless `None` carries specific business meaning. Falsy checks like `if not value:` and `if items:` are correct Python.

[WARN] Only add explicit `is None` checks when `None` has a distinct semantic role (e.g., "not yet computed" vs "computed as empty").

### Context Managers

Use `with` statements for resource management.

[FATAL] Do not forget to close files, connections, or other resources. Always use context managers.

```python
# Correct
with open("file.txt") as f:
    content = f.read()

# Wrong
f = open("file.txt")
content = f.read()  # May not close on exception
```

### List Comprehensions

Use list comprehensions and generator expressions for transformations.

[ADV] Prefer `results = [f(x) for x in items]` over imperative loops when the intent is clear.

### Type Hints

Python supports type hints as of 3.5+. Use them consistently.

[WARN] If modifying a function without type hints, consider adding them only when the repo already treats type hints as part of the maintained contract. Do not widen a narrow patch just to annotate unrelated code.

### Exception Handling

Python uses exceptions for error signaling.

[FATAL] Never use bare `except:` without specifying exception types.

```python
# Correct
try:
    value = int(user_input)
except ValueError as e:
    raise ValidationError(f"Invalid input: {e}") from e

# Wrong
try:
    value = int(user_input)
except:  # Catches everything including KeyboardInterrupt
    pass
```

---

## Python Traps

### Mutable Default Arguments

[FATAL] Never use mutable default arguments.

```python
# Wrong — list is shared across all calls
def add_item(item, items=[]):
    items.append(item)
    return items

# Correct — use None and initialize inside
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

Why this matters: Default arguments are evaluated once at function definition time, not at call time.

### Late Binding Closures

[FATAL] Be careful with closures capturing loop variables.

```python
# Wrong — all functions capture the same variable
funcs = [lambda: x for x in range(3)]
print([f() for f in funcs])  # [2, 2, 2]

# Correct — bind default argument
funcs = [lambda x=x: x for x in range(3)]
print([f() for f in funcs])  # [0, 1, 2]
```

### `==` vs `is` for None

[FATAL] Use `is None` or `is not None` for None checks. Do not use `== None`.

```python
# Correct
if value is None:
    ...

# Wrong
if value == None:
    ...
```

### Boolean Comparison with `is`

[WARN] Use `is` only for `None`, `True`, `False`. Do not use `is` for integer or string comparison.

```python
# Correct
if result is True:  # Only when you specifically want True (not truthy)
if value is None:
if a is b:  # Only when you want identity, not equality

# Wrong
if status_code is 200:  # Use ==
    ...
```

### `eval()` and `exec()`

[FATAL] Never use `eval()` or `exec()` with untrusted input. This is a severe security risk.

### Global Interpreter Lock (GIL)

[WARN] Python's GIL means CPU-bound threads do not parallelize. For true parallelism, use `multiprocessing` or `asyncio` for I/O-bound tasks.

### Async in Python

[WARN] Do not mix synchronous and asynchronous code without explicit awaiting. Never use `blocking_call()` inside `async def` without `run_in_executor()`.

---

## Python Style

### Naming Conventions

Follow PEP 8:

- Functions and variables: `snake_case`
- Classes: `CapWords`
- Constants: `UPPER_SNAKE_CASE`
- Private members: `_leading_underscore`
- Name mangling: `__double_underscore`

### Docstrings

[ADV] Use docstrings for public APIs. Follow Google, NumPy, or Sphinx style consistently within a codebase.

### Logging

[WARN] Use the `logging` module, not `print()`. Configure logger names with `__name__`.

```python
logger = logging.getLogger(__name__)
```

---

## Python Type System

### Type Hints Syntax

```python
# Use typing module for complex types
from typing import List, Dict, Optional, Union, Callable

def process(items: List[int]) -> Optional[str]:
    ...

# For Python 3.10+, use union syntax
def process(items: list[int]) -> str | None:
    ...
```

### Protocol and Structural Typing

[ADV] Use `typing.Protocol` for structural subtyping (duck typing with type hints).

### Runtime Type Checking

[FATAL] Do not confuse type hints with runtime type checking. Type hints are not enforced at runtime by default. If runtime validation is needed, use explicit checks or libraries like `pydantic`.

---

## Python Testing

### Test Structure

[WARN] Prefer the repo's existing test runner. Python's standard library provides `unittest`, and many repos also use `pytest`. Do not invent a second test stack in a patch-safe task.

### Mocking

[WARN] If the repo already uses mocking, `unittest.mock` is a durable standard-library choice. Prefer dependency injection over mocking internal implementation details when both approaches are practical.

### Fixtures

[ADV] Reuse the repo's existing shared test setup pattern, whether that is `unittest` helpers, `pytest` fixtures, or framework-specific test utilities.

---

## Python Validation Commands

For Python code, prefer repo-aware validation commands over generic defaults. Common candidates include:

- Syntax: `python -m py_compile <file>`
- Type checking: `mypy <file>` when the repo already uses mypy
- Linting: `ruff check <file>` or the repo's configured linter
- Formatting: the repo's configured formatter
- Tests: the repo's existing Python test runner
