# Decision Cases

Use these cases to spot regressions in the skill's planning behavior.

## Case 1: Python Endpoint

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: split into a small handler file and one external adapter only if network or persistence logic is non-trivial

## Case 2: TypeScript UI Feature

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: keep local types and validators inline, split data adapter only if side effects dominate

## Case 3: Vue Page

- Local repo shape: mixed
- Artifact: ui-component
- Stack: vue
- Expected direction: keep page SFC whole unless async state or reusable behavior justifies composable and service extraction

## Case 4: Go Package

- Local repo shape: package-first
- Artifact: library-module
- Stack: go
- Expected direction: prioritize package cohesion; avoid multiplying files unless public API or adapters are obscuring the package

## Case 5: CLI Tool

- Local repo shape: mixed
- Artifact: cli-command
- Stack: python
- Expected direction: bias toward one visible main flow file plus one adapter only if external IO is substantial

## Case 6: Data Pipeline Step

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: typescript-javascript
- Expected direction: split by stage or sink boundary, not by helper function

## Case 7: Merge Tiny UI Files

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: merge a tiny component and tiny local API helper when the current split adds pass-through ceremony without a real boundary

## Case 8: Legacy Conflict Zone

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: python
- Expected direction: honor the documented layer model and relocate orchestration plus adapters into application and infrastructure files, while calling out migration cost from the legacy folder

## Case 9: Python Endpoint Keep Small

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: keep a small endpoint whole when it only validates input, applies local rules, and shapes a response

## Case 10: Python CLI Merge Pass-Through

- Local repo shape: mixed
- Artifact: cli-command
- Stack: python
- Expected direction: merge a tiny command-local client back into the main script when the helper only forwards one request for the same command

## Case 11: TypeScript Backend Endpoint Keep Small

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: typescript-javascript
- Expected direction: keep a route whole when it has request parsing and local rules only, while contrasting it with a nearby feature that already split a real network adapter

## Case 12: TypeScript Backend Endpoint Split IO

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: typescript-javascript
- Expected direction: split route glue from remote partner access and persistence when one file mixes multiple failure boundaries

## Case 13: React Feature Keep Local

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: keep a local stateful panel whole when there is no second consumer and no dominant remote-data boundary

## Case 14: Vue Page Split Reusable Async Flow

- Local repo shape: mixed
- Artifact: ui-component
- Stack: vue
- Expected direction: extract a composable when polling and retry state is shared across the page and a second component

## Case 15: Vue Page Merge Local Composable

- Local repo shape: mixed
- Artifact: ui-component
- Stack: vue
- Expected direction: merge a composable back into the page when it only wraps page-local refs and computed labels for a single consumer

## Case 16: Go Package Split Same Package

- Local repo shape: package-first
- Artifact: library-module
- Stack: go
- Expected direction: split one crowded package into a few files while keeping the same package boundary instead of creating extra packages or interfaces

## Case 17: Python Library Keep Shared Helper

- Local repo shape: mixed
- Artifact: library-module
- Stack: python
- Expected direction: keep one shared helper module whole when two consumers exist but the public surface is still small and cohesive

## Case 18: Python Pipeline Keep Single Job

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: python
- Expected direction: keep one simple job file whole when source parsing, light transformation, and sink writing still read as one flow

## Case 19: React Feature Split Shared Hook

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: extract a feature-local hook when two components share queue loading and decision flow instead of duplicating stateful async logic

## Case 20: Go Package Merge Tiny Files

- Local repo shape: package-first
- Artifact: library-module
- Stack: go
- Expected direction: merge several tiny package files back into one cohesive file when the split adds little ownership value

## Case 21: Python Pipeline Split Source And Sink

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: python
- Expected direction: split a Python job when one file mixes remote source access and persistence, while keeping counters and tiny normalization local

## Case 22: TypeScript Backend Merge Pass-Through Service

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: typescript-javascript
- Expected direction: merge a tiny route-local service back into the route when the split only adds pass-through ceremony

## Case 23: React Feature Merge Local Hook

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: merge a hook back into the panel when the state only serves one panel and is not shared like the nearby triage feature

## Case 24: Go Package Split Codec Surface

- Local repo shape: package-first
- Artifact: library-module
- Stack: go
- Expected direction: split codec details away from the small public package surface while staying in the same package

## Case 25: Python Library Split Mature API

- Local repo shape: mixed
- Artifact: library-module
- Stack: python
- Expected direction: split a shared Python module when a stable public surface and CSV codec details are both real and now serve multiple consumers

## Case 26: TypeScript Pipeline Keep Small

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: typescript-javascript
- Expected direction: keep a small job whole even in a layer-first pipeline area when transform and sink boundaries are still too small to justify separate files

## Case 27: Python CLI Keep Single

- Local repo shape: mixed
- Artifact: cli-command
- Stack: python
- Expected direction: keep a local summary command in one file when it only parses input, computes a local summary, and writes a report

## Case 28: Python Endpoint Merge Pass-Through Service

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: merge a thin service back into the handler when the split only adds an endpoint-local hop without a real side-effect boundary

## Case 29: Python Endpoint Split Remote And Store

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: split a handler away from real partner and persistence boundaries, while avoiding a generic feature-local service layer

## Case 30: TypeScript Pipeline Merge Local Transform

- Local repo shape: layer-first
- Artifact: data-pipeline-step
- Stack: typescript-javascript
- Expected direction: merge a transform-only split back into the job when it is just one same-job mapping and not a real stage boundary

## Case 31: Python Library Merge Tiny Aliases

- Local repo shape: mixed
- Artifact: library-module
- Stack: python
- Expected direction: merge labels and alias normalization back into one small shared helper until the surface grows into a real public format-or-CSV seam

## Case 32: Python CLI Keep Partial Visibility

- Local repo shape: mixed
- Artifact: cli-command
- Stack: python
- Expected direction: keep a small command whole under partial visibility, while lowering confidence because only one command file is visible

## Case 33: Python CLI Keep Filename Anchor

- Local repo shape: mixed
- Artifact: cli-command
- Stack: python
- Expected direction: recover the anchor from a file name only, keep the command in one file, and avoid leaking nearby comparison scripts into the returned plan

## Case 34: TypeScript Backend Keep Filename Anchor

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: typescript-javascript
- Expected direction: recover the route anchor from the file name, keep the route whole, and avoid inventing a service split when the nearby batch feature is only comparison context

## Case 35: Python EntryPoint Merge Compatibility Controller

- Local repo shape: layer-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: merge a short compatibility controller back into the documented entrypoint route when both files represent the same HTTP slice and the docs mark entrypoints as the migration target

## Case 36: Python Persistence Keep Documented Target

- Local repo shape: layer-first
- Artifact: library-module
- Stack: python
- Expected direction: keep one persistence adapter file in the documented `infrastructure/persistence` location while treating the older infrastructure root path as a pre-migration compatibility location

## Case 37: Python Interfaces HTTP Relocate On Doc Conflict

- Local repo shape: layer-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: relocate a refund HTTP slice from the older interfaces path into the documented entrypoints/http target when target-area baseline docs conflict with broader README guidance and the local file remains only a compatibility shim

## Case 38: Python HTTP Rollout Note Over Long-Term Target

- Local repo shape: layer-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: keep the current interfaces controller as the active ingress seam when a target-area migration note says downstream cutover is incomplete, while still calling out the long-term entrypoint target in risks

## Case 39: Python HTTP Same-Phase Granularity Merge Wrapper

- Local repo shape: layer-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: merge a thin route wrapper away when same-phase target-area docs agree that the controller is the active ingress seam and the more concrete seam guidance says wrappers should survive only for real framework glue

## Case 40: Python Endpoint Keep Conflicting Siblings

- Local repo shape: feature-first
- Artifact: service-endpoint
- Stack: python
- Expected direction: keep a small endpoint whole when the local slice has no real IO seam, even though nearby sibling examples disagree because one split around real IO and another merged away a thin service hop

## Case 41: React Feature Merge Exact File Anchor

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: preserve an exact file-path anchor while merging a panel-local hook back into the panel and keeping the nearby API-backed feature as comparison context only

## Case 42: React Feature Split Exact File Anchor

- Local repo shape: feature-first
- Artifact: ui-component
- Stack: typescript-javascript
- Expected direction: preserve an exact file-path anchor while splitting a panel away from a real feature-local API boundary and excluding the comparison feature from the returned plan
