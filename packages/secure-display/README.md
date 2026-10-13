# @caleb-media-studio-llc/secure-display

Experimental Secure Display React component, native element and DRM capability helpers distributed in **one npm package**. React is a peer dependency. Internal research modules are bundled into this artifact, not installed from separate npm packages.

```tsx
import {SecureDiv} from "@caleb-media-studio-llc/secure-display";
import "@caleb-media-studio-llc/secure-display/secure-div.css";

// Requires one-time configureSecureDisplay(...) plus a matching
// prepackaged licensed synthetic DRM media asset.
export default function Example(){
 return <SecureDiv><p>Prepackaged synthetic test content</p></SecureDiv>;
}
```

The HTML is still readable from the original DOM and developer tools. Wrapping arbitrary JSX does not encrypt it; the current proof of concept requires a fixed DRM video created at build time. Screenshot capture exclusion has **not** been validated universally. Public demo keys cannot protect confidential data. See repository documentation before use.
