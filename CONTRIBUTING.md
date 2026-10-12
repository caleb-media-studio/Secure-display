# Contributing

This is a **library-first** open-source research project maintained privately until release review. Do not include confidential records, credentials, DRM license responses or personally identifying data in patches or tests.

Build with `npm install && npm run typecheck && npm test`. For demos use `npm run dev` (diagnostics) or `npm run example:elements`. Bun users may use `bun install && bun run dev` without recursively invoking the root dev script.

Every new DRM adapter must fail closed on unsupported platforms. Content must be encoded and encrypted *before delivery*. Plaintext HTML attributes, child text, React props or JS decryption are prohibited for sensitive content. No CSS screenshot illusions or WebGPU canvas renderer should be described as hardware output protection.

PR descriptions should document provider licensing, OS/browser/CDM tested, output-policy constraints, screenshot/recording results, and regressions. Packages remain marked `private: true` until release review.
