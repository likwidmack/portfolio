## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

On GitHub Pages, use the **topic** links (themed HTML). Filenames in the GitHub tree catalog: [docs/README.md](https://github.com/likwidmack/portfolio/blob/main/docs/README.md).

### This tree

| Topic                         | Path                 |
| ----------------------------- | -------------------- |
| [Contributing](contributing.html) | `contributing.md` |

### App (`@tgmc/web`)

| Topic                                                       | Path                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| [App docs hub](web/)                                        | `web/README.md`                                               |
| [Quick start](web/guides/quickstart.html)                   | `web/guides/quickstart.md`                                    |
| [Examples](web/guides/examples.html)                        | `web/guides/examples.md`                                      |
| [Environment variables](web/setup/environment.html)         | `web/setup/environment.md`                                    |
| [SSL / HTTPS](web/setup/ssl-setup.html)                     | `web/setup/ssl-setup.md`                                      |
| [Messages API](web/features/messages-api.html)              | `web/features/messages-api.md`                                |
| [Page data loading](web/features/page-data-loading.html)    | `web/features/page-data-loading.md`                           |
| [Gallery and docs hubs](web/features/gallery-and-docs.html) | `web/features/gallery-and-docs.md` (`/docs` via Work sub-nav) |
| [Data stores](web/data-stores.html)                         | `web/data-stores.md`                                          |
| [Project structure](web/reference/project-structure.html)   | `web/reference/project-structure.md`                          |
| [Architecture hub](web/reference/architecture.html)         | `web/reference/architecture.md`                               |
| [System C4](web/reference/system-c4.html)                   | `web/reference/system-c4.md`                                  |
| [API & store UML](web/reference/api-uml.html)               | `web/reference/api-uml.md`                                    |
| [Site wireframes](web/reference/site-wireframes.html)       | `web/reference/site-wireframes.md`                            |
| [Process sequences](web/reference/process-sequences.html)   | `web/reference/process-sequences.md`                          |
| [TypeScript types](web/reference/types.html)                | `web/reference/types.md`                                      |
| [TypeScript config](web/reference/typescript-config.html)   | `web/reference/typescript-config.md`                          |

### Packages

| Topic                                        | Path                                                   |
| -------------------------------------------- | ------------------------------------------------------ |
| [Packages index](packages/)                  | `packages/README.md`                                   |
| [`@tgmc/utilities`](packages/utilities.html) | `packages/utilities.md`                                |
| [`@tgmc/theme`](packages/theme.html)         | `packages/theme.md` (brand vs hue, `data-fit`, ratios) |

### Developer tooling

| Topic                                               | Path                               |
| --------------------------------------------------- | ---------------------------------- |
| [Dev tooling index](dev/)                           | `dev/README.md`                    |
| [npm overrides](dev/npm-security-overrides.html)    | `dev/npm-security-overrides.md`    |
| [Encapsulation](dev/encapsulation-remediation.html) | `dev/encapsulation-remediation.md` |

### Design history (not runbooks)

These directories are **not** built into Pages. Open them on GitHub:

| Topic         | On GitHub                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------ |
| Feature plans | [docs/plans/](https://github.com/likwidmack/portfolio/tree/main/docs/plans)                 |

### Code trees (on GitHub)

| Path                                                                                               | Use                                           |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`core/web/`](https://github.com/likwidmack/portfolio/tree/main/core/web)                   | Nuxt app; `nuxt.config.ts`                    |
| [`packages/`](https://github.com/likwidmack/portfolio/tree/main/packages)                   | `utilities`, `media-player`, `likwidlibs`     |
| [`theme/core/`](https://github.com/likwidmack/portfolio/tree/main/theme/core)               | `@tgmc/theme`                                 |
| `.github/workflows/` | Tests, sync, and GitHub profile YAML          |
