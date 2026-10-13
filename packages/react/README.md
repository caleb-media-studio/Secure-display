# @caleb-media-studio-llc/react

**Research-only React UI for prepackaged, licensed DRM media.** Native React children stay inspectable; visible pixels are supplied from a separate encrypted video. Not arbitrary live JSX capture protection.

```tsx
import {SecureDiv} from "@caleb-media-studio-llc/react";

<SecureDiv className="secure-card">
 <h2>Prepackaged synthetic test content</h2>
</SecureDiv>
```

The host application must call `configureSecureDisplay({resolveAsset,playbackAdapter})` once, using a matching encrypted asset and DRM license implementation. The example adapter uses **public Axinom test keys** and is not suitable for confidential data.

Optional status: `useSecureDisplayStatus()` returns `status` and `onSecureStateChange`; pass that callback to the component. A `playing` state is **not** proof of screenshot exclusion.

See [React guide](../../docs/REACT.md), [status](../../docs/STATUS.md) and [publishing preparation](../../docs/PUBLISHING.md).
