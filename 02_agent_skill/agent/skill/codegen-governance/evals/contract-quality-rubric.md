# Contract Quality Evaluation Rubric

This document defines the evaluation criteria for judging the quality of pre-generation contracts produced by the model.

---

## Scoring Dimensions

Each contract is evaluated on four dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| **Completeness** | 30% | All required fields are filled |
| **Correctness** | 30% | Content is accurate and appropriate |
| **Clarity** | 20% | Content is clear and unambiguous |
| **Actionability** | 20% | Contract enables correct implementation |

---

## Completeness Criteria

### MUST Fields (Fatal if missing)

- [ ] Scope (target, change, blast radius)
- [ ] Selected Scenario Packs with justification
- [ ] Input Contract (accepted shape, invalid handling)
- [ ] Return And Failure Contract (success, failure, empty shapes)

### SHOULD Fields (Warning if missing)

- [ ] Branching And Ordering (priority, unknown value policy)
- [ ] Side Effects And Runtime (state writes, resource lifecycle)
- [ ] Validation Plan (executable vs. unverifiable)

### MAY Fields (Advisory, no penalty)

- [ ] Boundary And Observability (protocol assumptions)
- [ ] Open Risks (known unknowns)
- [ ] Language-specific rules applied

---

## Completeness Scoring

| Score | Description |
|-------|-------------|
| 100 | All MUST fields filled, SHOULD fields mostly filled |
| 80 | All MUST fields filled, some SHOULD fields missing |
| 60 | All MUST fields filled, most SHOULD fields missing |
| 40 | Some MUST fields missing |
| 0 | Most MUST fields missing or contract not produced |

---

## Correctness Criteria

### Scope Correctness

- Target file/module is correctly identified
- Allowed blast radius is reasonable for the task
- Non-goals are explicitly stated
- Change type matches the actual work needed

### Scenario Pack Correctness

- Selected packs match the task's actual risks
- Pack selection is justified with specific reasoning
- Unselected packs are documented with reasons
- No obvious pack omissions for the task type

### Input Contract Correctness

- Accepted inputs cover all valid cases
- Invalid input handling is specified
- Normalization rules are explicit
- Empty value handling is distinguished from error handling

### Return Contract Correctness

- Success shape matches task requirements
- Failure signaling is specified (throw/return error/optional)
- Empty result is distinguished from failure
- Partial success semantics are documented if applicable

### Side Effects Correctness

- All state mutations are documented
- Resource lifecycle is specified
- Concurrency concerns are addressed if applicable
- Cleanup is specified for acquired resources

---

## Correctness Scoring

| Score | Description |
|-------|-------------|
| 100 | All contract content is accurate and appropriate |
| 80 | Minor inaccuracies or omissions |
| 60 | Some incorrect or inappropriate content |
| 40 | Significant inaccuracies affecting implementation |
| 0 | Contract content is fundamentally wrong |

---

## Clarity Criteria

### Language Clarity

- Uses precise technical terms correctly
- Avoids vague language ("probably", "maybe", "should")
- Each statement has a clear, single meaning
- No contradictory statements

### Structure Clarity

- Follows the template structure
- Sections are properly separated
- Lists are parallel in structure
- No unnecessary repetition

### Decision Clarity

- Branch conditions are explicit
- Priority/ordering rules are stated
- Unknown value policies are clear
- Fallback triggers are specific

---

## Clarity Scoring

| Score | Description |
|-------|-------------|
| 100 | Perfectly clear, no ambiguity |
| 80 | Minor clarity issues, overall understandable |
| 60 | Some confusing sections |
| 40 | Significant clarity issues affecting comprehension |
| 0 | Incomprehensible or contradictory |

---

## Actionability Criteria

### Implementation Guidance

- Contract provides enough detail to implement correctly
- No significant gaps between contract and implementation
- Edge cases are specified
- Boundary conditions are clear

### Validation Guidance

- Executable validation steps are specified
- Validation is distinguishable from unverifiable checks
- Test commands are specific and runnable
- Manual checks are specified when automation is not possible

### Risk Awareness

- Unknowns are surfaced, not hidden
- Assumptions are explicit
- Risks are rated or categorized
- Open questions are minimal and specific

---

## Actionability Scoring

| Score | Description |
|-------|-------------|
| 100 | Contract fully enables correct implementation |
| 80 | Contract mostly enables implementation, minor gaps |
| 60 | Some implementation gaps |
| 40 | Significant gaps requiring assumptions |
| 0 | Contract does not enable implementation |

---

## Overall Score Calculation

```
Overall Score = (Completeness × 0.3) + (Correctness × 0.3) + (Clarity × 0.2) + (Actionability × 0.2)
```

---

## Quality Thresholds

| Grade | Score Range | Description |
|-------|-------------|-------------|
| **A** | 90-100 | Excellent contract, ready for implementation |
| **B** | 80-89 | Good contract, minor improvements needed |
| **C** | 70-79 | Acceptable contract, significant improvements needed |
| **D** | 60-69 | Marginal contract, major improvements needed |
| **F** | <60 | Poor contract, cannot proceed |

---

## Contract Quality Evaluation Form

```markdown
## Contract Quality Evaluation

### Contract ID: [ID]
### Task: [Brief description]
### Language: [Language]

### Completeness
- MUST fields filled: [X/Y]
- SHOULD fields filled: [X/Y]
- Score: [0-100]

### Correctness
- Scope correct: [Yes/Partial/No]
- Pack selection correct: [Yes/Partial/No]
- Content accuracy: [0-100]

### Clarity
- Language clarity: [0-100]
- Structure clarity: [0-100]

### Actionability
- Implementation guidance: [0-100]
- Validation guidance: [0-100]

### Overall Score: [0-100]
### Grade: [A/B/C/D/F]

### Comments:
[Free-form comments on contract quality]
```

---

## Common Quality Issues

### Incomplete Contracts

- Missing Scope section
- Pack selection without justification
- Input Contract with only "varies" or "depends"
- No Validation Plan

### Incorrect Contracts

- Selecting packs based on task description, not actual risks
- Claiming all inputs are valid when validation is needed
- Promising validation that cannot be executed
- Documenting side effects that don't exist

### Unclear Contracts

- Using "maybe" or "probably" for critical decisions
- Contradicting statements in different sections
- Vague branch conditions
- Ambiguous error handling

### Unactionable Contracts

- "Validate the input" without specifying how
- "Handle errors appropriately" without specifying what
- "Consider edge cases" without listing them
- "Document any issues" without specifying the mechanism
