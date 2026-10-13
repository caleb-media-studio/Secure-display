# macOS capture-exclusion region experiment

**Purpose:** test the *actual native window capture-exclusion function used in Chromium* and determine whether it can exclude a **portion of a live HTML browser view** rather than a full window. The user still sees and interacts with the original HTML. Compare the resulting screenshot or recording with what is physically visible.

**This is a temporary research harness, NOT a production Secure Display architecture.** It runs a small standalone macOS window containing a real `WKWebView`, not stock Chrome or Safari, and it cannot be implemented by a normal browser extension alone. The long-term Secure Display constraint remains **npm/browser first, optional extension at most, no permanent native companion**.

## Start on your Mac

From the repository root:

```sh
git pull origin feat/initial-research-framework
bash experiments/macos-capture-region/run.sh
```

Requires macOS 13 or newer and Xcode Command Line Tools. If `clang` is missing, run `xcode-select --install`. The script compiles the locally installed source with Apple system frameworks into the existing ignored folder `.secure-display-local/bin/` and launches it. It **does not** install an app, helper, extension, privileged service, configuration profile, or browser modification. Quit the test window to end it.

## What it displays

The native window contains a `WKWebView` rendering two side-by-side **real, interactive HTML** sections:

- **Left:** the exact public test sentence, *This page is protected by [Secure Display GitHub repo](https://github.com/caleb-media-studio/Secure-display), and this is a test*, and a real JavaScript-driven clickable button.
- **Right:** an ordinary HTML comparison section with another real clickable button.

There is also a separate **unprotected black window behind** the foreground test window. If macOS completely omits protected foreground pixels during capture, the black backing helps show black rather than an unrelated app/desktop in that hole. That backing is visible only to capture if the foreground truly gets excluded. It isn't an overlay painted over the foreground UI.

Press the native controls at the top:

| Control | Action |
| --- | --- |
| **Protect LEFT** | Exclude a left-half *native window region* from screen capture |
| **Protect RIGHT** | Exclude right-half native window region |
| **Protect ALL** | Exclude the entire native window |
| **Clear** | Remove the exclusion region |

The mask is recalculated on window resize. The status label and Terminal report whether `CGSSetWindowCaptureExcludeShape` returned `kCGErrorSuccess` or an error code. **A successful function return does not imply the screenshot was actually blocked.**

## Actual test protocol

1. With **Clear**, take a normal macOS screenshot (`Shift + Command + 4`) including the whole lab window. Both colored HTML columns and buttons should be present.
2. Click **Protect LEFT**. Confirm **both columns are still readable and clickable on your physical display**.
3. Take another OS screenshot of the same window. Compare the left and right. Does the left become black, transparent, show the window behind, or stay visible? Does the right remain visible?
4. Click **Protect RIGHT** and screenshot again. If the excluded half moves, this is evidence that a **native capture exclusion rectangle** works on this macOS version.
5. Click **Protect ALL** and screenshot again. If the whole foreground window is removed from capture, inspect whether the backing produces black. Click **Clear** to restore normal capture.
6. Repeat with **Shift + Command + 5** screen recording and an ordinary screen-sharing application. Different capture methods can behave differently.

Keep an eye on both JavaScript click counters, and record your macOS version and capture method. The test might exclude only window portions, exclude the whole window, or have no effect at all. The shapes are **window-relative halves**, not a precisely tracked DOM `<div>` rectangle.

### Result matrix

| Native API result | Physical window | Screenshot | Conclusion |
| --- | --- | --- | --- |
| Success | Normal interactive HTML | Left section omitted/black, right visible | Promising native **per-region** protection proof of concept |
| Success | Normal interactive HTML | Whole window omitted, regardless of region | Only whole-window behavior supported/observed |
| Success | Normal interactive HTML | Both columns still captured | API ineffective for that capture path/system |
| Error/missing symbol | Any | Any | API blocked/unavailable; preserve error message |
| Success | Foreground itself black | Black capture | **Fail** — users must see the actual content normally |

The public goal remains: `<secure-div className="...">…</secure-div>` in an **ordinary browser** should keep true DOM layout/events and be blacked out in third-party captures. **Even a successful native demo is NOT an extension solution**, because WebExtensions cannot call this private macOS API, and the demo controls only the window it owns. The next question would be what official browser integration could safely expose per-region capture exclusion without a companion.

## Implementation and sources

This deliberately mirrors the native function signatures used in Chromium's `components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm`:

```objc
CGSConnectionID CGSMainConnectionID(void);
CGRegionRef CGRegionCreateWithRect(CGRect rect);
CGError CGSSetWindowCaptureExcludeShape(
    CGSConnectionID connection, CGSWindowID window, CGRegionRef region);
```

The test uses `dlsym`/`dlopen` at runtime rather than linking private symbols directly, so if symbols disappear in a future macOS release the test reports this explicitly. It creates a region with local coordinates and passes it to the same function Chromium uses. Passing a null region clears exclusion.

- [Chromium implementation](https://chromium.googlesource.com/chromium/src/+/HEAD/components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm)
- [Chromium change introducing that use](https://chromium.googlesource.com/chromium/src/+/994837a8c8401ca28c6979ced8dd64cc97ca9b92%5E%21/)

**Warnings:** `CGSSetWindowCaptureExcludeShape` and `CGRegionCreateWithRect` are undocumented private macOS APIs; unsupported, subject to change, and inappropriate for App Store distribution. Native window backing behavior can vary on macOS releases and recording services. There is no guaranteed capture blocking. The example uses no school data, credentials, DRM keys or network services. There is no installation persistence. It has not been run on the user's Mac yet.
