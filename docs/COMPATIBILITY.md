# Compatibility (research, not certified)

| Browser | Candidate pathway | Capture exclusion |
| --- | --- | --- |
| Edge on compatible Windows | PlayReady SL3000 | **Not verified** |
| Chrome on compatible Android/ChromeOS | Widevine hardware robustness | **Not verified** |
| Chrome on Windows | Chromium typically rejects hardware Widevine robustness | **Not verified** |
| Safari on Apple platforms | FairPlay | **Not verified** |
| Chrome on iOS | WebKit DRM support varies | **Not verified** |
| DuckDuckGo | Depends on underlying browser engine/platform | **Not verified** |

A successful `requestMediaKeySystemAccess` call does not prove actual license playback, protected output, or screenshot blocking.

Sources:
- https://www.w3.org/TR/encrypted-media/
- https://learn.microsoft.com/en-us/playready/overview/key-system-strings
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/cdm/renderer/widevine_key_system_info.cc
- https://developer.apple.com/streaming/fps/
