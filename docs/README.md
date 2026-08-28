# Documentation

Canonical instructions for **tgmc-portfolio** live in this folder. The [root README](https://github.com/likwidmack/portfolio#readme) is a GitHub landing page (badges, quick start, links).

**Start here:** [web/guides/quickstart.md](./web/guides/quickstart.md)

## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

### `docs/` (this tree)

| File                                   | Topic                             |
| -------------------------------------- | --------------------------------- |
| [index.md](./index.md)                 | GitHub Pages home                 |
| [README.md](./README.md)               | This catalog (GitHub tree view)   |
| [contributing.md](./contributing.md)   | How to change docs and code       |

### `docs/web/` — Nuxt app (`@tgmc/web`)

| Path                                                                       | Topic                                    |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [web/README.md](./web/README.md)                                           | App docs hub                             |
| [web/guides/quickstart.md](./web/guides/quickstart.md)                     | Local 5-minute setup                     |
| [web/guides/examples.md](./web/guides/examples.md)                         | CDN and feature examples                 |
| [web/setup/environment.md](./web/setup/environment.md)                     | `SYS_ENV`, secrets, runtimeConfig        |
| [web/setup/ssl-setup.md](./web/setup/ssl-setup.md)                         | Local HTTPS certs                        |
| [web/features/messages-api.md](./web/features/messages-api.md)             | Contact messages API                     |
| [web/features/page-data-loading.md](./web/features/page-data-loading.md)   | `useContentAsyncData`                    |
| [web/features/gallery-and-docs.md](./web/features/gallery-and-docs.md)     | `/gallery` grid + `/docs` (Work sub-nav) |
| [web/data-stores.md](./web/data-stores.md)                                 | SQLite / Postgres / Dynamo adapters      |
| [web/reference/project-structure.md](./web/reference/project-structure.md) | App layout                               |
| [web/reference/architecture.md](./web/reference/architecture.md)           | Architecture diagram hub                 |
| [web/reference/system-c4.md](./web/reference/system-c4.md)                 | C4 context, containers, deployment       |
| [web/reference/api-uml.md](./web/reference/api-uml.md)                     | API inventory and store UML              |
| [web/reference/site-wireframes.md](./web/reference/site-wireframes.md)     | Site map and page wireframes             |
| [web/reference/process-sequences.md](./web/reference/process-sequences.md) | UML sequences for key processes          |
| [web/reference/types.md](./web/reference/types.md)                         | TypeScript types                         |
| [web/reference/typescript-config.md](./web/reference/typescript-config.md) | Paths and compiler                       |

### `docs/packages/`

| File                                             | Topic                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| [packages/README.md](./packages/README.md)       | Workspace packages index                                                    |
| [packages/utilities.md](./packages/utilities.md) | `@tgmc/utilities` Node vs `/browser` vs `/universal`                        |
| [packages/theme.md](./packages/theme.md)         | `@tgmc/theme` tokens, brand vs hue scale, `data-fit`, ratios, container fit |

### `docs/dev/`

| File                                                                   | Topic                               |
| ---------------------------------------------------------------------- | ----------------------------------- |
| [dev/README.md](./dev/README.md)                                       | Developer tooling index             |
| [dev/npm-security-overrides.md](./dev/npm-security-overrides.md)       | npm overrides                       |
| [dev/encapsulation-remediation.md](./dev/encapsulation-remediation.md) | Layer / import boundaries           |

### Design history (not runbooks)

| Directory          | Topic                                      |
| ------------------ | ------------------------------------------ |
| [plans/](./plans/) | Feature plans (e.g. media-player MSE)      |

These are excluded from the GitHub Pages build (`docs/_config.yml`).

### Code trees (pointers only)

| Path                                          | Use                                      |
| --------------------------------------------- | ---------------------------------------- |
| [`core/web/`](../core/web/)                   | Nuxt app source; config `nuxt.config.ts` |
| [`packages/`](../packages/)                   | `utilities`, `media-player`, `likwidlibs`, `web-layer-admin` |
| [`theme/core/`](../theme/core/)               | Packaged theme (`@tgmc/theme`)           |
| [`.github/workflows/`](../.github/workflows/) | Tests, sync, and GitHub profile YAML     |
