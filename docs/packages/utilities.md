# `@tgmc/utilities` reference

Package README (quick start + tables): [`packages/utilities/README.md`](https://github.com/tamaramack/portfolio/blob/development/packages/utilities/README.md).

This page expands usage notes, entry boundaries, and API behavior for agents and app developers.

## When to use which entry

| Need                                              | Import                      |
| ------------------------------------------------- | --------------------------- |
| Server / Nitro / Lambda / Vitest `node`           | `@tgmc/utilities`           |
| Browser client, jsdom tests, storage / DOM events | `@tgmc/utilities/browser`   |
| Shared SSR/client CDN and string helpers          | `@tgmc/utilities/universal` |

The default entry must stay free of `window` / `document` / `localStorage` at **module load**. Browser APIs live only on the `/browser` subpath. Shared client/server modules should use `/universal` so Node `EventEmitter` never enters Vite's browser graph.

`core/web` keeps thin re-exports under `services/storage/*` and `shared/utils/debounce.ts` that forward to `@tgmc/utilities/browser` for stable app import paths.

## Node surface (`@tgmc/utilities`)

### Type / env

- `isUnd(x)` — `undefined` or `null`
- `isObject(x)` — plain object (`[object Object]`)
- `isFunc(x)` — function via `toString` tag
- `isClass(x)` — object/function with a callable `constructor` (note: many plain objects qualify because `Object` is a function)
- `isNodeEnv()` / `isBrowserEnv()` — safe try/catch detection

### `deepAssign` / `deepSet`

`deepAssign(root, ...sources)` mutates `root`:

- Nested plain objects (and class instances as targets) recurse
- Matching arrays unique-merge through `deepSet`
- Other values overwrite

`deepSet(rootArray, ...arrays)` flattens and dedupes with `Set`. It is **not** lodash-style path assignment.

## Runtime-neutral helpers (`@tgmc/utilities/universal`)

### CDN helpers

```ts
import { resolveCdnPath, createCdnHelper } from '@tgmc/utilities/universal';

resolveCdnPath('/images/hero.webp', 'https://cdn.example.com');
createCdnHelper('https://cdn.example.com').resolve('/a.png');
```

Also: `resolveCdnPaths`, `buildCdnUrl`, `isCdnUrl`, `stripCdnPrefix`, type `CdnConfig`.

### `toSnakeCase`

```ts
import { toSnakeCase } from '@tgmc/utilities/universal';
toSnakeCase('fooBar'); // 'foo_bar'
```

## Node-only classes (`@tgmc/utilities`)

### `Logging`

```ts
import { Logging } from '@tgmc/utilities';

const log = new Logging({ scope: 'web', level: 4 });
log.debug('…');
log.info('…');
log.warn('…');
log.error('…');
```

Methods forward to Consola. `group` / `groupCollapsed` / `groupEnd` use `console`.

### Events (Node)

```ts
import { EventsHandler } from '@tgmc/utilities';

const a = new EventsHandler();
const b = new EventsHandler();
// a and b do not share listeners
```

API: `on` / `off` / `dispatch` / `clear(true | 'all' | '*' | eventName)`.

## Browser surface (`@tgmc/utilities/browser`)

### Events (DOM)

Same `on` / `off` / `dispatch` model, plus aliases `add` / `remove` / `removeAll`.  
`EventHandler` extends `CustomEvent` and dispatches on `document` when constructed in a browser.

### `WebStorageService`

Drivers: `'local' | 'session' | 'cookie'`.

- Async: `set` / `get` / `remove` / `has` / `clear` — SSR-safe
- Sync (default driver, Web Storage only): `setItem` / `getItem` / `removeItem` / `clearStorage` / `length`
- `StorageService` is an alias; `storage` is a default-driver singleton

Values are JSON-serialized. Cookie writes use `document.cookie` with optional `CookieOptions`.

### `WebStorage` / `StorageProperty`

High-level map with 100ms debounce for updates to **existing** keys. New keys persist immediately.

```ts
import { WebStorage } from '@tgmc/utilities/browser';

const store = new WebStorage('session', { prefix: 'likwidmack:web' });
store.set('theme', 'dark'); // immediate
store.set('theme', 'light'); // debounced batch
store.remove('theme'); // archived + dropped from map (key can be set again)
```

Default prefix is `'likwidmack:web'` (keep aligned with `unique_web_id` in `core/web` when using that constant).

### `StorageQueue` / `debounce` / `throttle` / `FakeLocalStorage`

- `StorageQueue` — process one item per macrotask; `clear()` invalidates in-flight drains
- `debounce(fn, delay?, immediate?)` — leading edge when `immediate` is true (default)
- `throttle(fn, delay?)` — at most once per `delay` ms, with trailing schedule
- `FakeLocalStorage` — memory-first Storage-like; missing keys → `null`

## Testing

Package specs live under `packages/utilities/tests/` (not under `src/`).

```bash
npx nx run @tgmc/utilities:build
npx nx run @tgmc/utilities:test
# or via root CI entry (builds utilities + media-player dists first):
npm test
```

Nx `test` only depends on `^build` (dependency packages). This package’s own `test` target also depends on `build` so `dist/` exists for consumers. Root `scripts/test-web.sh` builds `@tgmc/utilities` and `@tgmc/media-player` before web Vitest, because web imports resolve through package `exports` → `dist/*` (not the `tgmc-portfolio` → `src` condition).

Browser modules use `// @vitest-environment jsdom` on individual specs. Default Vitest environment for the package is `node`.

## Design history

- [Lambda-ready entry split](https://github.com/tamaramack/portfolio/blob/development/docs/superpowers/specs/2026-07-28-utilities-lambda-ready-design.md)
- [Harden + storage move](https://github.com/tamaramack/portfolio/blob/development/docs/superpowers/specs/2026-07-29-utilities-harden-and-storage-move-design.md)
