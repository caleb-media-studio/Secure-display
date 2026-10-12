# Secure Display: observed DRM capture validation

## Status and evidence

**October 12, 2026 — User-observed test, not independently reproduced.**

The user tested Secure Display's **own synthetic rasterized text document**, packaged as DRM media using the local Shaka Packager/Axinom public-test-vector workflow. The user reported that the protected text was visible on the physical screen, that interactive selection/highlighting worked, and that screenshot output omitted the protected text region. The submitted screenshot shows the application chrome, zoom control, `Caret 6` position and a black protected media rectangle. This is **observational evidence for that capture path**, not cryptographic output attestation or a guarantee across capture mechanisms.

| Test | Platform | Displayed to user | Interaction | Screenshot result | Evidence |
| --- | --- | --- | --- | --- | --- |
| Protected synthetic text, Widevine DASH | Chrome on macOS | User confirmed | User confirmed highlight/selection | Protected text area omitted | User report and screenshot, October 12, 2026 |
| Protected synthetic text, FairPlay HLS | Safari on macOS | User confirmed | User confirmed highlight/selection | Protected text area omitted | User report, October 12, 2026 |

Specific macOS release, exact browser versions, screenshot API, and hardware/CDM robustness tier **were not recorded**. No independent reproduction, capture-tool instrumentation, or screen recording/sharing result was supplied.

## What this demonstrates

The browser's DRM video output path can omit synthetic text pixels from a screenshot on the tested macOS/browser configurations, while the surrounding UI remains visible. It supports the feasibility of a DRM-backed, selectable-looking document using geometry-only overlays.

**It does not establish** that all screenshots, macOS screen recordings, `getDisplayMedia`, Zoom/Teams/Meet sharing, remote desktop, virtual displays, accessibility pipelines, printing, browser extension APIs, or external photography omit the content. Selection highlights are ordinary UI layers and can remain visible in screenshots. The public test content encryption keys are known and cannot protect confidential data from extraction.

## Next test matrix

- Repeat with macOS `Command + Shift + 4`, `Command + Shift + 5`, browser tab/window/full screen share, Zoom/Meet/Teams and ScreenCaptureKit-based recording.
- Test while video is playing, paused, backgrounded, scrolled offscreen, zoomed, and after external display/HDCP changes.
- Record browser and OS versions, hardware details, chosen DRM key system, license state, and actual media advancing.
- Confirm selection highlights line up with the video when zooming, scrolling, selecting across lines/pages, and when a page unloads/reloads.
- Re-test after browser or OS updates, and on Windows Edge, Android Chrome and iOS Safari if supported.
- Add a licensed production-key backend, per-user authorization, revocation, no content leakage via logging/devtools, and external security review **before** any confidential reports are considered.

The implementation remains research-only, with `classification:"synthetic-test-only"` enforced by the document schema.
