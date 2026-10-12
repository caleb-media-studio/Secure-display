# Generate a safe research fixture

Run `npm run fixture` with FFmpeg (including libx264 and drawtext) installed. The script **does not read personal data**, accept real report content, or contact a server. It generates a three-second MP4 showing fake field data and a prominent **NOT DRM ENCRYPTED** warning.

Files appear under `fixtures/generated/` and are excluded from git. They are **ordinary capturable H.264 video**, **not DRM protected**. Generated video is solely an input to future authorized DRM packaging and device capture experiments.

Next experiment: encrypt every media sample using an approved DRM packaging workflow; issue short-lived playback licenses via a server-side provider integration; verify screenshot behavior on actual Chrome, Edge and Safari devices before making any guarantees. Do not emulate DRM with simple AES or Clear Key and call it protected.
