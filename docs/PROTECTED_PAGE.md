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
