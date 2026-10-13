# Secure Display

**Experimental browser DRM rendering for React and native HTML. One npm package, no visitor extension.**

Secure Display is an Apache-2.0-licensed research project from Caleb Media Studio LLC. The repository is currently private while the prototype is being developed. It explores showing the pixels of a **prebuilt, DRM-encrypted rendering of HTML** while retaining the original browser DOM for clicks, focus, layout, and text selection. The React integration centers on a single component named `SecureDiv`.

> [!CAUTION]
> **Not production-ready or generally screenshot-proof.** The project has shown promising protected-media capture behavior in specific user-reported macOS tests, but it has **not** proven universal screenshot, recording, or screen-sharing protection. The test assets use publicly known keys; the original text remains readable in the DOM and developer tools. Do not use Secure Display for confidential, financial, customer, student, medical, or other sensitive information.

## At a glance

| Question | Answer |
| --- | --- |
| What do developers install? | **One package:** `@caleb-media-studio-llc/secure-display` |
| Is it on npm yet? | **No.** The repository and release remain private/draft. |
| What is the React component? | `<SecureDiv>` |
| Do end users install an extension? | No, the experiment runs on a normal browser with a compatible DRM system. |
| Can it wrap any JSX and protect it immediately? | **No.** JSX currently needs a matching encrypted **build-time** asset. |
| Is the real React button still clickable? | Yes, in the synthetic demo. |
| Can the underlying text be extracted? | **Yes.** The original DOM is retained, including native text selection and copying. |
| Is it universal across browsers? | No, browser/CDM compatibility and capture results vary. |

## Try the React demo locally

The demo is part of this repository, **not** an npm-installed app. You need the development branch because `main` has not received the draft implementation.

### 1. Prerequisites

- macOS for the documented test workflow, with [Bun](https://bun.com/), Git, developer Google Chrome, and [FFmpeg](https://ffmpeg.org/).
- [Shaka Packager](https://github.com/shaka-project/shaka-packager), which generates the encrypted test video. The earlier project setup may already have it at `.secure-display-local/bin/packager`.
- Internet access to the public Axinom synthetic DRM test vectors and licensing endpoints. Availability, CORS, and licensing behavior may change.
- Chrome for the developer's HTML snapshot. To test playback, try Chrome (Widevine) and Safari (FairPlay) separately.

On macOS, you can install the common tools with `brew install ffmpeg` if needed. Verify the packager path before using the commands below.

### 2. Get the latest development branch

If you already cloned the repository:

```bash
cd /path/to/Secure-display
git fetch origin
git switch feat/initial-research-framework
git pull --ff-only
bun install
```

If starting from scratch, clone the private repository with your authorized GitHub account, then switch to `feat/initial-research-framework`.

### 3. Build the current React bundle

```bash
bun run typecheck
```

This checks TypeScript and builds the unified package for the examples. It does **not** create encrypted media.

### 4. Generate the DRM-backed React fixture

Use your existing Shaka Packager location:

```bash
SECURE_DISPLAY_PACKAGER="$PWD/.secure-display-local/bin/packager" bun run drm:element:package
```

If `packager` is already on your `PATH`, you may simply run `bun run drm:element:package`. The command renders the **actual** synthetic React JSX in a developer Chrome instance, encodes a fixed **960 × 540** H.264 video using FFmpeg, then generates encrypted DASH and HLS with public test keys. Locally generated fixtures are ignored by Git.

### 5. Start the React example

```bash
bun run example:react
```

Open **[http://localhost:5173/react/](http://localhost:5173/react/)**, or use the exact Local URL and port printed by Vite. If local TLS is already configured, Vite may print an `https://` URL instead. Don't open just the root route if your goal is to test React: the root of this example contains a separate vanilla HTML test. The `/react` shortcut redirects to `/react/` to avoid serving the wrong page.

**Expected behavior:** the 960 × 540 synthetic card displays licensed video pixels on the physical screen, its real HTML button increments the **React click counter**, and a visible DRM status reports `playing` (with the selected DRM). If the asset, browser, size, or license does not match, the demo should report `blocked` rather than painting the original text.

> [!NOTE]
> Every time you change JSX within `<SecureDiv>`, its captured CSS, dimensions, or asset generation inputs, **re-run `drm:element:package` and restart or refresh the demo**. Hot reload alone cannot update a pre-encrypted video.

## Public-facing React API

**Proposed future installation, after publication:**

```bash
bun add @caleb-media-studio-llc/secure-display
# or
npm install @caleb-media-studio-llc/secure-display
```

This is one package, not three. React is a peer dependency because normal React applications already provide it.

```tsx
import {SecureDiv, useSecureDisplayStatus} from "@caleb-media-studio-llc/secure-display";
import "@caleb-media-studio-llc/secure-display/secure-div.css";

export function Example() {
  const {status, onSecureStateChange} = useSecureDisplayStatus();

  return (
    <>
      <SecureDiv className="secure-card" onSecureStateChange={onSecureStateChange}>
        <h2>Static, prepackaged synthetic content</h2>
        <button type="button" onClick={() => console.log("clicked")}>
          Continue
        </button>
      </SecureDiv>
      <output role="status">DRM: {status.state}</output>
    </>
  );
}
```

**This is API syntax, not a self-contained DRM demo.** It will not display protected pixels unless the app has previously called `configureSecureDisplay({resolveAsset, playbackAdapter})`, and the JSX matches an encrypted asset prepared by the build pipeline. The complete working synthetic wiring is in [`examples/auto-secure-element/react/setup.js`](examples/auto-secure-element/react/setup.js). The React component itself is in [`App.tsx`](examples/auto-secure-element/react/App.tsx).

Keep the CSS first-paint guard in the document head before server-rendered content can appear. Importing it only after hydration may be too late. See the [React guide](docs/REACT.md) and [status API](docs/STATUS.md).

### Exposed APIs

| Export | Purpose |
| --- | --- |
| `SecureDiv` | React wrapper that coordinates prepackaged media with native DOM interactions |
| `configureSecureDisplay` | One-time asset resolver and licensed playback adapter |
| `useSecureDisplayStatus` | Optional React hook for `loading`, `playing`, `blocked`, and `stale` |
| `registerSecureDiv` | Lower-level HTML custom-element registration for non-React applications |
| `SecureDivElement` | Native custom-element class, distinct from React `SecureDiv` |
| DRM probe utilities | Experimental EME capability diagnostics, not proof of screenshot exclusion |
| `./secure-div.css` | First-paint guard that suppresses regular DOM painting |

## How it works

```text
DEVELOPER BUILD
React JSX + reference CSS
          |
          v
Headless Chrome renders a static 960 x 540 snapshot
          |
          v
FFmpeg H.264 video
          |
          v
Shaka Packager -> encrypted DASH (Widevine) / HLS (FairPlay)
          |
          v
Local asset metadata + prebuilt encrypted media

BROWSER RUNTIME
Real React DOM stays present but visually transparent
          |
          +--> native clicks, keyboard focus and selection
          |
          +--> asset hash, DOM fingerprint and dimension checks
                  |
                  v
           Licensed encrypted video
                  |
                  v
           Pointer-transparent video portal
```

The display intentionally fails closed on missing/invalid metadata, unavailable DRM, unlicensed playback, unsupported sizing, or altered protected content. It does **not** remove the original HTML from the document, block DevTools, protect the license key used in the public synthetic demonstration, or guarantee what an OS capture application will record.

### Browser and capture testing

For each browser/OS combination, compare what appears physically on the display against: an OS screenshot, an OS screen recording, and a screen-sharing session. Also verify native clicks, focus, selection and copy. Repeat after changing the protected JSX: the old video should block or become stale, not silently show mismatched content.

**A `playing` DRM state means encrypted playback was established, not that capture protection has been proven.** Selection rectangles and the counter/status UI are normal capturable DOM. Photographing the screen with a camera cannot be prevented by this approach.

See [validation evidence](docs/VALIDATION_MATRIX.md), [capture research](docs/CAPTURE_PROTECTION_RESEARCH.md), [zero-install feasibility](docs/ZERO_INSTALL_BROWSER_CAPTURE_RESEARCH.md), and [threat model](docs/THREAT_MODEL.md).

## Troubleshooting

| Problem | Explanation / next check |
| --- | --- |
| Blank / black protected card | Fail-closed behavior. Check the status output, Console and Network panel for DRM or asset errors. |
| Missing `asset-info.json`, manifest 404, or Vite HTML response | Run the DRM packaging command again and confirm generated files exist under `examples/auto-secure-element/public/secure-asset/`. |
| `JSX differs from the encrypted asset` | Repackage after changing `App.tsx` or protected HTML. |
| Source SHA mismatch | A source/CSS file differs from the packaged snapshot. Repackage and refresh. |
| `Protected DOM dimensions changed` | The fixture is fixed at 960 × 540. Rebuild to match; responsive sizes aren't implemented. |
| No browser key system / license request fails | Try compatible Chrome or Safari on trusted localhost/HTTPS; verify network and Axinom test service. |
| `packager` command not found | Set `SECURE_DISPLAY_PACKAGER` to the actual executable path. |
| Chrome not found during packaging | Install desktop Google Chrome or set `SECURE_DISPLAY_CHROME_PATH` to its executable. |
| React click counter works but video stays black | DOM interactions and DRM video are separate. Inspect DRM status and media/license requests. |
| LAN IP loads UI but DRM rejects | Use trusted HTTPS and a device-trusted local certificate. See [LAN instructions](docs/NETWORK_TESTING.md). |

## Development and release checks

```bash
bun install
bun run typecheck
bun run test
bun run build
bun run release:inspect
bun run release:smoke:npm
bun run release:smoke:bun
```

The release checks validate **one** candidate registry artifact, `@caleb-media-studio-llc/secure-display`, including packed JavaScript, TypeScript declarations, CSS, and isolated npm/Bun consumer installs. The private internal workspaces are not separate registry releases. GitHub CI checks cannot establish real hardware screen-capture behavior. Check the latest workflow results rather than assuming the single-package release passed.

Read [publishing preparation](docs/PUBLISHING.md) before considering any release. **No publication is authorized or enabled**; the single distribution package remains `private: true`.

## Repository map

| Path | Role |
| --- | --- |
| `packages/secure-display/` | The **only** planned npm package |
| `packages/react/` | Internal React implementation |
| `packages/secure-div/` | Internal native element, DOM fingerprint, selection geometry and CSS |
| `packages/core/` | Internal DRM capability/policy/playback research |
| `packages/document/`, `packages/elements/` | Earlier document/element experiments, not separate releases |
| `examples/auto-secure-element/react/` | Working React authoring example and one-time adapter setup |
| `examples/auto-secure-element/src/` | Standalone HTML element example and synthetic DRM player |
| `tools/package-dom-element.mjs` | Developer-time JSX snapshot and encryption packaging |
| `tools/build-distribution.mjs` | Builds the one npm ESM entrypoint and its type declarations |
| `docs/` | Tutorials, evidence, feasibility research, compatibility and security |
| `experiments/` | Isolated research, including native macOS capture-region experiments |

## Scope, licensing and responsible use

This is a research implementation, not a deployed production security boundary. Production-safe delivery would require a defensible private content and key architecture, browser/platform validation, capture testing, accessibility work and independent review. Do not equate DRM support with guaranteed capture exclusion.

Copyright 2026 Caleb Media Studio LLC. Licensed under **Apache-2.0**. See [LICENSE](LICENSE), [NOTICE](NOTICE), [SECURITY.md](SECURITY.md), and [CONTRIBUTING.md](CONTRIBUTING.md).
