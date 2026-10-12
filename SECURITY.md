# Security policy

Secure Display is a research-stage project, **not production-ready**. Do not use it to protect real sensitive reports or student records. A successful Encrypted Media Extensions (EME) probe cannot certify that screen capture is blocked.

## Report a vulnerability

Do not create a public issue for a vulnerability or include user data, private keys, or DRM license material. Use GitHub's **Report a vulnerability** private advisory feature if enabled, or contact maintainers through an established private channel.

## Secrets and fixtures

No production DRM credentials, license challenge responses, signing keys, or private data may be committed, even in a private development repository. Use sanitized, synthetic fixtures. License proxies must keep provider credentials server-side. Removing a secret from git later is not a substitute for rotating it.

## Scope

Unintended plaintext disclosure, bypassing a block policy, secret leakage and unsanitized errors are vulnerabilities. Screenshot exclusion is an **unsolved and unverified product requirement**, not a current feature.
