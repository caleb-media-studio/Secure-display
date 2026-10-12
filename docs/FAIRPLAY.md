# FairPlay HLS integration (experimental)

## Observed macOS diagnostics, October 12, 2026

The browser EME capability test returned **FairPlay candidate** in Safari and **software Widevine candidate** in Chrome. Hardware Widevine was rejected. These results determine only EME configuration availability, not actual playback or screen-capture exclusion.

## Integration path

Server-side: synthetic strings -> encode frames -> **real FairPlay HLS encryption and packaging** -> authenticated HLS URL. License proxy and certificate endpoints must be provided by an approved DRM service or valid Apple development credentials. Provider-specific SPC/CKC request transformations may be necessary.

Browser-side:
```ts
import { registerSecureElements } from "@secure-display/elements";

// In an application that has separately installed shaka-player:
registerSecureElements({
  resolveAsset: async (assetId, signal) => {
    // Only returns approved, synthetic, DRM-packaged test media descriptor.
    // The endpoint must authenticate and authorize access.
    const response = await fetch("/api/synthetic-drm-assets/" + encodeURIComponent(assetId), { signal });
    if (!response.ok) throw Error("Unable to retrieve DRM media descriptor.");
    return response.json();
  },
  requestLicense: async () => {
    // For CENC adapters only. Real implementation sends challenges to a
    // server-side license proxy; no vendor secrets belong in JS.
    throw Error("CENC DRM test provider not configured.");
  },
  createFairPlayPlayer: async () => {
    const { default: shaka } = await import("shaka-player");
    shaka.polyfill.installAll();
    return new shaka.Player();
  },
});
```
`shaka-player` is an **application-provided optional integration**, not installed into the core package. Its TypeScript interface may require a small adapter based on the Shaka version in use. Use Shaka's networking engine for a provider-specific license challenge/response format. Never expose credentials in URLs or source files.

A synthetic FairPlay HLS descriptor:
```json
{
  "classification": "synthetic-test-only",
  "format": "fairplay-hls",
  "keySystem": "com.apple.fps",
  "encryptedMediaUrl": "https://your-test-media.example/asset.m3u8",
  "certificateUrl": "https://your-test-media.example/drm/certificate",
  "licenseProxyUrl": "https://your-test-media.example/drm/license"
}
```
**These URLs are illustrative and not real endpoints.** The library rejects non-HLS media URLs and refuses to show anything other than synthetic media. It additionally checks that Shaka selected `com.apple.fps` after media loading before showing a test video. This cannot guarantee capture exclusion or independently prove all content frames were encrypted.

## FairPlay entitlement

Apple publishes development SDK resources and sample encrypted streams. Production credentials require approval and Apple says that the team must provide a consumer streaming service. Secure Display's intended arbitrary-report use might not qualify, so a DRM-as-a-service provider and their contractual restrictions must be evaluated before real deployment.

- Apple FairPlay overview: https://developer.apple.com/streaming/fps/
- Shaka FairPlay documentation: https://github.com/shaka-project/shaka-player/blob/main/docs/tutorials/fairplay.md
- Shaka native HLS configuration: https://github.com/shaka-project/shaka-player

## Unverified security property

A successful FairPlay capability probe, or a successful licensed playback, does **not** prove every screenshot, screen recording, screen-sharing application, or external camera will be blocked. Only platform-specific real-device capture testing can show observed behavior.
