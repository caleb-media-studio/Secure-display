# Publishing to npm, using npm or Bun

**No packages are published.** The workspace currently sets `"private": true` to prevent unreviewed publication. Do not remove that guard without explicit release approval.

## One registry, several installers

Publish to the **npm registry** once. Consumers can use any supported package manager:

```bash
npm install @caleb-media-studio-llc/react
bun add @caleb-media-studio-llc/react
pnpm add @caleb-media-studio-llc/react
```

These are **future commands**, not currently working installation instructions. `@secure-display` is an **npm scope**, which must belong to your own npm user or organization. Having a GitHub repository with this name does not grant npm namespace ownership. Verify the scope before a release, and rename all package imports/dependencies together if necessary.

## npm organization and scope

The user-provided npm organization is [caleb-media-studio-llc](https://www.npmjs.com/org/caleb-media-studio-llc). The package scope is **`@caleb-media-studio-llc`**. A URL does not itself verify the publisher's account permissions; check membership and publishing rights after logging in.


These manifests use the npm organization's scope, not the separate `caleb-media-studio` GitHub organization name. Keep the npm organization slug, internal dependencies, and documentation aligned before publication.

```bash
npm login
npm whoami
npm org ls caleb-media-studio-llc
npm view @caleb-media-studio-llc/react version
```

The last command can legitimately return a not-found error before the first publication. Do not interpret a nonexistent package as ownership evidence. Verify permissions in your npm organization's settings. The intended primary package is `@caleb-media-studio-llc/react`, with `@caleb-media-studio-llc/core` and `@caleb-media-studio-llc/secure-div` as runtime dependencies. If the organization slug is different, rename these manifests, their internal dependency names, imports and documentation consistently **before** the first publication.

The npm organization description is not the package description: the short summaries shown on npm come from each package's own `package.json`. Keep the repository private and package publishing disabled until the release gates are met.

## npm scope check

The canonical npm organization is [caleb-media-studio-llc](https://www.npmjs.com/org/caleb-media-studio-llc). All package manifests, internal dependency names, and new examples use the `@caleb-media-studio-llc` scope. The archived research log intentionally retains historical references. Run `bun run release:inspect` before preparing a release to reject outdated imports or accidental public package flags.

## Packages to release first

| Package | Why |
| --- | --- |
| `@caleb-media-studio-llc/core` | React package currently depends on it for DRM diagnostics |
| `@caleb-media-studio-llc/secure-div` | Native element, JS, CSS guard and TypeScript declarations |
| `@caleb-media-studio-llc/react` | Primary React API; depends on the above two |

`document` and `elements` are earlier research packages and should not automatically be released with the main React component. A public React tarball would **not** include a turnkey production DRM license server or general-purpose live JSX encoder.

## Safe preparation without publishing

```bash
bun install
bun run build
bun run release:inspect
bun run release:smoke:npm
bun run release:smoke:bun
npm pack --dry-run --workspace @caleb-media-studio-llc/core
npm pack --dry-run --workspace @caleb-media-studio-llc/secure-div
npm pack --dry-run --workspace @caleb-media-studio-llc/react
```

The release inspection checks compiled entrypoints, dependency links, CSS declarations and package boundaries. The two smoke tests also pack all three private packages into temporary tarballs, install them into a fresh application with npm and Bun respectively, and verify runtime imports, types and CSS without depending on monorepo links or publishing. They may download the public React peer dependency. Review exactly which files npm would expose. Running `npm pack` or `bun pm pack --dry-run` does **not** publish to the registry.

## Later: actual publication

Only after completing security, distribution and namespace checks:

1. Create/verify your npm account or organization, enable appropriate MFA, and ensure it owns the package scope.
2. Select a prerelease version such as `0.1.0-alpha.1`. Update the three manifest versions and cross-package dependencies consistently. Include correct repository and license metadata.
3. Confirm the tarballs contain only approved files and compiled TypeScript declarations. Never ship private keys, credentials, real records or unapproved fixtures.
4. Remove `private: true` from **only** the approved packages. Keep the research workspaces private until reviewed.
5. Authenticate with `npm login`, verify with `npm whoami`.
6. Publish dependencies before React, from each package directory. Example, once approved: `npm publish --access public --tag experimental`, or `bun publish --access public --tag experimental`. **Both target npm**, not a separate Bun registry.
7. Verify the published package and install it using npm **and** Bun in fresh projects, outside this monorepo.

New scoped public releases require `--access public`. A first publication can affect the `latest` tag even if a prerelease tag was requested, so review registry tag behavior rather than assuming a prerelease is invisible. A published package version cannot be silently replaced.

For later CI/CD, npm's **trusted publishing** supports OIDC from GitHub Actions without long-lived publish tokens. It requires properly configured package and workflow trust plus compatible Node/npm versions. The GitHub repo remains private for now; npm notes limitations on provenance for private source repos. No release workflow should be enabled until approved.

## Pre-publication gate

- [ ] npm scope ownership and release package names confirmed
- [x] Isolated npm and Bun install smoke tests are implemented (CI must pass for the exact release commit)
- [ ] Release commit's isolated install checks pass for both package managers
- [ ] Production DRM/license/key/authorization architecture reviewed
- [ ] Synthetic-only restrictions and confidentiality limits documented
- [ ] Actual target browsers and recording/screenshot/share methods tested
- [ ] No sensitive material in git history or packed artifacts
- [ ] Accessibility and platform behavior reviewed
- [ ] Explicit approval to make package contents public

Official docs: [npm scoped publishing](https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/), [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [Bun publish](https://bun.com/docs/pm/cli/publish), [Bun add](https://bun.com/docs/pm/cli/add).
