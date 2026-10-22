/**
 * Which store backs messages, posts and the media catalog.
 *
 * - `sqlite`   — host `npm run dev` (`SYS_ENV=local`); media blobs on the filesystem.
 * - `dynamodb` — every Docker stack (DynamoDB Local + MinIO) and AWS test/production (DynamoDB + S3).
 * - `postgres` — opt-in only (compose profile `postgres`).
 */
export const DATA_BACKENDS = ['sqlite', 'postgres', 'dynamodb'] as const;

export type DataBackend = (typeof DATA_BACKENDS)[number];

type DataBackendEnv = Record<string, string | undefined>;

const isDataBackend = (value: string): value is DataBackend => (DATA_BACKENDS as readonly string[]).includes(value);

/**
 * Default backend for a `SYS_ENV`. Mirrors the Nuxt SYS_ENV normalizer: the legacy `remote` means
 * `development`, and a missing, blank or unknown value means `local`.
 */
const defaultDataBackend = (sysEnv: string | undefined): DataBackend => {
  switch (sysEnv?.trim()) {
    case 'development':
    case 'remote':
    case 'test':
    case 'production':
      return 'dynamodb';
    default:
      return 'sqlite';
  }
};

/**
 * Resolve the data backend. `DATA_BACKEND=sqlite|postgres|dynamodb` overrides the `SYS_ENV` default
 * (`local` → `sqlite`; `development`, `test`, `production` → `dynamodb`; a non-blank `E2E_STORE_SYS_ENV`
 * stands in for `SYS_ENV`). A blank `DATA_BACKEND` is
 * unset; any other value throws.
 *
 * @throws {Error} when `DATA_BACKEND` is set to something other than `sqlite`, `postgres` or `dynamodb`.
 */
export function resolveDataBackend(env: DataBackendEnv = process.env): DataBackend {
  const override = env.DATA_BACKEND?.trim().toLowerCase();
  if (!override) {
    // E2E_STORE_SYS_ENV (CI keeps the public SYS_ENV=test but runs the stores as local) takes the place of
    // SYS_ENV here, exactly as in the web store factories, so media and the stores cannot diverge.
    return defaultDataBackend(env.E2E_STORE_SYS_ENV?.trim() || env.SYS_ENV);
  }
  if (!isDataBackend(override)) {
    throw new Error(`Invalid DATA_BACKEND "${env.DATA_BACKEND?.trim()}": expected one of ${DATA_BACKENDS.join(', ')}`);
  }
  return override;
}
