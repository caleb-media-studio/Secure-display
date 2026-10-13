# Full-page DRM experiment: page pixels vs transparent DOM overlay

This is a stand-alone **synthetic test** built to determine whether overlaying a nearly transparent DRM video on normal DOM elements can make underlying text disappear from screenshots. It also demonstrates the alternative: an entire protected page frame as DRM video, with interactive pointer hotspots.

## Exact sample sentence

> This page is protected by Security Display GitHub repo, and this is a test.

This sentence is embedded only in this experimental synthetic fixture; it is deliberately public. Do not substitute confidential documents.

## Prepare and run

The existing `packager` binary, FFmpeg and Bun are required. On the Mac where Secure Display already packages the synthetic document:

```bash
git pull origin feat/initial-research-framework
bun install
bun run drm:page:package
bun run example:page
```

Use the local or HTTPS LAN URL printed by Vite. For other devices on your LAN, the browser must trust a valid HTTPS development certificate (`bun run network:cert` with `mkcert`; see [NETWORK_TESTING.md](NETWORK_TESTING.md)). The test-only Axinom published key and test entitlement are used at runtime, exactly as with `drm:demo:package`.

The script generates an ignored clear local intermediate (`fixtures/generated/protected-page-clear.mp4`) and DRM CBCS output under `examples/protected-page/public/drm-page/`, with HLS/FairPlay and DASH/Widevine streams and **zero clear lead**.

## Three comparison modes

1. **Full protected page:** all visible sentence and page design pixels come from licensed encrypted video, rather than HTML text. The user can click the video-rendered sample button through a transparent, positioned HTML hotspot; its label is intentionally not the protected text.
2. **DOM + DRM overlay:** the same public sentence is actual HTML. Licensed video is drawn above it at **CSS opacity = 0.015** to simulate a near-transparent overlay. This is **not actual alpha-channel protected video** and **must not** be presumed to protect the HTML underneath. Take a screenshot to find out whether ordinary DOM stays visible.
3. **Unprotected DOM control:** ordinary HTML without visible DRM video, so the expected control is that text appears in screenshots.

The app starts in fail-closed full protected mode. It hides the full-page video until a Shaka DRM session is confirmed and a real `playing` event is received. There is **no fallback** that exposes the test sentence as ordinary DOM in full protected mode.

## Observe and report

With Safari/FairPlay and Chrome/Widevine separately:
- Confirm the **video-rendered page is visible to your eyes** before interpreting a black screenshot as capture blocking.
- Test screenshot, screen recording and screen sharing in all three modes.
- Use the click hotspot to verify interaction remains possible in protected mode.
- Compare whether text remains visible in captured media for the overlay mode.
- Record exact browser/device and application used. There is no universal outcome guaranteed for all CDMs or capture APIs.

The overlay mode explicitly demonstrates why protecting *one layer* usually does not grant a protection policy to independently composited ordinary DOM underneath. Full-page protected media can block captures only for protected pixels; outer controls/status (ordinary DOM) are capturable.

**Not an arbitrary React/HTML page protector.** Full-page rasterization is done separately, and the video must be re-encoded and re-licensed when visible page content changes. The prototype preserves a single click interaction but does not provide true DOM selection, layout, forms, accessibility or dynamic reflow.

### Security

This demo uses public test-only content keys, which offer **no confidentiality**. It is not an authenticated application or production-grade DRM license service. Do not run it on untrusted networks or supply real reports/data. Do not commit any key files or real certificates. The browser CDM behavior must be tested in each supported browser and environment.

## Startup repair (October 13)

The earlier example did not start DRM automatically and hid the video while waiting for playback, making the default full-page region black. The updated example:

- Initiates Axinom public-test FairPlay/Widevine playback on load. The **Start / Retry DRM** button remains available.
- Validates that the local DASH/HLS media manifest is actually present. A Vite HTML fallback does not count as an encrypted manifest.
- Shows the current loading stage and any recoverable error directly above the video. The detailed diagnostics are expanded by default.
- Keeps the encrypted video element mounted while it initializes behind an opaque black guard, revealing its pixels only after the chosen DRM key system is verified and playback is observed.
- Continues to fail closed; it never substitutes capturable DOM text into the full protected page.

If the page reports that the encrypted media manifest is missing, regenerate the separate full-page test fixture:

```sh
bun run drm:page:package
bun run example:page
```

Your already working `bun run drm:demo:package` prepares the **different document example**, not this full-page test. Use trusted HTTPS over LAN.

## Near-invisible full-viewport DRM overlay experiment

**Hypothesis under test, not a claimed protection method.** The example now starts in `DOM + DRM overlay` mode and draws a real licensed, encrypted Axinom public-test video as a CSS `position: fixed` layer above the entire browser viewport. Its opacity is **0.0000001%**, i.e. decimal CSS `opacity: 0.000000001`. Do not confuse this value with `0.0000001` CSS opacity, which would be 100 times more opaque.

The underlying sample text, button and page remain **ordinary interactive DOM**. The video uses `pointer-events: none`, so the normal DOM button remains clickable. It reuses the existing FairPlay/Widevine public-test package and makes no attempt to decrypt the video in JavaScript. There is no replacement for the DOM or custom clickable proxy in this mode.

**Testing:** First confirm the page reports a verified DRM session and advances the video timestamp/decoded-frame counter (when available). The diagnostics report computed CSS opacity and pointer-event behavior. Then take an operating-system screenshot, record a screen, or screen share. Compare the captured ordinary DOM content against the physical display. Use `Unprotected DOM control` (no overlay) and `Full protected page` (opaque licensed media) as controls. The outcome for near-invisible overlay mode **has not yet been verified** on hardware. Browsers may handle extremely small alpha values or protected video compositor layers differently, so record exact browser and capture method.

If the browser computes the opacity as `0` or stops sending decoded frames, report it rather than interpreting the result as DRM capture blocking. This experiment does not test whether it protects confidential data, and no result should be assumed without a capture comparison.

## Live opacity threshold experiment

The original test at **0.0000001%** still showed ordinary DOM text in the supplied screenshot, even though the diagnostic reported verified Widevine playback and advancing decoded frames. This is a concrete observation for that specific browser and capture, not a general conclusion about all opacity settings.

A new **Live DRM opacity** slider changes the same encrypted video's CSS opacity without destroying/recreating the Shaka player or restarting its DRM license session. It does **not** rasterize or otherwise modify the DOM underneath. The choices are intentionally discrete, reproducible values: 0%, 0.0000001%, 0.000001%, 0.00001%, 0.0001%, 0.001%, 0.01%, 0.1%, 0.4%, 1%, 5%, 10%, 25%, 50%, and 100%. The UI displays both the percentage and decimal CSS opacity; for example, **0.0000001% = CSS opacity 0.000000001**.

### How to test

1. Start `bun run example:page` using an already generated `bun run drm:page:package` encrypted synthetic fixture. The default is the full-viewport overlay at 0.0000001% over the clickable HTML.
2. Confirm the on-screen diagnostic reports DRM verified, a running media timeline, decoded frames (if provided by the browser), pointer-events none, and full viewport coverage.
3. Move the slider to an opacity preset. The actual underlying HTML must remain interactive and the license session must not be recreated.
4. Take an OS screenshot or short recording at that setting. Note whether the **DOM text itself** remains visible, whether the protected video is omitted, and whether the physical screen is still readable.
5. Repeat at selected opacities, especially **0%**, **0.0000001%**, **0.01%**, **0.1%**, **0.4%**, **1%**, **10%** and **100%**. Compare with the unprotected DOM control, which has no active video overlay.

At higher opacity, a DRM video might obscure the DOM to the physical viewer as well as in a captured image. That is **not** the sought result: the goal is to preserve readable, interactive DOM on the screen while it is absent from screenshots. Treat each opacity as an experiment; don't infer compositor behavior solely from playback diagnostics. Browser implementations may quantize alpha or drop an effectively invisible layer.

The selected index is encoded in the demo URL `?mode=overlay&opacity=<index>` so it can be revisited and reproduced.
