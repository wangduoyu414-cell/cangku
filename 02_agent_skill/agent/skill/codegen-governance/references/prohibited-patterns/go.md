# Prohibited Patterns: Go

These patterns MUST NOT appear in Go code unless the current repo contract explicitly requires them.

---

## Ignoring Returned Errors

[FATAL] Never ignore a returned error.

```go
// WRONG
result, _ := doSomething()

// CORRECT
result, err := doSomething()
if err != nil {
    return fmt.Errorf("doSomething: %w", err)
}
```

---

## Nil Pointer Dereference

[FATAL] Do not dereference a pointer without first proving it is non-nil on that path.

```go
if ptr != nil {
    value := *ptr
    _ = value
}
```

---

## Goroutine Without Exit Path

[FATAL] Do not start goroutines with no bounded exit path.

---

## Using Panic for Control Flow

[FATAL] Do not use `panic()` for normal error handling.

---

## Typed Nil Interface Return

[FATAL] Do not accidentally return a typed nil inside an interface value.

```go
type myErr struct{}

func (*myErr) Error() string { return "boom" }

// WRONG
func bad() error {
    var err *myErr = nil
    return err
}

// CORRECT
func good() error {
    return nil
}
```

---

## Global State Mutation

[FATAL] Do not silently mutate global state.

---

## Relying on Map Iteration Order

[FATAL] Do not rely on map iteration order.

---

## Channel Close Ambiguity

[WARN] If a closed channel's zero value is ambiguous, use the two-value receive form.

```go
// RISKY
value := <-ch  // Cannot distinguish zero value from closed channel

// CORRECT
value, ok := <-ch
if !ok {
    // Channel closed
}
_ = value
```

---

## Mutating Maps During Iteration

[WARN] Avoid deleting or inserting map entries during iteration unless the behavior is deliberate and well-understood.

---

## Context-Free Long Operations

[WARN] Prefer caller-provided `context.Context` for request-scoped or potentially slow operations.
