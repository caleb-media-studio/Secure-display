> **Internal research workspace, not an npm release.** For consuming applications, install and import `@caleb-media-studio-llc/secure-display` only.

# @caleb-media-studio-llc/core

**Research-only** foundation for browser Encrypted Media Extensions (EME) capability probes, diagnostic policy evaluation and synthetic DRM media playback paths.

This package is a dependency of the experimental `@caleb-media-studio-llc/react` integration. Its functions do **not** prove screenshot exclusion. A browser accepting an EME configuration or obtaining a license is not evidence that screenshots, screen recordings, screen sharing or photography are blocked.

## Scope

- Candidate DRM key-system probing and capability reporting.
- Conservative display policy helpers for synthetic media tests.
- Experimental CENC/EME and FairPlay interfaces using externally supplied authorized adapters.

This is **not** a turnkey license server, key vault, confidential-data renderer or production security boundary.

See the monorepo [README](../../README.md), [research](../../docs/RESEARCH.md), [threat model](../../docs/THREAT_MODEL.md) and [publishing gate](../../docs/PUBLISHING.md). The package intentionally remains `private: true` until approval.
