# Secure Display

Experimental, library-first, Apache-2.0-licensed research into **hardware DRM-backed rendering of server-encoded text** in ordinary browsers.

> [!WARNING]
> Screenshot prevention is **NOT demonstrated**. This alpha must not display confidential data. EME/DRM support does not prove that every screenshot or screen share will omit output. Strict confidential display remains blocked.

## Architecture

```text
   trusted service: report text -> glyph layout -> video encode -> DRM packaging
                         |                            |
                         |                encrypted CENC/HLS media
                         |                            |
  <secure-text asset-id="opaque-key">  ->  browser CDM  ->  protected decoder/output
       <secure-p> / <secure-h1>              (hardware when supported)
```

Unlike GPU-canvas experiments, this approach targets **actual browser DRM**, where decryption and protected output can be delegated to the CDM/OS/hardware. Encoding normally happens on the trusted server; the browser performs licensed decoding. No text is passed in HTML children, React props, or DOM attributes.

A CDM or robustness probe is not evidence that a screenshot is blocked. Supported DRM differs across Chrome, Safari, and Edge. FairPlay needs a provider-specific adapter and is not part of the initial CENC experiment.

## Repository

- `packages/core`: EME capabilities, strict disclosure policy, experimental synthetic CENC playback.
- `packages/elements`: **`<secure-text>`, `<secure-p>`, `<secure-h1>`** custom elements routed through that DRM media pipeline.
- `packages/react`: React security-status component (full element wrappers planned).
- `examples/diagnostics`: optional browser capability lab.
- `examples/web-components`: plain HTML example, intentionally blocked until a licensed synthetic DRM source exists.
- `docs`: architecture, threat model, compatibility and validation plans.

The repository root is a **library workspace**, not a deployed web application.

## Usage (synthetic DRM research only)

```html
<secure-h1 asset-id="fake-heading"></secure-h1>
<secure-p asset-id="fake-report-paragraph"></secure-p>
<secure-text asset-id="fake-total"></secure-text>
```

Register the tags once using `registerSecureElements({resolveAsset, requestLicense})`. The asset resolver must return **only a synthetic encrypted-media descriptor**; license requests are processed by an authorized **server-side DRM license proxy**. See `examples/web-components`.

Plaintext children like `<secure-text>real secret</secure-text>` are **forbidden**: HTML parsing would already expose that secret. The library is fail-closed and refuses to display inline content.

## Develop

```bash
npm install
npm run typecheck
npm test
npm run dev              # diagnostics example
npm run example:elements # custom-element example
```

Alternatively use Bun (all root scripts invoke tools directly, avoiding Bun workspace-script recursion):

```bash
bun install
bun run typecheck
bun run test
bun run example:elements
```

Use `Ctrl+C` to stop an earlier runaway process before updating. Pull the latest feature branch, then rerun the commands.

## Roadmap

Actual DRM-protected synthetic media packaging + authorized license integration; FairPlay adapter; hardware/OS capture testing; accessibility, size/layout, security review. Publishing to npm is disabled until validated.

See `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, and `SECURITY.md`.

Apache-2.0. See `LICENSE`.
