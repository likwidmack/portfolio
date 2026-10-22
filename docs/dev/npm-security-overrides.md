# npm security overrides

Root `package.json` `overrides` pin patched transitive versions when direct upgrades are not enough. Prefer bumping direct deps first; use overrides for deep/transitive CVEs.

Security updates must move versions forward and retain necessary packages. Do not run `npm audit fix --force` blindly: its suggested remediation can downgrade Nx, Nuxt, or i18n. Compare the resulting lockfile against the pre-update working copy, including existing uncommitted upgrades.

## Current audit-related pins

| Package           | Pin       | Notes                                                                                                  |
| ----------------- | --------- | ------------------------------------------------------------------------------------------------------ |
| `@nuxt/devtools`  | `^3.4.1`  | Direct + override; fixes unauthenticated DevTools RPC (GHSA-279x-mwfv-vcqv)                            |
| `nuxt`            | `^4.5.2`  | Direct + override; Nuxt 4.5.1+ security fixes                                                          |
| `axios`           | `^1.20.0` | Overrides Nx 22.7.12's exact 1.18.1 dependency; fixes Axios advisories affecting versions below 1.20.0 |
| `brace-expansion` | `^5.0.9`  | DoS bypass of prior mitigation                                                                         |
| `fast-uri`        | `^3.1.5`  | Host confusion; stay on 3.x for `ajv`                                                                  |
| `js-yaml`         | `^4.3.1`  | `!!omap` CPU DoS on 3.x/4.x                                                                            |
| `postcss`         | `^8.5.26` | Incomplete `sourceMappingURL` fix                                                                      |
| `undici`          | `^8.10.0` | Default; `nitro` nested override uses `^7.29.0` (same-major patch)                                     |

Nx and all direct `@nx/*` packages are pinned to **22.7.12**, including `@tgmc/likwidlibs`' `@nx/devkit` dependency. This fixes [local socket access](https://github.com/advisories/GHSA-w3vv-58gj-gw77) and [migration archive path traversal](https://github.com/advisories/GHSA-hrvq-x7jp-36xv), while retaining the earlier CORS / remote-cache Zip-Slip fixes. Nx 22.7.12 still pins Axios 1.18.1, so the Axios override remains necessary. Do not jump to Nx 23 without a deliberate migration.

`eslint-plugin-react` was removed: it is unused in flat configs and its peer range still caps at ESLint 9, which blocked `eslint@^10` installs.

`nuxt-content-assets` was removed: it was unused (commented out of `nuxt.config`) and pulled `image-size` (GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq). No patched `image-size` is published (`2.0.3` is not on npm). In-app docs use `@nuxt/content` + `@nuxt/image` instead.

## Unresolved upstream advisories (2026-10-04)

Updating Axios from 1.18.1 to 1.20.0 reduced `npm audit` from **33 to 17 high-severity findings**. Those counts include affected parent packages, not just distinct root vulnerabilities. The remaining findings originate from two packages with no patched npm release:

| Package            | Dependency path                                               | Advisory and upstream status                                                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `braces@3.0.3`     | `micromatch` → content, i18n, globbing and TypeScript tooling | [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): deeply nested patterns exhaust the stack. [Upstream issue #70](https://github.com/micromatch/braces/issues/70) remains open.                                                       |
| `node-forge@1.4.0` | `listhen` → Nuxt CLI, Nitro and IPX                           | [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv): malformed nested DigestAlgorithm elements can bypass RSA signature verification. [Upstream fix #1152](https://github.com/digitalbazaar/forge/pull/1152) is not merged or released. |

These remain unresolved, not suppressed or accepted as safe. Keep the required consumers installed. Recheck published versions and advisories before the next update; upgrade when compatible patched releases are available. Local patches do not change npm's version-based audit findings, and replacing a package with an unreviewed fork is not equivalent to an upstream security release.

## Recheck on 2026-10-05

The audit before the Nx patch update reported **28 high, 7 critical and 1 moderate** affected packages. With Nx 22.7.12 installed, it reports **13 high, 7 critical and 1 moderate**. Nx no longer appears in the findings. The counts include vulnerable consumers and can change when npm publishes advisories.

The `braces` and `node-forge` blockers above remain unresolved. New `simple-git@3.36.0` findings also affect Nuxt DevTools and its consumers:

- [Git configuration includes](https://github.com/advisories/GHSA-g4wm-2vf7-vfgr) and [abbreviated Git options](https://github.com/advisories/GHSA-858h-whjf-mvg5) permit command execution.
- [Trailer command configuration](https://github.com/advisories/GHSA-x6jw-m9v5-85vh) and [VISUAL editor detection](https://github.com/advisories/GHSA-v5rq-49vh-5v5c) produce critical findings.
- `simple-git@4.0.2` includes the fixes, but [v4 removes the default export](https://github.com/steveukx/git-js/releases/tag/simple-git@4.0.0) used by the installed `@nuxt/devtools@3.4.2`. Do not override 3.x to 4.x without adapting and testing that integration. npm proposes the DevTools 4 beta; adopting that prerelease requires a deliberate compatibility review.

Validation: installed Nx / DevKit / ESLint plugin versions are 22.7.12; `npm install --dry-run --ignore-scripts` resolves successfully; uncached Nx builds for `@tgmc/likwidlibs` and `@tgmc/theme` pass. This does not establish a clean security audit or validate a DevTools major upgrade. Existing staged and unstaged lockfile and prepare-script changes were preserved.

## Verify

```bash
npm audit
node -p "require('axios/package.json').version"
npm view braces version
npm view node-forge version
```

Validation for the Axios update: `npm install` completed theme compilation and both Nuxt prepare steps; `npx nx run @tgmc/theme:build --skipNxCache` and a local HTTP request using Axios 1.20.0 passed. Compared with the pre-update working lockfile, only Axios changed version, with no downgrades or removed packages. If npm retains an older installed Axios after a lockfile-only update, run `npm update axios --ignore-scripts` and verify the runtime version again.
