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

**User-verified preliminary result (October 12, 2026):** the protected synthetic text was visible on the display and omitted from **screenshots, screen recordings, and screen sharing** using Chrome/Widevine and Safari/FairPlay on the user's Mac. The two latter results are user-reported with no attached recording/sharing captures, and exact software/environment specifics are not recorded. See [VALIDATION_MATRIX.md](VALIDATION_MATRIX.md).

Open blockers: independent reproduction, detailed environment/capture-method records and cross-platform testing, production authorization and private-key licensing, output-policy negotiation, accessibility, text reflow and copy semantics, and a security review.
