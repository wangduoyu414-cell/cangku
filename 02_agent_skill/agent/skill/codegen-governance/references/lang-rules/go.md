# Language Rules: Go

Target language: Go (1.21+)

---

## Go Idioms

These patterns are idiomatic in Go and should be used instead of patterns borrowed from other languages.

### Error Handling

Go uses explicit error returns, not exceptions.

[FATAL] Never ignore a returned error. Every error must be explicitly handled or intentionally returned to the caller.

```go
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething failed: %w", err)
}
```

[WARN] Wrap errors with context using `fmt.Errorf("context: %w", err)` when the extra context helps the caller.

### Multiple Return Values

Go uses multiple return values for error propagation. This is idiomatic.

```go
func fetchData(id string) ([]byte, error) {
    return data, nil
}
```

### Zero Values

[WARN] Understand zero values: `0` for integers, `""` for strings, `nil` for pointers, interfaces, slices, maps, and channels.

### Slices, Maps, and Channels

[WARN] Nil slices and nil maps are readable. `len(nilSlice) == 0`, ranging a nil slice runs zero times, and ranging a nil map runs zero times. Nil channels are different: send and receive operations block forever.

```go
var items []int
if len(items) == 0 { // Safe: len(nilSlice) is 0
    // No items
}

for range items { // Safe: zero iterations
}
```

---

## Go Traps

### Goroutine Leaks

[FATAL] Every goroutine must have a way to exit. Provide cancellation, channel closure, or another bounded lifecycle.

```go
func process(ctx context.Context, data <-chan int) {
    for {
        select {
        case <-ctx.Done():
            return
        case item, ok := <-data:
            if !ok {
                return
            }
            _ = item
        }
    }
}
```

### Collection Mutation During Iteration

[WARN] Be careful when mutating collections during iteration. Updating the current slice element by index is valid, but changing slice length or mutating maps during iteration is harder to reason about and should be explicit.

```go
// OK: update current slice element in place
for i := range items {
    if items[i] == old {
        items[i] = new
    }
}

// Risky: mutating a map while iterating it
for key := range counts {
    delete(counts, key)
}
```

### Defer in Loops

[WARN] Do not use `defer` inside loops without careful consideration. Defers run when the surrounding function returns, not at the end of each iteration.

### Typed Nil in Interfaces

[FATAL] A typed nil stored in an interface value is not the same as a nil interface. Be careful when returning interface types.

```go
type myErr struct{}

func (*myErr) Error() string { return "boom" }

func bad() error {
    var err *myErr = nil
    return err // Non-nil interface value with nil concrete pointer
}

func good() error {
    return nil
}
```

### Context Propagation

[WARN] For request-scoped, cancelable, or potentially slow operations, accept `context.Context` from the caller and pass it through.

```go
func FetchUser(ctx context.Context, id string) (*User, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", "/users/"+id, nil)
    if err != nil {
        return nil, err
    }
    return client.Do(req)
}
```

### Panic for Control Flow

[FATAL] Do not use `panic` for normal error handling. Reserve panic for unrecoverable programmer errors or process-fatal conditions.

### Map Iteration Order

[FATAL] Do not rely on map iteration order. If order matters, collect and sort keys explicitly.

### Channel Receive Semantics

[WARN] Receiving from a closed channel returns the zero value immediately. Use the two-value receive form when the zero value is ambiguous and you must distinguish "closed" from "real zero value".

```go
value, ok := <-ch
if !ok {
    // Channel closed
}
```

---

## Go Style

### Naming

- Use `PascalCase` for exported names and `camelCase` for unexported names
- Keep names short but specific
- Preserve common acronym casing such as `ID`, `URL`, and `API`

### Error Strings

[WARN] Error messages should be lowercase and should not end with punctuation.

```go
return nil, fmt.Errorf("invalid input: %s", value)
```

### Formatting

[WARN] Use `gofmt` output as the formatting source of truth.

### Package Structure

[ADV] Keep packages focused and avoid circular dependencies.

### Testing

[ADV] Prefer repo-native validation commands. For concurrency-sensitive changes, add race-aware validation if the repo already uses it.
