# OWASP Top 10 quick reference

Map findings to these categories when you flag them:

| Category | What to look for in the diff |
| --- | --- |
| A01 Broken Access Control | Missing authz checks, IDOR, path traversal, force-browsing |
| A02 Cryptographic Failures | Weak/absent encryption, bad hashing, secrets in transit or at rest |
| A03 Injection | SQL/NoSQL/command/LDAP/template injection from untrusted input |
| A04 Insecure Design | Missing rate limits, no threat modeling around new flows |
| A05 Security Misconfiguration | Debug on, permissive CORS, default creds, verbose errors |
| A06 Vulnerable Components | New/updated deps with known CVEs; unpinned versions |
| A07 Auth Failures | Weak session handling, missing MFA hooks, credential stuffing surface |
| A08 Data Integrity Failures | Unsigned updates, unsafe deserialization, CI/CD supply chain |
| A09 Logging Failures | Sensitive data logged, or security events not logged at all |
| A10 SSRF | Server-side requests to user-controlled URLs without allow-listing |
