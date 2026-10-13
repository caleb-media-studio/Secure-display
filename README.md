# Secure Display

**An experimental React component for presenting static HTML-authored content as DRM-licensed video pixels while keeping native DOM interactions.**

> [!WARNING]
> **Research, not screenshot-proof software.** Do not use real credentials, customer records, student information or other confidential material. The demo uses public DRM test keys, the underlying DOM is inspectable, and cross-platform screenshot exclusion is not certified.

## The React API

```tsx
import {SecureDiv} from "@secure-display/react";

export function Page(){
  return <SecureDiv className="secure-card">
    <h2>Normal React JSX</h2>
    <button onClick={() => alert("Real HTML button")}>Continue</button>
  </SecureDiv>;
}
```

No per-element asset IDs, hashes, DRM setup or React effects are required. A developer configures the licensed asset resolver **once** at application bootstrap. This API currently requires the JSX to match **prepackaged static DRM media**. Wrapping arbitrary live JSX does **not** make it capture-protected.

## Run the synthetic React demo

Prerequisites: **Bun**, developer **Google Chrome**, **FFmpeg**, **Shaka Packager**, and network access to publicly documented Axinom test vectors.

```bash
bun install
bun run typecheck
SECURE_DISPLAY_PACKAGER="/absolute/path/to/packager" bun run drm:element:package
bun run example:auto-element
```

Open the Vite URL with `/react/` appended, commonly `http://localhost:5173/react/`. For local builds without DRM packaging, use `bun run test` and `bun run build`.

See [React guide](docs/REACT.md) for the example and one-time setup, [DRM build experiment](docs/AUTO_SECURE_ELEMENT.md) for details, and [network testing](docs/NETWORK_TESTING.md) for secure LAN testing. Only synthetic content is allowed.

## How it works

```text
BUILD TIME                                    RUNTIME
Actual JSX/CSS -> Headless Chrome snapshot   Real React DOM (opacity 0)
                     |                              |  Native clicks, focus, selection
                     v                              |  DOM fingerprint check
                H.264 encoder                       v
                     |                         Encrypted HLS/DASH
                     v                              |
                DRM packaging ----------------------+
                                                    v
                                           Browser CDM licensed video
                                                    |
                                                    v
                                       Pointer-transparent video portal
```

The app reuses original DOM for interaction, but the visible pixels come from encrypted video. Source/hash/dimension mismatches, DRM errors and DOM mutations block or hide that video, never reveal normal DOM paint. This does **not** prevent text inspection through DevTools, all capture software, screen photography, or selection geometry from appearing in screenshots.

## Current evidence

| Capability | Status |
| --- | --- |
| Minimal React component with actual HTML clicks | Implemented and browser-tested, synthetic fixture |
| Automatic developer snapshot from React JSX and H.264 encode | Implemented and CI tested |
| FairPlay/Widevine media via public test-license vectors | Experimental; **not private encryption** |
| User-observed macOS protected-media capture omission | Reported for earlier fixtures, not independently certified |
| All browsers/devices and new React route capture exclusion | **Not verified** |
| Dynamic arbitrary React JSX, live CSS/React state changes | **Not implemented** |
| Production DRM license authority and confidential data security | **Not implemented** |

See [evidence and research](docs/RESEARCH.md), [validation matrix](docs/VALIDATION_MATRIX.md) and [threat model](docs/THREAT_MODEL.md). A successful `playing` event never certifies screenshot protection.

## Repository navigation

| Location | Responsibility |
| --- | --- |
| `packages/react/` | Primary React API, optional status hook |
| `packages/secure-div/` | Native element, fingerprint validation, selection overlay |
| `examples/auto-secure-element/react/App.tsx` | Smallest real JSX implementation |
| `examples/auto-secure-element/react/setup.js` | App-wide synthetic asset and DRM integration |
| `tools/package-dom-element.mjs` | Build-time JSX render and DRM packaging |
| `packages/core/`, `packages/elements/`, `packages/document/` | Prior EME, HTML-tag and document research |
| `examples/diagnostics/`, `examples/fairplay-capture/`, `examples/protected-document/`, `examples/protected-page/` | Research labs and controls |
| `experiments/macos-capture-region/` | Native capture exclusion research, not a web implementation |
| `docs/` | Evidence, compatibility, threat model, tutorials |

## Documentation

- [React quickstart and troubleshooting](docs/REACT.md)
- [Status and failure behavior](docs/STATUS.md)
- [Research findings and remaining work](docs/RESEARCH.md)
- [npm/Bun publication plan](docs/PUBLISHING.md)
- [Detailed automated element research](docs/AUTO_SECURE_ELEMENT.md)
- [Independent testing matrix](docs/VALIDATION_MATRIX.md)

## Development

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run release:inspect
```

Node/npm also works: `npm install`, `npm run typecheck`, `npm test`, `npm run build`.

**Nothing has been published to npm or Bun.** All packages deliberately remain `private: true`. [Publication requirements](docs/PUBLISHING.md) must be satisfied before releasing a research build.

Apache-2.0. See [LICENSE](LICENSE), [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
