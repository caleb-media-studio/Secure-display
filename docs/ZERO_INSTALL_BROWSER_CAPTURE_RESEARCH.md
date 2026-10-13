# Secure Display — zero-install browser capture protection research

**Updated:** October 2026. **Non-negotiable deployment goal:** users visit an HTTPS website in their existing browser on macOS, Windows, Linux, iOS, Android or ChromeOS; no installation, no extension, no OS configuration, no proprietary service. Site developers apply protection to arbitrary normal HTML/React UI with a simple wrapper or component such as `<SecureDiv className="...">`. **Physical display must look normal and native interactions must work, but OS screenshots, recordings and screen sharing should omit/black protected pixels.**

## What is confirmed

- **User's macOS native experiment succeeded.** A temporary Cocoa app hosting real interactive HTML in WKWebView successfully excluded a native window or region from capture. That proves some native capture exclusion exists on the tested Mac; it does **not** grant webpages access to the capability, nor establish cross-OS support. `experiments/macos-capture-region/` preserves the executable research test.
- Earlier Secure Display test videos showed screenshot-excluded DRM **media pixels** for Widevine and FairPlay on the user's Mac, with user-reported recording and sharing results. These protections do not transfer to DOM underneath the protected video.
- CSS tricks tried with full-viewport encrypted black/white layers (alpha and multiply blending) did not black the captured normal DOM while leaving the physical view unchanged. Video license/playback success alone cannot be interpreted as capture exclusion for the rest of the page.

## Permissions and execution boundary

A website running ordinary JS/WASM is a low-trust browser renderer origin. Native capture-protection operations are owned by its browser/OS host; a webpage cannot invoke arbitrary Cocoa, Win32 or Android window APIs. A browser executable may implement that functionality, but only through deliberate public browser or browser-management interfaces. An OS/library implementation alone does not grant an HTTPS origin the ability to invoke it.

### Native browser/API evidence

| Path | What exists | Why it does not fulfill zero-install arbitrary-HTML protection today |
| --- | --- | --- |
| **Chromium/Chrome** | Enterprise screenshot rules can call `BrowserView::ApplyScreenshotSettings` → `Widget::SetAllowScreenshots` | Behind `ENTERPRISE_SCREENSHOT_PROTECTION` and managed Chrome Enterprise Premium rules, not a supported website API |
| **macOS** | `CGSSetWindowCaptureExcludeShape` native window region exclusion (confirmed by user in a standalone app) | Private native CoreGraphics function; cannot be called by ordinary browser JS |
| **Windows** | `SetWindowDisplayAffinity` native capture exclusion | Win32 operation owned by application/window; ordinary webpage does not own Chrome's native window |
| **Android** | `FLAG_SECURE` applied to an Android activity's native window | Website JavaScript can't set flags on Chrome's Activity |
| **Linux** | Chrome Enterprise screenshot-prevention documentation currently says this setting is not available on Linux | Platform-dependent capture pipelines, compositor protocols and user capture providers need individual treatment |
| **Chrome Element Capture** | `RestrictionTarget.fromElement` and `BrowserCaptureMediaStreamTrack.restrictTo` can isolate a subtree within the *capturer-controlled* outgoing stream | It does not suppress independent OS screenshots, screen recorders or third-party sharing applications |
| **Screen Capture APIs** | `getDisplayMedia` chooses/controls capture the requesting app initiates. `Permissions-Policy: display-capture` limits only that requesting page's own calls | Not a power to control OS-level recording of this page by a different app |
| **DRM/EME** | Encrypted HLS/DASH media played through a `HTMLMediaElement` may be assigned a protected compositor surface | Only frames actually rendered by that media element are eligible; normal DOM isn't marked as protected by adding a video overlay |

### Sources

- [Chromium BrowserView ApplyScreenshotSettings](https://chromium.googlesource.com/chromium/src/+/main/chrome/browser/ui/views/frame/browser_view.cc)
- [Chromium Widget SetAllowScreenshots](https://chromium.googlesource.com/chromium/src/+/HEAD/ui/views/widget/widget.h)
- [Chromium DataControlsRules schema — cloud_only](https://chromium.googlesource.com/chromium/src/+/HEAD/components/policy/resources/templates/policy_definitions/Miscellaneous/DataControlsRules.yaml)
- [Google enterprise screenshot prevention availability: Mac and Windows, not Linux](https://support.google.com/chrome/a/answer/2657289)
- [Android FLAG_SECURE guidance](https://developer.android.com/security/fraud-prevention/activities)
- [Chrome Element Capture: restrictTo](https://developer.chrome.com/docs/web-platform/element-capture)
- [MDN display-capture Permissions-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/display-capture)
- [W3C Encrypted Media Extensions](https://www.w3.org/TR/encrypted-media/)

## What could actually meet the *zero-install* constraint?

### Candidate A: automatically project selected DOM into encrypted media (feasible to investigate, NOT established)

This is the **only promising existing stock-browser output route** from our current prototypes, because protected video pixels have already demonstrated screenshot exclusion on a Mac.

Potential pipeline:

1. Developer uses `<SecureDiv>` or `<secure-div>` with original styles/events/children.
2. Library *automatically* renders that DOM subtree into an offscreen image **without asking the developer to hand-author a video**. The actual interactive DOM stays mounted for event handling, focus/semantics and selection logic, but must not visibly paint its own sensitive pixels into a capturable layer.
3. Offscreen image frames are encoded into a browser-supported video container/codec; frames are Common-Encrypted for playback through the Widevine/FairPlay CDM using existing test-only fixtures/authorized licenses.
4. Only **decoded encrypted media output** supplies the visible sensitive pixels. Native browser hit targets forward events into the real DOM; the protected media is pointer-transparent. CSS layout/style changes and text updates trigger re-render/re-encode/replacement of frames.

**This is automatic protected rerendering, not a magic native DOM capture flag.** It MAY yield the desired simple developer-facing API, but risks: incorrect visual equivalence; animation/scroll/update latency; font/CORS/iframe/tainted canvas restrictions; HLS/DASH packaging complexity; CDM/browser differences; accessibility and native text caret behavior; public test license availability and lack of production authorization. On devices where the browser shows DRM media in screenshots, the library must fail closed. A normal capturable DOM pixel leak fails the experiment.

Test in the smallest useful increments, never as a universal blanket claim:
- **A1:** single static element, matching real text and CSS, *no ordinary DOM text in capture*, DRM text physically visible on Mac.
- **A2:** real click button, focus and keyboard navigation, with a visually correct protected representation.
- **A3:** update text and styling without changing the developer component and measure frame-to-display latency.
- **A4:** scrollable real DOM, multiple elements and mixed normal/protected content without leaking pixels.
- **A5:** macOS Safari/Chrome then Windows/Chrome/Edge, Linux/Chrome/Firefox, Android and iOS. Report unsupported (do not silently show unprotected DOM).

For rendering evaluation, [html2canvas documents](https://html2canvas.hertzen.com/documentation/) that its snapshots *reconstruct* CSS from the DOM and are not automatically pixel-identical. CORS and cross-origin iframe restrictions are real. For encryption, [Shaka Packager raw key docs](https://shaka-project.github.io/shaka-packager/html/tutorials/raw_key.html) define the CBCS/DASH/HLS packaging workflow, but converting rapidly changing JS/DOM to encrypted video in-browser is not already solved by that tool.

### Candidate B: supported browser-native per-element capture-redaction API (the clean long-term solution)

Prototype a browser patch for research, but **do not require users to install a custom browser** for the shipping product. Add a declarative opt-in and capture-time redaction path that carries `protected` classification on render surfaces into each browser's platform capture implementation.

Use [Element Capture](https://screen-share.github.io/element-capture/) as precedent for identifying DOM subtrees, but the redaction must be applied **inside the browser's native compositor/capture path**, not to a capturer-controlled `MediaStreamTrack`. Existing widget-level restrictions are only a starting point; per-element mask layout, cross-origin descendants, overlapping windows, changing transforms, capture race conditions, DOM raster backend, native OS screen captures and screen sharing need explicit handling.

Suggested **future** API, not a current browser API:

```js
// DOES NOT EXIST in Chrome/Safari/Firefox today.
document.querySelector(".report").captureProtection = "black";
```

A browser-vendor feature/standards implementation is the only way to ship this path to zero-install users in stock browsers. Cross-platform adoption (including mobile and Linux) cannot be assumed.

## What does NOT establish the claim

- A test program calling the private macOS API on a window **it owns**.
- Compiling Chromium or changing local policies on the developer's machine.
- Chrome Enterprise Premium, paid management or user-managed configuration.
- A browser extension, desktop helper, Electron app, PWA/TWA requiring installation, browser flags or `chrome://policy` changes.
- `getDisplayMedia`, `restrictTo`, `display-capture`, watermarking, blur, CSS mixing, opaque or near-transparent videos that leave original DOM capturable.
- DRM license acquisition alone; successful CDM negotiation says nothing about **capture output**.
- A design that works only on macOS but advertises protection for every OS/browser.

## Product integration contract

The final npm package may make the developer-facing code simple even when the renderer underneath is complicated:

```jsx
<SecureDiv className="report" onClick={handleClick}>
  <h2>Confidential report</h2>
</SecureDiv>
```

But an autonomous HTML custom element such as `<secure-div>` is not literally a built-in `<div>`: browser default display styles, CSS selectors, accessibility semantics, and React custom-element prop/property handling must be tested. Framework adapters should preserve semantics where possible. Never render unprotected data while claiming a protected state. A honest runtime capability status is mandatory.

### Next decision

**Build Candidate A1 as the next research experiment.** It can test the only stock-browser output plane we have actually seen excluded from screenshots. We can investigate browser-native APIs concurrently, but currently have no source-supported claim that any ordinary website can call native screenshot exclusion. If A1 succeeds, evaluate update latency and DOM interaction; if it fails, narrow to native browser support and clearly state that the zero-install version requires a platform change.

## Implemented A1 example (October 13, 2026)

**Implementation committed, native capture results not yet verified:** `examples/auto-secure-element` now exercises the A1 static DOM-to-protected-media route with no viewer installation. The developer maintains a single ordinary `div` source in `public/secure-content.html`, including the original classes, styles, and button. `tools/package-dom-element.mjs` uses headless Chrome (developer machine) to render that actual element to a PNG, encodes H264 with FFmpeg, and packages it as separately licensed FairPlay HLS and Widevine DASH using the established Axinom publicly available test key. The browser instantiates `<secure-div>` with those **real** HTML children, removes their normal paint through `opacity:0` while preserving DOM layout/hit testing, and positions the protected video at the component bounds. It checks the original HTML SHA256 against build metadata and blocks on any child-text/style mutation instead of showing outdated pixels.

**Developer:** `bun run drm:element:package`, then `bun run example:auto-element`. Browser user: ordinary HTTPS URL only. See [the runnable A1 experiment](../docs/AUTO_SECURE_ELEMENT.md).

This is **not a solution for live arbitrary DOM**, native carat/selection animations, or cross-platform screenshot certification. It needs static build-time media generation and cannot honestly promise the same simple semantics for every HTML component yet. No native screenshot-exclusion API has been discovered for an unprivileged website. The next research step is real-time DOM re-encoding with measured latency, followed by per-browser screenshot verification; keep unsupported browsers fail-closed.
