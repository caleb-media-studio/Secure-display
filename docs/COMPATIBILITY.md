# Compatibility (research, not certified)

| Browser | Candidate pathway | Capture exclusion |
| --- | --- | --- |
| Edge on compatible Windows | PlayReady SL3000 | **Not verified** |
| Chrome on compatible Android/ChromeOS | Widevine hardware robustness | **Not verified** |
| Chrome on macOS | Ordinary Widevine may be available; `HW_SECURE_ALL` can be rejected | **Not verified** |
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

## Distinguish playback capability from protection

The `widevine-software-baseline` probe is only an EME diagnostic. It cannot unlock protected fields or verify capture exclusion. Rejection of PlayReady in Chrome/macOS is expected, and Chrome does not expose Apple's FairPlay CDM. A rejected FairPlay EME config in Safari may also reflect the wrong adapter, codec, init-data type, or browser API combination. Actual authorized FairPlay HLS playback is a separate milestone.

The user's macOS Chrome test on 2026-10-12 rejected PlayReady SL3000, hardware Widevine `HW_SECURE_ALL`, and FairPlay. This does **not** establish whether ordinary Widevine is installed, nor certify whether protected output is possible on that machine.
