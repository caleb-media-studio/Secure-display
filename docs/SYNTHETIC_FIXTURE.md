# Generate a safe research fixture

Run `bun run fixture` or `npm run fixture` with FFmpeg and the H.264 `libx264` encoder installed.

**No `drawtext` filter is needed.** The generator creates an RGB bitmap frame directly in JavaScript, then asks FFmpeg to encode it as a three-second H.264 MP4. Only hard-coded synthetic text is rendered. No records, passwords, credentials, user-supplied text, or network calls.

Generated files appear in `fixtures/generated/` and remain gitignored. The resulting clip is **clear and screenshot-capturable**, not DRM-encrypted. This synthetic fixture is an input for later authorized DRM packaging; do not treat it as protected media.

To inspect the output: `ffprobe fixtures/generated/synthetic-clear.mp4`.

Next experiment: encrypt each video sample with an approved DRM packaging workflow, issue licenses through a server-side provider integration, and verify screenshot behavior on real Chrome, Edge and Safari devices. Never represent Clear Key or plain Web Crypto as protected output.
