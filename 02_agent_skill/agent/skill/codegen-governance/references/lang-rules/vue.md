# Language Rules: Vue 3 (with Composition API)

Target language: Vue 3

---

## Vue 3 Idioms

These patterns are idiomatic in Vue 3 and should be used instead of patterns borrowed from other frameworks or older Vue versions.

### Script Setup

[WARN] Prefer `<script setup>` for Composition API components when it matches the repo's existing style.

### Reactive State with `ref` and `reactive`

[WARN] Keep reactive state inside `ref`, `reactive`, or `computed`. Plain objects are fine when they are intentionally non-reactive.

```typescript
const count = ref(0)
count.value++

const state = reactive({
    count: 0,
    name: 'Vue'
})
state.count++
```

### Props and Emits

[WARN] Prefer explicit prop and emit definitions. When the repo uses TypeScript, keep those definitions typed.

```vue
<script setup lang="ts">
interface Props {
    title: string
    count?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
    (e: 'update', value: number): void
    (e: 'delete'): void
}>()
</script>
```

### Lifecycle Hooks

[WARN] Use Composition API lifecycle hooks from `vue` for mount, cleanup, and side-effect ownership.

---

## Vue 3 Traps

### Props Mutation

[FATAL] Never mutate props directly. Props are one-way-down inputs.

```vue
<script setup lang="ts">
const props = defineProps<{ initialCount: number }>()

// Wrong
function incrementBad() {
    props.initialCount++
}

// Correct
const count = ref(props.initialCount)
function incrementGood() {
    count.value++
}
</script>
```

### `this` in Composition API

[FATAL] Do not rely on `this` inside `<script setup>` or Composition API logic. Use refs, reactive objects, and returned values directly.

```vue
<script setup lang="ts">
const count = ref(0)

// Wrong
console.log(this?.count)

// Correct
console.log(count.value)
</script>
```

### Side Effects in Computed

[FATAL] Keep computed values pure. Move logging, network calls, or state writes into watchers, events, or lifecycle hooks.

### Async in `<script setup>`

[WARN] Top-level `await` in `<script setup>` is supported, but it turns setup async and depends on framework support such as Suspense or higher-level runtime integration. When the repo does not clearly support async setup, prefer lifecycle hooks or composables.

```vue
<script setup lang="ts">
import { onMounted, ref } from 'vue'

const user = ref<User | null>(null)
const loading = ref(true)

onMounted(async () => {
    user.value = await fetchUser()
    loading.value = false
})
</script>
```

### `v-for` without `:key`

[FATAL] Always use `:key` with `v-for`.

### Watchers

[WARN] Use `watch` when you need explicit dependencies and cleanup. Use `watchEffect` when automatic dependency tracking is the right fit.

### Cleanup in Watchers and Lifecycle

[WARN] Clean up side effects started by lifecycle hooks or watchers.

```typescript
let timer: number | undefined

onMounted(() => {
    timer = setInterval(() => {
        interval.value++
    }, 1000)
})

onUnmounted(() => {
    if (timer !== undefined) {
        clearInterval(timer)
    }
})
```

### Stable Keys

[WARN] Prefer stable unique identifiers over array indices for `:key` whenever order can change.

---

## Vue 3 Style

### Component Organization

[ADV] Follow a consistent component structure that matches the repo's current conventions.

### Template Expressions

[ADV] Keep template expressions simple. Move complex logic to computed values or methods.

### Testing

[ADV] Prefer repo-native validation commands. Use component tests or E2E checks only when the repo already provides that tooling.
