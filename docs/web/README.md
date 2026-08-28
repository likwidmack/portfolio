# App documentation (`docs/web`)

Guides for the Nuxt app `@tgmc/web` (`core/web`).

**Hub:** [Catalog](../) · **Agents:** [docs/agents/README.md](../agents/) · **CI/CD:** [docs/cicd.md](../cicd.md) · **Public IA / launch:** [portfolio-august-launch.md](../portfolio-august-launch.md)

## Public chrome (restyle IA)

Primary navigation (`AppPrimaryNav`): **Work** → `/work`, **About** → `/about`, **Gallery** → `/gallery`, **Writing** → `/blog`, **Code** → `/code`.

Work sub-navigation (`AppWorkSubNav` on `/work` and `/work/[slug]`): **Docs** → `/docs`, **AI Lab** → `/ai-lab`, **Process** → `/process`. Secondary demos (`/media-player`, `/product`, `/styles`) stay off the primary rail.

Shipped page layouts (ember brand; sparse `--portfolio-teal` on About résumé, Gallery stats, Code language tags):

| Surface           | Layout notes                                                                                   |
| ----------------- | ---------------------------------------------------------------------------------------------- |
| Home              | Fluid split hero (`data-fit="screen"`); ambient video confined to `.home-hero__visual`         |
| About             | Digital CV sidebar + sticky on-page nav (`data-fit="prose"`); teal résumé download             |
| Gallery           | Social feed/grid; default **grid**; teal engagement stats                                      |
| Writing (`/blog`) | Editorial shelf (`content/writing.json` essays + `/api/posts` notes) — not a flat “Notes” list |
| Code              | Editor chrome + explorer/repos; teal language tags                                             |
| Work              | Case-study grid + evidence dialog; Related sub-nav for Docs / AI Lab / Process                 |

Theme tokens and `data-fit`: [packages/theme.md](../packages/theme.md). Gallery + `/docs` hubs: [features/gallery-and-docs.md](./features/gallery-and-docs.md).

## Getting started

- [Quick start](./guides/quickstart.md)
- [Examples](./guides/examples.md)
- [Environment variables](./setup/environment.md)
- [SSL / HTTPS](./setup/ssl-setup.md)

## Features

- [CDN guide](./features/cdn-guide.md) · [CDN quick start](./features/cdn-quickstart.md)
- [Messages API](./features/messages-api.md)
- [Page data loading](./features/page-data-loading.md)
- [Gallery and technical docs](./features/gallery-and-docs.md)
- [Theme layout / page fit](../packages/theme.md) (`data-fit`, ratios, container fit)
- [Data stores](./data-stores.md) (SQLite / Postgres / DynamoDB)

## Reference

- [Project structure](./reference/project-structure.md)
- [Architecture hub](./reference/architecture.md) — [System C4](./reference/system-c4.md) · [API UML](./reference/api-uml.md) · [Wireframes](./reference/site-wireframes.md) · [Sequences](./reference/process-sequences.md)
- [TypeScript types](./reference/types.md)
- [TypeScript config](./reference/typescript-config.md)

## Commands

From **repo root** (not `core/web` alone):

```bash
npm run dev
npm run build
npm test
npm run lint
NUXT_APP_CDN_URL=https://cdn.example.com npm run build
```

## Source

| Path                      | Role                               |
| ------------------------- | ---------------------------------- |
| `core/web/nuxt.config.ts` | Aliases, Nitro, runtimeConfig, CDN |
| `core/web/package.json`   | App scripts                        |
| `.env*.example`           | Env templates                      |
