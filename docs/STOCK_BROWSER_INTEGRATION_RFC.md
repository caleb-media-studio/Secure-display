# Stock-browser integration: Secure Display capture exclusion

**Research stage, October 2026.** The native/CEF host proof of concept establishes a possible macOS native capture-exclusion mechanism *inside an application-owned window*. This document targets **ordinary, unmodified Chrome** and eventually Safari/other stock browsers with normal SSR/React/HTML rendering and no encrypted-video substitution.

## The exact gap

A webpage cannot call Chromium's `BrowserView::ApplyScreenshotSettings`, `GetWidget()->SetAllowScreenshots()`, or private macOS `CGSSetWindowCaptureExcludeShape`. An ordinary Chrome extension has no published method for marking the underlying DOM or Chrome-owned window capture-excluded.

Chrome's actual native macOS `ApplyCaptureExclusion` uses `CGSMainConnectionID()`, obtains its **own** `NSWindow.windowNumber`, creates a **full-window rectangle** and calls `CGSSetWindowCaptureExcludeShape`. Showing that a native test window can exclude a region does **not** establish that an external helper can alter a window belonging to Chrome.

On Windows, Microsoft explicitly restricts `SetWindowDisplayAffinity` to an application's **own top-level window**, so an out-of-process helper cannot simply apply it to Chrome by identifying Chrome's HWND. On macOS, whether a same-user but **foreign-process** CGS caller can update the Chrome window region is **not yet established**. It must be experimentally demonstrated, not assumed.

Existing Chrome Enterprise Premium protection is browser-owned and URL/policy scoped, requires management/licensing, and is not a general per-DOM-element API. Standard Chrome extension recording APIs and DevTools Protocol `Page.captureScreenshot` control recording or inspection, not application-wide capture exclusion.

## Track A: test Chrome extension + Native Messaging on macOS (near-term)

**Deployment tradeoff:** normal Chrome remains unmodified, but the user must install an extension **and** a native host. This is not zero-install.

1. **Discover target identity safely:** extension uses the user's explicitly selected active tab. The user grants host permission for that site. A content script measures one synthetic `secure-div` via `getBoundingClientRect`. On-page coordinates are insufficient alone: account for device scale factor, Chrome toolbar/titlebar, browser viewport offsets, moving/resizing windows, external monitors, transforms, browser zoom and scrolling.
2. **Send to a native host:** use supported `chrome.runtime.connectNative` messages. Native Messaging starts a separate application; it does **not** grant browser-process privileges.
3. **First answer the real blocker:** can an *external, same-user process* call private `CGSSetWindowCaptureExcludeShape` for a **Chrome-owned** NSWindow window number and get observable capture exclusion? Use synthetic content, require explicit consent, only target a window the tester selected, log API result, restore the original region immediately, and validate OS screenshot and ScreenCaptureKit captures. Do not build a general-purpose foreign-window mutation tool unless this succeeds. A successful error code alone is not proof.
4. **Reject misleading success:** if the macOS private function enforces owning connection/process restrictions, or ScreenCaptureKit ignores the exclusion, mark this track unsupported. Do not use code injection, privilege escalation, binary patching, undocumented entitlements, or Chrome CDM modifications as a supposed standard browser feature.
5. **Only after confirmation:** implement an opt-in, reversible host bridge for synthetic tests. Never silently protect a page or alter unselected Chrome windows. The host is separate from the npm library, and its installation and limitations must be disclosed.

**Expected unknown:** Apple provides no supported contract for this private API, and neither Chromium's own usage nor a CEF owned-window result proves it works across processes. Other browser and OS versions may behave differently.

## Track B: browser-side Chromium integration (long-term)

This is the most credible route to a **real stock browser** feature:

1. **Propose** a new opt-in, permissioned browser capability for capture exclusion, preferably prototype it on a Chromium research build.
2. Route its request from an authorized extension or page origin **to the Chrome browser process**, not an arbitrary renderer's JavaScript or a native messaging helper.
3. In Chromium native UI/compositor integration, map the selected DOM region from renderer coordinates to native window coordinates, clipping to the browser's content viewport. Handle scrolling, zoom, OOPIFs, scale factors, occlusion, tabs, visual viewport and window movement.
4. For macOS, test native region exclusion (potentially via Chromium's existing private CGS implementation); recognize private API fragility and capture pipeline differences. For Windows, current OS display affinity is whole top-level window, so **per-element protection needs other compositor/window architecture**.
5. Make the browser show a persistent indicator and require explicit user consent or managed policy. Allow users to switch capture exclusion off and have clear policy for screen sharing, accessibility, automation, reporting and incident response. This must be designed to prevent abuse by phishing/malware pages hiding evidence.
6. Surface a capability/status result only after verifying that the platform backend is actually active; even then avoid promises covering physical cameras, privileged software or unsupported OS capture APIs.
7. Seek Chromium upstream review, Chrome/Edge platform approval and standardization if a Web API is intended. **A patch in a CEF fork or a custom Chrome build is not a feature of stock Chrome.** Ordinary users benefit only if their browser vendor ships the change.

### Proposed developer intent (DESIGN ONLY: no such API exists)

```ts
// Expresses a future capability; not callable in current Chrome.
const status = await browser.captureProtection.request({
  tabId,
  target: {elementToken: "component-scoped-identity"},
  behavior: "exclude-from-capture",
  requiresUserActivation: true,
});
// status.backend, status.scope and status.limits are browser-verified.
```

The extension/browser should allocate and validate opaque element/frame identities, rather than trust arbitrary CSS selectors or allow websites to set arbitrary OS window exclusion regions. A pure webpage API needs even stronger user-consent/anti-abuse review.

## Track C: today, only for managed deployments

Chrome Enterprise Premium documents URL-visited screenshot/screen-share restrictions controlled by management policy. This is actual protection **inside stock Chrome**, but its deployment and coverage do not match a free, zero-install public npm component; it is **not per div**.

## What not to spend time on

- More invisible/transparent Widevine video opacity tricks: earlier tests already showed DRM media exclusions do not automatically redact HTML behind it.
- Copying the proprietary Chrome CDM into CEF/Electron: not a capture-exclusion API and raises CDM licensing/distribution questions.
- Chrome `--app`, PWAs or `window.open()`: these change window presentation, not screenshot permissions.
- Chrome offscreen extension documents, tabCapture, getDisplayMedia, Element Capture, CSS, JS keyboard blockers: they control **cooperative** recording or appearance, not independent OS screenshot capture.
- `chrome.debugger`/CDP: no documented command for `GetWidget()->SetAllowScreenshots`, and CDP screenshot commands capture pixels rather than preventing independent capture.

## Decision gates

| Experiment | Pass condition | If it fails |
| --- | --- | --- |
| External native helper, macOS stock Chrome | Normal content stays visible and interactive; selected foreign Chrome region demonstrably omitted in OS screenshot **and** tested recording paths | Reject helper approach; browser-owned code required |
| Browser-owned macOS Chromium prototype | Per-DOM-region exclusion without altering visible DOM pixels or neighboring content | Investigate whether the private OS API or compositing prevents reliable per-region exclusion |
| Windows normal Chrome | Browser-vendor implementation protects intended scope; whole-window is labeled whole-window | Do not claim per-element support |
| User-facing stock browser | Shipped browser feature/extension API with permission design and hardware/capture tests | Keep native shell as clearly differentiated research option only |

**Platform security warning:** screen capture blocking may be useful for privacy but can also hide evidence from legitimate incident reporting. Any proposed browser feature needs an explicit user control and a visible disclosure signal. The webpage should never be able to silently decide that it cannot be captured.

## Primary references

- [Chromium `native_widget_ns_window_bridge.mm` and `ApplyCaptureExclusion`](https://chromium.googlesource.com/chromium/src/+/HEAD/components/remote_cocoa/app_shim/native_widget_ns_window_bridge.mm)
- [Chrome Extensions Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
- [Microsoft SetWindowDisplayAffinity ownership rule](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-setwindowdisplayaffinity)
- [Chrome Enterprise screenshot prevention](https://support.google.com/chrome/a/answer/2657289)
- [Chrome Developer extensions API index](https://developer.chrome.com/docs/extensions/reference/api/)
- [Chrome debugger extension API and restrictions](https://developer.chrome.com/blog/debugger-enterprise-policy-restrictions)
- [W3C EME screen capture protection proposal, for media rather than HTML](https://github.com/w3c/encrypted-media/issues/564)

No deployment, browser vulnerability, cross-process macOS permission, capture-protection guarantee, or Widevine endorsement is assumed by this RFC.
