import type Database from 'better-sqlite3';

import { FsBlobStore } from './adapters/fs-blob-store.js';
import { openMediaDatabase, openMediaDatabaseReadOnly } from './adapters/sqlite/db.js';
import { SqliteAuditStore, SqliteCatalogStore, SqliteJobStore } from './adapters/sqlite/stores.js';
import { MediaLibrary } from './media-library.js';
import { createDefaultTransformerRegistry } from './transformers/registry.js';

export type CreateMediaLibraryOptions = {
  dbPath: string;
  blobDir: string;
  /** Optional pre-opened DB (tests). */
  database?: Database.Database;
  /** See `MediaLibraryDeps.enforceMetaPolicy` (ignored by `createSqliteMediaStores`). */
  enforceMetaPolicy?: boolean;
};

export type MediaLibraryHandle = {
  library: MediaLibrary;
  close: () => void;
};

export type CreateSqliteMediaStoresOptions = CreateMediaLibraryOptions & {
  /**
   * Never create, migrate or write the database (catalog writes throw; a missing file reads as an
   * empty catalog). For dry runs against a target. The blob store is not restricted. Cannot be
   * combined with `database`.
   */
  readOnly?: boolean;
};

/** The local stores behind `createMediaLibrary`, for callers that work on the ports directly (`transferMedia`). */
export type SqliteMediaStores = {
  catalog: SqliteCatalogStore;
  jobs: SqliteJobStore;
  audit: SqliteAuditStore;
  blobs: FsBlobStore;
  close: () => void;
};

/** Open (and migrate, unless `readOnly`) the SQLite catalog and wire an `FsBlobStore` rooted at `blobDir`. */
export function createSqliteMediaStores(options: CreateSqliteMediaStoresOptions): SqliteMediaStores {
  if (options.readOnly && options.database) {
    throw new Error('createSqliteMediaStores: readOnly cannot be combined with a pre-opened database');
  }
  const db =
    options.database ??
    (options.readOnly
      ? openMediaDatabaseReadOnly(options.dbPath)
      : openMediaDatabase(options.dbPath, { blobDir: options.blobDir }));
  return {
    catalog: new SqliteCatalogStore(db),
    jobs: new SqliteJobStore(db),
    audit: new SqliteAuditStore(db),
    blobs: new FsBlobStore(options.blobDir),
    close: () => {
      db.close();
    },
  };
}

/**
 * Wire default SQLite + filesystem adapters and the transformer registry.
 */
export function createMediaLibrary(options: CreateMediaLibraryOptions): MediaLibraryHandle {
  const { close, ...stores } = createSqliteMediaStores(options);
  const library = new MediaLibrary({
    ...stores,
    transformers: createDefaultTransformerRegistry(),
    enforceMetaPolicy: options.enforceMetaPolicy,
  });
  return { library, close };
}
