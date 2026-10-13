# React demo and integration

Secure Display's only proposed npm package is **`@caleb-media-studio-llc/secure-display`**. The examples in this repository use the single-package bundle. `packages/react`, `packages/secure-div` and `packages/core` are private internal workspaces.

> [!WARNING]
> **Research-only synthetic DRM experiment.** The original JSX is still in the browser DOM, public test keys are not confidential, and screenshot exclusion is not certified. Do not use real user or customer information.

## Run the demo you can actually see

Start from the repository root, on branch `feat/initial-research-framework`.

```bash
git fetch origin
git switch feat/initial-research-framework
git pull --ff-only
bun install
bun run typecheck
SECURE_DISPLAY_PACKAGER="$PWD/.secure-display-local/bin/packager" bun run drm:element:package
bun run example:react
```

If Shaka Packager is elsewhere, replace the executable path in `SECURE_DISPLAY_PACKAGER`. When already available on `PATH`, the variable can be omitted. Packaging requires FFmpeg, developer Google Chrome, Shaka Packager, and access to public Axinom test resources.

Open the printed Vite **Local** URL with a **trailing slash**, `/react/`, usually **http://localhost:5173/react/**. The demo now redirects `/react` to `/react/` so Vite will not accidentally serve the vanilla HTML root page. If HTTPS was configured for LAN testing, use the trusted `https://` URL instead.

The React UI has a protected static synthetic card, a real HTML button, a click counter, and a diagnostic DRM status below the card. `playing` means the adapter returned a licensed player. `blocked` means it did not become displayable; read the reason shown. Neither state proves screen-recording exclusion.

The packaged fixture is fixed to **960 × 540**. For edits to protected JSX/CSS, **re-run `drm:element:package`** before testing the modified markup.

## Minimal React authoring shape

The actual example is [`App.tsx`](../examples/auto-secure-element/react/App.tsx). A component author can keep the normal JSX authoring experience:

```tsx
import {SecureDiv, useSecureDisplayStatus} from "@caleb-media-studio-llc/secure-display";

function Screen() {
  const {status, onSecureStateChange} = useSecureDisplayStatus();
  return <>
    <SecureDiv className="secure-card" onSecureStateChange={onSecureStateChange}>
      <h2>Static prepackaged synthetic content</h2>
      <button onClick={() => console.log("click")}>Continue</button>
    </SecureDiv>
    <output role="status">{status.state} {status.reason ?? ""}</output>
  </>;
}
```

**This snippet is API illustration, not a newly generated encrypted asset for this exact JSX.** It cannot become protected just by importing and wrapping a component.

## Configure the application once

The working synthetic app uses [`react/setup.js`](../examples/auto-secure-element/react/setup.js):

```ts
import {configureSecureDisplay} from "@caleb-media-studio-llc/secure-display";

configureSecureDisplay({
  resolveAsset,     // verifies the prebuilt asset metadata and DOM fingerprint
  playbackAdapter,  // returns a licensed video handle for that prebuilt asset
});
```

The resolver and playback adapter are supplied by the integration. The current lab setup uses public Axinom entitlement data; it must not be copied into a production confidentiality design. The consumer package does not include a private DRM license server.

Load `@caleb-media-studio-llc/secure-display/secure-div.css` **before the first HTML paint** (for example, from an early document stylesheet). The demonstration's `react/index.html` includes an inline guard for this purpose.

## Test checklist

1. Verify the physical display shows the prepackaged static content.
2. Verify the protected card button increments the outside React counter.
3. Check the outside status shows `playing` and the expected DRM identifier. This proves playback state only.
4. Drag-select protected text and use native Copy. The current research build deliberately keeps its DOM extractable.
5. Compare OS screenshots, screen recordings and sharing output to the physical display. Record each browser, OS, device, and capture method.
6. Change protected JSX without regenerating the video. It should block/stale rather than displaying old pixels. Restore/repackage afterward.
7. Resize the card away from 960 × 540. Layout mismatch should block.
8. Test Chrome and Safari independently; do not assume results transfer between Widevine and FairPlay.

See [validation matrix](VALIDATION_MATRIX.md) and [status definitions](STATUS.md). Do not use private documents for the test.

## Common failures

| Symptom | Action |
| --- | --- |
| `Encrypted media not packaged` or HTML returned instead of JSON | The packager did not finish and Vite fell back to its HTML page. Run `drm:element:package`, confirm `public/secure-asset/asset-info.json` exists and then refresh. |
| `page.goto: net::ERR_EMPTY_RESPONSE` during packaging, after `mkcert` setup | Older snapshot code tried HTTP against an auto-HTTPS Vite server. Update the branch: the developer snapshot now explicitly uses loopback HTTP; the visitor-facing app can still use HTTPS. |
| `TS2339: drm/reason` on status | Fixed in the updated `SecureDivObservedState` typing. Pull the latest commit, then run `bun run typecheck`. |
| Blank card | Read `blocked` state and console/network diagnostics, verify DRM licensing |
| `React HTML differs` or SHA mismatch | Repackage the current JSX and CSS |
| Dimensions differ | The synthetic fixture requires 960 × 540 |
| Selected text highlights visible in captures | The selection geometry overlay is normal DOM, not DRM media |
| JavaScript clicks work but no video | React interactions and licensed pixels are separate systems |
| Browser DRM works on localhost but fails on LAN | Use trusted HTTPS; see [network testing](NETWORK_TESTING.md) |
| Packager or Chrome executable missing | Install them or set `SECURE_DISPLAY_PACKAGER` / `SECURE_DISPLAY_CHROME_PATH` |

## Local packaging and distribution checks

```bash
bun run test
bun run build
bun run release:inspect
bun run release:smoke:npm
bun run release:smoke:bun
```

Only `@caleb-media-studio-llc/secure-display` is proposed for publication. It remains private. See [publishing](PUBLISHING.md), [technical research](AUTO_SECURE_ELEMENT.md), [threat model](THREAT_MODEL.md), and [repository README](../README.md).
