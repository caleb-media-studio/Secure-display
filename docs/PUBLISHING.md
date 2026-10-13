# One package: npm and Bun release preparation

The **only registry artifact** planned for this repository is `@caleb-media-studio-llc/secure-display`. The user's npm organization is [caleb-media-studio-llc](https://www.npmjs.com/org/caleb-media-studio-llc). The internal `core`, `react`, `secure-div`, `document` and `elements` folders remain **private research workspaces**, not separate npm releases.

**The first experimental release (`0.1.0-alpha.1`) has been published.** The checked-in next-release manifest retains `private: true` to prevent accidental additional releases. This project remains research-only, uses public synthetic DRM test media, exposes original DOM text to inspection, and does not guarantee screenshot protection.

## Experimental consumer install

All installers use the same npm registry package. Only one Secure Display dependency is needed.

```bash
npm install @caleb-media-studio-llc/secure-display@experimental
# or
bun add @caleb-media-studio-llc/secure-display@experimental
# or
pnpm add @caleb-media-studio-llc/secure-display@experimental
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
2. This branch prepares **`0.1.0-alpha.2`** for `@caleb-media-studio-llc/secure-display` because `0.1.0-alpha.1` is immutable on npm. No three-package version synchronization.
3. Pass the release inspection, npm and Bun isolated install smoke tests, real-device test matrix, security and accessibility review. Read the tarball contents for sensitive files and confirm proper license and notices.
4. After explicit approval, remove `private: true` from **only** the one distribution manifest and publish from `packages/secure-display/` with `npm publish --access public --tag experimental`. Leave the internal research workspace packages private.
5. Verify the package and both installers in clean external projects. No publish automation or credentials are configured in this PR.

No standalone Shaka/DRM key server or private licensing credentials ship in the tarball. The one-time app configuration and the fixed build-time encrypted media are still required.

See [npm scoped package publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [Bun publishing](https://bun.com/docs/pm/cli/publish) and [security limitations](THREAT_MODEL.md).

## npm organization team setup and publishing updates

An npm **team is not a package namespace reservation**. The first experimental package is now published; the `secure-display` team may be granted access from the npm organization once its permission is confirmed. A **Forbidden** page can also mean the npm account lacks organization management permissions; check the npm organization owner/admin role if it persists after publication.

The CLI command is **`npm publish`**, not `npm upload`. For a publicly available, explicitly approved experimental release: authenticate using `npm login`, confirm `npm whoami` and `npm org ls caleb-media-studio-llc`, run all release smoke checks, inspect `npm pack --dry-run --workspace @caleb-media-studio-llc/secure-display`, then (only after explicit approval and removing `private: true` **from the one distribution manifest**) run `npm publish --access public --tag experimental` inside `packages/secure-display`. Do not remove the private guard from internal workspaces. Ensure the version was explicitly chosen and does not already exist; npm published versions cannot be overwritten.

Once the package is listed under the npm organization, open the team's access page and grant the `secure-display` team the required read/write privileges. npm publishing may prompt for a 2FA code or other supported authentication; never paste tokens or codes into issues or chat. Public publication makes the included bundled JavaScript publicly accessible even if the GitHub repository remains private.

## Linked GitHub repository and clean package metadata

- Repository: [caleb-media-studio/Secure-display](https://github.com/caleb-media-studio/Secure-display). The URL in `repository.url` is the canonical Git endpoint. The `repository.directory` field is `packages/secure-display`.
- Homepage: [current source on `feat/initial-research-framework`](https://github.com/caleb-media-studio/Secure-display/tree/feat/initial-research-framework) while that PR remains a draft. GitHub `main` does not yet contain the complete package implementation.
- Issue tracker: [GitHub Issues](https://github.com/caleb-media-studio/Secure-display/issues).
- The single distributed tarball has no normal dependencies and **no devDependencies**; React remains in `peerDependencies`. Workspace packages still exist as unpublished local build-time inputs and are bundled by Vite. Do not put their names back into the distributable manifest.
- npm versions are immutable. The `0.1.0-alpha.1` metadata still lists those old development dependencies, but a new `0.1.0-alpha.2` tarball can omit them. `experimental` will move to the new version after publication. Consumers of the previous version will still see its historical metadata.

After a successful publish of the cleaned version, check: `npm view @caleb-media-studio-llc/secure-display@experimental devDependencies` (should be empty), `npm view @caleb-media-studio-llc/secure-display@experimental repository homepage bugs`, and the [npm package page](https://www.npmjs.com/package/@caleb-media-studio-llc/secure-display).
