# Optional Secure Display Chrome Extension

Research-only secondary route, not part of the primary npm install. The ordinary Secure Display React package continues to work without this extension. The optional Manifest V3 extension researches enterprise SSO, authenticated key release and a native Chrome capture capability probe. **No screenshot exclusion is implemented in the extension or native host.**

## What works today

- Load unpacked Manifest V3 extension in stock Chrome
- Chrome Identity interactive OIDC Authorization Code + PKCE (S256), for an enterprise that supplies a managed policy and compatible identity provider
- Service-worker-only in-memory OAuth access tokens, never browser page localStorage
- Authenticated encrypted document envelope retrieval from a separately supplied enterprise API
- Ephemeral RSA-OAEP-3072 nonextractable private key to unwrap per-document AES-256-GCM content key; content integrity via GCM tag and associated data binding to document ID and origin
- Extension popup shows decrypted text, or explicit user-authorized text-only reveal in an allowlisted page if company policy permits
- macOS read-only Chrome Native Messaging probe after optional host registration

**Not provided:** a company backend, production SSO configuration, encryption/KMS server, live Widevine capture protection, third-party capture exclusion, or guarantees about DOM confidentiality after reveal.

## Test regular Chrome screenshot and tab capture

From the repository root on the research branch:

    bun run example:capture

Open the Vite URL with /capture-test.html at the end. Example: https://localhost:5173/capture-test.html when trusted local HTTPS is configured, or http://localhost:5173/capture-test.html on localhost otherwise.

The test page has two side-by-side, fully interactive HTML regions. The left has the data-secure-display marker recognized by the extension. The right is an ordinary control. Start tab capture with the button and choose This Tab. A live preview shows what Chrome's cooperative getDisplayMedia capture sees. Save one PNG frame if helpful.

For **independent macOS capture**, use Shift + Command + 4 to screenshot both panels, then Shift + Command + 5 for a recording. Repeat after clicking the extension's Probe selected Secure Display element control. The native helper currently responds with supported=false; it does not modify a Chrome window.

**Expected today:** both panels remain visible in captures. This tests the procedure and the extension/native handshake, not working screenshot exclusion. No DRM video packaging or enterprise login is required.

## Local Chrome setup without SSO

1. Check out the research branch and visit Chrome's extensions page: chrome://extensions/
2. Enable Developer mode, choose Load unpacked and select the folder experiments/chrome-extension/
3. Click the extension popup. Without a company managed policy it reports SSO not configured. This is expected.
4. Start the normal synthetic React Secure Display demo, visit its /react/ page and click Probe selected Secure Display element.
5. Chrome will report a missing native host unless you separately register the read-only host. No screenshot protection is enabled.

### Optional macOS read-only native probe

Chrome lists the unpacked extension's ID under chrome://extensions/ (32 lowercase characters a through p). From the root of the repo:

    node experiments/chrome-extension/native-host/install-host.mjs YOUR_EXTENSION_ID

Quit and restart Chrome, visit the synthetic demo and press Probe again. The native host will respond with supported=false. This proves Chrome to host messaging only. It cannot change an existing Chrome-owned window and does not invoke private macOS APIs.

Optional local files written:
- ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.calebmedia.secure_display_research.json
- ~/.secure-display-native-probe/run-host.sh

Remove both if you want to undo the host installation.

## Enterprise SSO configuration

Company IT configures Chrome enterprise-managed extension storage according to the shipped managed-schema.json. Example **non-secret placeholders**:

| Property | Value |
| --- | --- |
| issuer | https://login.example.org/tenant/v2.0 |
| clientId | public-extension-client-123 |
| scope | openid profile api://secure-display.read |
| apiBaseUrl | https://api.example.org |
| allowedOrigin | https://app.example.org |
| tenantId | tenant_1 |
| allowDomReveal | false |

Chrome extension identity callback: https://EXTENSION-ID.chromiumapp.org/callback

Register a **public OAuth client with PKCE, no client secret**, at the IdP. This prototype requires the OIDC discovery issuer plus its authorization and token endpoints on the same HTTPS origin. Chrome host access for those configured endpoints is requested only after a user clicks Sign in. Some identity providers require additional API audience/scope and CORS arrangements. Do not assume any IdP or company will work until configured and tested.

The access token is kept only in the extension service-worker memory. Worker suspension clears the session; the user must sign in again. No refresh token, password or private keys are stored persistently.

## Company API contract (PROPOSAL, not deployed)

The company's server must authorize *each request* against the IdP access token's signature, issuer, audience, expiry, authorized tenant, role and document. The untrusted browser-provided tenantId header and requested origin are not proof of authorization. TLS and company authorization are mandatory.

1. GET https://api.example.org/v1/documents/:opaqueId with Authorization Bearer token. Expected JSON fields: version=1, algorithm=AES-256-GCM, documentId, audienceOrigin, keyId, ivBase64url (12-byte nonce), ciphertextBase64url (ciphertext plus 16-byte tag). The AES-GCM additional authenticated data is UTF-8 concatenation of secure-display/v1/ + documentId + / + audienceOrigin. Never reuse an AES-GCM nonce with the same content key.
2. The extension generates an ephemeral RSA-OAEP-3072 key pair (SHA-256) and sends only the public JWK to POST https://api.example.org/v1/documents/:opaqueId/release with keyId, documentId, audienceOrigin and a fresh nonce.
3. The server must validate authorization and wrap the document AES key to that public key using RSA-OAEP-256. Return a JSON object containing matching keyId, documentId, nonce, algorithm=RSA-OAEP-256 and wrappedKeyBase64url.
4. The extension checks the matching nonce and key identity, unwraps with its nonextractable private key, decrypts with authenticated AES-GCM and discards references after the request. This is not a formal production security review.

An authorized end user always has access to what the extension renders. Decryption in a browser is not secrecy from the authenticated recipient.

## Rendering and SSR boundary

Default: the plaintext is displayed only inside the Chrome extension popup using textContent. This is still readable/capturable by the human and browser.

Optional DOM reveal: only if the admin configures allowDomReveal=true AND a user clicks Reveal. A single element with data-secure-display-doc="opaque-document-id" receives textContent only, never untrusted HTML. **At that point plaintext is in the page DOM:** page scripts, DevTools, other extensions and screenshot tools can read it. Do not represent this as confidentiality or screen-capture exclusion. DOM mutations will invalidate static DRM fixtures.

Ordinary application layout/headers can be SSR. Sensitive plaintext cannot be both initially SSR in browser HTML and unavailable to the browser DOM. For sensitive fields, SSR may render placeholders/ciphertext followed by an authorized client reveal, not plaintext SSR.

## Tests

From the repo root:

    node --test experiments/chrome-extension/test/*.test.mjs
    bun run test

Tests cover PKCE, policy validation, AES-GCM with authenticated binding, ephemeral RSA wrapping, native protocol parsing and a fail-closed unsupported status. They do NOT test real SSO, enterprise backend, production key custody, macOS native capture exclusion, or browser capture protection.

**Privacy and safety:** Never commit real SSO tokens, DRM keys, passwords, company/customer/student data, browser extension signing private keys or host installation manifests with production secrets. Browser-side capture prevention also needs user-visible permission and anti-abuse controls. This research host makes no changes to third-party windows.

Further reading: [stock Chrome capture RFC](../../docs/STOCK_BROWSER_INTEGRATION_RFC.md), [capture research](../../docs/CAPTURE_PROTECTION_RESEARCH.md), [threat model](../../docs/THREAT_MODEL.md).
