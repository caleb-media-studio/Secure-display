# Secure Display

Experimental, library-first, Apache-2.0-licensed research into **hardware DRM-backed rendering of server-encoded text** in ordinary browsers.

> [!WARNING]
> **Experimental result (October 12, 2026):** A macOS user reported that the synthetic DRM-protected document was visible on the display but omitted from screenshots in Safari/FairPlay and Chrome/Widevine. This is an observed test result, **not universal or independently verified protection**. This alpha must not display confidential data. Other capture engines remain untested; strict confidential display remains blocked.

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

A CDM or robustness probe is not evidence that a screenshot is blocked. Supported DRM differs across Chrome, Safari, and Edge. A **synthetic-only FairPlay HLS adapter** is available for experiments, but cannot work without externally provisioned encrypted HLS, a FairPlay certificate and an authorized license-proxy service. It has not been tested end-to-end with licensed media.

## Repository

- `packages/core`: EME capabilities, strict disclosure policy, synthetic CENC and experimental FairPlay HLS adapter.
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

### Browser example result

Run `bun run example:elements`. The three elements intentionally report **DRM test provider is not configured** until an actual licensed synthetic test source is supplied. Click **Check browser DRM candidates** to probe the browser's PlayReady, hardware Widevine and FairPlay EME configurations. A candidate result indicates only that the configuration was accepted; **it does not prove screenshot exclusion**. Chrome's graphics acceleration toggle is separate and does not authorize the DRM license path.

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

Use `Ctrl+C` to stop an earlier runaway process before updating. Pull the latest feature branch, then rerun the commands. Starting either example now builds the dependent TypeScript packages first, so a fresh pull does not leave stale `dist` exports.

## Roadmap

Actual DRM-protected synthetic media packaging + authorized license integration; FairPlay end-to-end playback; hardware/OS capture testing; accessibility, size/layout, security review. Publishing to npm is disabled until validated.

See `docs/ARCHITECTURE.md`, `docs/THREAT_MODEL.md`, and `SECURITY.md`.

Apache-2.0. See `LICENSE`.


## Run a real DRM browser experiment

`bun run example:fairplay` launches the public test-media experiment under `examples/fairplay-capture`. Select FairPlay in Safari or Widevine in Chrome. It uses PBS/Axinom publicly documented encrypted sample media; a public test entitlement is fetched on demand rather than embedded in this repository. The earlier Dolby test manifest returned HTTP 403 and is no longer the default. The example intentionally uses *vendor test footage*, not Secure Display's proprietary text renderer or confidential documents.

See `docs/FAIRPLAY.md`. A user-reported macOS screenshot experiment on October 12, 2026 observed DRM media omitted from the captured image while visible on the display. See `docs/VALIDATION_MATRIX.md`. No universal screenshot or screen-share guarantee is established.

## DRM protected document and selection (experimental)

A reusable `@secure-display/document` library now provides:

```html
<secure-document asset-id="synthetic-report-fairplay" zoom="1"></secure-document>
```

The element renders each visible page as **licensed DRM video**, with coordinate-only selection and highlight overlays, keyboard selection, zoom and lazy page loading. It does not put readable text in HTML or JavaScript. Copying selected plaintext is deliberately disabled.

To generate and run **our own synthetic test document**, not a third-party video:

```bash
bun install
bun run drm:demo:package  # requires FFmpeg + official Shaka Packager binary
bun run example:document
```

The packager script fetches Axinom's **public, test-only** key at runtime, encrypts the synthetic clip with CBCS and zero clear lead, and produces ignored FairPlay HLS/Widevine DASH files and matching glyph positions. Public keys provide no confidentiality and are for capture experiments only. Actual licensed playback from your localhost environment has **not yet been verified**.

Read [docs/PROTECTED_DOCUMENT.md](docs/PROTECTED_DOCUMENT.md) for setup, architecture and limitations. The open-source project must not be advertised as screenshot-proof; OS/browser capture testing is still required.
