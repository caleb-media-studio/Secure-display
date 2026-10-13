# npm publishing: automated experimental releases

The **only** public npm package is [`@caleb-media-studio-llc/secure-display`](https://www.npmjs.com/package/@caleb-media-studio-llc/secure-display). All core, React and native internal workspaces are **private source packages**, bundled into this one artifact. React remains a peer dependency.

This remains research software. Its synthetic public DRM test keys are not confidential, the live DOM is inspectable, and hardware screenshot exclusion is not guaranteed.

## What happens after a push to main?

[GitHub Actions `.github/workflows/publish.yml`](../.github/workflows/publish.yml) runs for pushes to `main`. A full test-and-pack job runs **without publish credentials**. It installs the monorepo, typechecks, tests, builds all examples, checks the single package's layout, performs both isolated npm and Bun consumer tests, and runs browser DOM smoke checks.

Only if all checks pass, a tiny CI helper temporarily edits the **one** distributable package manifest in the runner to remove `private: true` and generate a unique SemVer prerelease. The tracked manifest stays private. The runner packs and uploads **exactly one npm tarball**.

A separate job downloads that tested artifact and publishes it using **npm Trusted Publishing with GitHub Actions OIDC**. It needs no npm token or repository secrets. npm provenance links the release to GitHub.

Publishing happens automatically only after you complete the one-time npm Trusted Publisher configuration below. The first workflow run will fail at publish until configured.

### Versioning and tags

The tracked `packages/secure-display/package.json` version is the SemVer **base**. For example, from base `0.1.0-alpha.2`, GitHub Actions run 7 attempt 1 builds `0.1.0-main.7.1`. Retrying produces `0.1.0-main.7.2`; each version is immutable.

All automatic builds publish to the **`experimental`** npm dist-tag. They do not change `latest` and do not create Git commits or Git tags. `bun add @caleb-media-studio-llc/secure-display@experimental` fetches the newest experimental build.

Rapid consecutive pushes may be coalesced while a publish workflow is pending; the latest successful `main` run should ultimately lead the `experimental` tag. CI failures prevent publication.

For a new base release line, explicitly update the package version and the internal example workspace references together. Do not bump internal private packages' versions as independent registry releases.

## One-time npm Trusted Publishing setup (required)

Open [the npm package page](https://www.npmjs.com/package/@caleb-media-studio-llc/secure-display) and choose **Settings → Trusted Publishing → GitHub Actions**.

Use exactly:

| npm field | Value |
| --- | --- |
| GitHub organization or username | `caleb-media-studio` |
| GitHub repository | `Secure-display` |
| Workflow filename | `publish.yml` |
| GitHub environment | **Leave blank** |
| Allowed actions | **Enable `npm publish`** |

GitHub repo owner is **not** the same as the npm organization name `caleb-media-studio-llc`. The workflow filename is case-sensitive and must not include `.github/workflows/` in the npm form. npm may require account authentication to save the trust relationship. There is no `NPM_TOKEN` secret.

Official documentation: [npm Trusted Publishers](https://docs.npmjs.com/trusted-publishers/).

The build uses a GitHub-hosted Linux runner, Node 24, and a compatible npm 11 CLI, with `id-token: write` only on the final publishing job.

## Local validation (never publishes)

```bash
git switch main
git pull --ff-only
bun install
bun run typecheck
bun run test
bun run build
bun run release:inspect
bun run release:smoke:npm
bun run release:smoke:bun
```

The tracked npm manifest's `private: true` flag is intentional and is checked by `release:inspect`. Do not remove it or commit a publishable manifest. Never save an npm token in repository files.

After a successful automatic run, verify:

```bash
npm view @caleb-media-studio-llc/secure-display@experimental version
npm view @caleb-media-studio-llc/secure-display@experimental dependencies
npm view @caleb-media-studio-llc/secure-display@experimental devDependencies
npm view @caleb-media-studio-llc/secure-display@experimental repository homepage
```

If the publishing job fails with `ENEEDAUTH`, `E404` or `E403`, check the exact npm Trusted Publisher settings, including **`npm publish` allowed actions**, rather than creating a token. A browser-tested build does not prove universal screenshot exclusion.

### Changing to stable releases later

Leave `experimental` until browser and hardware tests substantiate the product. Making a stable release or moving `latest` should be a separate, deliberate release policy change.

Apache-2.0. © Caleb Media Studio LLC.
