# Secure Display

**Experimental open-source research into browser DRM and capture-resistant rendering for sensitive reports.**

> [!WARNING]
> Research alpha. No production screenshot protection is claimed. Do not use it with private reports, student data, DRM secrets, or license keys. Browser EME capability checks are not proof of screen-capture exclusion.

The project explores protected video paths exposed by **Encrypted Media Extensions** (EME) in ordinary Chrome, Safari, and Edge. A GPU canvas is ordinarily capturable. The first milestone is a fail-closed research lab: real sensitive content is never rendered unless demonstrable platform protection is available. No such general browser attestation exists today.

## Goals

- TypeScript packages for browser capabilities, an experimental licensed-media pipeline, and React bindings.
- No browser extensions or installed apps.
- No credentials or personal information in source, fixtures or logs.
- Per-browser and per-device testing before any claims of capture protection.
- Privately develop first, then publish source and potentially npm packages after review.

## Setup

```sh
npm install
npm run typecheck
npm test
npm run dev
```

The repo will use an npm-compatible workspace, runnable with Bun where supported. Package publishing is intentionally disabled until release review.

## Security status

A supported DRM key system means only that the browser accepted a request. It does **not** guarantee a screenshot will be blank. Standard browser APIs cannot generally enforce screenshot exclusion for a text div or canvas. All strict protected-display requests remain blocked.

See `SECURITY.md`, `docs/THREAT_MODEL.md`, and `docs/TEST_PLAN.md` for limitations and testing.

## License

Apache-2.0. See `LICENSE`.
