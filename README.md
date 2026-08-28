# portfolio

Public, sanitized source for Tamara Mack’s Nx + Nuxt 4 portfolio.

- Live site: [likwidmack.com](https://likwidmack.com)
- Private source of truth: `tamaramack/portfolio`
- This mirror: [likwidmack/portfolio](https://github.com/likwidmack/portfolio)

Synced from `development` (`c259145`). Private env templates, AWS/SAM and Docker internals, GitHub admin scripts, agent/dot-directory tooling, archives, and admin packages are omitted.

## Run locally

Requires Node.js >= 24.

```bash
npm ci
npm run dev
```

App: `http://localhost:4200`.

## Sync

Tag releases on `tamaramack/portfolio` refresh this tree (or run **Actions → Sync public mirror**). Keep-list: `sync/allowlist.txt`.

The sync workflow needs repository secret `TM_GH_TOKEN` (tamaramack PAT: Contents read on `tamaramack/portfolio`). Dest API / collaborator invite uses `LK_GH_TOKEN` (likwidmack PAT: Administration + Contents + Pull requests write on this repo). Optional `CURSOR_API_KEY` runs a Cursor SDK review that comments on the sync PR and does not copy files from the private source.
