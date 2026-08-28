# `@tgmc/utilities`

Shared TypeScript utilities for TGMC apps: env/type helpers, Consola logging, deep merge helpers, Node/DOM events, and browser storage.

Longer reference: [`docs/packages/utilities.md`](../../docs/packages/utilities.md).

## Entries

| Import                      | Runtime                   | Contents                                                                                                                                        |
| --------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `@tgmc/utilities`           | Node / Nitro / AWS Lambda | Env helpers, `Logging`, `deepAssign` / `deepSet`, CDN helpers, `toSnakeCase`, Node `EventHandler` / `EventsHandler`                             |
| `@tgmc/utilities/browser`   | Browser only              | DOM events, `WebStorageService` / `StorageService`, `WebStorage`, `StorageProperty`, `StorageQueue`, `debounce`, `throttle`, `FakeLocalStorage` |
| `@tgmc/utilities/universal` | SSR and browser           | Runtime-neutral CDN helpers and `toSnakeCase`; excludes Node events and DOM/storage APIs                                                        |

Do **not** import `@tgmc/utilities/browser` from Nitro server code or Lambda handlers.

Use `@tgmc/utilities/universal` from modules shared by server rendering and Vite's client graph so the default entry's Node `EventEmitter` dependency is not bundled for browsers.

Default vs browser `EventHandler` / `EventsHandler` are **different implementations** (Node `EventEmitter` vs DOM `CustomEvent`). Import the entry that matches the target runtime.

## Install / workspace

This package is a workspace dependency (`"@tgmc/utilities": "*"`). Build before consumers that resolve `dist`:

```bash
npm run build --workspace=@tgmc/utilities
```

## Quick examples

### Default entry (Node-safe)

```ts
import { isNodeEnv, deepAssign, Logging, EventsHandler } from '@tgmc/utilities';

isNodeEnv(); // true under Node / Nitro

deepAssign({ a: { x: 1 } }, { a: { y: 2 } });
// → { a: { x: 1, y: 2 } }

const log = new Logging({ scope: 'api', level: 4 });
log.info('ready');

const bus = new EventsHandler();
bus.on('ping', (e) => console.log(e.type));
bus.dispatch('ping', { type: 'ping' } as Event);
```

### Browser entry

```ts
import { WebStorage, WebStorageService, debounce, EventsHandler } from '@tgmc/utilities/browser';

const store = new WebStorage('app', { prefix: 'likwidmack:web' });
store.set('theme', 'dark');
store.get('theme'); // 'dark'

const svc = new WebStorageService('local');
await svc.set('user', { id: 1 });
await svc.get<{ id: number }>('user');

const save = debounce((v: string) => store.set('draft', v), 100, false);

const bus = new EventsHandler();
bus.add('ready', () => {});
```

## API overview

### `@tgmc/utilities`

| Export                                                                                                   | Role                                                       |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `isUnd` / `isObject` / `isFunc` / `isClass`                                                              | Type guards                                                |
| `isNodeEnv` / `isBrowserEnv`                                                                             | Runtime detection                                          |
| `Logging`                                                                                                | Consola-backed logger                                      |
| `deepAssign`                                                                                             | Recursive object merge (arrays via `deepSet`)              |
| `deepSet`                                                                                                | Unique array merge (**not** a path setter)                 |
| `resolveCdnPath` / `resolveCdnPaths` / `createCdnHelper` / `buildCdnUrl` / `isCdnUrl` / `stripCdnPrefix` | CDN URL helpers (`CdnConfig`)                              |
| `toSnakeCase`                                                                                            | camelCase → `snake_case`                                   |
| `EventHandler`                                                                                           | Node `EventEmitter` subclass                               |
| `EventsHandler`                                                                                          | Per-instance pub/sub (`on` / `off` / `dispatch` / `clear`) |
| `NodeEventsHandler`                                                                                      | Default export alias of `EventsHandler`                    |

### `@tgmc/utilities/browser`

| Export              | Role                                                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| `EventHandler`      | DOM `CustomEvent` (may dispatch on `document` at construct)                     |
| `EventsHandler`     | Per-instance pub/sub + `add` / `remove` / `removeAll`                           |
| `WebStorageService` | local / session / cookie + JSON; SSR-safe async API                             |
| `StorageService`    | Alias of `WebStorageService`                                                    |
| `storage`           | Singleton `WebStorageService`                                                   |
| Sync helpers        | `setItem` / `getItem` / `removeItem` / `clearStorage` / `length` on the service |
| `FakeLocalStorage`  | In-memory Storage-like (missing → `null`)                                       |
| `WebStorage`        | Debounced property map; optional `prefix` (default `'likwidmack:web'`)          |
| `StorageProperty`   | Single keyed value + archive                                                    |
| `StorageQueue`      | Macrotask drain queue                                                           |
| `debounce`          | Leading/trailing debounce helper                                                |
| `throttle`          | Rate-limited callback helper                                                    |

## Build / test / publish

```bash
# Build
npm run build --workspace=@tgmc/utilities

# Test — specs live under packages/utilities/tests/
npx nx test utilities
# or
npx vitest run --config packages/utilities/vitest.config.mts
```

Publishing is manual (not CI-wired). With `@tgmc` org access:

```bash
npm run build --workspace=@tgmc/utilities
npm pack --dry-run --workspace=@tgmc/utilities
npm publish --workspace=@tgmc/utilities
```

## Related

- Design: [`docs/superpowers/specs/2026-07-29-utilities-harden-and-storage-move-design.md`](../../docs/superpowers/specs/2026-07-29-utilities-harden-and-storage-move-design.md)
- Lambda-safe entry: [`docs/superpowers/specs/2026-07-28-utilities-lambda-ready-design.md`](../../docs/superpowers/specs/2026-07-28-utilities-lambda-ready-design.md)
