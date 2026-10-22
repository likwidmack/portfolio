import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { createMediaLibrary } from './create-media-library.js';

/** Minimal valid 1×1 PNG (red pixel) for smoke without a sharp dependency. */
const SMOKE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function usage(): string {
  return `Usage: tgmc-media <command> [options]

Commands:
  init --db <path> --blob-dir <path>
  ingest --db <path> --blob-dir <path> --file <path> --kind <image|audio|video>
  list --db <path> --blob-dir <path> [--kind <kind>]
  show --db <path> --blob-dir <path> --asset <id>
  materialize --db <path> --blob-dir <path> --asset <id> --role <role> --recipe <json|@file>
  delete --db <path> --blob-dir <path> --asset <id> --yes
  smoke --db <path> --blob-dir <path>
`;
}

function getFlag(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) {
    return undefined;
  }
  return argv[idx + 1];
}

function requireFlag(argv: string[], name: string): string {
  const value = getFlag(argv, name);
  if (!value) {
    throw new Error(`Missing required flag ${name}`);
  }
  return value;
}

async function readRecipe(raw: string): Promise<unknown> {
  if (raw.startsWith('@')) {
    const { readFile } = await import('node:fs/promises');
    return JSON.parse(await readFile(raw.slice(1), 'utf8'));
  }
  return JSON.parse(raw);
}

/**
 * CLI command runner used by `bin/media.mjs` and tests. Returns an exit code and never
 * calls `process.exit` — this module is re-exported from the package entry and gets
 * bundled into servers (Nitro), so it must stay free of import-time side effects.
 * The executable entry is `bin/media.mjs`.
 */
export async function runCli(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === '-h' || command === '--help') {
    console.log(usage());
    return command ? 0 : 1;
  }

  try {
    switch (command) {
      case 'init': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        mkdirSync(dirname(dbPath), { recursive: true });
        mkdirSync(blobDir, { recursive: true });
        const handle = createMediaLibrary({ dbPath, blobDir });
        handle.close();
        console.log(JSON.stringify({ ok: true, dbPath, blobDir }));
        return 0;
      }
      case 'ingest': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        const file = resolve(requireFlag(rest, '--file'));
        const kind = requireFlag(rest, '--kind') as 'image' | 'audio' | 'video';
        if (kind !== 'image' && kind !== 'audio' && kind !== 'video') {
          throw new Error(`Invalid kind: ${kind}`);
        }
        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          const asset = await handle.library.ingest({ kind, data: file });
          console.log(JSON.stringify(asset, null, 2));
        } finally {
          handle.close();
        }
        return 0;
      }
      case 'list': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        const kind = getFlag(rest, '--kind') as 'image' | 'audio' | 'video' | undefined;
        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          const assets = await handle.library.listAssets(kind ? { kind } : undefined);
          console.log(JSON.stringify(assets, null, 2));
        } finally {
          handle.close();
        }
        return 0;
      }
      case 'show': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        const assetId = requireFlag(rest, '--asset');
        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          const asset = await handle.library.getAsset(assetId);
          const children = await handle.library.listChildren(assetId);
          const jobs = await handle.library.listJobs({ assetId });
          const audit = await handle.library.listAuditEvents(assetId);
          console.log(JSON.stringify({ asset, children, jobs, audit }, null, 2));
        } finally {
          handle.close();
        }
        return 0;
      }
      case 'materialize': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        const assetId = requireFlag(rest, '--asset');
        const role = requireFlag(rest, '--role');
        const recipeRaw = requireFlag(rest, '--recipe');
        const recipe = await readRecipe(recipeRaw);
        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          const result = await handle.library.materializeChild(assetId, role, recipe);
          console.log(JSON.stringify(result, null, 2));
          return result.job.status === 'succeeded' ? 0 : 1;
        } finally {
          handle.close();
        }
      }
      case 'delete': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        const assetId = requireFlag(rest, '--asset');
        if (!rest.includes('--yes')) {
          throw new Error('Refusing to delete without --yes');
        }
        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          await handle.library.deleteAsset(assetId);
          console.log(JSON.stringify({ deleted: assetId }));
        } finally {
          handle.close();
        }
        return 0;
      }
      case 'smoke': {
        const dbPath = resolve(requireFlag(rest, '--db'));
        const blobDir = resolve(requireFlag(rest, '--blob-dir'));
        mkdirSync(blobDir, { recursive: true });
        mkdirSync(dirname(dbPath), { recursive: true });
        const fixture = join(blobDir, '_smoke-sample.png');
        writeFileSync(fixture, SMOKE_PNG);

        const handle = createMediaLibrary({ dbPath, blobDir });
        try {
          const asset = await handle.library.ingest({ kind: 'image', data: fixture, mime: 'image/png' });
          const result = await handle.library.materializeChild(asset.id, 'thumb', {
            kind: 'image',
            ops: [{ type: 'resize', ops: { width: 32 } }],
            format: 'webp',
          });
          if (result.job.status !== 'succeeded' || result.child.status !== 'ready') {
            throw new Error(`Smoke materialize failed: ${result.job.lastError}`);
          }
          const audit = await handle.library.listAuditEvents(asset.id);
          const childAudit = await handle.library.listAuditEvents(result.child.id);
          if (audit.length < 1 || childAudit.length < 1) {
            throw new Error('Smoke expected audit events');
          }
          console.log(
            JSON.stringify({
              ok: true,
              assetId: asset.id,
              childId: result.child.id,
              jobId: result.job.id,
            })
          );
        } finally {
          handle.close();
        }
        return 0;
      }
      default:
        console.error(`Unknown command: ${command}`);
        console.error(usage());
        return 1;
    }
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    return 1;
  }
}
