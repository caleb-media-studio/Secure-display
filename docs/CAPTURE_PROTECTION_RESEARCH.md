# Secure Display — native capture-protection research ledger

**Research date:** October 12–13, 2026  
**Product target:** In an ordinary browser, a developer marks any real DOM subtree (e.g. `<secure-div>`, `<secure-main>`, `<secure-body>` or a framework wrapper) as capture-protected. The user sees and interacts with the **original DOM** with native buttons/forms/scrolling/classes. Uncooperative operating-system screenshots, screen recordings and screen sharing see black/omitted protected pixels. Ideally **zero-cost**, npm-only; an optional browser extension is the highest acceptable deployment dependency. **No native companion app, modified browser distribution, streaming-service account or mandatory Caleb Media service.**

This document distinguishes what is **proved**, what is **source-supported but not tested**, and what remains a hypothesis. Do not claim capture security based on encrypted playback alone.

## Evidence from the user-tested Secure Display experiments

| Path | Observed | Verdict |
| --- | --- | --- |
| Synthetic DRM-rendered text, Safari/FairPlay and Chrome/Widevine | User reported and supplied evidence for capture omission while text was visible on the physical Mac, with geometry-based selection. Also user-reported recording/sharing exclusion. | **Working capture-excluded media pixels on tested configurations**, not arbitrary DOM protection. |
| Nearly transparent encrypted video on top of ordinary DOM | DRM video playing, normal DOM text clearly present in screenshot | Does **not** satisfy goal at measured alpha. |
| Opaque black video with CSS opacity | Real DOM and video darken in screenshot; user physically sees dimming | Does **not** satisfy "normal physical appearance". |
| White encrypted video at 100% opacity with `mix-blend-mode:multiply` | DRM/Eme playing, user screenshot still contains normal text and controls | **Failed on tested Chrome/macOS capture path.** |
| Matching encrypted vs clear colored video side by side | Encrypted video black in screenshot, clear video colorful (physical observation required for complete validation) | Evidence for media-plane capture exclusion; still not a DOM-protection mechanism. |

## Confirmed Chromium engine path — most important finding

1. Chrome Enterprise Data Protection can decide based on visited URL whether screenshots are allowed. In `chrome/browser/enterprise/data_protection/data_protection_navigation_controller.cc`, restrictions reach `BrowserView::ApplyScreenshotSettings(allow)`.
2. `chrome/browser/ui/views/frame/browser_view.cc` implements `ApplyScreenshotSettings` by calling **`GetWidget()->SetAllowScreenshots(allow)`**.
3. **Windows:** `ui/views/widget/desktop_aura/desktop_window_tree_host_win.cc` implements this through `SetWindowDisplayAffinity`, currently using `WDA_MONITOR` to prevent capture for a whole window.
4. **macOS:** `ui/views/cocoa/native_widget_mac_ns_window_host.mm` forwards `SetAllowScreenshots` through a browser/native-window Mojo bridge. `components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm` uses the **undocumented** Core Graphics `CGSSetWindowCaptureExcludeShape` with a window-relative region. This is **native code in Chromium**, not a DOM/CSS/API operation and not a browser-extension capability.
5. Separate DRM video paths mark protected media quads and, on macOS, may use `AVSampleBufferDisplayLayer.preventsCapture = true`. This protects only the video/output layer, not HTML under it.

**Source links:**
- [Chrome ApplyScreenshotSettings](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/views/frame/browser_view.cc)
- [Native Windows display affinity](https://chromium.googlesource.com/chromium/src/+/main/ui/views/widget/desktop_aura/desktop_window_tree_host_win.cc)
- [macOS native window](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/views/cocoa/native_widget_mac_ns_window_host.mm)
- [macOS window exclusion region](https://chromium.googlesource.com/chromium/src/+/HEAD/components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm)
- [macOS protected video display layer](https://chromium.googlesource.com/chromium/src/+/master/ui/accelerated_widget_mac/ca_renderer_layer_tree.mm)

## Free-access investigation

- **Chrome Enterprise Premium screenshot prevention**: it protects normal webpages and is evidence of a real browser capability, but Google's published documentation specifies **managed browsers/users with Premium licenses**. Its settings are for sites/windows, not arbitrary native DOM subtrees. It is **not** a free general extension API. [Google Admin policy](https://support.google.com/chrome/a/answer/2657289) · [DLP rule behavior](https://support.google.com/chrome/a/answer/10104358).
- **Chrome `DisableScreenshots` enterprise policy**: exists, but Google's policy reference specifically notes that on Windows, macOS, and Linux it does **not** block screenshots taken by OS or third-party applications. It does not fulfill this threat model. [Policy description](https://chromeenterprise.google/policies/disable-screenshots/).
- **`DataControlsRules` policy**: Chromium's policy schema contains `SCREENSHOT` restrictions, but marks the setting **`cloud_only: true`**. A free local per-website configuration should **not** be promised without a repeatable demonstration. [Schema](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/policy/resources/templates/policy_definitions/Miscellaneous/DataControlsRules.yaml).
- **Manifest V3 extension**: script injection, DOM changes, CSS, and some DevTools Protocol domains are available. Public extension permissions **do not expose** `SetAllowScreenshots`, `CGSSetWindowCaptureExcludeShape`, `SetWindowDisplayAffinity`, or a "protect this compositor layer" call. The `chrome.debugger` API exposes a restricted protocol; it cannot execute arbitrary native browser code. [Chrome extension API](https://developer.chrome.com/docs/extensions/reference/api) · [Debugger API](https://developer.chrome.com/docs/extensions/reference/api/debugger) · [Chromium security FAQ](https://github.com/chromium/chromium/blob/main/extensions/docs/security_faq.md).
- **W3C Screen Capture / Element Capture**: helps a cooperating app limit an *outgoing stream it owns*. It does not control another application's OS screenshot/recording. [W3C Screen Capture](https://www.w3.org/TR/screen-capture/).
- **Alternating frames / blur / keyboard interception libraries**: potentially reduce quality of individual frames or intercept some browser shortcuts, but they don't establish black output for arbitrary OS and screen sharing capture, and may hinder accessibility/visibility. Do not market as reliable capture blocking.

## Actual candidate paths ranked against product requirements

| Approach | Unchanged real DOM | Browser without modifications | Free to integrate | OS capture exclusion | Current status |
| --- | --- | --- | --- | --- | --- |
| Protected media plane | No: pixels must belong to the media layer | Yes | Public test vectors only | Observed for protected media | Works for text-as-DRM prototype, **not** arbitrary DOM |
| CSS overlays, blend modes | Yes | Yes | Yes | No supporting result | Tested unsuccessfully in our environment |
| Extension/DevTools controls alone | Yes | Yes | Yes | No identified API or reproducible working path | Investigate documented domains, do not claim support |
| Chrome Enterprise DLP | Yes | Stock managed Chrome | **No** (Premium policy) | Google documents screenshot blocking | Demonstrated product feature, violates cost and deployment goals |
| Patch Chromium to expose opt-in capture restriction to extensions | Yes; initial scope likely **whole tab/window**, per-element needs additional rendering support | **No until shipped upstream** | Code can be open source | Browser already has native hooks | **Strongest standards/product-development route**, not currently deployable as an extension alone |
| Native window host or companion | Yes | Requires native component | Possibly | Native capture APIs | Excluded by current user requirements |

## First concrete development hypothesis with a legitimate route to release

**Propose a narrow browser API** that an installed, user-authorized extension can request for its active tab/URL, eventually per DOM subtree:

```ts
// DESIGN PROPOSAL ONLY: this API does not currently exist in stock Chrome.
await browser.captureProtection.set({
  tabId,
  target: "entire-tab", // future: subtree element identifier
  behavior: "black-on-capture",
});
```

The browser would apply existing native capture restrictions while preserving real DOM functionality. A robust implementation needs browser-level permission review, window/tab lifetime management, navigation isolation, UI showing the user that capture is restricted, treatment of extension-origin captures, and cross-platform screenshot/recording/share tests. **Whole-window restriction is not per-element restriction.** Per-subtree capture protection would require separate protected render surfaces or capture-time region redaction implemented *inside* Chromium.

The package-facing API can still be very simple, with a React component forwarding all props, classes, event handlers and children or an equivalent registered custom element. **Never label the component protected until the browser reports a genuinely supported capture-protected backend.** Otherwise fail closed or display an explicit unprotected-preview state for *synthetic development examples only*.

## Research next steps and stop/go criteria

1. Audit Chromium's current `SetAllowScreenshots` platform behavior (including macOS third-party ScreenCaptureKit limitations) and **capture exclusion for a browser tab versus an entire native window**.
2. Confirm whether any **new supported extension API**, Chrome enterprise extension capability, or opt-in browser experiment exposes this widget operation (none identified as of this review).
3. If no supported free hook exists, prepare a **minimum Chromium extension API design/feature request**, or prototype a Chromium fork strictly as engine research. Such a fork is not a deployable Secure Display solution under the extension-only requirement until the capability lands in a mainstream browser.
4. Explore native compositor per-region protection with security/privacy reviewers, because `<secure-div>` requires independent pixel exclusion without hiding other tabs or adjacent page content.
5. Maintain a matrix for screenshot shortcuts, macOS ScreenCaptureKit, window/tab sharing, recording, DRM protected vs normal DOM; never generalize from only one capture path.

**Decision as of this review:** no verified free stock-Chrome extension/npm mechanism meets the full arbitrary DOM + OS screenshot + screen recording/share requirement. A provider-supported browser capture-protection interface remains the best path fitting the installed-extension-only deployment constraint. Continue investigating, but do not promise a solved exploit or circumvent managed-browser licensing restrictions.
