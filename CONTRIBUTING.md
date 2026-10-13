# Contributing

This is a **library-first** open-source research project maintained privately until release review. Do not include confidential records, credentials, DRM license responses or personally identifying data in patches or tests.

Build with `npm install && npm run typecheck && npm test`. For demos use `npm run dev` (diagnostics) or `npm run example:elements`. Bun users may use `bun install && bun run dev` without recursively invoking the root dev script.

Every new DRM adapter must fail closed on unsupported platforms. Content must be encoded and encrypted *before delivery*. Plaintext HTML attributes, child text, React props or JS decryption are prohibited for sensitive content. No CSS screenshot illusions or WebGPU canvas renderer should be described as hardware output protection.

PR descriptions should document provider licensing, OS/browser/CDM tested, output-policy constraints, screenshot/recording results, and regressions. Packages remain marked `private: true` until release review.

## Development default for new components

New protected elements and examples should use the project's existing Axinom public DRM test integration as part of the feature, including actual encrypted FairPlay and Widevine media playback. Do not leave a placeholder that requires private licensing to demonstrate the prototype. Use synthetic test content only, with clear errors if it does not play. The public test vectors are not production credentials or confidentiality protection.
