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
