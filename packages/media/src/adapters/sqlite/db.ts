import Database from 'better-sqlite3';
import { copyFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { slugMediaFilename, splitMediaFilename, suggestMediaName } from '../../filename.js';
import { extensionForMime, isMediaKind } from '../../kinds.js';
import {
  DEFAULT_TENANT,
  customVariantSuffix,
  isMediaTenant,
  originalKey,
  parseMediaKey,
  variantKey,
} from '../../paths.js';
import type { MediaKind } from '../../types.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  mime TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  blob_key TEXT NOT NULL,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  tenant TEXT NOT NULL DEFAULT 'portfolio',
  name TEXT NOT NULL DEFAULT '',
  path TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_assets_kind ON media_assets(kind);

CREATE TABLE IF NOT EXISTS media_children (
  id TEXT PRIMARY KEY NOT NULL,
  asset_id TEXT NOT NULL,
  role TEXT NOT NULL,
  recipe_json TEXT NOT NULL,
  status TEXT NOT NULL,
  blob_key TEXT,
  meta_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  variant TEXT NOT NULL DEFAULT 'custom',
  path TEXT,
  FOREIGN KEY (asset_id) REFERENCES media_assets(id)
);

CREATE INDEX IF NOT EXISTS idx_media_children_asset ON media_children(asset_id);

CREATE TABLE IF NOT EXISTS media_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  child_id TEXT NOT NULL,
  status TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_jobs_status ON media_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_jobs_asset ON media_jobs(asset_id);

CREATE TABLE IF NOT EXISTS media_audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  occurred_at TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  correlation_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_media_audit_entity ON media_audit_events(entity_id, occurred_at);

-- A name (tenant, kind, name; no extension) held for an asset id while its presigned upload is in flight.
CREATE TABLE IF NOT EXISTS media_name_reservations (
  tenant TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  path TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  PRIMARY KEY (tenant, kind, name)
);
`;

/** Columns added after the first release; `CREATE TABLE IF NOT EXISTS` does not touch older tables. */
const ADDED_COLUMNS: Array<{ table: string; column: string; ddl: string }> = [
  { table: 'media_assets', column: 'tenant', ddl: `tenant TEXT NOT NULL DEFAULT 'portfolio'` },
  { table: 'media_assets', column: 'name', ddl: `name TEXT NOT NULL DEFAULT ''` },
  { table: 'media_assets', column: 'path', ddl: 'path TEXT' },
  { table: 'media_children', column: 'variant', ddl: `variant TEXT NOT NULL DEFAULT 'custom'` },
  { table: 'media_children', column: 'path', ddl: 'path TEXT' },
];

export type MediaDatabaseOptions = {
  /**
   * Blob root used to move legacy objects (`blob_key`) to their new `path` during migration.
   * Without it the rows are migrated but files stay where they are.
   */
  blobDir?: string;
};

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function parseMeta(raw: unknown): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(String(raw));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function nameSlot(tenant: string, kind: string, name: string): string {
  return `${tenant}/${kind}/${name}`;
}

/** Legacy rows: derive `tenant`/`name`/`path` from the filename (or kind + id) and keep names unique. */
function backfillAssets(db: Database.Database): void {
  const rows = db
    .prepare(`SELECT id, kind, mime, meta_json FROM media_assets WHERE path IS NULL ORDER BY created_at ASC, id ASC`)
    .all() as Array<{ id: string; kind: string; mime: string; meta_json: string }>;
  if (rows.length === 0) {
    return;
  }
  const taken = new Set(
    (
      db.prepare(`SELECT tenant, kind, name FROM media_assets WHERE path IS NOT NULL`).all() as Array<{
        tenant: string;
        kind: string;
        name: string;
      }>
    ).map((row) => nameSlot(row.tenant, row.kind, row.name))
  );
  const update = db.prepare(`UPDATE media_assets SET tenant = ?, name = ?, path = ? WHERE id = ?`);
  const migrate = db.transaction(() => {
    for (const row of rows) {
      const kind: MediaKind = isMediaKind(row.kind) ? row.kind : 'document';
      const filename = parseMeta(row.meta_json).filename;
      const wanted =
        typeof filename === 'string' && filename.trim() ? filename : `${kind}-${row.id.replace(/-/g, '').slice(0, 8)}`;
      const split = splitMediaFilename(slugMediaFilename(wanted));
      const ext = split.ext || extensionForMime(row.mime);
      let name = split.name;
      for (let attempt = 2; taken.has(nameSlot(DEFAULT_TENANT, kind, name)); attempt += 1) {
        name = suggestMediaName(split.name, ext, attempt);
      }
      taken.add(nameSlot(DEFAULT_TENANT, kind, name));
      update.run(DEFAULT_TENANT, name, originalKey({ tenant: DEFAULT_TENANT, kind, name, ext }), row.id);
    }
  });
  migrate();
}

/**
 * Names are unique per (tenant, kind) whatever the extension, because a variant key drops the
 * original's extension. Databases from before that rule may hold `hero.png` and `hero.jpg`: keep the
 * oldest, rename the later ones `hero-2`, `hero-3`, ... and re-key their children. Blobs move
 * afterwards through {@link moveLegacyBlobs} (`blob_key` keeps the old key until then). A child whose
 * key was shared with another asset cannot be attributed to either: both children are marked failed
 * (re-materialize).
 * Idempotent: once names are unique there is nothing left to rename.
 */
function dedupeAssetNames(db: Database.Database): void {
  const rows = db
    .prepare(
      `SELECT id, tenant, kind, name, path FROM media_assets WHERE path IS NOT NULL ORDER BY created_at ASC, id ASC`
    )
    .all() as Array<{ id: string; tenant: string; kind: string; name: string; path: string }>;
  const seen = new Set<string>();
  const later: typeof rows = [];
  for (const row of rows) {
    const slot = nameSlot(row.tenant, row.kind, row.name);
    if (seen.has(slot)) {
      later.push(row);
    } else {
      seen.add(slot);
    }
  }
  if (later.length === 0) {
    return;
  }
  const updateAsset = db.prepare(`UPDATE media_assets SET name = ?, path = ? WHERE id = ?`);
  const selectChildren = db.prepare(`SELECT id, path, meta_json FROM media_children WHERE asset_id = ?`);
  const sharingChildren = db.prepare(`SELECT id, meta_json FROM media_children WHERE path = ? AND asset_id <> ?`);
  const rekeyChild = db.prepare(`UPDATE media_children SET path = ? WHERE id = ?`);
  const failChild = db.prepare(
    `UPDATE media_children SET path = ?, blob_key = ?, status = 'failed', meta_json = ? WHERE id = ?`
  );
  const failSharer = db.prepare(`UPDATE media_children SET status = 'failed', meta_json = ? WHERE id = ?`);
  const collisionError = (meta: string) =>
    JSON.stringify({
      ...parseMeta(meta),
      error: 'Variant key collided with another asset during the name-uniqueness migration; re-materialize.',
    });
  const migrate = db.transaction(() => {
    for (const row of later) {
      const parsed = parseMediaKey(row.path);
      if (!parsed || !isMediaTenant(row.tenant) || !isMediaKind(row.kind)) {
        // Skipping would leave a duplicate (tenant, kind, name) and fail CREATE UNIQUE INDEX opaquely.
        throw new Error(
          `Media migration: cannot rename asset ${row.id} (tenant "${row.tenant}", kind "${row.kind}", path "${row.path}") ` +
            `which collides on name "${row.name}"; fix or delete the row, then reopen the database.`
        );
      }
      let name = row.name;
      for (let attempt = 2; seen.has(nameSlot(row.tenant, row.kind, name)); attempt += 1) {
        name = suggestMediaName(row.name, parsed.ext, attempt);
      }
      seen.add(nameSlot(row.tenant, row.kind, name));
      const path = originalKey({ tenant: row.tenant, kind: row.kind, name, ext: parsed.ext });
      updateAsset.run(name, path, row.id);
      for (const child of selectChildren.all(row.id) as Array<{ id: string; path: string | null; meta_json: string }>) {
        const childKey = child.path ? parseMediaKey(child.path) : null;
        if (!child.path || !childKey?.variant) {
          continue;
        }
        const childPath = variantKey(path, childKey.variant, childKey.ext);
        const sharers = sharingChildren.all(child.path, row.id) as Array<{ id: string; meta_json: string }>;
        if (sharers.length > 0) {
          // The one object at the shared key belongs to no single asset: fail every child that claimed it.
          failChild.run(childPath, childPath, collisionError(child.meta_json), child.id);
          for (const sharer of sharers) {
            failSharer.run(collisionError(sharer.meta_json), sharer.id);
          }
        } else {
          rekeyChild.run(childPath, child.id);
        }
      }
    }
  });
  migrate();
}

/** Legacy ready children (blob_key set, no path): key them as custom variants of their asset. */
function backfillChildren(db: Database.Database): void {
  const rows = db
    .prepare(
      `SELECT c.id, c.meta_json, a.path AS asset_path
       FROM media_children c JOIN media_assets a ON a.id = c.asset_id
       WHERE c.path IS NULL AND c.blob_key IS NOT NULL AND a.path IS NOT NULL`
    )
    .all() as Array<{ id: string; meta_json: string; asset_path: string }>;
  const update = db.prepare(`UPDATE media_children SET variant = 'custom', path = ? WHERE id = ?`);
  const migrate = db.transaction(() => {
    for (const row of rows) {
      const contentType = parseMeta(row.meta_json).contentType;
      const ext = extensionForMime(typeof contentType === 'string' ? contentType : 'image/webp');
      update.run(variantKey(row.asset_path, customVariantSuffix(row.id), ext), row.id);
    }
  });
  migrate();
}

function moveFile(from: string, to: string): void {
  mkdirSync(dirname(to), { recursive: true });
  try {
    renameSync(from, to);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EXDEV') {
      throw err;
    }
    copyFileSync(from, to);
    unlinkSync(from);
  }
}

/**
 * Move legacy objects from `blob_key` to `path` and mark them done (`blob_key = path`).
 * Idempotent: an already-moved or missing file is skipped, and a missing file keeps its row
 * pending so a late-arriving file is moved on a later open.
 */
function moveLegacyBlobs(db: Database.Database, blobDir: string): void {
  for (const table of ['media_assets', 'media_children'] as const) {
    const rows = db
      .prepare(
        `SELECT id, blob_key, path FROM ${table} WHERE blob_key IS NOT NULL AND path IS NOT NULL AND blob_key <> path`
      )
      .all() as Array<{ id: string; blob_key: string; path: string }>;
    const done = db.prepare(`UPDATE ${table} SET blob_key = path WHERE id = ?`);
    for (const row of rows) {
      const from = join(blobDir, row.blob_key);
      const to = join(blobDir, row.path);
      if (existsSync(to)) {
        done.run(row.id);
      } else if (existsSync(from)) {
        moveFile(from, to);
        done.run(row.id);
      }
    }
  }
}

/** Bring an existing database up to the tenant/name/path schema (idempotent; renames only colliding names). */
export function migrateMediaDatabase(db: Database.Database, options: MediaDatabaseOptions = {}): void {
  for (const { table, column, ddl } of ADDED_COLUMNS) {
    if (!hasColumn(db, table, column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
    }
  }
  backfillAssets(db);
  dedupeAssetNames(db);
  db.exec(`DROP INDEX IF EXISTS idx_media_assets_path`);
  db.exec(`DROP TABLE IF EXISTS media_path_reservations`);
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_name ON media_assets(tenant, kind, name)`);
  db.exec(`CREATE INDEX IF NOT EXISTS idx_media_assets_tenant_kind ON media_assets(tenant, kind, created_at)`);
  backfillChildren(db);
  if (options.blobDir) {
    moveLegacyBlobs(db, options.blobDir);
  }
}

export function openMediaDatabase(dbPath: string, options: MediaDatabaseOptions = {}): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  try {
    db.exec(SCHEMA);
    migrateMediaDatabase(db, options);
  } catch (err) {
    // A failed migration must not leave the file locked (Windows cannot delete an open database).
    db.close();
    throw err;
  }
  return db;
}

/**
 * Open a catalog for reading only (dry runs): the file is never created, migrated or written, and
 * writes throw. A missing file reads as an empty catalog. An existing file is used as is, so it must
 * already be on the current schema.
 */
export function openMediaDatabaseReadOnly(dbPath: string): Database.Database {
  let db: Database.Database;
  if (existsSync(dbPath)) {
    db = new Database(dbPath, { readonly: true, fileMustExist: true });
  } else {
    db = new Database(':memory:');
    db.exec(SCHEMA);
    migrateMediaDatabase(db);
  }
  db.pragma('query_only = ON');
  return db;
}
