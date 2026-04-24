# Bad Contract: Annotated Examples

This document shows common contract quality issues with annotations explaining what's wrong and how to fix it.

---

## Example 1: Incomplete Scope

### ❌ Bad Contract

```markdown
## Pre-Generation Contract

### Scope
- Target: Some file
- Change: Fix the bug
- Blast radius: Small
```

### Issues

1. **Target is vague**: "Some file" doesn't identify the actual file
2. **Change is vague**: "Fix the bug" doesn't specify what the bug is
3. **Blast radius is unverified**: "Small" has no justification

### ✅ Good Contract

```markdown
### Scope
- **Target**: `src/services/user_service.py` — `get_user_by_email` function
- **Requested change**: Fix TypeError when email is None
- **Allowed blast radius**: Only this function
- **Explicit non-goals**:
  - Do not modify database query logic
  - Do not add caching
```

---

## Example 2: Missing Justification for Pack Selection

### ❌ Bad Contract

```markdown
### Selected Scenario Packs
- Pack A: Input And Branching
- Pack B: Fallback And Contract
- Pack C: Side Effect And Runtime
- Pack D: Boundary And Observability
```

### Issues

1. **No justification**: Why was each pack selected?
2. **Suspicious completeness**: Selecting all 4 packs suggests cargo-culting
3. **No explanation of unselected packs**: Why weren't they needed?

### ✅ Good Contract

```markdown
### Selected Scenario Packs
- **Pack A: Input And Branching** ✅ Selected
  - Why: Email input validation is the core task
  - Specific risks: None validation, empty handling

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: User not found is a valid return case
  - Specific risks: Return shape when user not found

- **Pack C: Side Effect And Runtime** ⚠️ Not selected
  - Reason: This is a read-only query with no side effects

- **Pack D: Boundary And Observability** ⚠️ Not selected
  - Reason: No external protocols, dates, or logging
```

---

## Example 3: Vague Input Contract

### ❌ Bad Contract

```markdown
### Input Contract
- Accepted inputs: email and config
- Missing handling: Depends on situation
- Invalid value strategy: Handle appropriately
```

### Issues

1. **"Depends on situation"**: This is not a strategy, it's avoidance
2. **"Handle appropriately"**: What does "appropriate" mean?
3. **No concrete examples**: What are the actual edge cases?

### ✅ Good Contract

```markdown
### Input Contract
- **Accepted inputs**:
  - `email`: `str` — valid email format per RFC 5322
  - `config`: `dict` — optional, defaults to `{}`

- **Missing or empty handling**:
  - `email` is `None`: Raise `ValueError("email cannot be None")`
  - `email` is `""`: Raise `ValueError("email cannot be empty")`
  - `email` is whitespace: Strip whitespace, reject if empty after strip
  - `config` is `None`: Use `{}`

- **Invalid value strategy**:
  - Invalid email format: Raise `ValueError(f"Invalid email: {email}")`
  - Config contains unknown keys: Ignore unknown keys, use known keys only
```

---

## Example 4: Hidden Side Effects

### ❌ Bad Contract

```markdown
### Side Effects And Runtime
- State writes: None
- Resources: None
```

### Issues

1. **Potentially wrong**: If the function queries a database, that's a side effect
2. **Not verified**: Did the developer check for side effects?
3. **Missing from this section**: If there are side effects, they're hidden

### ✅ Good Contract

```markdown
### Side Effects And Runtime
- **State writes or mutations**: None
- **Resources to acquire and release**: Database connection (handled by session parameter)
- **Concurrency notes**:
  - Read-only operation — safe to retry
  - No concurrency concerns
- **Implicit side effects**:
  - Database query executed via `session.query()`
  - No data modification
```

---

## Example 5: Non-Executable Validation Plan

### ❌ Bad Contract

```markdown
### Validation Plan
- Commands or tests to run: Test the function
- Manual checks: Make sure it works
```

### Issues

1. **"Test the function"**: How? What command?
2. **"Make sure it works"**: What does "works" mean?
3. **No differentiation**: What's executable vs. manual?

### ✅ Good Contract

```markdown
### Validation Plan

**Commands or tests to run:**
1. Syntax check: `python -m py_compile src/services/user_service.py`
2. Type check: `mypy src/services/user_service.py --ignore-missing-imports`
3. Unit tests: `pytest tests/test_user_service.py -v -k test_get_user_by_email`

**Manual checks to run:**
- Verify error messages are user-friendly (not internal details)
- Verify database query is parameterized (SQL injection check)

**Validation that cannot be run now:**
- Integration test with real database (requires test DB setup)
- Performance test under load (requires load testing environment)
```

---

## Example 6: Ignoring Unknowns

### ❌ Bad Contract

```markdown
### Open Risks
- Unknowns: None
```

### Issues

1. **Suspiciously complete**: Every task has unknowns
2. **No acknowledgment**: What if there's a timezone issue? A length limit?
3. **Hidden risks**: If there's something unknown, it's now hidden

### ✅ Good Contract

```markdown
### Open Risks
- **Unknowns that could change behavior**:
  - Email case sensitivity: Is comparison case-insensitive? Affects query results
  - Rate limiting: Does the API have rate limits? Affects retry strategy

- **Reasons to stop and ask instead of guessing**:
  - Email case sensitivity: Could cause silent data inconsistencies if wrong
  - Rate limiting: May need exponential backoff if exceeded
```

---

## Example 7: No Language-Specific Considerations

### ❌ Bad Contract

```markdown
### Input Contract
- `data`: any data structure
- Validation: Handle edge cases
```

### Issues

1. **"any data structure"**: Too vague, no type safety
2. **"Handle edge cases"**: Which ones? How?
3. **Ignores Python idioms**: In Python, falsy checks are idiomatic

### ✅ Good Contract

```markdown
### Input Contract
- `data`: `dict` — must be a dictionary, not arbitrary object
- `data.name`: `str` — optional, defaults to "Anonymous"
- `data.count`: `int` — must be non-negative integer

**Validation rules:**
- `data` is `None`: Use `{}` (idiomatic Python)
- `data` is not a `dict`: Raise `TypeError("data must be a dict")`
- `data.count` < 0: Raise `ValueError("count cannot be negative")`

**Python-specific notes:**
- Falsy checks are idiomatic for `None` checks
- Use `isinstance()` for type checking, not duck typing
```

---

## Example 8: Contradictory Statements

### ❌ Bad Contract

```markdown
### Return And Failure Contract
- Success shape: `User` object
- Failure signaling: Return `None` for all failures
- Partial success: Not applicable
```

### Issues

1. **Contradiction**: If "Return None for all failures", what distinguishes:
   - User not found (legitimate empty result)
   - Database error (actual failure)
   - Invalid input (validation failure)
2. **No error types**: All failures look the same to the caller

### ✅ Good Contract

```markdown
### Return And Failure Contract
- **Success shape**: `User` object
- **Empty or miss shape**: `None` — user not found
- **Failure signaling**:
  - `ValueError` — invalid input parameters
  - `DatabaseError` — connection or query failure
  - `PermissionError` — access denied
- **Partial success**: N/A
```

---

## Quality Checklist

Before finalizing a contract, check:

### Basic Completeness
- [ ] Scope identifies exact file, function, and change
- [ ] Each pack has specific justification
- [ ] Unselected packs have reasons
- [ ] Input contract specifies all parameters with types
- [ ] Input contract specifies exact handling for each edge case
- [ ] Return contract distinguishes success, empty, and failure
- [ ] Side effects are explicitly listed (even if "none")
- [ ] Validation plan has specific, runnable commands
- [ ] Open risks section is honest about unknowns

### Language Specificity (NEW)
- [ ] Target Language field is filled first
- [ ] Language-specific rules have been applied
- [ ] Prohibited patterns have been checked for the target language
- [ ] Language idioms are followed (e.g., falsy checks in Python)

### Validation Quality (NEW)
- [ ] Validation plan distinguishes "executed" vs "not executed" checks
- [ ] No vague language ("appropriate", "handle", "depends", "TBD")
- [ ] Contract deviations are documented if any exist

### Conflict Detection
- [ ] No contradictory statements in different sections
- [ ] Return contract does not mix failure modes
- [ ] Side effects section matches actual implementation behavior

