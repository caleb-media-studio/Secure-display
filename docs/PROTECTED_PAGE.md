# Black DRM overlay vs ordinary HTML: empirical capture experiment

This is a stand-alone **synthetic test** of how a licensed, featureless **black DRM video** affects screen capture when composited above completely ordinary interactive HTML. The DRM media has no text, buttons or page graphics. It is not a method established to protect underlying DOM.

## Exact sample sentence

> This page is protected by Security Display GitHub repo, and this is a test.

This public sentence exists **only in the ordinary HTML underneath the DRM video** in the active experiment. The encrypted media source is solid black; it contains no text or controls. Do not substitute confidential documents.

## Prepare and run

The existing `packager` binary, FFmpeg and Bun are required. On the Mac where Secure Display already packages the synthetic document:

```bash
git pull origin feat/initial-research-framework
bun install
bun run drm:page:package
bun run example:page
```

Use the local or HTTPS LAN URL printed by Vite. For other devices on your LAN, the browser must trust a valid HTTPS development certificate (`bun run network:cert` with `mkcert`; see [NETWORK_TESTING.md](NETWORK_TESTING.md)). The test-only Axinom published key and test entitlement are used at runtime, exactly as with `drm:demo:package`.

The script generates a **solid-black-only** clear video intermediate (`fixtures/generated/protected-page-clear.mp4`) and encrypts it to `examples/protected-page/public/drm-page/` with HLS/FairPlay and DASH/Widevine streams and **zero clear lead**. It also writes `drm-page/fixture-info.json` with `kind: "solid-black-v1"` after successful packaging. The page refuses to use an old graphic-bearing fixture without this marker. **Run `bun run drm:page:package` again after pulling these changes.**

## Three comparison modes

1. **Opaque black DRM (control):** A full-opacity encrypted black video with no lettering and no buttons is rendered. The underlying DOM is hidden in this control.
2. **Black DRM overlay (the actual experiment):** The public sentence and button exist only in ordinary HTML. A **solid black DRM video** is fixed over the viewport, with `pointer-events: none` and adjustable opacity from 0% to 100%. Capture results must be measured, not assumed.
3. **Unprotected DOM control:** The normal HTML is visible without an active DRM video overlay.

The app starts in the **black DRM overlay** experiment with the normal DOM visible. It initializes the public test DRM video automatically; the status and fixture marker indicate whether playback is verified. The separate **opaque black DRM** control hides the DOM and uses a black guard until playback is confirmed.

## Observe and report

With Safari/FairPlay and Chrome/Widevine separately:
- Confirm the black DRM video is licensed and playback is advancing, but verify the browser actually composites it; decrypted media cannot be inspected with Canvas.
- Test screenshot, screen recording and screen sharing in all three modes.
- Click the ordinary DOM button in overlay mode; no custom video hotspot is needed.
- Compare whether text remains visible in captured media for the overlay mode.
- Record exact browser/device and application used. There is no universal outcome guaranteed for all CDMs or capture APIs.

The overlay mode measures whether the independently composited ordinary DOM remains capturable beneath the protected black video. Video playback alone is not evidence that the DOM inherited protected status; record the actual result.

**Not an arbitrary React/HTML page protector.** The current video never renders the underlying page. The DOM continues to handle its native text, buttons, layout, selection and input. Whether this overlay changes screenshot behavior remains under empirical investigation.

### Security

This demo uses public test-only content keys, which offer **no confidentiality**. It is not an authenticated application or production-grade DRM license service. Do not run it on untrusted networks or supply real reports/data. Do not commit any key files or real certificates. The browser CDM behavior must be tested in each supported browser and environment.

## Startup repair (October 13)

The earlier graphic-bearing example did not start DRM automatically and hid the video while waiting for playback. The startup fixes remain in place, and this experiment now uses separately generated blank video:

- Initiates Axinom public-test FairPlay/Widevine playback on load. The **Start / Retry DRM** button remains available.
- Validates that the local DASH/HLS media manifest is actually present. A Vite HTML fallback does not count as an encrypted manifest.
- Shows the current loading stage and any recoverable error directly above the video. The detailed diagnostics are expanded by default.
- Keeps the encrypted video element mounted while it initializes behind an opaque black guard, revealing its pixels only after the chosen DRM key system is verified and playback is observed.
- Continues to keep the opaque DRM control black when protected playback is unavailable; overlay mode deliberately displays ordinary DOM because that is the experimental subject.

If the page reports that the encrypted media manifest is missing, regenerate the separate full-page test fixture:

```sh
bun run drm:page:package
bun run example:page
```

Your already working `bun run drm:demo:package` prepares the **different document example**, not this full-page test. Use trusted HTTPS over LAN.

## Near-invisible full-viewport DRM overlay experiment

**Hypothesis under test, not a claimed protection method.** The example now starts in `DOM + DRM overlay` mode and draws a real licensed, encrypted Axinom public-test video as a CSS `position: fixed` layer above the entire browser viewport. Its opacity is **0.0000001%**, i.e. decimal CSS `opacity: 0.000000001`. Do not confuse this value with `0.0000001` CSS opacity, which would be 100 times more opaque.

The underlying sample text, button and page remain **ordinary interactive DOM**. The video uses `pointer-events: none`, so the normal DOM button remains clickable. It reuses the existing FairPlay/Widevine public-test package and makes no attempt to decrypt the video in JavaScript. There is no replacement for the DOM or custom clickable proxy in this mode.

**Testing:** First confirm the page reports a verified DRM session and advances the video timestamp/decoded-frame counter (when available). The diagnostics report computed CSS opacity and pointer-event behavior. Then take an operating-system screenshot, record a screen, or screen share. Compare the captured ordinary DOM content against the physical display. Use `Unprotected DOM control` (no overlay) and `Opaque black DRM` (opaque licensed media) as controls. The outcome for near-invisible overlay mode **has not yet been verified** on hardware. Browsers may handle extremely small alpha values or protected video compositor layers differently, so record exact browser and capture method.

If the browser computes the opacity as `0` or stops sending decoded frames, report it rather than interpreting the result as DRM capture blocking. This experiment does not test whether it protects confidential data, and no result should be assumed without a capture comparison.

## Live opacity threshold experiment

The original *graphic-bearing* test at **0.0000001%** still showed ordinary DOM text in the supplied screenshot, even though the diagnostic reported verified Widevine playback and advancing decoded frames. This is a concrete observation for that specific browser and capture, not a general conclusion about all opacity settings.

A new **Live DRM opacity** slider changes the same encrypted video's CSS opacity without destroying/recreating the Shaka player or restarting its DRM license session. It does **not** rasterize or otherwise modify the DOM underneath. The choices are intentionally discrete, reproducible values: 0%, 0.0000001%, 0.000001%, 0.00001%, 0.0001%, 0.001%, 0.01%, 0.1%, 0.4%, 1%, 5%, 10%, 25%, 50%, and 100%. The UI displays both the percentage and decimal CSS opacity; for example, **0.0000001% = CSS opacity 0.000000001**.

### How to test

1. Start `bun run example:page` using an already generated `bun run drm:page:package` encrypted synthetic fixture. The default is the full-viewport overlay at 0.0000001% over the clickable HTML.
2. Confirm the on-screen diagnostic reports DRM verified, a running media timeline, decoded frames (if provided by the browser), pointer-events none, and full viewport coverage.
3. Move the slider to an opacity preset. The actual underlying HTML must remain interactive and the license session must not be recreated.
4. Take an OS screenshot or short recording at that setting. Note whether the **DOM text itself** remains visible, whether the protected video is omitted, and whether the physical screen is still readable.
5. Repeat at selected opacities, especially **0%**, **0.0000001%**, **0.01%**, **0.1%**, **0.4%**, **1%**, **10%** and **100%**. Compare with the unprotected DOM control, which has no active video overlay.

At higher opacity, a DRM video might obscure the DOM to the physical viewer as well as in a captured image. That is **not** the sought result: the goal is to preserve readable, interactive DOM on the screen while it is absent from screenshots. Treat each opacity as an experiment; don't infer compositor behavior solely from playback diagnostics. Browser implementations may quantize alpha or drop an effectively invisible layer.

The selected index is encoded in the demo URL `?mode=overlay&opacity=<index>` so it can be revisited and reproduced.

## Solid-black media revision

The previous DRM demo video included a synthetic copy of the sentence and button. In the user's 10% opacity capture, its ghosted pixelated lettering overlapped the real DOM, confounding the experiment. The revised `bun run drm:page:package` produces only encrypted **black frames**. The browser preflights `/drm-page/fixture-info.json` and requires `kind: "solid-black-v1"` before loading a license. The `--graphic` argument to the standalone generator remains an optional historical visual diagnostic and must not be packaged for this overlay test.

Rebuild **once** after pulling:

```sh
git pull origin feat/initial-research-framework
SECURE_DISPLAY_PACKAGER="$PWD/.secure-display-local/bin/packager" bun run drm:page:package
bun run example:page
```

If the old giant DRM lettering is still visible after that, stop the test and inspect the newly generated `fixture-info.json`, manifest and Vite cache. The only readable sentence in overlay mode must be the normal HTML text. The black video itself contains no selectable or readable information. The effect on screenshot/recording behavior with a black DRM video is **not yet verified**.
