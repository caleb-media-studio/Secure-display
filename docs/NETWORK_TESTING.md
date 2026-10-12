# Network testing Secure Display examples

**Purpose:** test synthetic DRM video/documents from a second device on the same trusted LAN. This is not a hosted or production server.

## 1. Start a local network Vite server

```sh
bun install
bun run example:document
```

All four Vite examples now bind to `0.0.0.0`, and Vite should print `Local:` and `Network:` URLs. You can also run `bun run example:fairplay`, `bun run example:elements`, or `bun run example:diagnostics`.

Without a TLS certificate, the server uses ordinary HTTP. The UI is accessible over LAN, but the DRM browser API may reject non-localhost HTTP: `http://localhost` is a secure-context exception, while `http://192.168.x.x` typically is not.

## 2. Enable HTTPS for DRM across the LAN

On the Mac running the Vite server:

```sh
brew install mkcert
mkcert -install
bun run network:cert
bun run example:document
```

The certificate-generation command includes localhost, your hostname and detected RFC1918 IPv4 LAN addresses in the certificate's SAN entries. It saves the generated certificate and private key into ignored `.secure-display-local/tls/`.

After certificate creation, the shared Vite config automatically enables HTTPS in every example. Open the printed **HTTPS** network URL on the other device, e.g. `https://192.168.1.50:5173`, matching the IP included in the certificate.

### Important trust requirement

The device opening the site **must trust the mkcert-generated local root CA**. Running `mkcert -install` on the Mac trusts it on that Mac, not automatically on your phone, iPad, or other computer. Other devices need separate, carefully considered CA installation and trust configuration; an untrusted certificate may prevent browser DRM APIs from working even when you proceed past a warning.

For a Mac or computer you control, install the appropriate mkcert CA following the [mkcert documentation](https://github.com/FiloSottile/mkcert). Never distribute the root CA **private key**, put any CA/HTTPS key in Git, or expose a local development certificate/private key using Vite `public/`. Never use these test resources to serve confidential data.

You can override the HTTPS files if necessary by setting **both** `SECURE_DISPLAY_HTTPS_CERT` and `SECURE_DISPLAY_HTTPS_KEY` to absolute paths or paths relative to the repository root. If only one file is present, Vite refuses to start.

## 3. Security and testing notes

- Use trusted home/test networks only; the server listens on all interfaces. Mac firewall or router isolation can prevent devices from connecting.
- Keep the ports firewalled from the internet. Do not port-forward Vite or use it on public/shared networks.
- Vite is a development server, not a secure application boundary. This example uses synthetic media and publicly known Axinom demo keys; it **must not** be exposed with real school or customer data.
- HTTPS does not by itself guarantee FairPlay or Widevine availability on another device. Hardware, browser support, output restrictions and DRM licensing can still prevent playback.
- After a LAN address change, stop the server and regenerate the certificate with `bun run network:cert` to include the new address.
- The app's configured manifest URL must remain reachable from that other device, and any DRM license endpoint must permit the requests.
