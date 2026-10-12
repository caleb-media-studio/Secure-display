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

## Local Apple SDK 27 bridge

Keep the downloaded `FairPlay_Streaming_Server_SDK_27/` folder in the repository working directory, **but not in Git**. The folder and `.secure-display-local/` are ignored; the tracked-file secret guard blocks either from commits.

Run from the Secure Display root:

```bash
bun run fps:sdk:doctor  # only checks local SDK paths, no credentials opened
bun run fps:sdk:paths   # writes a local-only JSON index of SDK paths
bun run fps:sdk:build   # builds the Apple Rust KSM examples in place (needs Cargo)
bun run fps:sdk:test    # runs Apple's Rust SDK tests in place (needs Cargo)
```

The script looks at `FairPlay_Streaming_Server_SDK_27/Development/Key_Server_Module/Rust/Cargo.toml`, Rust `src/bin/server.rs` and `src/bin/local.rs`, the test certificate and provisioning data in `Development/Key_Server_Module/credentials/`, the SDK test vectors, and the Safari HLS sample. It **references**, but never copies or bundles, Apple's files.

For other layouts, set `SECURE_DISPLAY_FPS_SDK_PATH=/absolute/path/to/FairPlay_Streaming_Server_SDK_27`. It can also be relative to the repository root.

`fps:sdk:paths` writes `.secure-display-local/fps-sdk-paths.json` with **filesystem paths only**, never certificate bytes, key contents or test vectors. This file is ignored by Git. Never expose the local SDK folder via Vite's `public/`, an API static file route, or npm packaging. Rust build/test output is produced within the ignored SDK directory.

**Important Apple limitation:** Apple's development credentials are intended for validating the key server with provided test SPC vectors; Apple says they **cannot be used to test actual FairPlay-protected content playback**. This bridge therefore does not magically supply a working Safari license, encrypted HLS stream or screenshot exclusion. For real playback, use an authorized provider or properly issued playback credentials and verify provider eligibility.

- Apple guidance: https://developer.apple.com/library/archive/technotes/tn2454/
