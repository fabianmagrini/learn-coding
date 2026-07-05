---
description: Use when reviewing or triaging a pull request diff — the standard review rubric.
---

Walk the diff against this rubric and report only the items that apply. For each
finding give the file, a one-line explanation, and a concrete suggested fix.

- **Tests** — Does new logic ship with tests? Are edge cases and error paths
  covered? Flag `needs-tests` when non-trivial code arrives without them.
- **Breaking changes** — Public API/signature changes, renamed or removed
  exports, changed response shapes, DB migrations. Call these out explicitly.
- **Error handling** — Unhandled promise rejections, swallowed errors, missing
  input validation, unbounded loops or fetches.
- **Security** — Injection surfaces, secrets in code, missing authorization
  checks, unsafe deserialization. When any appear, load the `security-review`
  skill and do a deeper pass.
- **Performance** — N+1 queries, work inside hot loops, large synchronous
  operations, missing pagination.
- **Clarity** — Dead code, leftover TODOs, misleading names, oversized functions
  that should be split.
