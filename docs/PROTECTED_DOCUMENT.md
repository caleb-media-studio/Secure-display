# Protected document renderer (experimental)

The core library now includes `@secure-display/document`, a DRM-backed document custom element:

```html
<secure-document asset-id="synthetic-report" zoom="1"></secure-document>
```

This is **not an ordinary canvas**. Each visible page is a licensed `<video>` surface decoded by the browser DRM pipeline. Selection/zoom/UI are HTML overlays that contain **coordinates only, never the words**. The browser sees a selection range such as `{start:5,end:17}`, not the selected text.

## Implemented

- Native custom element, framework agnostic, compatible with React integration.
- Protected media per page, FairPlay HLS and Widevine HLS/DASH through an application-supplied Shaka-compatible player.
- Custom click/drag/Shift+Arrow/Command+A selection, multi-line and cross-page highlight rectangles, Escape clears selection.
- Zoom 50%-200%, scrolling, lazy page loading/unloading (IntersectionObserver).
- Read-only selection: clipboard, cut, native text drag and native text selection disabled.
- Strict schema validation that rejects unknown keys including text, HTML, extra metadata, clear-media URLs and real/confidential classifications.
- DRM key-system verification before allowing synthetic page playback. No clear/plaintext/canvas fallback.
- Unit tests for geometry, hit testing, selection ranges, DRM player startup and fail-closed behavior.

## Prepare a synthetic text test asset

```sh
bun run fixture:document
```

Produces ignored local files:

- `fixtures/generated/synthetic-clear.mp4`: **unencrypted**, synthetic moving video with rasterized sample text.
- `fixtures/generated/document-geometry.json`: character coordinates/indices only.

**These do not work in the protected element until video is genuinely DRM packaged.** Use a legally authorized packager and license provider to encrypt the test video into HLS FairPlay and/or Widevine HLS/DASH, then serve it over HTTPS with matching license and FairPlay certificate endpoints. Public third-party test footage may confirm hardware capture exclusion, but will not visually match the generated glyph geometry.

Create **ignored** `examples/protected-document/public/synthetic-document.json` with only public, synthetic test URLs:

```json
{
  "version": 1,
  "classification": "synthetic-test-only",
  "pages": [{
    "id": "synthetic-page-1",
    "width": 640,
    "height": 360,
    "media": {
      "keySystem": "com.apple.fps",
      "format": "hls",
      "manifestUrl": "https://YOUR_AUTHORIZED_TEST_MEDIA/stream.m3u8",
      "licenseUrl": "https://YOUR_AUTHORIZED_TEST_PROXY/license",
      "certificateUrl": "https://YOUR_AUTHORIZED_TEST_PROXY/certificate"
    },
    "lines": []
  }]
}
```

Populate `lines` with the arrays in `document-geometry.json`. The empty array shown above is only a template; validation rejects it. This JSON is a static synthetic research fixture, **not** a production pattern for authorizing protected data.

Then run:

```sh
bun run example:document
```

The example does not package media or generate licenses. The provider must actually accept the stream's encryption and respond with a valid FairPlay/Widevine license. Supply any required test-license networking behavior through the `preparePlayer` adapter, but **never put production DRM secrets in browser code or the manifest**.

## Limitations and threat model

The user can visually select characters, but **cannot copy their plaintext**. This is intentionally not equivalent to browser-native `Selection.toString()` or an editable document. Blind users cannot access report text from the encrypted video; accessibility needs a policy-aware server-side alternative. Layout changes require regenerating encrypted frames and glyph positions; scaling is not automatic reflow. Large documents have decoder and bandwidth overhead. Text lengths and line positions are observable even without words.

The project's security claim remains narrow: a test-specific DRM video may be blacked out by tested screenshot paths. It **does not** establish resistance to every screenshot, capture application, browser extension, screen share, remote desktop, or physical camera. Ordinary highlight overlays may themselves appear in screenshots, but they contain no printable report text.

**Real private reports remain unsupported/blocked.** No production content should use this before authorized DRM infrastructure, a complete capture test matrix, and security/accessibility review.

## One-command PUBLIC test-only DRM packaging (macOS)

The repository now has an experimental pipeline that packages the rasterized sample text using [Shaka Packager](https://github.com/shaka-project/shaka-packager), `cbcs`, **zero clear lead** and the content key Axinom openly published with its demo test vectors.

First install official Shaka Packager from its [releases](https://github.com/shaka-project/shaka-packager/releases), ensuring `packager --version` works. FFmpeg must also be installed.

```bash
bun install
bun run drm:demo:package
bun run example:document
```

The packaging script generates:
- Ignored `examples/protected-document/public/drm-synthetic/master.m3u8` for Safari FairPlay.
- Ignored `examples/protected-document/public/drm-synthetic/master.mpd` for Chrome Widevine.
- Ignored `synthetic-document-fairplay.json` and `synthetic-document-widevine.json` containing geometry and media descriptors.
- Local, synthetic, rasterized text that is genuinely encrypted by Shaka Packager, **not** an HTML canvas.

The browser retrieves the public Axinom demo entitlement at runtime. The license server is external and can refuse third-party test content, reject localhost, reject mismatched FairPlay signaling, or become unavailable. The test therefore might require adjustment to packaging or a licensed provider.

**Critical security limit:** the key is PUBLIC. Anyone can decrypt this test fixture with ordinary tools. FairPlay/Widevine browser playback may still demonstrate capture exclusion for a specific mechanism, but these test vectors give **zero protection against deliberate content extraction**. Never pass production records, financial data, or other private material to this demo. For private content use your own authorized secret-key/DRM license infrastructure.

Browser test:
1. Open the page in Safari (FairPlay) or Chrome (Widevine).
2. Ensure rasterized synthetic words are visibly playing on the device and the document selection overlays align with them.
3. Select text with the mouse/keyboard. The overlay highlights a position range; clipboard copy intentionally remains disabled.
4. Screenshot and screen-record the document. Test which capture paths omit the protected pixels. Do not generalize beyond tested browser/OS versions.

Shaka Packager docs: https://shaka-project.github.io/shaka-packager/html/tutorials/raw_key.html
Public Axinom test vectors: https://github.com/Axinom/public-test-vectors
