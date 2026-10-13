# Real React DOM → encrypted media: current research prototype

> **Current implementation guide.** Historical investigation notes were preserved in [the experiment log](history/AUTO_SECURE_ELEMENT_LOG.md). For the shortest integration, start with [React usage](REACT.md) and [the README](../README.md).

## Objective

Let the developer write an ordinary `<SecureDiv>` containing React JSX. Render the same *static* JSX into a DRM-encrypted H.264 video **during a developer build**, then display those licensed pixels through FairPlay/Safari or Widevine/Chrome without installing a visitor-side extension. Preserve real DOM focus/clicks/selection but never paint the original DOM glyphs.

## What was implemented

1. **Native custom element:** `packages/secure-div` defines `secure-div`; the original light-DOM children stay alive but the host is opacity zero from first paint. A separately positioned licensed video portal tracks its rectangle, and a text-free selection overlay mirrors browser `Selection` geometry. The overlay is ordinary, capturable HTML.
2. **React bridge:** `packages/react` exports `SecureDiv` and `configureSecureDisplay`. JSX authors only wrap their static markup; a one-time resolver and DRM adapter supply packaged media. Optional status hook: `useSecureDisplayStatus`.
3. **Developer packaging:** `tools/package-dom-element.mjs` starts temporary Vite/Chrome, renders the **actual React App.tsx**, applies reference CSS and produces a 960×540 static H.264 snapshot. Shaka Packager encrypts HLS/DASH using Axinom public test vectors.
4. **Integrity checks:** build metadata includes a source SHA, DOM structure/text SHA, root class and dimensions. The browser verifies before revealing licensed pixels. Changes to protected DOM or layout block the view, not fall back to plain HTML.
5. **Local demo:** `examples/auto-secure-element/react/App.tsx` is the tiny JSX authoring example. `react/setup.js` is the shared synthetic-only adapter. A second vanilla HTML example remains at the demo root.

## Quick lab workflow

```bash
bun install
bun run typecheck
SECURE_DISPLAY_PACKAGER="/absolute/path/to/packager" bun run drm:element:package
bun run example:auto-element
```

Open Vite at `/react/`. Chrome and FFmpeg are required for generating the synthetic asset. No visitor-side extension or native helper is required. The built asset is generated/ignored and never committed with private credentials.

## What the browser actually does

The original JSX remains real, **inspectable** DOM and can receive native clicks and selection. Its CSS paint is suppressed. Shaka (in the synthetic example) licenses real encrypted media through a CDM; a pointer-transparent video displays a prerecorded frame at the element position. If the browser omits those protected video pixels from an OS capture, the black backing can show through. This is capture behavior of *media*, **not a screenshot-exclusion attribute for DOM**.

## Proof and limitations

- **Observed earlier, by user:** synthetic media physically displayed on macOS and omitted from tested screenshots in Chrome/Widevine and Safari/FairPlay. Screen recording/sharing results were user-reported, not exhaustively independently documented. See [validation matrix](VALIDATION_MATRIX.md).
- **CI:** tests React fingerprint equality, Chrome native selection/clicks, fail-closed hash hydration, and captures/encodes/decodes nonblank H.264 images. CI cannot test OS-level capture exclusion.
- **Not secure against extraction:** the browser has the source DOM; Axinom key/entitlement are public test vectors. Never put confidential documents into this demo.
- **Static only:** new JSX, CSS, fonts, dimensions, hover/focus visuals or dynamic state can diverge from the frame. The DOM fingerprint does not cover all visual styling. Repackage after every supported change.
- **Missing capabilities:** no production license authority, no universal cross-platform capture evidence, no live DOM-to-video updates, no safe print/iframe/complex layout system, and no independent accessibility/security certification.
- **Selection privacy:** blue highlight rectangles and demo selection-length information are ordinary DOM and may appear in captures.

## Next steps

Test the latest React route physically using explicit capture methods; validate hover, focus, scrolling, background playback/visibility and varying displays; make visual/CSS changes cause blocked or regenerated video; design secure licensing and real tenant-scoped asset delivery; independently validate supported platforms and accessibility.

See [research overview](RESEARCH.md), [statuses](STATUS.md), [publishing](PUBLISHING.md), [threat model](THREAT_MODEL.md) and [history](history/AUTO_SECURE_ELEMENT_LOG.md).
