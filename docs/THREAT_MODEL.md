# Threat model

## Assets
Confidential report content, DRM keys, server-side authorization decisions, decrypted pixels.

## Intended behavior
The strict browser policy never exposes confidential content because no interoperable Web API can prove screenshot exclusion. Experimental playback only accepts synthetic test media.

## Not guaranteed
Blocking of screenshots, screen shares, remote desktop, compromised endpoints, browser extensions, accessibility capture, or photography. Hardware-backed DRM may exclude *some* capture paths, on *some* devices, but its presence does not prove blanket protection.

## Trust boundaries
1. Server authorizes the requester and enforces report access.
2. DRM provider's CDM manages protected media and licensing; keys never belong in browser JavaScript.
3. Browser, OS and hardware may provide protected output. EME availability is not attestation.
4. React and the DOM are inspectable. Never place a protected report's plaintext into props, DOM nodes or client logs.

## Hard rules
- Encrypted media and license endpoints require authorization; do not expose long-lived URLs.
- Never log sensitive content, tokens or license responses.
- Every sensitive frame must be genuinely DRM-encrypted, not merely named "encrypted".
- Missing protection means blocked, not hidden CSS or a canvas fallback.
- Validate on real hardware before making security claims.
