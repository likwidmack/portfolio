# Tamara Mack — public portfolio source

Public source showcase for Tamara Mack, Founder of HyperActivity and Creative Technologist.

The **live site** stays at [tamaramack.github.io](https://tamaramack.github.io/). This repository is not a GitHub Pages host.

## Audience

Developers who want to read the Nuxt 4 / Nitro profile source, run it locally, and compare tagged public snapshots.

## Requirements

- Node.js 22.19 or newer
- npm 10 or newer

The upstream tree used pnpm. This snapshot installs with npm. If you are restoring a Vue CLI tag that still depends on `node-sass@4`, use the Node version in `.nvmrc` from that tag before `npm ci`.

Kendo UI (`@progress/*`) is a vendor dependency when present on older tags. It stays so the tree matches production; this README does not grant a Kendo license.

## Quick start

```bash
npm ci
npm run serve
```

The app listens on **http://127.0.0.1:9200**.

| Script | What it does |
| --- | --- |
| `npm run serve` / `npm start` | Dev server on port 9200 |
| `npm run build` | Production build |
| `npm run typecheck` | Nuxt TypeScript check (Nuxt tags) |
| `npm run test:unit` | Sanitizer unit tests |

## Public routes

| Path | Page |
| --- | --- |
| `/` | Home |
| `/practice` | Capabilities |
| `/hyperactivity` | Firm |
| `/portfolio` | Links hub |
| `/architecture` | Stack notes |
| `/about` | Biography |
| `/about/resume` | Experience |

## Layout

```
app/           Nuxt pages, layouts, components, SCSS
server/api/    Nitro handlers
shared/        Profile, practice, and experience content
public/        Favicon and robots.txt
sync/          Allowlist snapshot tooling
templates/     Dest-owned README, LICENSE, gitignore overlays
```

Hidden Vue CLI directories (`src/js/.sys`, `src/css/.sys`, `api/.api`) are kept when those tags still exist. Do not delete them; the app imports them.

## Related links

| Label | URL |
| --- | --- |
| Live profile | https://tamaramack.github.io/ |
| Creative work | https://likwidmack.com |
| Upstream source | https://github.com/tamaramack/tamaramack.github.io |

## License

BSD-2-Clause. See [LICENSE](LICENSE).
