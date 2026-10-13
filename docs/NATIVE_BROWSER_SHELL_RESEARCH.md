# Native-browser capture exclusion path: Chrome app mode, CEF and Electron

**Research date:** October 13, 2026  
**Status:** Exploration only. The current npm release remains a synthetic HTML-to-encrypted-video proof of concept, not guaranteed capture-protected HTML.

## Problem to solve

Preserve one genuine SSR/hydrated React DOM tree with ordinary HTML/CSS, focus, selection, scrolling, button actions, accessibility, and layout, but have OS screenshots, recordings and sharing omit selected regions. Ideally users install no app; a native Chromium/CEF browser shell is now considered an alternative research path rather than an already-working deployment.

## Findings

1. Chrome `--app=URL` gives an application-style window **inside Chrome**, still owned by Chrome. The website does not gain the internal screenshot APIs. No native host access or per-element screenshot privileges.
2. CEF creates an **application-owned** Chromium browser window. Its documented `CefBrowserHost::GetWindowHandle()` gives an HWND on Windows or NSView* on macOS. Native APIs can be called from host C++/Objective-C, not from page JavaScript.
3. Chromium already has internal `GetWidget()->SetAllowScreenshots(false)` as part of enterprise screenshot protection. It is not a published `CefBrowserHost` method or standard Web API. In Chrome Enterprise it is managed and licensed.
4. Windows `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)` can exclude an app-owned **top-level window** (not an arbitrary DOM element), subject to OS and capture-path limitations.
5. macOS Chromium's native widget bridge uses **private** `CGSSetWindowCaptureExcludeShape`, which takes a region within its window. It is worth testing as a per-region candidate but is undocumented, might break, and has not been validated for all ScreenCaptureKit outputs.
6. Electron `setContentProtection(true)` directly covers this app-owned window use case, but on modern macOS its `NSWindowSharingNone` implementation may not block ScreenCaptureKit capture. The existing macOS CGS region harness is a more relevant test for per-element behavior on Mac.
7. A Widevine-enabled embedded Chromium binary is a separate distribution issue. Castlabs' [Electron for Content Security](https://github.com/castlabs/electron-releases) implements the Widevine CDM component updater and supports Verified Media Path workflows. We can test standard EME through it, without changing or copying Google's CDM. A passing EME test or VMP status is **not** evidence of arbitrary HTML screenshot protection.
8. A DRM video layer cannot automatically confer its capture exclusion onto normal HTML painted above, below, or through it. Our previous opacity and blend-mode experiments failed to prove this.

## Best next proof points

**Fastest Mac test:** `bash experiments/macos-capture-region/run.sh`. The code is already in the repo. Record screenshots of left-only, right-only, whole and unprotected states, plus ScreenCaptureKit and recording. This isolates the native region question **without** the complexity of Widevine licensing.

**Fastest Windows test:** An Electron `BrowserWindow` that loads our existing React SSR URL and calls `setContentProtection(true)`. This should exercise `WDA_EXCLUDEFROMCAPTURE` on the entire native window. It does not solve native per-element capture.

**Widevine + browser-shell test:** The new `experiments/desktop-browser-shell/` harness with Castlabs ECS. Run the same React page with protection off/on and independently verify standard EME playback via our synthetic Axinom test fixture.

**Longer-term CEF path:** Add an explicitly app-owned, permission-gated capture exclusion interface to the native CEF host. Resolve browser DOM rectangles across device scale factor, transforms, window movement and scrolling, then translate into native window coordinates. Browser might compose in multiple surfaces; do not assume a browser-view rectangle corresponds directly to a protected compositor surface. Require per-capture-method verification before indicating a protected state.

## Platform reality

| Option | Normal SSR/React | Per-element capture candidate | Standard web, no install? | Widevine needed? |
| --- | --- | --- | --- | --- |
| Chrome `--app` | Yes | No additional access | Chrome installed | Only for DRM tests |
| Electron + `setContentProtection` on Windows | Yes | No, whole window | No, app required | No |
| Electron `setContentProtection` on macOS | Yes | No; ScreenCaptureKit caveat | No, app required | No |
| Native Mac CGS region (experimental/private) | Yes inside owned window | **Candidate**, not verified | No, app required | No |
| Native CEF with app-owned screenshot API | Yes | Platform-dependent; development required | No, app required | Optional |
| Current encrypted-video SDK | DOM exists, but visual output fixed | Video-only capture behavior | Yes, with compatible DRM | Yes |

**Decision:** Test native screenshot exclusion first before spending on DRM key infrastructure. The native window path is more relevant to protecting ordinary SSR HTML; it also avoids the false assumption that Widevine itself exposes screenshot protection to DOM nodes. The current encrypted-video track remains valuable separately.

## Source references

- https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/ui/views/frame/browser_view.cc
- https://chromium.googlesource.com/chromium/src/+/HEAD/components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm
- https://chromiumembedded.github.io/cef/general_usage.html
- https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity
- https://www.electronjs.org/docs/latest/api/browser-window
- https://github.com/castlabs/electron-releases
- https://support.google.com/chrome/a/answer/2657289

No distribution keys, DRM binaries or protected customer data should be committed. This lab remains outside the single npm library.
