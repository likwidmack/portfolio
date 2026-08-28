/**
 * Root Nuxt configuration for `@tgmc/web`.
 *
 * Wires workspace-aware paths, Nitro output (including remote deploy layouts), optional HTTPS dev certs
 * (`HTTPS`, `SSL_CERT`, `SSL_KEY`), and delegates app head / transitions, Vite, a11y, and PrimeVue
 * options to `./config-properties`.
 */
import { existsSync } from 'node:fs';
import { URL, fileURLToPath } from 'node:url';
import { defineNuxtConfig } from 'nuxt/config';
import { isAbsolute, join } from 'path';
import * as configProps from './config-properties';
import { firstNonEmptyEnv } from './resolve-process-env';
import { normalizeSysEnv, type SysEnv } from './server/db/sys-env';

const {
  APP_TITLE: siteTitle = 'TMack Portfolio App',
  DEPLOYMENT: deploy = 'client',
  SYS_ENV: rawSysEnv = 'local',
  NODE_ENV: node = 'development',

  HTTPS = '0',
  SSL_CERT = 'localhost.crt',
  SSL_KEY = 'localhost.key',
  HOST = 'tgmc-portfolio.local',
  PORT = '4200',
  NUXT_APP_CDN_URL = '',
} = process.env;

/** Prefer NUXT_* so Docker/Lambda runtimeConfig overrides match Nuxt conventions. */
const databaseUrl = firstNonEmptyEnv(process.env, 'NUXT_DATABASE_URL', 'DATABASE_URL') ?? '';
const dynamoTable = firstNonEmptyEnv(process.env, 'NUXT_DYNAMO_TABLE', 'DYNAMO_TABLE') ?? '';
const dynamoPostsTable = firstNonEmptyEnv(process.env, 'NUXT_DYNAMO_POSTS_TABLE', 'DYNAMO_POSTS_TABLE') ?? '';
const awsRegion = firstNonEmptyEnv(process.env, 'NUXT_AWS_REGION', 'AWS_REGION') ?? '';
const adminToken = firstNonEmptyEnv(process.env, 'NUXT_ADMIN_TOKEN', 'ADMIN_TOKEN') ?? '';
const siteUrl = firstNonEmptyEnv(process.env, 'NUXT_PUBLIC_SITE_URL', 'SITE_URL') ?? 'http://localhost:4200';
const openaiApiKey = firstNonEmptyEnv(process.env, 'NUXT_OPENAI_API_KEY', 'OPENAI_API_KEY') ?? '';
const openaiModel = firstNonEmptyEnv(process.env, 'NUXT_OPENAI_MODEL', 'OPENAI_MODEL') ?? 'gpt-5.6-luna';
const aiLabLiveEnabledRaw =
  firstNonEmptyEnv(process.env, 'NUXT_PUBLIC_AI_LAB_LIVE_ENABLED', 'AI_LAB_LIVE_ENABLED') ?? '0';
const aiLabSigningSecret = firstNonEmptyEnv(process.env, 'NUXT_AI_LAB_SIGNING_SECRET', 'AI_LAB_SIGNING_SECRET') ?? '';

/**
 * Whether the admin UI should advertise write capability.
 * Local/dev: only when a token is present at build time.
 * Test/prod: true so Lambda-injected NUXT_ADMIN_TOKEN enables the UI; APIs still fail closed if unset.
 */
const adminWritesEnabledFor = (sysEnv: SysEnv, token: string): boolean => {
  switch (sysEnv) {
    case 'test':
    case 'production':
      return true;
    case 'local':
    case 'development':
      return Boolean(token);
    default: {
      const _exhaustive: never = sysEnv;
      return _exhaustive;
    }
  }
};

/**
 * Nitro preset for a given SYS_ENV.
 * Use `node-server` (not `node`): in Nitro 2.13+ `node` aliases to `node-listener`,
 * which only exports a handler and exits under `node .output/server/index.mjs`.
 * Docker/local need the auto-listening `node-server` entry.
 */
const nitroPresetFor = (sysEnv: SysEnv): 'node-server' | 'aws_lambda' => {
  switch (sysEnv) {
    case 'local':
    case 'development':
      return 'node-server';
    case 'test':
    case 'production':
      return 'aws_lambda';
    default: {
      const _exhaustive: never = sysEnv;
      throw new Error(`Unhandled SYS_ENV for Nitro preset: ${_exhaustive}`);
    }
  }
};

const env = normalizeSysEnv(rawSysEnv);
/** CI Full regression: keep SYS_ENV=test identity but serve via node-server (no Docker/Lambda). */
const nitroPresetOverride = process.env.NITRO_PRESET;
const nitroPreset =
  nitroPresetOverride === 'node-server' || nitroPresetOverride === 'aws_lambda'
    ? nitroPresetOverride
    : nitroPresetFor(env);
/**
 * Nuxt Content DB for Lambda: in-memory SQLite restored from the build dump on
 * cold start. Do not use a filesystem SQLite path on test/production — Lambda's
 * /var/task is read-only, and /tmp still violates "no SQLite on test/prod".
 * MessageStore / BlogPostStore remain DynamoDB for those envs (see data-stores.md).
 */
const contentDatabaseForLambda =
  nitroPreset === 'aws_lambda' ? ({ type: 'sqlite' as const, filename: ':memory:' } as const) : undefined;
const debug = env === 'local';
const isDev = !['production'].includes(node);
const isLocalDev = isDev && debug;
const adminWritesEnabled = adminWritesEnabledFor(env, adminToken);

// Optional CDN origin (absolute http(s) only). Used for `app.cdnURL` asset
// rewrite — never as `vite.base` / router base (relative values like `./`
// produce broken routes such as `//admin/blog`).
const CDN_URL = configProps.resolveNuxtCdnUrl(NUXT_APP_CDN_URL);

// Avoid polluting `nx show … --json` / lint-staged stdout (console noise breaks JSON parse).
if (process.env.DEBUG_NUXT_CONFIG === '1') {
  console.log('Nuxt Config', {
    title: siteTitle,
    deploy,
    env,
    rawSysEnv,
    nitroPreset,
    node,
    debug,
    isDev,
    isLocalDev,
  });
}

/**
 * Resolve a path relative to this file's module URL.
 *
 * This helper is used throughout the Nuxt config to produce absolute paths
 * that work both in development (source files) and when Nuxt builds the
 * project (where paths may be served from the generated `.nuxt` or `.output`
 * directories).
 *
 * @param strUrl - A string path or URL to resolve relative to this module.
 * @returns An absolute filesystem path for the given module-relative URL.
 */
const resolvePath = (strUrl: string | URL) => fileURLToPath(new URL(strUrl, import.meta.url));

/**
 * Resolve a certificate path for dev HTTPS usage.
 *
 * If an absolute path is provided it is returned as-is. Otherwise the
 * certificate name is resolved from `bin/ssl/<name>` relative to the
 * repository (matching the project's local SSL helper scripts).
 *
 * @param strUrl - Certificate filename or absolute path.
 * @returns Absolute path to the certificate file to use with the dev server.
 */
const resolveCertPath = (strUrl: string) => (isAbsolute(strUrl) ? strUrl : resolvePath(join('bin/ssl', strUrl)));

const workspaceDir = resolvePath('../../');

const siteDescription = 'Tamara Mack [LikwidMack] web portfolio application';

const modules: any[] = [
  '@nuxt/a11y',
  '@nuxt/content',
  '@nuxt/fonts',
  '@nuxt/image',
  '@nuxtjs/i18n',
  '@nuxtjs/device',
  [
    '@pinia/nuxt',
    {
      autoImports: ['defineStore', 'acceptHMRUpdate'],
    },
  ],
  '@primevue/nuxt-module',
  'nuxt-svgo',
];

// All SYS_ENV values write `{workspaceRoot}/.output/<sysEnv>` (same contract as scripts/nitro-output-dir.mjs).
const outputDir = join(workspaceDir, '.output', env);
const outputObj = {
  dir: outputDir,
  serverDir: join(outputDir, 'server'),
  publicDir: join(outputDir, 'public'),
};
if (process.env.DEBUG_NUXT_CONFIG === '1') {
  console.log('Output Config', { outputDir, outputObj, nitroPreset });
}

const isHttps = !!+HTTPS;
const sslKeyPath = resolveCertPath(SSL_KEY);
const sslCertPath = resolveCertPath(SSL_CERT);
const hasLocalSslFiles = existsSync(sslKeyPath) && existsSync(sslCertPath);
// Precompute vite props so we can override `base` when a CDN is configured.
const viteProps = configProps.vite();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Local `./layers/*` auto-scanned (e.g. 1.base). Publishable layers use `extends`.
  // Do not also list auto-scanned `./layers/*` paths in `extends` (double-merge).
  extends: ['@tgmc/web-layer-admin'],
  modules,
  // Lambda Content: in-memory SQLite from build dump (no writable Content DB file).
  ...(contentDatabaseForLambda
    ? {
        content: {
          database: contentDatabaseForLambda,
        },
      }
    : {}),
  // Nuxt build-mode layers (NODE_ENV), not SYS_ENV — env-chip + a11y/log tooling.
  $development: {
    runtimeConfig: { public: { showEnvIndicator: true } },
    nitro: { logLevel: 5 },
    a11y: { defaultHighlight: true, logIssues: true },
  },
  $production: {
    runtimeConfig: { public: { showEnvIndicator: false } },
    nitro: { logLevel: 0 },
    a11y: { enabled: false },
  },
  $test: {
    runtimeConfig: { public: { showEnvIndicator: true } },
    nitro: { logLevel: 3 },
    a11y: { report: { enabled: true, output: 'a11y-report.md', failOnViolation: true } },
  },
  imports: {
    autoImport: true,
    dirs: ['stores'],
  },
  // Merge base app props. On AWS, `cdnURL` (from `NUXT_APP_CDN_URL`) rewrites hashed
  // `_nuxt` + favicon to CloudFront — never set `vite.base` / router base to the CDN.
  // `.output/public` is synced to S3 by SAM; Lambda CodeUri is server-only.
  app: {
    ...(configProps.app(siteDescription, siteTitle, CDN_URL) as any),
    ...(CDN_URL ? { cdnURL: CDN_URL } : {}),
  } as any,
  css: [
    resolvePath('./assets/css/styles.scss'),
    resolvePath('./assets/css/portfolio-launch.scss'),
    'primeicons/primeicons.css',
  ],
  vue: {
    propsDestructure: true,
  },
  runtimeConfig: {
    // Private server keys for the MessageStore / BlogPostStore adapters (NUXT_* overrides also apply).
    databaseUrl,
    dynamoTable,
    dynamoPostsTable,
    awsRegion,
    adminToken,
    openaiApiKey,
    openaiModel,
    aiLabSigningSecret,
    public: {
      theme: {
        mode: 'system',
        uiStack: 'primevue',
        bridges: {
          primevue: true,
          foundation: true,
        },
        applySourcesOnMount: true,
        applyDefaultsOnInit: true,
      },
      // Public CDN URL used by the app at runtime (empty when not configured)
      cdnUrl: CDN_URL || undefined,
      sysEnv: env,
      /** Fail-closed default; `$development` / `$test` layers flip this on. */
      showEnvIndicator: false,
      /** True when admin UI writes are expected (never exposes the secret). */
      adminWritesEnabled,
      siteUrl,
      aiLabLiveEnabled: aiLabLiveEnabledRaw === '1' && Boolean(openaiApiKey && aiLabSigningSecret),
    },
  },
  workspaceDir,
  alias: {
    images: resolvePath('./assets/images'),
    style: resolvePath('../../theme/core/scss'),
    data: resolvePath('./assets/other/data'),
    '#shared': resolvePath('./shared'),
    // Resolve the runtime-neutral entry from this worktree even when its
    // node_modules directory is linked to an older primary checkout.
    '@tgmc/utilities/universal': resolvePath('../../packages/utilities/src/universal.ts'),
    // Aliased app types so runtime tooling and Vite can resolve imports like `#types/*`.
    '#types': resolvePath('./types'),
    // SCSS-only theme aliases (JS uses `@tgmc/theme` / `@tgmc/theme/tokens` package exports)
    'theme/scss': resolvePath('../../theme/core/scss'),
    theme: resolvePath('../../theme/core'),
    '#theme/scss': resolvePath('../../theme/core/scss'),
  },
  build: { transpile: [] },
  routeRules: {
    '/styles/kitchen-sink': { redirect: { to: '/styles', statusCode: 301 } },
    '/styles/kitchen-sink/**': { redirect: { to: '/styles', statusCode: 301 } },
  },
  dev: isDev,
  devServer: {
    host: HOST,
    port: +PORT,
    // Use configured certs when available; otherwise let Vite handle HTTPS certs in local dev.
    https: isHttps ? (hasLocalSslFiles ? { key: sslKeyPath, cert: sslCertPath } : true) : false,
  },
  experimental: {
    payloadExtraction: true,
    crossOriginPrefetch: true,
    clientFallback: true,
  },
  nitro: {
    awsLambda: {
      // API Gateway HTTP API uses buffered Lambda Invoke. Nitro streaming
      // (streamifyResponse) returns a prelude+body payload APIGW cannot parse → 500.
      streaming: false,
    },
    // AWS: do not serve `public/` from Lambda. SAM stages `.output/public` beside
    // `server/` and syncs it to the private assets bucket + CloudFront after deploy.
    // Local/Docker `node-server` keeps Nitro's default static serving.
    ...(nitroPreset === 'aws_lambda' ? { serveStatic: false as const } : {}),
    logLevel: debug ? 5 : isDev ? 3 : 0,
    inlineDynamicImports: true,
    output: outputObj,
    prerender: {},
    preset: nitroPreset,
    // Suppress Node's DEP0155 trailing-slash export map warnings that come from
    // upstream packages (@vue/shared, @primeuix/utils, etc.) during the Nitro
    // prerender step — these are not actionable from this codebase.
    nodeOptions: ['--no-deprecation'],
    rollupConfig: {
      onwarn(warning, warn) {
        const message = typeof warning.message === 'string' ? warning.message : String(warning);

        // Known Windows/Nuxt unresolved import for the Nitro cache driver (nuxt#27424); safe to ignore.
        if (warning.code === 'UNRESOLVED_IMPORT' && message.includes('cache-driver')) {
          return;
        }

        // Replacing Nitro's default onwarn exposes upstream circular deps in nitropack/nuxt modules.
        if (
          warning.code === 'CIRCULAR_DEPENDENCY' &&
          (message.includes('node_modules') ||
            message.includes('virtual:#nitro') ||
            message.includes('virtual:#imports'))
        ) {
          return;
        }

        // h3's Nitro server shim re-exports H3Error / H3Event from an external module
        // but they are never called by the shim itself — safe to silence (upstream issue).
        if (
          warning.code === 'UNUSED_EXTERNAL_IMPORT' &&
          message.includes('h3') &&
          (message.includes('H3Error') || message.includes('H3Event'))
        ) {
          return;
        }

        warn(warning);
      },
    },
  },
  // Vite CSS: SCSS `loadPaths` + auto `@use "nuxt-auto"` for Vue SFC styles
  // (variables, colors, button mixins). See `config-properties/vite-prop.ts`.
  // CDN belongs on `app.cdnURL` only — never as `vite.base` / router base.
  vite: { ...viteProps },
  typescript: {
    builder: 'vite',
    includeWorkspace: false,
    shim: false,
    strict: true,
    typeCheck: false,
    tsConfig: {
      extends: join(workspaceDir, './tsconfig.base.json'), // Nuxt copies this string as-is to the `./.nuxt/tsconfig.json`, therefore it needs to be relative to that directory
      compilerOptions: {
        // Prefer package `types`/`import` (dist) over `tgmc-portfolio` → src for app typecheck.
        customConditions: [],
        paths: {
          '@tgmc/theme': [join(workspaceDir, 'theme/core/dist/index')],
          '@tgmc/theme/*': [join(workspaceDir, 'theme/core/dist/*')],
          '@tgmc/theme/tokens': [join(workspaceDir, 'theme/core/dist/tokens-public')],
          '@tgmc/theme/primevue': [join(workspaceDir, 'theme/core/dist/primevue')],
        },
      },
    },
  },
  debug: isLocalDev,
  a11y: configProps.a11y() as any,
  i18n: configProps.i18n() as any,
  primevue: configProps.primevue() as any,
  svgo: {
    autoImportPath: resolvePath('./assets/svg/'),
    componentPrefix: 'i',
  },
});
