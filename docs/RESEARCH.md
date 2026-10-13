# Research findings and evidence

This is a concise map of the existing repository investigations, not an independent security certification. See the cited experiment notes for details.

## Problem

Stock websites cannot generally mark arbitrary native HTML pixels as excluded from OS screenshots through a standardized browser API. [Browser source research](CAPTURE_PROTECTION_RESEARCH.md) and [zero-install feasibility](ZERO_INSTALL_BROWSER_CAPTURE_RESEARCH.md).

## Approaches evaluated

| Direction | Result | Source |
| --- | --- | --- |
| CSS layers, opacity, DRM overlays | Cannot be relied upon to prevent capture of ordinary HTML | [Protected-page controls](PROTECTED_PAGE.md) |
| macOS native-window exclusion | User confirmed native-app capture exclusion works; private APIs cannot be invoked from normal webpage JavaScript | [Native experiment](../experiments/macos-capture-region/README.md) |
| DRM HLS/DASH output | Earlier user-reported macOS screenshots omitted protected media physically visible on display | [Validation notes](VALIDATION_MATRIX.md) |
| DOM/JSX to encrypted video | Preserves actual browser DOM interactions while presenting a static licensed snapshot | [Auto element](AUTO_SECURE_ELEMENT.md) |
| Standardized browser subtree redaction | Possible future standards/browser-engine direction, not an available product API | [Capture research](CAPTURE_PROTECTION_RESEARCH.md) |

## Evidence levels

**Observed by user:** Synthetic DRM content physically visible on Mac; Chrome/Widevine and Safari/FairPlay omitted media pixels in tested captures. Screen recording/sharing behaviors were reported, without separately supplied reproducible video evidence for every application. Details such as OS/browser versions and capture methods were not fully recorded.

**Automated:** CI reproduces React DOM rendering and text fingerprint checks, native selection/click handling, H.264 encode/decode and fail-closed behavior. CI cannot certify hardware capture exclusion.

**Not established:** Universal blocking of screenshots, virtual displays, remote-desktop tools, screen-sharing, browser extensions, print paths or camera photography. The latest simplified React demo still needs hardware revalidation.

## Security boundaries

The React children remain inspectable through DOM/DevTools. The public Axinom test key does not keep media confidential. DOM hashes check HTML structure and text, **not** every computed style, font, animation, pseudo-element, layout change or runtime state. Status transitions describe playback, not protection from external capture.

A real production version needs authorized media generation and a production license server, per-user authorization and expiry, repeatable capture testing, explicit device policy, accessibility review and independent security assessment. See [threat model](THREAT_MODEL.md).

## Prioritized research work

1. Validate this specific React build on hardware with recorded screenshots, recordings and screen-share samples and explicit device/browser versions.
2. Define what changing CSS, fonts, responsive layout, focus, hover, scroll and React state must trigger. Block unsupported dynamic updates.
3. Remove public test keys from any production design; secure asset creation, keys, licenses and delivery.
4. Independently test Windows, Android, iOS, Linux and different browser/DRM combinations.
5. Review accessibility, tab/focus behavior, pointer overlay, audio, back/foreground pauses and performance with multiple elements.
6. Obtain external evaluation before marketing or release claims.

Other labs remain preserved under `examples/` and `experiments/`; they are not the primary React API.
