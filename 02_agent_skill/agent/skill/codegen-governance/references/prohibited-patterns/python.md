# Prohibited Patterns: Python

These patterns MUST NOT appear in Python code. Each pattern includes the correct alternative.

---

## Mutable Default Arguments

[FATAL] Never use mutable default arguments.

```python
# WRONG — list is shared across all calls
def add_item(item, items=[]):
    items.append(item)
    return items

# CORRECT
def add_item(item, items=None):
    if items is None:
        items = []
    items.append(item)
    return items
```

---

## Bare Except

[FATAL] Never use bare `except:`.

```python
# WRONG
try:
    value = int(user_input)
except:
    pass

# CORRECT
try:
    value = int(user_input)
except ValueError:
    pass  # Or handle appropriately
```

---

## Using == for None

[FATAL] Use `is None` or `is not None` for None checks.

```python
# WRONG
if value == None:

# CORRECT
if value is None:
```

---

## Using is for Value Comparison

[WARN] Use `is` only for `None`, `True`, `False`.

```python
# WRONG
if status_code is 200:
    return "OK"

# CORRECT
if status_code == 200:
    return "OK"
```

---

## eval() with Untrusted Input

[FATAL] Never use `eval()` or `exec()` with untrusted input.

```python
# WRONG
code = user_input
result = eval(code)

# CORRECT
# Use ast.literal_eval for safe literal evaluation
import ast
result = ast.literal_eval(user_input)
```

---

## Using `assert` for Validation

[FATAL] Do not use `assert` for runtime validation. Assertions can be disabled with `-O`.

```python
# WRONG
assert user_id > 0, "Invalid user ID"

# CORRECT
if user_id <= 0:
    raise ValueError("Invalid user ID")
```

---

## Shadowing Built-in Names

[WARN] Do not shadow built-in names.

```python
# WRONG
list = [1, 2, 3]
dict = {"a": 1}

# CORRECT
items = [1, 2, 3]
mapping = {"a": 1}
```

---

## Modifying Global State

[FATAL] Do not silently modify global state.

```python
# WRONG — global state mutation without explicit declaration
counter = 0  # module-level state

def increment():
    global counter  # silently modifies module-level state
    counter += 1
    return counter

# CORRECT — pass state explicitly
def increment(counter):
    return counter + 1
```

> Note: The `global` keyword itself is not wrong if used intentionally, but it should be documented in the contract's Side Effects section.

---

## Late Binding in Closures

[FATAL] Be careful with closures capturing loop variables.

```python
# WRONG
funcs = [lambda: x for x in range(3)]  # All capture same x

# CORRECT
funcs = [lambda x=x: x for x in range(3)]  # Bind default argument
```

---

## Using 'is' for String Comparison

[WARN] Do not use `is` for string comparison.

```python
# WRONG
if status is "active":

# CORRECT
if status == "active":
```

---

## Catching Exception and Raising Same

[FATAL] Do not catch an exception only to raise it again without adding context.

```python
# WRONG
try:
    do_something()
except SomeError:
    raise

# CORRECT
try:
    do_something()
except SomeError as e:
    raise NewError("Context") from e
```

---

## Forgetting to Close Resources

[FATAL] Always use context managers for resources.

```python
# WRONG
f = open("file.txt")
content = f.read()
# f may not be closed if exception occurs

# CORRECT
with open("file.txt") as f:
    content = f.read()
```

---

## Using Mutable Class Attributes

[FATAL] Be careful with mutable class attributes.

```python
# WRONG
class Cache:
    items = []  # Shared across all instances

# CORRECT
class Cache:
    def __init__(self):
        self.items = []
```
