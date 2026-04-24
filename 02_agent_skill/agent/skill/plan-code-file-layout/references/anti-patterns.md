# Anti-Patterns

Avoid these patterns unless the repository has a very strong reason for them.

## Thin Wrapper Files

Files that only forward calls, re-export local code, or rename a concept without reducing complexity.

## Premature Shared Utils

Creating `shared`, `common`, or `utils` modules before there is a second real consumer.

## Function-Per-File Splits

Breaking one coherent unit into many tiny files so that readers must chase a long import chain.

## Mixed-Layer Giant Files

Keeping route glue, domain logic, persistence, formatting, and recovery logic in one large file.

## Fake Reuse

Extracting code for hypothetical future reuse rather than current duplication or stable API value.

## Cross-File Ping-Pong

A bug or routine change requires repeated jumps across many local files that add little ownership value.

## Package Sprawl

Especially in Go, creating extra packages before there is a real boundary in ownership, dependencies, or API shape.
