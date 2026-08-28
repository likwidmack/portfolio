# npm security overrides

Root `package.json` `overrides` pin patched transitive versions when direct upgrades are not enough. Prefer bumping direct deps first; use overrides for deep/transitive CVEs.

## Current audit-related pins

| Package           | Pin       | Notes                                                                       |
| ----------------- | --------- | --------------------------------------------------------------------------- |
| `@nuxt/devtools`  | `^3.4.1`  | Direct + override; fixes unauthenticated DevTools RPC (GHSA-279x-mwfv-vcqv) |
| `nuxt`            | `^4.5.2`  | Direct + override; Nuxt 4.5.1+ security fixes                               |
| `brace-expansion` | `^5.0.9`  | DoS bypass of prior mitigation                                              |
| `fast-uri`        | `^3.1.5`  | Host confusion; stay on 3.x for `ajv`                                       |
| `js-yaml`         | `^4.3.1`  | `!!omap` CPU DoS on 3.x/4.x                                                 |
| `postcss`         | `^8.5.26` | Incomplete `sourceMappingURL` fix                                           |
| `undici`          | `^8.10.0` | Default; `nitro` nested override uses `^7.29.0` (same-major patch)          |

Nx packages are pinned to **22.7.8** (latest 22.x with CORS / remote-cache Zip-Slip fixes). Do not jump to Nx 23 without a deliberate migration.

`eslint-plugin-react` was removed: it is unused in flat configs and its peer range still caps at ESLint 9, which blocked `eslint@^10` installs.

`nuxt-content-assets` was removed: it was unused (commented out of `nuxt.config`) and pulled `image-size` (GHSA-w3rx-r6r6-pgpr / GHSA-5p2g-fcmc-qvqq). No patched `image-size` is published (`2.0.3` is not on npm). In-app docs use `@nuxt/content` + `@nuxt/image` instead.

## Verify

```bash
npm audit
```
