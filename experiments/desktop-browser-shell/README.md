# Native Chromium browser capture lab

**Separate desktop research experiment, NOT part of the npm library or a production security guarantee.** It hosts unmodified real SSR/React HTML inside a normal interactive Chromium/Electron `BrowserWindow`, and toggles **native window-level capture exclusion**. There is no HTML-to-video conversion in this experiment.

This path requires an app rather than a stock web browser; it is a tradeoff against Secure Display's original zero-install goal.

## Two independent things to test

1. Does the native browser window remain normal and interactive while captures omit it when the window-level capture flag is **on**?
2. Does a genuine Widevine EME video play through a licensed CDM in this embedded browser? This is a separate property and does **not** establish capture exclusion.

The desktop lab can work without Widevine for the first test. For a controlled Widevine test, [Castlabs Electron for Content Security](https://github.com/castlabs/electron-releases) is an existing Electron fork with a CDM component updater, VMP signing for development, and production-signing arrangements. Do not copy Chrome CDM files, disable media verification, or modify Google's CDM.

## Start on your Mac

At the Secure Display repository root, build and start the normal React example in terminal 1:

```bash
bun install
bun run typecheck
# For DRM video tests, additionally run your existing successful
# SECURE_DISPLAY_PACKAGER=... bun run drm:element:package command.
bun run example:react
```

In terminal 2, run this isolated experiment (it is **not** an npm workspace):

```bash
cd experiments/desktop-browser-shell
npm install --save-dev "https://github.com/castlabs/electron-releases#v44.5.1+wvcus"
npm test
SECURE_DISPLAY_CAPTURE_PROTECTION=off npm start
```

Observe the same React SSR/interactive page. Then quit the app and start the **on** version:

```bash
SECURE_DISPLAY_CAPTURE_PROTECTION=on npm start
```

If you are using Vite's local mkcert HTTPS, the system must trust that certificate. You can point the lab at another HTTPS site explicitly:

```bash
SECURE_DISPLAY_LAB_URL=https://example.org/ SECURE_DISPLAY_CAPTURE_PROTECTION=on npm start
```

Never use personal, student, customer, or secret data in this capture research. Unlike the standalone `bun add @caleb-media-studio-llc/secure-display` package, the desktop shell requires an installed runtime and may download proprietary Widevine components on first launch.

## What is actually protected?

- **Windows 10 (2004+) and Windows 11**: Electron `win.setContentProtection(true)` uses `SetWindowDisplayAffinity(WDA_EXCLUDEFROMCAPTURE)`; supported desktop capture APIs should omit the *entire application window*. It requires an app-owned native window. It does not protect unrelated Chrome windows or individual divs.
- **macOS**: Electron calls `NSWindowSharingNone`. Electron explicitly warns that newer apps using `ScreenCaptureKit` can capture despite this setting. **Do not claim screenshot protection from a successful toggle.**
- **CEF**: A CEF host can obtain the window handle with `browser->GetHost()->GetWindowHandle()` (Windows `HWND`, macOS `NSView*`). The OS protection method can be applied to a window owned by the embedding application. This is native code, not an exposed Web or Widevine API.
- **Chromium internal**: Chrome Enterprise uses `GetWidget()->SetAllowScreenshots(false)`. On macOS Chromium itself calls the private CoreGraphics `CGSSetWindowCaptureExcludeShape` via its native widget bridge. That could plausibly support region-based exclusions but is undocumented and may not work consistently with newer capture frameworks.
- **Widevine**: Protected media layers are not the same as native DOM windows. Castlabs ECS can engage the CDM with normal EME, but `setContentProtection` works independently of DRM and does not depend on getting encryption keys.

## Capture test matrix

Test `off` and `on` on the same unchanged HTML for each method:

| Case | Physical display | OS screenshot | OS recording | Screen sharing |
| --- | --- | --- | --- | --- |
| Electron/macOS with `off` | Should remain normal | Baseline expected to capture | Baseline | Baseline |
| Electron/macOS with `on` | Must remain normal | Record actual result | ScreenCaptureKit may still capture | Record actual result |
| Electron/Windows with `on` | Must remain normal | Whole window should be omitted by compatible APIs | Test independently | Test independently |
| Native macOS region harness | Must remain normal | Test left/right halves separately | Record actual result | Record actual result |
| Pure Chrome `--app` | Same as Chrome | No extra API privileges | Baseline | Baseline |

The prior macOS region experiment is at `experiments/macos-capture-region/`. Run from the repository root:

```bash
bash experiments/macos-capture-region/run.sh
```

That harness uses a native `WKWebView` plus the same private CGS exclusion function used in Chromium, to check whether a **part** of a live HTML window can be omitted without rasterizing it as video. It is not a CEF/Widevine implementation.

## Chrome application mode without an embedded browser

For baseline comparisons on macOS:

```bash
open -na "Google Chrome" --args --app="https://localhost:5173/react/"
```

This is Chrome with less browser UI, **not CEF**, and does not grant extensions or websites `SetAllowScreenshots`. Chrome already has its own bundled CDM. You cannot simply import that proprietary CDM or its internal native screenshot methods into arbitrary webpage JavaScript.

## Next research target

If the native macOS region lab works, explore an app-owned **CEF** shell whose native bridge follows the bounding rectangle of the real `<secure-div>`. Preserve React DOM, SSR, hydration and event handlers. A successful API call is **not** proof that common capture paths redact it; require real screenshot, recording and sharing tests before declaring a protected state.

On Windows, native `SetWindowDisplayAffinity` is explicitly **top-level-window scoped**. Per-element protection likely requires different native windows/rendering architecture, or upstream browser compositor changes. A transparent overlay alone won't inherit protections onto HTML behind it.

### Primary source references

- [Chromium native macOS window capture-exclusion implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm)
- [Chromium BrowserView screenshot policy hookup](https://chromium.googlesource.com/chromium/src/+/HEAD/chrome/browser/ui/views/frame/browser_view.cc)
- [Microsoft SetWindowDisplayAffinity](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
- [Electron BrowserWindow.setContentProtection](https://www.electronjs.org/docs/latest/api/browser-window)
- [CEF native window handle](https://chromiumembedded.github.io/cef/general_usage.html)
- [Castlabs ECS and Widevine component updater](https://github.com/castlabs/electron-releases)
- [Chrome Enterprise screenshot prevention licensing and platforms](https://support.google.com/chrome/a/answer/2657289)
- [Secure Display macOS window-region experiment](../macos-capture-region/README.md)

No source credentials, license keys, Widevine binary components, or unverified capture claims are committed to this repo.
