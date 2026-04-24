# Language Rules: TypeScript

Target language: TypeScript (5.0+)

---

## TypeScript Idioms

These patterns are idiomatic in TypeScript and should be used instead of patterns borrowed from other languages.

### Strict Type Checking

[WARN] Respect the repo's existing compiler settings. For greenfield or isolated modules, prefer `strict: true`. Do not widen the blast radius in `patch-safe` tasks just to flip `tsconfig` flags.

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Type Inference

TypeScript can infer types. Do not add explicit types where inference works.

[WARN] Add explicit types for function parameters and return types of public APIs. Let TypeScript infer local variable types.

```typescript
// Correct - explicit for public API
function add(a: number, b: number): number {
    return a + b;
}

// Correct - inferred for local
const result = add(1, 2);

// Usually unnecessary
const sameResult: number = add(1, 2);
```

### Interface vs Type

[WARN] Use `interface` for object shapes that may be extended. Use `type` for unions, intersections, and aliases.

```typescript
interface User {
    name: string;
    email: string;
}

type Status = 'pending' | 'active' | 'inactive';
type ID = string | number;
```

### Null and Undefined

[FATAL] Do not treat `null` (intentional absence) and `undefined` (missing or not provided) as interchangeable when business meaning differs.

```typescript
// Correct - preserve the difference between "missing" and "empty string"
function readName(input: { name?: string | null }): string | null {
    if (input.name === undefined) {
        return null;
    }
    return input.name;
}

// Wrong - falsy check collapses distinct cases
function readName(input: { name?: string | null }): string | null {
    if (!input.name) {
        return null;  // Collapses "", null, and undefined
    }
    return input.name;
}
```

---

## TypeScript Traps

### `any` Type

[FATAL] Do not introduce a new unconstrained `any` when `unknown` or a concrete type is available. If a `patch-safe` task must preserve an existing `any` boundary, document why instead of widening it further.

```typescript
// Wrong - any defeats type checking
function process(data: any) {
    return data.name;
}

// Correct - unknown requires narrowing
function process(data: unknown) {
    if (typeof data === 'object' && data !== null && 'name' in data) {
        return (data as { name: string }).name;
    }
    throw new Error('Invalid data');
}

// Better - use a concrete type when available
interface Data {
    name: string;
}

function processTyped(data: Data) {
    return data.name;
}
```

### Object Mutation

[WARN] Prefer immutable patterns when they do not fight the current repo style. Avoid mutating objects passed as parameters unless mutation is the intended contract.

```typescript
// Wrong - mutating input implicitly
function addField(obj: { name: string; id?: string }) {
    obj.id = generateId();
}

// Correct - return a new object
function addFieldCopy(obj: { name: string }): { name: string; id: string } {
    return { ...obj, id: generateId() };
}
```

### Array Index Access

[WARN] If the repo enables `noUncheckedIndexedAccess`, treat indexed access as possibly undefined. Even without it, explicit bounds checks are safer for contract-sensitive logic.

```typescript
const first = items[0];
if (first === undefined) {
    return;
}
```

### `==` vs `===`

[WARN] Prefer `===` and `!==`. The main intentional exception is `value == null` when you specifically want to match both `null` and `undefined`.

```typescript
// Wrong
if (value == 0) {
    // Matches both 0 and "0"
}

// Correct
if (value === 0) {
    // Only number 0
}

if (value === undefined) {
    // Only undefined
}

// Intentional
if (value == null) {
    // Matches null and undefined on purpose
}
```

### Async/Await

[WARN] Handle promise rejections explicitly with `try/catch`, `.catch()`, or a caller contract that clearly owns the rejection path.

```typescript
async function fetchData() {
    try {
        const response = await fetch(url);
        return await response.json();
    } catch (error) {
        console.error('Fetch failed:', error);
        throw error;
    }
}
```

### `this` in Callbacks

[FATAL] Be careful with `this` in callbacks. Use arrow functions or `.bind()` when the callback needs instance state.

```typescript
class Handler {
    name = 'handler';

    handleBad() {
        setTimeout(function () {
            console.log(this.name);  // Wrong receiver
        }, 100);
    }

    handleGood() {
        setTimeout(() => {
            console.log(this.name);
        }, 100);
    }
}
```

### Empty Object and Array Truthiness

[WARN] Empty arrays and empty objects are truthy. `if (items)` checks existence, not emptiness.

```typescript
if (items) {
    // Runs for [] because [] is truthy
}

if (items.length > 0) {
    // Explicit non-empty check
}

if (obj && Object.keys(obj).length > 0) {
    // Explicit object non-empty check
}
```

### Runtime Validation

[FATAL] TypeScript types do not perform runtime validation. If the input crosses a trust boundary, add real validation instead of relying on compile-time types.

---

## TypeScript Style

### Naming Conventions

- Variables and functions: `camelCase`
- Classes and interfaces: `PascalCase`
- Constants: `UPPER_SNAKE_CASE` or the repo's existing module-level convention
- Enum members: `PascalCase`

### Enums

[WARN] Prefer union types over enums for simple closed sets. Use enums when you need runtime values or interop that benefits from them.

```typescript
type Status = 'pending' | 'active' | 'inactive';

enum Direction {
    Up = 'UP',
    Down = 'DOWN',
}
```

### Generics

[ADV] Use generics for reusable components. Avoid falling back to `any` in generic constraints.

### Testing

[ADV] Prefer repo-native validation commands. If the repo exposes `tsc`, lint, or test scripts, use them instead of inventing generic commands.
