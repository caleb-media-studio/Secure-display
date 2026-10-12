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

Open blockers: legally licensed provider samples, FairPlay adapter, live hardware test matrix, output-policy negotiation, accessibility, text interactions and a security review.
