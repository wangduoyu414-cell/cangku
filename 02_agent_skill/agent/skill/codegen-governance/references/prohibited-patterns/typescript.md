# Prohibited Patterns: TypeScript

These patterns MUST NOT appear in TypeScript code unless the current repo contract explicitly requires them.

---

## Using `any` Type

[FATAL] Do not introduce a new unconstrained `any` when `unknown` or a concrete type is available.

```typescript
// WRONG
function process(data: any) {
    return data.name;
}

// CORRECT
function process(data: unknown) {
    if (typeof data === 'object' && data !== null && 'name' in data) {
        return (data as { name: string }).name;
    }
    throw new Error('Invalid data');
}
```

---

## Using `==` Instead of `===`

[WARN] Prefer `===` for comparison. The intentional exception is `value == null` when you explicitly want to match both `null` and `undefined`.

```typescript
// WRONG
if (value == 0) {
    // ...
}

// CORRECT
if (value === 0) {
    // ...
}

// ALSO OK - intentional nullish match
if (value == null) {
    // Matches null and undefined on purpose
}
```

---

## `new Object()` Instead of `{}`

[WARN] Use object literal syntax instead of `new Object()`.

```typescript
// WRONG
const obj = new Object();

// CORRECT
const obj = {};
```

---

## Using `new Boolean()`, `new String()`, `new Number()`

[FATAL] Never use wrapper constructors for primitives.

```typescript
// WRONG
const flag = new Boolean(false);
if (flag) {
    // Wrapper object is always truthy
}

// CORRECT
const flag = false;
```

---

## Empty Object and Array Truthiness

[WARN] Do not use `if (items)` or `if (config)` as emptiness checks.

```typescript
// RISKY
if (items) {
    // [] still enters this block
}

// CORRECT
if (items.length > 0) {
    // Non-empty array
}

if (config && Object.keys(config).length > 0) {
    // Non-empty object
}
```

---

## Runtime Validation by Type Assertion

[FATAL] Do not treat `as`, non-null assertions, or declared types as runtime validation.

```typescript
// WRONG
const payload = incoming as ApiPayload;
return payload.user.id;

// CORRECT
if (!isApiPayload(incoming)) {
    throw new Error('Invalid payload');
}
return incoming.user.id;
```

---

## Async Without Error Handling

[FATAL] Do not leave Promise rejection paths implicit when the local contract owns the failure behavior.

```typescript
// WRONG
async function fetchData() {
    const response = await fetch(url);
    return response.json();
}

// CORRECT
async function fetchData() {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        throw error;
    }
}
```

---

## `this` in Regular Functions

[FATAL] Do not rely on implicit `this` inside callbacks when instance state is required.

```typescript
// WRONG
class Handler {
    name = 'handler';

    handle() {
        setTimeout(function () {
            console.log(this.name);
        }, 100);
    }
}

// CORRECT
class Handler {
    name = 'handler';

    handle() {
        setTimeout(() => {
            console.log(this.name);
        }, 100);
    }
}
```

---

## Vue-Specific Shared Traps

[FATAL] Never mutate props directly.

[FATAL] Keep computed values pure.

[FATAL] Use `:key` with `v-for`.
