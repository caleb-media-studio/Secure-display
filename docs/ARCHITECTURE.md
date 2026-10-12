# Architecture

## Modules

- `@secure-display/core`: EME capability probes, strict disclosure-policy evaluator and synthetic-only CENC playback.
- `@secure-display/react`: accessible, fail-closed React UI with no plaintext-report props.
- `@secure-display/lab`: browser compatibility diagnostic with no secrets or actual reports.

## Experimental pathway

```text
synthetic text -> offline video encoding -> provider DRM packaging
  -> encrypted media CDN -> browser EME/CDM -> synthetic test playback
                                ^
                        authorized license service
```

Production would require provider-specific Widevine, PlayReady and FairPlay adapters, genuine DRM packaging and key management, server authorization, license controls, HLS/DASH integration, revocation, and extensive hardware tests. Nothing in this research repo certifies output capture exclusion.

Canvas, WebGL, WebGPU and Web Crypto cannot mark arbitrary pixels as DRM-protected. The DRM media pipeline is being evaluated because hardware-protected output paths are not exposed to arbitrary JavaScript UI.

## Roadmap

1. Honest capability probes, strict blocking, synthetic-only experiments, unit tests.
2. Legally provisioned test streams, licenses and device test fixtures.
3. Real-device capture tests on Chrome, Safari, Edge and selected mobile browsers.
4. Third-party security review and public compatibility matrix.
5. Remove package `private` flags and publish only after release checks pass.
