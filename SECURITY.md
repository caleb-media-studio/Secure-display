# Security policy

Secure Display is a research-stage project, **not production-ready**. Do not use it to protect real sensitive reports or student records. A successful Encrypted Media Extensions (EME) probe cannot certify that screen capture is blocked.

## Report a vulnerability

Do not create a public issue for a vulnerability or include user data, private keys, or DRM license material. Use GitHub's **Report a vulnerability** private advisory feature if enabled, or contact maintainers through an established private channel.

## Secrets and fixtures

No production DRM credentials, license challenge responses, signing keys, or private data may be committed, even in a private development repository. Use sanitized, synthetic fixtures. License proxies must keep provider credentials server-side. Removing a secret from git later is not a substitute for rotating it.

## Scope

Unintended plaintext disclosure, bypassing a block policy, secret leakage and unsanitized errors are vulnerabilities. Screenshot exclusion is an **unsolved and unverified product requirement**, not a current feature.

## Public DRM test-vector experiment

`bun run drm:demo:package` downloads a published Axinom **public test content key** and uses it to encrypt *synthetic* text video. The key and license entitlement are deliberately public. They cannot protect confidential data from extraction. This helper is solely for investigating whether the browser's genuine DRM output is omitted from screenshots and screen sharing.

Never point the helper at customer records, student data or proprietary reports. Never put a real content key, Apple FairPlay certificate private key, provider account credential or DRM signing secret in browser source, HTML, generated JSON, Git or CI. Do not interpret a DRM license success as universal capture blocking.
