# One package: npm and Bun release preparation

The **only registry artifact** planned for this repository is `@caleb-media-studio-llc/secure-display`. The user's npm organization is [caleb-media-studio-llc](https://www.npmjs.com/org/caleb-media-studio-llc). The internal `core`, `react`, `secure-div`, `document` and `elements` folders remain **private research workspaces**, not separate npm releases.

**No publication is authorized yet.** The distribution package is `private: true`. This project remains research-only, uses public synthetic DRM test media, exposes original DOM text to inspection, and does not guarantee screenshot protection.

## Future consumer install

All installers use the same npm registry package. Only one Secure Display dependency is needed.

```bash
npm install @caleb-media-studio-llc/secure-display
# or
bun add @caleb-media-studio-llc/secure-display
# or
pnpm add @caleb-media-studio-llc/secure-display
```

React is a peer dependency for the React component. The package exports `SecureDiv`, `configureSecureDisplay`, optional status utilities, native `registerSecureDiv`, DRM probes and a `./secure-div.css` first-paint guard.

## Test locally without publishing

```bash
bun install
bun run build
bun run release:inspect
bun run release:smoke:npm
bun run release:smoke:bun
npm pack --dry-run --workspace @caleb-media-studio-llc/secure-display
```

The single distribution build bundles the private internal runtime code into one ESM entrypoint and carries self-contained TypeScript declarations and CSS. The release check rejects old multi-package dependencies and inspects the actual packed artifact. npm and Bun install the same **one tarball** into temporary projects and check imports and declarations. Neither `npm pack` nor these tests publishes anything.

## Publishing later, after approval

1. Confirm publishing rights for the `caleb-media-studio-llc` npm organization (`npm login`, `npm whoami`, `npm org ls caleb-media-studio-llc`).
2. Pick a prerelease such as `0.1.0-alpha.1` for **only** `@caleb-media-studio-llc/secure-display`. No three-package version synchronization.
3. Pass the release inspection, npm and Bun isolated install smoke tests, real-device test matrix, security and accessibility review. Read the tarball contents for sensitive files and confirm proper license and notices.
4. After explicit approval, remove `private: true` from **only** the one distribution manifest and publish from `packages/secure-display/` with `npm publish --access public --tag experimental`. Leave the internal research workspace packages private.
5. Verify the package and both installers in clean external projects. No publish automation or credentials are configured in this PR.

No standalone Shaka/DRM key server or private licensing credentials ship in the tarball. The one-time app configuration and the fixed build-time encrypted media are still required.

See [npm scoped package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [Bun publishing](https://bun.com/docs/pm/cli/publish) and [security limitations](THREAT_MODEL.md).
