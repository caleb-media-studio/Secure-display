# @caleb-media-studio-llc/secure-div

The research-only native Web Component powering the React integration. `registerSecureDiv` needs a licensed DRM playback adapter and a static matching encrypted asset. It keeps the actual DOM transparent, preserving clicks and selection, while a video portal shows packaged DRM pixels.

```html
<secure-div data-asset-id="synthetic-id" data-source-sha256="64-hex-character-digest">
  <p>Matches a prepackaged static synthetic fixture</p>
</secure-div>
```

Load `secure-div.css` in the initial document head. Never use the demo to display confidential content. Original DOM can be read through DevTools, public test keys provide no secrecy, and text-free selection overlays remain capturable. See [experiment](../../docs/AUTO_SECURE_ELEMENT.md).
