---
description: Use for a deeper security pass when a PR touches auth, secrets, crypto, deserialization, or user-controlled input.
---

Do a focused security review. Check each item against the diff and report
concrete findings with file references.

- **AuthN / AuthZ** — Is every new endpoint or action gated by the right identity
  and permission check? Watch for a missing check on the "obvious" path.
- **Injection** — SQL/NoSQL/command/template injection from user input. Confirm
  parameterization and escaping.
- **Secrets** — No hardcoded keys, tokens, or passwords. Secrets come from an env
  or secret store, and are never logged.
- **Untrusted input** — Validate and bound all external input (size, type,
  range). Reject by default.
- **Crypto** — No home-rolled crypto, no weak hashes for passwords, correct
  randomness source.
- **Dependencies** — New dependencies vetted; lockfile changes reviewed for
  unexpected packages.

See `references/owasp-quickref.md` for the mapped OWASP Top 10 categories.
