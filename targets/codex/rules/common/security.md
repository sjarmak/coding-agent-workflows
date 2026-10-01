# Security Guidelines

## Mandatory Security Checks

Before ANY commit:
- [ ] No hardcoded secrets (API keys, passwords, tokens)
- [ ] All user inputs validated
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (sanitized HTML)
- [ ] CSRF protection enabled
- [ ] Authentication/authorization verified
- [ ] Rate limiting on all endpoints
- [ ] Error messages don't leak sensitive data

## Secret Management

- NEVER hardcode secrets in source code
- ALWAYS use environment variables or a secret manager
- Validate that required secrets are present at startup
- Rotate any secrets that may have been exposed

## Adopting third-party skills

A skill is executable instructions you hand an agent — treat an unvetted one from a
package, collection, or the web as untrusted input. Before adopting third-party skills
or a shared collection, run them through a review gate. [skillager](https://pypi.org/project/skillager/)
(see [skill-management.md](./skill-management.md)) provides one: a local static scanner
(no agent involved) that flags the common malicious patterns —

- instruction-override / hidden system-prompt attempts,
- secret exfiltration and credential-path references (`.env`, `.ssh/id_rsa`, cloud creds),
- download-and-execute flows (`curl … | bash`) and network callbacks carrying env data,
- shell execution requested by skills that don't declare tool use,
- hidden control characters, hidden markdown/HTML, and encoded payload blobs.

It content-hashes each reviewed skill, so any later change forces a fresh review
rather than silently activating modified instructions. Keep skills approved-but-not-
exposed until a task needs them, and keep the mutating commands user-run.

## Security Response Protocol

If security issue found:
1. STOP immediately
2. Use **security-reviewer** agent
3. Fix CRITICAL issues before continuing
4. Rotate any exposed secrets
5. Review entire codebase for similar issues
