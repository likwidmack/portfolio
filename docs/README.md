# Documentation

Canonical instructions for **tgmc-portfolio** live in this folder. The [root README](../README.md) is a GitHub landing page (badges, quick start, links).

**GitHub Pages** publishes this tree (Jekyll Cayman). Source: `/docs`. Workflow: [`.github/workflows/pages.yml`](../.github/workflows/pages.yml).

**AI agents:** [agents/README.md](./agents/README.md) · [agents/map.md](./agents/map.md) · generated checklist [`AGENTS.md`](https://github.com/tamaramack/portfolio/blob/development/AGENTS.md)

**Humans:** [web/guides/quickstart.md](./web/guides/quickstart.md) · [cicd.md](./cicd.md)

## Catalog (by directory)

Instructions are grouped the same way as the repo. Prefer these pages over duplicating setup in package READMEs.

### `docs/` (this tree)

| File                                                       | Topic                                               |
| ---------------------------------------------------------- | --------------------------------------------------- |
| [index.md](./index.md)                                     | GitHub Pages home                                   |
| [README.md](./README.md)                                   | This catalog (GitHub tree view)                     |
| [cicd.md](./cicd.md)                                       | Four-env CI/CD, workflows, OIDC, versioning, CDN/S3 |
| [templates/nuxt-ssr-cicd/](./templates/nuxt-ssr-cicd/)     | Portable Nuxt SSR CI/CD template for other agents   |
| [templates/commit-pr-rules/](./templates/commit-pr-rules/) | Portable commit, PR, merge, and ruleset template    |
| [docker.md](./docker.md)                                   | Compose local/dev/test, host `.output`, ports       |
| [infra.md](./infra.md)                                     | SAM Lambda + DynamoDB + CloudFront                  |
| [contributing.md](./contributing.md)                       | How to change docs and code                         |
| [portfolio-august-launch.md](./portfolio-august-launch.md) | Public IA, restyle layouts, QA, release gates       |

### `docs/agents/`

| File                                                    | Topic                                                 |
| ------------------------------------------------------- | ----------------------------------------------------- |
| [README.md](./agents/README.md)                         | AI agent onboarding (commands, conventions, pitfalls) |
| [map.md](./agents/map.md)                               | Repo map: directory → purpose → source of truth       |
| [shared-cdn-handoff.md](./agents/shared-cdn-handoff.md) | Archived brief: shared test CDN with HyperActivity    |

Root [`AGENTS.md`](https://github.com/tamaramack/portfolio/blob/development/AGENTS.md) is a **generated checklist**. Edit `scripts/update-agents.mjs` or pages here; do not hand-edit `AGENTS.md`.

### `docs/web/` — Nuxt app (`@tgmc/web`)

| Path                                                                       | Topic                                    |
| -------------------------------------------------------------------------- | ---------------------------------------- |
| [web/README.md](./web/README.md)                                           | App docs hub                             |
| [web/guides/quickstart.md](./web/guides/quickstart.md)                     | Local 5-minute setup                     |
| [web/guides/examples.md](./web/guides/examples.md)                         | CDN and feature examples                 |
| [web/setup/environment.md](./web/setup/environment.md)                     | `SYS_ENV`, secrets, runtimeConfig        |
| [web/setup/ssl-setup.md](./web/setup/ssl-setup.md)                         | Local HTTPS certs                        |
| [web/features/cdn-guide.md](./web/features/cdn-guide.md)                   | CDN / `NUXT_APP_CDN_URL`                 |
| [web/features/cdn-quickstart.md](./web/features/cdn-quickstart.md)         | CDN cheat sheet                          |
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
| [dev/git-hooks.md](./dev/git-hooks.md)                                 | Husky, lint-staged, LF line endings |
| [dev/github-access.md](./dev/github-access.md)                         | GitHub About, topics, Pages, `gh`   |
| [dev/npm-security-overrides.md](./dev/npm-security-overrides.md)       | npm overrides                       |
| [dev/encapsulation-remediation.md](./dev/encapsulation-remediation.md) | Layer / import boundaries           |

### Design history (not runbooks)

| Directory                                  | Topic                                 |
| ------------------------------------------ | ------------------------------------- |
| [superpowers/specs/](./superpowers/specs/) | Locked design specs                   |
| [superpowers/plans/](./superpowers/plans/) | Implementation plans                  |
| [plans/](./plans/)                         | Feature plans (e.g. media-player MSE) |

These are excluded from the GitHub Pages build (`docs/_config.yml`).

### Code trees (pointers only)

| Path                                          | Use                                                        |
| --------------------------------------------- | ---------------------------------------------------------- |
| [`core/web/`](../core/web/)                   | Nuxt app source; config `nuxt.config.ts`                   |
| [`docker/`](../docker/)                       | Dockerfiles + Compose; details in [docker.md](./docker.md) |
| [`infra/sam/`](../infra/sam/)                 | SAM template; details in [infra.md](./infra.md)            |
| [`packages/`](../packages/)                   | `utilities`, `media-player`, `likwidlibs`                  |
| [`theme/core/`](../theme/core/)               | Packaged theme (`@tgmc/theme`)                             |
| [`scripts/`](../scripts/)                     | migrate, SAM, GitHub env, `update-agents.mjs`              |
| [`.github/workflows/`](../.github/workflows/) | CI/CD YAML; narrative in [cicd.md](./cicd.md)              |
