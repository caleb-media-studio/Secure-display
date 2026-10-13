# Component states and diagnostics

`SecureDiv` works without any status UI. For debugging, it emits `secure-state-change` with a state, optional reason and DRM type. Its host also uses `data-secure-state`.

```tsx
import {SecureDiv,useSecureDisplayStatus} from "@caleb-media-studio-llc/secure-display";

function Inspector(){
 const {status,onSecureStateChange}=useSecureDisplayStatus();
 return <>
  <SecureDiv onSecureStateChange={onSecureStateChange}>
   <p>Requires a matching static encrypted asset</p>
  </SecureDiv>
  <output role="status">Playback: {status.state} {status.reason ?? ""}</output>
 </>;
}
```

The above is a **diagnostic snippet**, not a generated DRM asset for that text.

| Status | Meaning | Visual behavior |
| --- | --- | --- |
| `loading` | Waiting for binding/media/DRM initialization | DOM stays hidden |
| `playing` | DRM adapter returned a playback handle | Licensed video portal can be displayed |
| `blocked` | Asset, license, browser, integrity or decoder error | No ordinary HTML fallback |
| `stale` | Protected DOM mutated after packaging | Video hidden until rebuilt |

The optional hook initially reports `loading`, then tracks emitted lifecycle events. A `playing` status is **not evidence screenshots are blocked**.

`onSecureSelectionChange` offers counts and highlight rectangle geometry. The blue overlay is ordinary, capturable HTML, even where encrypted media pixels are omitted. Selected characters remain copyable in this particular real-DOM prototype.

For tests, log only synthetic asset IDs, non-sensitive failure reasons, DRM type, browser/OS, and capture method. Never log plaintext secrets, credentials, license challenges, or raw license messages.

See [React guide](REACT.md) and [validation matrix](VALIDATION_MATRIX.md).
