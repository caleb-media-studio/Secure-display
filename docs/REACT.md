# React usage

**This is a fixed synthetic DRM experiment, not a tool for confidential records.** The JSX remains in the browser DOM, and the static encrypted video has to match it.

## Minimal component

The real fixture is [App.tsx](../examples/auto-secure-element/react/App.tsx). The author writes JSX rather than building a video or handling DRM in each component.

```tsx
import {SecureDiv} from "@secure-display/react";

function Screen(){
 return <SecureDiv className="secure-card">
  <h2>Static, packaged synthetic content</h2>
  <button onClick={() => console.log("native click")}>Continue</button>
 </SecureDiv>;
}
```

This is the **authoring shape**, not automatically generated encrypted media for this exact snippet. To see the working synthetic test, use the fixture in `App.tsx`.

## Configure once

The sample [setup.js](../examples/auto-secure-element/react/setup.js) calls:

```ts
import {configureSecureDisplay} from "@secure-display/react";

configureSecureDisplay({
  resolveAsset,     // look up trusted metadata for this prebuilt DRM asset
  playbackAdapter,  // attach authorized encrypted HLS/DASH media
});
```

That one-time setup is application wiring. The current example uses the public Axinom **test** entitlement and is **not production licensing**. Regular component authors do not need to repeat these parameters.

**First-paint protection:** load the native [secure-div.css](../packages/secure-div/secure-div.css) opacity guard in the initial document head before SSR/hydration. The example page includes such a guard already. Loading CSS only after React starts may not prevent an early plaintext paint.

## Package and run

```bash
bun install
SECURE_DISPLAY_PACKAGER="/absolute/path/to/packager" bun run drm:element:package
bun run example:auto-element
```

Go to the printed Vite URL at `/react/`. The build uses developer Chrome and FFmpeg to render **actual React JSX**, encode H.264 at the fixed 960×540 size, then package DRM video. It saves metadata about source HTML/CSS, the DOM fingerprint, asset identity and dimensions. At runtime, the resolver and element validate the matching static asset before showing video.

Repackage after changes to the JSX or styling. The fingerprint detects many HTML/text mismatches but **not every visual change**, so manual CSS changes, fonts, reflow, dynamic state, pseudo-elements and responsiveness remain significant limitations. There is no real-time DOM-to-DRM encoder.

## Optional status hook

```tsx
import {SecureDiv,useSecureDisplayStatus} from "@secure-display/react";

function Demo(){
 const {status,onSecureStateChange}=useSecureDisplayStatus();
 return <>
  <SecureDiv onSecureStateChange={onSecureStateChange}>
   <p>Prepackaged synthetic fixture required</p>
  </SecureDiv>
  <output role="status">{status.state}</output>
 </>;
}
```

This snippet demonstrates the optional diagnostics API, not a valid video asset for that text. The component works with no hook or callback. See [status and errors](STATUS.md).

## Common problems

| Observation | What to check |
| --- | --- |
| Black/blank card | Missing DRM media or blocked state is a correct fail-closed behavior |
| `JSX differs from the encrypted asset` | Repackage from current `App.tsx`; check its root class and children |
| Source SHA differs | The CSS/source fixture and encrypted media are out of sync |
| Dimensions changed | This prototype only supports fixed-size prepackaged pixels |
| Screenshot has blue selection rectangles | Highlight is ordinary capturable DOM |
| React works but another browser blocks | DRM playback/capture behavior varies by browser, OS and CDM |
| VS Code complains about CSS import | Run `bun install`, use the declared CSS export and restart the TS server if needed |

Even with a successfully playing card, screen capture must be tested separately on physical hardware. The original React text is still visible to DevTools/scripts.
