# Contributing

## Documentation

1. Put durable instructions under [`docs/`](./), categorized by directory (see the catalog).
2. Link new pages from `docs/README.md` **and** `docs/_catalog.md` (GitHub Pages include).
3. Keep the [root README](https://github.com/tamaramack/portfolio#readme) short: badges, one quick start, links into `docs/`.
4. GitHub **About**, **topics**, and **Website** are not in Git. When those change, update [`docs/dev/github-access.md`](./dev/github-access.md) and `package.json` `keywords`, then run the documented `gh repo edit`.
5. Package READMEs (`docker/`, `infra/sam/`, `packages/*`) stay operational or package-local; they should point here for topology.

### Whenever documentation is altered

Treat every docs edit (new page, rewrite, or behavior change reflected in markdown) as a **content sync**, not a drive-by typo fix:

1. **Review related docs** — update cross-links, catalogs (`docs/README.md`, `docs/_catalog.md`), and any hub that points at the page (`docs/web/README.md`, `docs/packages/README.md`, agents map).
2. **Review inline comments / JSDoc** in the code the page describes; keep file headers and token comments aligned with the written contract (or delete stale comments).
3. **In-app `/docs`** — markdown under repo `docs/` is ingested in place (`core/web/shared/docs-source.ts`). Editing those files **is** updating docs content; do not copy into `core/web/content/`. Rebuild the web app when you need the Content dump refreshed for Lambda/Docker.
4. **Agents** — if the checklist wording in root `AGENTS.md` should change, edit `scripts/update-agents.mjs` (or `docs/agents/`) and regenerate; do not hand-edit `AGENTS.md`.

## Code

- Node **>=24** (`.nvmrc`).
- Format + lint: `npm run lint`. Hooks: [dev/git-hooks.md](./dev/git-hooks.md).
- Tests: `npm test`. E2E against `:4200`.
- Agents: [agents/README.md](./agents/README.md). Commit only files from the current task.

## Pull requests

- PRs into `development` or `main` run [CI](./cicd.md).
- Do not put `[skip ci]` on commits (required checks never report). Version-bump PRs use branch prefix `ci/version-bump-` and label `skip-ci`.
- Portable commit/PR/ruleset template for other agents: [templates/commit-pr-rules/](./templates/commit-pr-rules/).
