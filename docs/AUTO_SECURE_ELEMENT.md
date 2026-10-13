# Zero-install real HTML element experiment

**Goal:** prove the smallest end-to-end proof of concept for `<secure-div class="...">…</secure-div>` inside an ordinary HTTPS webpage, preserving its actual DOM, CSS classes, event listeners and clickable children while using real FairPlay/Widevine video pixels as its **visual** representation.

**Current implementation is a deliberately limited static research prototype, not a ready-to-publish npm component.** Visitors do not install a browser extension, a native helper, or a custom browser. A developer performs a one-time offline build from a real HTML element using locally installed Chrome, FFmpeg and Shaka Packager; the resulting encrypted media is served by an ordinary website. This is NOT a browser API that marks native HTML pixels capture-protected.

## What this example actually does

1. The developer writes and styles **one source element** in `public/secure-content.html`: a 960×540 ordinary `<div id="snapshot-source" class="secure-card">…` with the exact example sentence and a real button.
2. `bun run drm:element:package` uses headless **Google Chrome on the developer's machine** (Playwright Core) to screenshot **the actual rendered element**. No manually duplicated video text/drawing coordinates.
3. FFmpeg generates a synthetic H.264 clip from those DOM pixels, and the existing Shaka Packager/Axinom public-test-vector path generates separate FairPlay HLS and Widevine DASH manifests. **No clear lead**. No permanent private license service, no viewer installation. Public test keys mean **no content confidentiality**.
4. The example webpage reads the same HTML/CSS source, creates an actual `<secure-div>` with the *same child elements and classes*, and registers normal browser click handlers.
5. To avoid screenshot leaks from the original DOM, the entire actual `secure-div` is **opacity 0** from first paint, but keeps real layout, semantics, pointer events and focus. The presentation video is a separate fixed-position, pointer-transparent `<video>` tracking its original bounds. It is revealed only after verified licensed DRM playback.
6. The ordinary DOM button still receives real pointer clicks, and increments an ordinary counter below the card. Protected pixels remain a **static** build-time screenshot. The runtime has a MutationObserver: changes to the original subtree hide the encrypted video and block rather than show stale protected content.
7. If DRM fails or the source element changes while running, the element stays transparent and shows a visible **blocked** status. It does not fall back to capturable plaintext.

The result tests **real DOM event/layout fidelity** with capture-resistant *video* output. This does **not** claim that the original browser DOM surface gained protected status; its pixels are deliberately hidden.

## Commands

From the repository root on the **developer's Mac**:

```sh
git pull origin feat/initial-research-framework
bun install
SECURE_DISPLAY_PACKAGER="$PWD/.secure-display-local/bin/packager" bun run drm:element:package
bun run example:auto-element
```

This build step needs local **Google Chrome**, FFmpeg, Shaka Packager and network access to publicly documented Axinom test vectors. If Chrome is in an unusual location, set `SECURE_DISPLAY_CHROME_PATH` to its executable. No external secret/credential provisioning is needed for the synthetic test.

Open the Vite URL (localhost, or a trusted HTTPS LAN URL using `bun run network:cert`). Chrome uses Widevine DASH; Safari uses FairPlay HLS.

## Check the result on your Mac

1. **Physically:** you should see a styled, recognizable HTML card with the requested synthetic sentence and button. Click the button; the ordinary `Real DOM button clicks` counter outside the card must increment.
2. **Screenshot:** screenshot the page with macOS screen capture. On a platform that excludes licensed DRM video pixels, the card should be **black/absent** in the captured image while surrounding controls, status and the counter remain visible. The original DOM must not appear as ordinary text in the capture.
3. **Recording / screen share:** repeat separately; do not assume the screenshot result generalizes.
4. **Fail-closed:** remove the generated DRM media and restart. The protected content must not become visible as ordinary DOM; the status should indicate blocked.
5. **Re-render limitation:** changing CSS/text or dynamic DOM means the existing video is stale. Rebuild `drm:element:package`. Mutations in the protected element are intentionally blocked rather than silently displaying stale media. Updates outside it (the click counter) remain live.

## Current limitations

- **Not dynamically reactive.** Each change to the protected pixels needs capture/encoding/packaging. There is no real-time DOM → DRM video conversion or always-synchronized animation support. Layout/interaction fidelity is just an initial feasibility test.
- **Not an arbitrary `<secure-div>` drop-in yet.** The sample uses a build-time DOM template and a fixed 960×540 aspect ratio, rather than capturing arbitrary application state. CSS selectors/layout nesting must be validated for each component and framework.
- **Not cross-platform certified.** Mac Safari/Chrome capture exclusion was observed for previous DRM tests, not yet for this particular generated element. Test Windows, Linux, Android and iOS independently; unsupported paths must remain blocked.
- **Not secured against content extraction.** Original HTML can be read through scripts/DevTools or fetched as part of this synthetic test, and Axinom test keys are public. This does not protect against that attack vector. The specific research target is screenshots/recordings/sharing.
- **No screenshot protection permission was discovered in unmodified stock browsers.** This uses the video compositor path we have already observed excluding encrypted media, instead of falsely claiming access to native browser window capture exclusion.
- **Portal layering:** overlay uses a fixed-position pointer-transparent video with DOM geometry tracking. Nested scrolling, transform stacking, modal overlays, iframe origins and viewport resizing remain experimental.
- **Focus/selection:** native focus and clicks remain functional even when source opacity is zero, but the video cannot display changing caret, text selection highlight or hover states automatically. The previous `<secure-document>` geometry selection prototype remains relevant.

## Key source files

- `public/secure-content.html`: one authoritative HTML/CSS fixture, used for both developer build and real browser DOM.
- `tools/package-dom-element.mjs`: screenshots actual DOM using developer's Chrome, encodes and encrypts the pixels.
- `src/secure-div.js`: preserves the existing light DOM, hiding only its own paint and presenting encrypted pixels outside.
- `src/drm-player.js`: Shaka licensed FairPlay/Widevine playback with the existing Axinom **public test** entitlement.
- `src/main.js`: instantiates `secure-div` from the original fixture and wires a native DOM button click listener.

The purpose is to empirically test **zero-install, DOM-authored, browser-rendered protected media** with the fewest invented prerequisites. It does not solve the native window capture privilege problem and does not establish a universally secure arbitrary-component package.

### Build-step verification

The CI pipeline also runs `node tools/package-dom-element.mjs --snapshot-only`, which launches headless Chrome, captures the genuine fixture element, encodes it into H.264 using FFmpeg and decodes a frame to check for actual nonblank HTML imagery. This does **not** verify Axinom license acquisition or real capture exclusion in the user's OS; run the full `drm:element:package` command locally for those checks.
