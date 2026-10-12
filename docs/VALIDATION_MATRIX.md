# Secure Display: observed DRM capture validation

## Status and evidence

**October 12, 2026 — User-observed macOS tests; not independently reproduced.**

The user tested Secure Display's **own synthetic rasterized text document**, packaged as encrypted DRM media using local Shaka Packager and Axinom public test vectors. The user confirmed that protected text was visible on the physical display and interactive text selection/highlighting worked in **Chrome/Widevine** and **Safari/FairPlay**. The user additionally explicitly confirmed that the protected content was omitted from **screenshots, screen recordings, and screen sharing in both browsers**.

The supplied screenshot visually shows surrounding application chrome, zoom controls and `Caret 6` while the media rectangle is black. There are no uploaded screen-recording samples or screen-share captures: those two results are specifically **user-reported**, not independently inspected here.

| Browser / DRM | Synthetic text visible on physical display | Selection / highlight | Screenshot exclusion | Screen recording exclusion | Screen sharing exclusion |
| --- | --- | --- | --- | --- | --- |
| Chrome / Widevine DASH on macOS | User confirmed | User confirmed | User confirmed; screenshot supplied | User confirmed | User confirmed |
| Safari / FairPlay HLS on macOS | User confirmed | User confirmed | User confirmed | User confirmed | User confirmed |

**Unrecorded details:** exact macOS and browser versions, GPU/CDM robustness tier, screenshot API, recording application, sharing application, selected tab/window/display source, external monitor/HDCP configuration, and repeatability after OS updates.

## What this demonstrates

The reported tests provide a **successful proof of concept for DRM-backed synthetic selectable-looking text and capture omission** across the three capture categories tested on this user's Mac. The DRM media path shows different capture behavior from the surrounding ordinary webpage UI.

This is **not** an OS- or browser-wide guarantee that arbitrary capture engines, virtual machines/displays, remote desktop software, printing, debugger access, browser extensions, accessibility pathways or a camera cannot retrieve content. The selection overlay is ordinary HTML UI and may appear in captures. The DRM test encryption keys are public and provide **no confidentiality against content extraction**.

## Remaining validation and engineering

- Collect test environment details and capture-tool names, and repeat screenshot, screen recording and screen sharing with recorded evidence and exact browser/OS versions.
- Exercise other capture implementations, ScreenCaptureKit, remote desktop, virtual displays and external displays/HDCP transitions.
- Verify pause, background, scrolling, zoom, multiple pages, mouse selection alignment, decoder lifecycle and license changes.
- Re-test after OS/browser updates and on other supported platforms; do not infer Windows/Android/iOS outcomes from this macOS result.
- Build a properly authorized production DRM key/license service with per-user authorization, expiry, revocation, auditability and security review, *before* evaluating confidential reports.
- Provide accessibility strategy and clearly document that native DOM text selection and copying are not supported.

The implementation remains research-only and enforces `classification:"synthetic-test-only"`.
