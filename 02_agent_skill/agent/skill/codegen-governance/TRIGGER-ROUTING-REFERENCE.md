# Codegen Execution Constraint Trigger Routing Reference

This document is intended for upstream routing skills, orchestrators, and
control agents that need to decide when to route a request to
`codegen-governance`.

It is not a replacement for [SKILL.md](./SKILL.md). Instead, it translates the
skill's design goal and the repository's current trigger evaluator into a
practical routing reference that can be used by higher-level systems.

## Purpose

`codegen-governance` is a pre-code-generation constraint skill.
Its job is to force an explicit implementation contract before code is written,
completed, or patched.

Per [SKILL.md](./SKILL.md) and [skill.yaml](./skill.yaml), it is intended for:

- Local implementation tasks
- Python, Go, TypeScript, JavaScript, and Vue 3
- Requests with concrete execution-risk semantics such as:
  - input parsing and validation
  - branching and ordering
  - defaults and fallback behavior
  - return and failure contracts
  - side effects and runtime lifecycle
  - retries, idempotency, caching, concurrency
  - boundary protocols, timestamps, money, encoding
  - audit, redaction, and observability

It is explicitly not intended for:

- Repository-wide architecture review
- Review-only tasks after the fact
- Pure explanation tasks
- Planning-only tasks
- Technology selection
- Requests that do not actually generate or patch code

## Source Of Truth

When building an upstream router, use these repository assets in this order:

1. Design scope:
   [SKILL.md](./SKILL.md) and [skill.yaml](./skill.yaml)
2. Executable trigger heuristic:
   [scripts/eval_trigger_and_scenario.py](./scripts/eval_trigger_and_scenario.py)
3. Concrete trigger and non-trigger examples:
   [evals/trigger.json](./evals/trigger.json)

The most important implementation fact is that the current evaluator still emits
three routing outcomes:

- `activate`
- `recover_anchor_then_activate`
- `do_not_activate`

It still uses lightweight request-text heuristics and is broader than the
redesigned target policy, so upstream systems should provide stronger path,
editor, or repository context and should add an explicit governance-threshold
gate instead of mirroring the raw evaluator one-for-one.

## Core Trigger Rule

The current evaluator logic in
[scripts/eval_trigger_and_scenario.py](./scripts/eval_trigger_and_scenario.py)
can be summarized as:

```text
Activate only when:

1. there is implementation intent (including contract-first intent)
2. the target stack is supported
3. and there is either:
   - a local code target anchor
   - or a concrete execution-risk anchor
4. and the request is not dominated by strong non-implementation intent

Recover anchor then activate when:

1. implementation intent is present
2. but the dominant stack or local code surface is still ambiguous

Do not activate when:

1. the request is read-only, review-only, design-only, or unsupported-stack
2. or implementation intent is absent
```

This means the evaluator is still capable of entering the skill for supported
code-writing requests with a supported local code surface or a recoverable
implementation anchor. During the redesign transition, upstream routers should
apply one more rule before routing: ordinary low-risk edits that are already
proven to stay outside governance-sensitive risk should stay on the normal
implementation path instead of entering this skill.

## Recommended Upstream Routing Policy

For an upstream router, do not rely on the current evaluator alone.
Use the following stricter policy.

Route to `codegen-governance` only when all of the following are true:

1. The request is about code generation, code completion, code patching, or
   local implementation change.
2. The target stack is within:
   `python`, `go`, `typescript`, `javascript`, or `vue`.
3. The request contains explicit implementation intent.
4. The request also contains at least one of:
   - a local code anchor
   - an execution-risk anchor
5. The request is not already proven to be an ordinary low-risk edit outside
   governance-sensitive risk.
6. The request is not primarily an explanation, review, planning, strategy,
   architecture, framework-selection, or whole-module refactor task.

Use `recover_anchor_then_activate` when implementation intent is clear but the
dominant supported code surface is not yet recoverable.

Do not route when any of the following dominate the request:

- "explain what this code does"
- "review these files"
- "analyze the strategy"
- "design the API"
- "which framework should we use"
- "draw the architecture diagram"
- "refactor the whole module architecture"

## Decision Order For Routers

Upstream agents should evaluate requests in this order:

1. Check task type.
   If the request does not ask for code to be written, completed, patched, or
   prepared via a pre-generation contract, do not route here.
2. Check stack scope.
   If the request is clearly outside Python, Go, TypeScript, JavaScript, or
   Vue, do not route here.
3. Check strong exclusions first.
   If the request is dominated by architecture, framework choice, performance
   analysis, or whole-module refactor framing, do not route here.
4. Check implementation intent.
   Treat contract-first requests as implementation intent.
5. Check whether the task is already proven to stay outside governance-sensitive risk.
   If it is an ordinary low-risk edit with no caller-visible contract drift,
   no widened side effects, and no trust or boundary concerns, stay on the
   normal path and do not route here.
6. Check stack confidence and local anchor confidence.
   If either is ambiguous but recoverable, use `recover_anchor_then_activate`.
7. Check local target anchor or execution-risk anchor.
   If neither exists after recovery, do not route here.
8. Resolve mixed cases.
   If the request mixes explanation and implementation, route here only when
   the implementation ask is concrete and local.

## Signal Classes

The evaluator organizes signals into five practical classes.

### 1. Implementation Action Signals

These indicate that the user wants code to be written or changed.

Defined in
[scripts/eval_trigger_and_scenario.py](./scripts/eval_trigger_and_scenario.py).

Examples include:

- English:
  `fix`, `implement`, `add`, `write`, `complete`, `modify`, `update`,
  `repair`, `finish`, `fill in`, `change`, `bug`
- Chinese:
  `修`, `修复`, `补全`, `补充`, `添加`, `新增`, `实现`, `写一个`, `完成`,
  `修改`, `更新`, `增加`, `加个`, `加上`, `加日志`, `加默认值`, `加重试`,
  `加缓存`, `改成`, `改为`, `改一下`, `修一下`

Interpretation:

- These are necessary but not sufficient.
- Action words alone should not trigger this skill.
- They must be paired with a local target anchor or a risk anchor.

### 2. Local Code Target Anchors

These indicate that the request is about a concrete local unit of code rather
than an abstract design problem.

Examples include:

- English nouns:
  `function`, `handler`, `client`, `component`, `module`, `class`, `method`,
  `props`, `api`, `cache`, `retry`, `export`, `webhook`, `worker`, `batch`,
  `contract`, `validation`
- File anchors:
  `.py`, `.go`, `.ts`, `.tsx`, `.js`, `.jsx`, `.vue`
- Chinese nouns:
  `代码`, `函数`, `模块`, `组件`, `类`, `方法`, `属性`, `接口`, `缓存`,
  `重试`, `导出`, `批处理`
- Local context phrases:
  `这个函数`, `这段代码`, `当前模块`, `这个组件`, `这个接口`,
  `this function`, `this module`, `this component`

Interpretation:

- These anchors make the task local and implementable.
- A request like "fix this function" triggers because it has both an action
  signal and a local target anchor, even if no detailed risk words appear.

### 3. Execution-Risk Anchors

These indicate the specific kind of implementation risk this skill is designed
to constrain before code is generated.

For upstream routing, it is better to group these by scenario type instead of
treating them as a flat keyword list.

#### Pack A Style Risks: Input / Parsing / Branching / Collections

Typical signals:

- `parse`, `payload`, `json`, `validation`, `props`
- `解析`, `输入`, `校验`
- patch field presence semantics
- schema version parsing
- sorting, grouping, pagination, top-N

Typical user phrasing:

- "parse this JSON payload"
- "validate props"
- "distinguish field absence from null clear"
- "handle v1 and v2 payloads"
- "sort by priority then amount then order id"

#### Pack B Style Risks: Defaults / Fallback / Return Contract / Failure Contract

Typical signals:

- `default`, `fallback`, `replay`, `idempotent`, `partial success`
- `默认`, `回退`, `幂等`, `去重`, `重放`, `部分成功`
- return shape, error shape, status mapping
- retain old value vs clear vs reject

Typical user phrasing:

- "add a default value"
- "keep old value when field is missing"
- "return partial success for mixed batch result"
- "reject unsupported version explicitly"

#### Pack C Style Risks: Side Effects / Runtime / Retry / State

Typical signals:

- `retry`, `timeout`, `cache`, `worker`, `webhook`, `dead-letter`
- `重试`, `超时`, `缓存`, `死信`
- local state writes, file write lifecycle, listener cleanup
- concurrency, lock contention, runtime mutation

Typical user phrasing:

- "add retry logic"
- "dedupe with cache replay"
- "ack/retry/dead-letter"
- "append one audit event after success"
- "claim a lease and handle contention"

#### Pack D Style Risks: Boundary / Protocol / Time / Money / Encoding / Audit

Typical signals:

- `utc`, `timezone`, `currency`, `decimal`, `csv`, `encoding`
- `audit`, `redaction`, `signature`, `status code`
- `UTC`, `时区`, `金额`, `精度`, `CSV`, `编码`, `审计`, `脱敏`,
  `签名`, `状态码`

Typical user phrasing:

- "normalize timestamps to UTC"
- "serialize amount_cents as money"
- "export UTF-8 CSV"
- "redact email and token in audit logs"
- "map upstream HTTP status codes"

Interpretation:

- These risk anchors are sufficient to justify this skill when paired with
  implementation intent, even if the request does not explicitly name a file or
  function.

### 4. Standard Non-Implementation Signals

These indicate that the request is more about explanation, design, or review
than code generation.

Examples include:

- English:
  `explain`, `describe`, `analyze`, `understand`, `review`, `plan`, `design`,
  `strategy`, `recommend`, `suggestion`, `compare`, `list`, `why`, `should`
- Chinese:
  `解释`, `说明`, `分析`, `理解`, `评审`, `代码审查`, `计划`, `设计`,
  `策略`, `建议`, `对比`, `列出`, `为什么`, `帮我找`

Interpretation:

- These do not always hard-block routing.
- They block routing when they appear without real implementation intent.
- They also block weak "action-only" prompts that still lack a local target or
  risk anchor.

### 5. Strong Non-Implementation Signals

These should be treated by upstream routers as high-priority route blockers.

Examples include:

- English:
  `architecture`, `diagram`, `framework`, `tech stack`, `performance`,
  `refactor`
- Chinese:
  `架构`, `架构图`, `选型`, `项目计划`, `性能分析`, `重构整个`

Interpretation:

- If these dominate the request, do not route here.
- Even if the request mentions code nouns, this skill is not the right tool for
  repository-level architecture or tech-selection work.

## Practical Trigger Patterns

These are the most reliable upstream routing patterns.

### High-Confidence Governance Trigger

Route when the request looks like:

- action + local target + risk

Examples:

- "Fix this PATCH update function and distinguish absent, null-clear, and keep-old-value semantics."
- "Implement an outbound HTTP client with timeout, 429 retry, status mapping, and audit logging."
- "Fix the webhook worker to validate signature, dedupe delivery, and handle ack/retry/dead-letter."

### Medium-High Confidence Governance Trigger

Route when the request looks like either:

- action + risk
- action + local target + unresolved governance-threshold question

Examples:

- "Add retry logic to this API client."
- "Implement dedupe with idempotency key replay."
- "Normalize this export to UTC and UTF-8 CSV."
- "Patch this function, but first determine whether the fallback path changes caller-visible behavior."

### Do Not Trigger

Do not route when the request looks like:

- explanation only
- review only
- strategy only
- architecture only
- framework choice only
- whole-module refactor framing

Examples:

- "Explain what this code does."
- "Review these files."
- "Analyze the retry strategy."
- "Design the PATCH semantics."
- "Which framework should this project use?"
- "Refactor the whole module architecture."

## Mixed Requests

Mixed requests require explicit handling by upstream routers.

### Route

Route when the request contains explanation language but still clearly asks for
concrete local implementation.

Examples:

- "Please explain briefly and then fix this timeout bug in the client."
- "Review and patch this function so it rejects unsupported schema versions."

Why:

- The dominant user outcome is still code change.

### Stay On The Normal Path

Do not route when the request is already clearly a local low-risk edit with no
contract-sensitive drift.

Examples:

- "Rename this private helper for clarity."
- "Delete this unused import."
- "Fix formatting in this file."
- "Adjust this local comment without changing behavior."

### Do Not Route

Do not route when implementation terms appear only as an abstract topic of
discussion.

Examples:

- "Explain how PATCH should distinguish absent, null, and keep-old-value."
- "Analyze how webhook ack and retry strategy should be designed."
- "Give me suggestions for audit log redaction."

Why:

- These are concept and design tasks, not local implementation tasks.

## Canonical Positive Examples From The Eval Suite

These examples are explicitly labeled as trigger cases in
[evals/trigger.json](./evals/trigger.json). They describe the current raw
evaluator surface, not the full stricter redesign target by themselves, so an
upstream router should still apply the governance-threshold gate documented
above before mirroring them directly:

- "修一下这个函数的 bug"
- "补全这个函数的实现"
- "给这个函数加个错误处理"
- "新增一个缓存逻辑"
- "修改这个 Vue 组件的 props 处理"
- "修复这个 PATCH 更新函数，区分字段缺失、null 清空和保留旧值"
- "实现一个出站 HTTP client，处理 timeout、429 重试、状态码映射和审计日志"
- "给这个接口增加幂等键去重和缓存回放结果"
- "修复这个账单导出函数，统一 UTC 时间、金额精度，并输出 UTF-8 CSV"
- "实现一个批处理函数，返回逐项成功/失败/跳过结果，并把永久失败写到 dead-letter"
- "修复 webhook worker：校验签名、区分 duplicate delivery、处理 ack/retry/dead-letter，并保留稳定审计事件"

## Canonical Negative Examples From The Eval Suite

These examples are explicitly labeled as non-trigger cases in
[evals/trigger.json](./evals/trigger.json):

- "解释一下这段代码在做什么"
- "画一个这个模块的架构图"
- "review 这几个文件的代码"
- "这个项目应该用什么框架"
- "帮我写一个项目计划"
- "这个函数性能怎么样"
- "列出这个目录下所有文件"
- "给我一个函数签名的建议"
- "重构整个模块的架构"
- "帮我找找这段代码的问题"
- "解释一下 PATCH 更新里字段缺失、null 清空和保留旧值应该怎么设计"
- "分析一下出站 HTTP client 的重试策略该怎么选型"
- "给我一个审计日志脱敏策略的建议"
- "解释一下批处理 partial success 和 dead-letter 应该怎么设计"
- "分析一下 webhook worker 的 ack 和 retry 策略应该怎么定"

## Important Implementation Note For Upstream Routers

The current repository evaluator is intentionally lightweight. Upstream routing
should still be stricter than the raw evaluator so the redesigned boundaries
hold.

Specifically:

- The evaluator can respect an explicit language signal, but it still does not
  recover stack scope from repository context on its own.
- The evaluator may return `recover_anchor_then_activate` for generic local
  implementation requests when stack or anchor confidence is still weak.
- The skill's design goal is narrower than "all coding tasks". It is focused on
  local implementation tasks with contract-sensitive behavior or unresolved
  governance threshold questions.

Therefore, upstream routers should add these safeguards:

1. Apply an explicit stack gate.
2. Prefer this skill when contract-sensitive execution semantics are present.
3. Keep ordinary low-risk edits on the normal path when you can positively
   prove that they stay outside governance-sensitive risk.
4. Require at least one risk anchor or one unresolved governance-threshold
   question before routing broad classes of local edits here.

## Recommended Strict Mode

If an upstream orchestrator wants tighter routing than the current evaluator,
use this stricter rule:

```text
Route only if:
1. code will be written or patched
2. the task is local in scope
3. the stack is Python, Go, TypeScript, JavaScript, or Vue
4. the task is not already proven to be an ordinary low-risk edit outside governance-sensitive risk
5. at least one execution-risk anchor is present, or the governance threshold still cannot be safely ruled out
6. the request is not mainly explanation, review, architecture, planning, or strategy
```

This strict mode better matches the design intent expressed in
[SKILL.md](./SKILL.md), even though it is narrower than the current evaluator.

## Final Routing Statement

For upstream systems, the most precise one-paragraph routing statement is:

`codegen-governance` should be routed for local code-generation or
code-patching requests in Python, Go, TypeScript, JavaScript, or Vue when the
request includes explicit implementation intent, is not already proven to be an
ordinary low-risk edit outside governance-sensitive risk, and also includes
either a concrete local code anchor or a contract-sensitive execution-risk
anchor. It should not be routed for pure explanation, review, planning,
architecture, technology selection, performance analysis, whole-module refactor
requests, or ordinary low-risk edits that can safely stay on the normal path.

