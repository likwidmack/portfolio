## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

On GitHub Pages, use the **topic** links (themed HTML). Filenames in the GitHub tree catalog: [docs/README.md](https://github.com/likwidmack/portfolio/blob/development/docs/README.md).

### This tree

| Topic                                                    | Path                                               |
| -------------------------------------------------------- | -------------------------------------------------- |
| [CI/CD](cicd.html)                                       | `cicd.md`                                          |
| [Docker](docker.html)                                    | `docker.md` (local/dev/test Compose)               |
| [SAM / AWS](infra.html)                                  | `infra.md`                                         |
| [Contributing](contributing.html)                        | `contributing.md`                                  |
| [August launch](portfolio-august-launch.html)            | `portfolio-august-launch.md` (public IA + restyle) |
| [Nuxt SSR CI/CD template](templates/nuxt-ssr-cicd/)      | `templates/nuxt-ssr-cicd/`                         |
| [Commit / PR rules template](templates/commit-pr-rules/) | `templates/commit-pr-rules/`                       |

### Agents

| Topic                                                | Path                                                    |
| ---------------------------------------------------- | ------------------------------------------------------- |
| [Agent guide](agents/)                               | `agents/README.md`                                      |
| [Repo map](agents/map.html)                          | `agents/map.md`                                         |
| [Shared CDN handoff](agents/shared-cdn-handoff.html) | `agents/shared-cdn-handoff.md` (archived; see infra.md) |

Root [AGENTS.md](https://github.com/likwidmack/portfolio/blob/development/AGENTS.md) is a **generated checklist**. Edit `scripts/update-agents.mjs` or pages here; do not hand-edit `AGENTS.md`.

### App (`@tgmc/web`)

| Topic                                                       | Path                                                          |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| [App docs hub](web/)                                        | `web/README.md`                                               |
| [Quick start](web/guides/quickstart.html)                   | `web/guides/quickstart.md`                                    |
| [Examples](web/guides/examples.html)                        | `web/guides/examples.md`                                      |
| [Environment variables](web/setup/environment.html)         | `web/setup/environment.md`                                    |
| [SSL / HTTPS](web/setup/ssl-setup.html)                     | `web/setup/ssl-setup.md`                                      |
| [CDN guide](web/features/cdn-guide.html)                    | `web/features/cdn-guide.md`                                   |
| [CDN quick start](web/features/cdn-quickstart.html)         | `web/features/cdn-quickstart.md`                              |
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
| [Git hooks](dev/git-hooks.html)                     | `dev/git-hooks.md`                 |
| [GitHub access](dev/github-access.html)             | `dev/github-access.md`             |
| [npm overrides](dev/npm-security-overrides.html)    | `dev/npm-security-overrides.md`    |
| [Encapsulation](dev/encapsulation-remediation.html) | `dev/encapsulation-remediation.md` |

### Design history (not runbooks)

These directories are **not** built into Pages. Open them on GitHub:

| Topic                | On GitHub                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| Locked design specs  | [docs/superpowers/specs/](https://github.com/likwidmack/portfolio/tree/development/docs/superpowers/specs) |
| Implementation plans | [docs/superpowers/plans/](https://github.com/likwidmack/portfolio/tree/development/docs/superpowers/plans) |
| Feature plans        | [docs/plans/](https://github.com/likwidmack/portfolio/tree/development/docs/plans)                         |

### Code trees (on GitHub)

| Path                                                                                               | Use                                           |
| -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| [`core/web/`](https://github.com/likwidmack/portfolio/tree/development/core/web)                   | Nuxt app; `nuxt.config.ts`                    |
| [`docker/`](https://github.com/likwidmack/portfolio/tree/development/docker)                       | Compose + Dockerfiles; [Docker](docker.html)  |
| [`infra/sam/`](https://github.com/likwidmack/portfolio/tree/development/infra/sam)                 | SAM template; [SAM / AWS](infra.html)         |
| [`packages/`](https://github.com/likwidmack/portfolio/tree/development/packages)                   | `utilities`, `media-player`, `likwidlibs`     |
| [`theme/core/`](https://github.com/likwidmack/portfolio/tree/development/theme/core)               | `@tgmc/theme`                                 |
| [`scripts/`](https://github.com/likwidmack/portfolio/tree/development/scripts)                     | migrate, SAM, GitHub env, `update-agents.mjs` |
| [`.github/workflows/`](https://github.com/likwidmack/portfolio/tree/development/.github/workflows) | CI/CD YAML; [CI/CD](cicd.html)                |
