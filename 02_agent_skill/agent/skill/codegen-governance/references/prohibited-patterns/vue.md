# Prohibited Patterns: Vue 3

These patterns MUST NOT appear in Vue 3 code unless the current repo contract explicitly requires them.

---

## Mutating Props

[FATAL] Never mutate props directly in Vue 3.

```vue
<!-- WRONG -->
<script setup lang="ts">
const props = defineProps<{ count: number }>()
props.count++
</script>

<!-- CORRECT -->
<script setup lang="ts">
const props = defineProps<{ count: number }>()
const localCount = ref(props.count)
localCount.value++
</script>
```

---

## Using `this` in `<script setup>`

[FATAL] Do not use `this` inside `<script setup>` or Composition API state access.

---

## Side Effects in Computed Properties

[FATAL] Computed properties must stay pure.

---

## `v-for` Without `:key`

[FATAL] Always use `:key` with `v-for`.

---

## Top-Level `await` Without Async Setup Support

[WARN] Do not assume top-level `await` is free. Use it only when the app or framework supports async setup; otherwise prefer lifecycle hooks or composables.

---

## Forgetting Cleanup for Side Effects

[FATAL] Clean up timers, listeners, subscriptions, and similar side effects when the component or watcher no longer owns them.

---

## Using Index as `:key` for Reorderable Data

[WARN] Avoid array indices as keys when list order or membership can change.

---

## Plain Object Mistaken for Reactive State

[WARN] Do not assume plain objects are reactive. Use `ref` or `reactive` when reactivity is required by the component contract.
