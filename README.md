# tgmc-portfolio

[![Tests](https://github.com/likwidmack/portfolio/actions/workflows/test.yml/badge.svg)](https://github.com/likwidmack/portfolio/actions/workflows/test.yml)
[![Node](https://img.shields.io/badge/node-%3E%3D24-brightgreen)](.nvmrc)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nx + Nuxt 4 monorepo for Tamara Mack’s web portfolio (`@tgmc/web`): Nitro SSR, shared packages, and local SQLite.

This repository is the source hub for the [Nuxt 4](docs/web/README.md) SSR site and [Nx](docs/packages/README.md) workspace packages. It orchestrates that stack; it does not replace Nuxt.

**Full documentation:** [docs/](docs/README.md) · **Live site:** [likwidmack.com](https://likwidmack.com)

## Who this is for

- Engineers reviewing a Nuxt 4 + Nitro SSR portfolio with an Nx monorepo
- Contributors working in this repo

## Table of contents

- [Who this is for](#who-this-is-for)
- [About](#about)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Repository layout](#repository-layout)
- [Contributing](#contributing)
- [License](#license)

## About

| Piece        | Role                                                      |
| ------------ | --------------------------------------------------------- |
| `core/web`   | Nuxt 4 app (`@tgmc/web`), Nitro SSR                       |
| `theme/core` | `@tgmc/theme` design tokens                               |
| `packages/*` | `utilities`, `media-player`, `likwidlibs`, `web-layer-admin` |

## Requirements

- Node.js **>= 24** (`.nvmrc`, `engine-strict`)
- npm

## Quick start

```bash
npm ci
npm run dev
```

App: `http://localhost:4200`. HTTPS: [docs/web/setup/ssl-setup.md](docs/web/setup/ssl-setup.md).

## Documentation

Instructions live under **`docs/`**. Do not grow this README with runbooks.

| Start here            | Link                                                           |
| --------------------- | -------------------------------------------------------------- |
| Catalog (all topics)  | [docs/README.md](docs/README.md)                               |
| GitHub Pages home     | [docs/index.md](docs/index.md)                                 |
| App quick start       | [docs/web/guides/quickstart.md](docs/web/guides/quickstart.md) |
| Environment variables | [docs/web/setup/environment.md](docs/web/setup/environment.md) |
| App docs              | [docs/web/README.md](docs/web/README.md)                       |
| Packages              | [docs/packages/README.md](docs/packages/README.md)             |
| Contributing          | [docs/contributing.md](docs/contributing.md)                   |

## Repository layout

| Path          | Docs                                      |
| ------------- | ----------------------------------------- |
| `core/web/`   | [docs/web/](docs/web/README.md)           |
| `packages/`   | [docs/packages/](docs/packages/README.md) |
| `theme/core/` | [docs/packages/theme.md](docs/packages/theme.md) |

## Contributing

See [docs/contributing.md](docs/contributing.md).

## License

[MIT](LICENSE) © Tamara Mack
