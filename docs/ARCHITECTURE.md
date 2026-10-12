# Secure Display Architecture

**Objective:** non-installable HTML tags that display server-encoded **DRM-protected media representing text**, ideally through a hardware-secure CDM path. No ordinary canvas-rendered plaintext.

## Trust model

```text
authorized backend obtains text
 -> text laid out as glyphs on SERVER
 -> video encoder -> provider DRM packager
 -> encrypted media CDN
 -> <secure-text asset-id="opaque-id">
 -> Encrypted Media Extensions / browser Content Decryption Module
 -> licensed hardware-robustness decode/output, if supported
 -> device compositor/display
```

The encoding step is normally server-side; the device performs **decoding**. No JavaScript or WebGPU shader receives plaintext report text.

`@secure-display/elements` exposes `secure-text`, `secure-p`, `secure-h1`, routing CENC assets to the EME player and FairPlay HLS assets to an injected Shaka-compatible player. Its resolver accepts only opaque IDs; **never supply plaintext as a child or attribute**.

**Current prototype only allows synthetic DRM tests.** It is not a production confidentiality mechanism. An accepted EME request, a usable license, or HDCP capability is not proof that a screenshot, screen sharing software, virtual display, or another camera cannot capture content.

## Supported adapters

- PlayReady SL3000 candidate: encrypted CENC MP4 via EME on compatible Edge/Windows hardware.
- Widevine `HW_SECURE_ALL` candidate: CENC experiment on browsers/OSes supporting this robustness; software Widevine is explicitly rejected.
- FairPlay: experimental modern EME/HLS adapter supports an injected Shaka-compatible player, authorized server-side license-proxy URL, and certificate URL. It rejects clear-media fallback through a DRM session check, but is not yet licensed-playback-verified.

None have been verified for universal screenshot exclusion.

## Not an ordinary text engine

Text metrics, glyph reflow, fonts, accessibility, text selection, copy and editable cursor behavior are **not native DOM text** when presented through encoded media. Recreate interactions only as non-plaintext overlays if needed, with careful risk review. Re-encoding content on every resize may be costly. Existing readable HTML must never be replaced after it has already rendered: the secret is already exposed.

## Layout

The library controls element sizing and a native <video> surface; CSS controls the outer box. The server controls the text's appearance and pixel dimensions.

## Future milestones

1. Genuine, licensed synthetic DRM media for a single known hardware/browser pairing.
2. Validate screenshot, screen share, output policy and reconfiguration behavior on real devices.
3. Validate experimental HLS/FairPlay pathway on real Safari and document compatibility fallback (block).
4. External security review and independent repeatable capture benchmark.
5. Only then consider sensitive field support and public npm release.
