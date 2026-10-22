# Nuxt App Generator (`@tgmc/likwidlibs:nuxt-app`)

Nx workspace generator to scaffold enterprise-grade Nuxt 4 applications in the `@tgmc` monorepo.

## Usage

```bash
npx nx g @tgmc/likwidlibs:nuxt-app <app-name> [options]
```

Or run interactively:

```bash
npx nx g @tgmc/likwidlibs:nuxt-app
```

## Options

| Option             | Type      | Default      | Description                                                                        |
| ------------------ | --------- | ------------ | ---------------------------------------------------------------------------------- |
| `name`             | `string`  | _(prompted)_ | Name of the application (e.g., `portal`, `docs`, `store`).                         |
| `directory`        | `string`  | `core`       | Target directory relative to monorepo root.                                        |
| `deploymentTarget` | `string`  | `aws-sam`    | Target CD workflow: `aws-sam`, `docker-node`, or `static-cloudflare`.              |
| `includeE2e`       | `boolean` | `true`       | Whether to scaffold a companion Cypress a11y E2E test project (`core/<name>-e2e`). |

## What Gets Scaffolded

1. **Nuxt 4 Application (`core/<name>`)**:
   - Extends `@tgmc/nuxt-layer-base` in `nuxt.config.ts`.
   - Accessible layout shell (`app/app.vue`) with `<UiSkipLink />` and semantic landmark regions.
   - Example accessible landing page (`app/pages/index.vue`) utilizing theme tokens, touch targets, and `useA11yAnnouncer()`.
   - In-app axe-core accessibility test (`tests/a11y.spec.ts`, Vitest + jsdom); the generator's smoke spec runs it, ESLint and the E2E type-check on every generator test run.
   - ESM `eslint.config.js` on `@nuxt/eslint-config/flat`, with boundary rules guarding against `@tgmc/utilities/browser` imports in SSR code.
   - App `.gitignore` (`.nuxt`, `.output`, `.data`, `dist`, `node_modules`, `coverage`, logs, `.env*` except `.env.example`). `@nuxt/eslint-config` reads the nearest `.gitignore`, so the app's own file keeps lint scoped to the app.
   - Nx targets are inferred from `package.json` scripts and the config files (`nuxt.config.ts`, `vitest.config.ts`, `eslint.config.js`) — no `project.json`, like every project in this repo. Tags live in `package.json` → `nx.tags`.

2. **Companion E2E Suite (`core/<name>-e2e`)** _(optional)_: an ESM package (`"type": "module"`) whose `package.json` declares `nx.implicitDependencies: ["@tgmc/<name>"]` and the same `e2e` target as `core/web-e2e`.
   - Cypress 15 with axe-core injected by a `cy.runAxe()` command (`src/support/e2e.ts`) — no extra Cypress plugins.
   - Landing-page WCAG 2.2 AA audit and a keyboard check with `cy.press(Cypress.Keyboard.Keys.TAB)` (`src/e2e/a11y-audit.cy.ts`).

3. **Continuous Deployment (`.github/workflows/<name>-cd*.yml`)**, by `deploymentTarget`:
   - **`aws-sam`** (default): mirrors `cd-aws.yml` / `cd-aws-prod.yml` (cicd.md). `<name>-cd.yml` runs a `deployable-gate` job (is `@tgmc/<name>` affected?) and then `deploy-test` in the `test` Environment (environment-scoped `AWS_ROLE_ARN` for OIDC): `npm run build:libs`, Nitro `aws_lambda` build, `sam deploy` of the generated `core/<name>/infra/template.yaml` (`Stage=test`) and a smoke GET of the `HttpApiUrl` output. `<name>-cd-prod.yml` deploys `Stage=production` on a published (non-prerelease) Release or a `confirm=deploy` dispatch in the `production` Environment. The SAM stack is Lambda + HTTP API only; assets are inlined (`serveStatic: 'inline'`).
   - **`docker-node`**: containerized Nitro node-server build with GitHub Container Registry publish (add `core/<name>/Dockerfile` yourself).
   - **`static-cloudflare`**: static pre-rendering via `nuxt generate` and Cloudflare Pages deployment.
   - Every job sets `HUSKY: '0'` (repo CI policy).
