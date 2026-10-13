# @caleb-media-studio-llc/secure-display

**One package for the experimental Secure Display React component, native custom element and DRM capability utilities.**

This is the sole intended registry artifact. It bundles the internal runtime implementation into one ESM entrypoint. **Experimental `0.1.0-alpha.1` has been published**; the implementation remains research-only, and this branch prepares metadata cleanup for the next release. React is a peer dependency.

## Install the experimental release

```bash
bun add @caleb-media-studio-llc/secure-display@experimental
# or npm install @caleb-media-studio-llc/secure-display@experimental
```

## Minimal React usage

```tsx
import {SecureDiv, useSecureDisplayStatus} from "@caleb-media-studio-llc/secure-display";
import "@caleb-media-studio-llc/secure-display/secure-div.css";

export default function Example() {
  const {status, onSecureStateChange} = useSecureDisplayStatus();
  return <>
    <SecureDiv onSecureStateChange={onSecureStateChange}>
      <p>Matches an already-packaged synthetic asset</p>
    </SecureDiv>
    <output>{status.state}</output>
  </>;
}
```

This illustrates the component syntax only. You **must also configure** `configureSecureDisplay({resolveAsset, playbackAdapter})` once at application startup and provide prebuilt DRM media matching the JSX. A bare `SecureDiv` will not generate a protected rendering dynamically. See the [real synthetic React demo](../../examples/auto-secure-element/react/App.tsx) and [one-time setup](../../examples/auto-secure-element/react/setup.js).

Source repository: [caleb-media-studio/Secure-display](https://github.com/caleb-media-studio/Secure-display). The implementation currently lives on the [`feat/initial-research-framework`](https://github.com/caleb-media-studio/Secure-display/tree/feat/initial-research-framework) development branch until the draft PR merges. The npm package contains **zero direct or development dependencies**. React is only a peer dependency.

## Exports

- `SecureDiv`: React wrapper over a real DOM element and licensed video surface
- `configureSecureDisplay`: app-wide asset resolver + DRM playback adapter
- `useSecureDisplayStatus`: optional loading/playing/blocked/stale status hook
- `registerSecureDiv` / `SecureDivElement`: lower-level custom element API
- Browser DRM capability diagnostics
- `./secure-div.css`: first-paint guard; ensure it is loaded before any protected content is painted

## What this does not do

The DOM stays inspectable, copyable, and interactive. This **does not guarantee** exclusion from screenshots or screen sharing, prevent malicious scripts from reading source content, securely store DRM keys, or protect arbitrary reactive JSX. The included example uses public synthetic test media with a fixed 960 × 540 static snapshot. Nothing in this package should be described as production-grade confidential-data protection.

Full [quickstart and architecture](../../README.md), [React guide](../../docs/REACT.md), [release instructions](../../docs/PUBLISHING.md), and [security model](../../docs/THREAT_MODEL.md).

Apache-2.0. Copyright 2026 Caleb Media Studio LLC.
