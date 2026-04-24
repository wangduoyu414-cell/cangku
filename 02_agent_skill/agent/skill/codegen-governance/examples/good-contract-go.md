# Good Contract: Go Function

This example demonstrates a well-formed pre-generation contract for a Go function implementation.

---

## Pre-Generation Contract

### Scope

- **Target**: `internal/user/service.go` — `FetchUserByID` function
- **Requested change**: Add proper error handling and context support
- **Allowed blast radius**: Only this function
- **Explicit non-goals**:
  - Do not change the repository interface
  - Do not add caching
  - Do not modify the User struct

---

### Selected Scenario Packs

- **Pack A: Input And Branching** ⚠️ Not selected
  - Reason: Only one input parameter with clear contract

- **Pack B: Fallback And Contract** ✅ Selected
  - Why: Error handling is the primary concern
  - Specific risks:
    - User not found error handling
    - Database error propagation
    - Error wrapping with context

- **Pack C: Side Effect And Runtime** ✅ Selected
  - Why: Database query is a side effect requiring resource management
  - Specific risks:
    - Context cancellation handling
    - Resource cleanup
    - Timeout handling

- **Pack D: Boundary And Observability** ⚠️ Not selected
  - Reason: No external protocols, time handling, or logging required

---

### Input Contract

- **Accepted inputs**:
  - `ctx`: `context.Context` — for cancellation and timeout
  - `id`: `string` — non-empty user ID

- **Missing or empty handling**:
  - `ctx` is nil: Return `nil, fmt.Errorf("ctx cannot be nil")`
  - `id` is empty string: Return `nil, fmt.Errorf("id cannot be empty")`

- **Unknown or invalid value strategy**:
  - Empty ID: Explicit check before query
  - Invalid format: Not validated — assumes caller responsibility
  - Non-existent ID: Return `nil, ErrUserNotFound`

- **Normalization or parsing rules**: None required

---

### Branching And Ordering

- **Decision points**:
  1. Check if ctx is nil → return error
  2. Check if id is empty → return error
  3. Query repository with context → return result or error

- **Priority or ordering rules**:
  - Context check is first (required for cancellation)
  - Input validation before database call
  - Error wrapping at each level

- **Unknown enum or future value policy**: N/A

---

### Defaults And Fallback

- **Default sources**: No defaults — all parameters are required
- **Fallback or downgrade triggers**: N/A
- **Caller visibility of downgrade**: N/A

---

### Return And Failure Contract

- **Success shape**:
  ```go
  (*User, nil)  // Valid User pointer and nil error
  ```

- **Empty or miss shape**:
  ```go
  (nil, ErrUserNotFound)  // User does not exist
  ```

- **Failure signaling**:
  ```go
  (nil, error)  // Any error from repository or validation
  ```

- **Partial success semantics**: N/A

---

### Side Effects And Runtime

- **State writes or mutations**: None
- **Resources to acquire and release**: Database query via repository (repository handles connection)
- **Concurrency, timeout, cancellation, retry, or idempotency notes**:
  - Context cancellation: Check `ctx.Err()` — return early if cancelled
  - Timeout: Should be handled by caller's context
  - Idempotent: Yes — read operation is naturally idempotent

---

### Boundary And Observability

- **External protocol or serialization assumptions**: N/A
- **Unit, timezone, precision, or encoding assumptions**: N/A
- **Logging, telemetry, or audit notes**:
  - Log at DEBUG level on user not found: `fmt.Printf("user not found: id=%s\n", id)`
  - Log at ERROR level on database error

---

### Validation Plan

**Commands or tests to run:**

1. Build:
   ```bash
   go build ./...
   ```

2. Vet:
   ```bash
   go vet ./...
   ```

3. Format check:
   ```bash
   gofmt -d internal/user/service.go
   ```

4. Unit tests:
   ```bash
   go test ./internal/user/... -v
   ```

5. Race detector:
   ```bash
   go test -race ./internal/user/... -v
   ```

**Manual checks to run:**

- Verify error messages are descriptive
- Verify errors are wrapped with `%w`

**Validation that cannot be run now:**

- Integration test with real database
- Load testing

---

### Open Risks

- **Unknowns that could change behavior**: None
- **Reasons to stop and ask instead of guessing**: None

---

## Implementation Notes

### Error Definitions

```go
var (
    ErrUserNotFound = fmt.Errorf("user not found")
    ErrNilContext   = fmt.Errorf("context cannot be nil")
    ErrEmptyID      = fmt.Errorf("user id cannot be empty")
)
```

### Function Signature

```go
func FetchUserByID(ctx context.Context, id string) (*User, error) {
    if ctx == nil {
        return nil, ErrNilContext
    }
    if id == "" {
        return nil, ErrEmptyID
    }

    // Check for cancellation
    select {
    case <-ctx.Done():
        return nil, ctx.Err()
    default:
    }

    user, err := s.repo.GetUserByID(ctx, id)
    if err != nil {
        return nil, fmt.Errorf("fetch user: %w", err)
    }

    if user == nil {
        return nil, ErrUserNotFound
    }

    return user, nil
}
```
