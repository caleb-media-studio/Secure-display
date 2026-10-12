# Protection validation plan

**Use synthetic dummy data exclusively. Never use real school, customer or other personal records.**

For each browser, OS, graphics driver and device, record:
- EME candidate accepted or rejected; hardware robustness and codec.
- License exchange and actual encrypted playback success.
- Native screenshot and recording.
- Browser `getDisplayMedia` tab/window/screen capture.
- Zoom, Teams and Meet sharing, before and after playback starts.
- Remote desktop capture, if supported.
- External camera control, which cannot be prevented.
- CDM `output-restricted` and key expiration responses.
- Screenshot capture after OS, GPU or browser updates.

A passing EME probe, usable license key or HDCP check is **not** proof of screenshot blocking.

**Observed preliminary result:** macOS screenshot exclusion of a locally DRM-packaged synthetic text document was reported in Chrome/Widevine and Safari/FairPlay on October 12, 2026. See [VALIDATION_MATRIX.md](VALIDATION_MATRIX.md). This does not certify capture resistance elsewhere.\n\nOpen blockers: recorded browser/OS versions, independent repeatability, screen recording/sharing tests, production authorization/secret-key licensing, output-policy negotiation, accessible alternatives, document reflow, native text selection/copy requirements, and security review.
