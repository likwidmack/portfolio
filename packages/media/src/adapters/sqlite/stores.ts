import type Database from 'better-sqlite3';

import { MediaConflictError, MediaNameConflictError, MediaNotFoundError } from '../../errors.js';
import { DEFAULT_TENANT, isMediaTenant, type MediaNameRef } from '../../paths.js';
import type { AuditStore, CatalogStore, JobStore } from '../../ports/index.js';
import type {
  AuditEvent,
  ChildStatus,
  JobRecord,
  JobStatus,
  ListAssetsFilter,
  MediaAsset,
  MediaChild,
  MediaKind,
  NameHolder,
} from '../../types.js';

function parseJson<T>(raw: string): T {
  return JSON.parse(raw) as T;
}

function rowToAsset(row: Record<string, unknown>): MediaAsset {
  return {
    id: String(row.id),
    tenant: isMediaTenant(row.tenant) ? row.tenant : DEFAULT_TENANT,
    kind: row.kind as MediaKind,
    mime: String(row.mime),
    sha256: String(row.sha256),
    byteSize: Number(row.byte_size),
    name: String(row.name),
    path: String(row.path),
    meta: parseJson(String(row.meta_json)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToChild(row: Record<string, unknown>): MediaChild {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    role: String(row.role),
    variant: row.variant as MediaChild['variant'],
    recipe: parseJson(String(row.recipe_json)),
    status: row.status as ChildStatus,
    path: row.path == null ? null : String(row.path),
    meta: parseJson(String(row.meta_json)),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToJob(row: Record<string, unknown>): JobRecord {
  return {
    id: String(row.id),
    type: row.type as JobRecord['type'],
    assetId: String(row.asset_id),
    childId: String(row.child_id),
    status: row.status as JobStatus,
    attempts: Number(row.attempts),
    lastError: row.last_error == null ? null : String(row.last_error),
    createdAt: String(row.created_at),
    startedAt: row.started_at == null ? null : String(row.started_at),
    finishedAt: row.finished_at == null ? null : String(row.finished_at),
  };
}

function rowToAudit(row: Record<string, unknown>): AuditEvent {
  return {
    id: String(row.id),
    occurredAt: String(row.occurred_at),
    action: String(row.action),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    payload: parseJson(String(row.payload_json)),
    correlationId: row.correlation_id == null ? null : String(row.correlation_id),
  };
}

export class SqliteCatalogStore implements CatalogStore {
  constructor(private readonly db: Database.Database) {}

  async insertAsset(asset: MediaAsset): Promise<void> {
    const insert = this.db.transaction(() => {
      const now = new Date().toISOString();
      const slot = { tenant: asset.tenant, kind: asset.kind, name: asset.name };
      this.db
        .prepare(
          `DELETE FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name AND expires_at <= @now`
        )
        .run({ ...slot, now });
      const held = this.db
        .prepare(
          `SELECT asset_id FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name`
        )
        .get(slot) as { asset_id: string } | undefined;
      if (held && held.asset_id !== asset.id) {
        throw new MediaNameConflictError(asset.path);
      }
      try {
        this.db
          .prepare(
            `INSERT INTO media_assets (id, tenant, kind, mime, sha256, byte_size, name, path, blob_key, meta_json, created_at, updated_at)
             VALUES (@id, @tenant, @kind, @mime, @sha256, @byteSize, @name, @path, @path, @metaJson, @createdAt, @updatedAt)`
          )
          .run({
            id: asset.id,
            tenant: asset.tenant,
            kind: asset.kind,
            mime: asset.mime,
            sha256: asset.sha256,
            byteSize: asset.byteSize,
            name: asset.name,
            path: asset.path,
            metaJson: JSON.stringify(asset.meta),
            createdAt: asset.createdAt,
            updatedAt: asset.updatedAt,
          });
      } catch (err) {
        const code = (err as { code?: string }).code;
        if (code === 'SQLITE_CONSTRAINT_UNIQUE') {
          // UNIQUE(tenant, kind, name): the name is taken under some extension.
          throw new MediaNameConflictError(asset.path);
        }
        if (code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
          throw new MediaConflictError(`Asset already exists: ${asset.id}`);
        }
        throw err;
      }
      this.db
        .prepare(
          `DELETE FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name AND asset_id = @assetId`
        )
        .run({ ...slot, assetId: asset.id });
    });
    insert();
  }

  async getNameHolder(ref: MediaNameRef): Promise<NameHolder | null> {
    const asset = this.db
      .prepare(`SELECT id, path FROM media_assets WHERE tenant = @tenant AND kind = @kind AND name = @name`)
      .get(ref) as { id: string; path: string } | undefined;
    if (asset) {
      return { assetId: asset.id, pending: false, path: asset.path };
    }
    const reservation = this.db
      .prepare(
        `SELECT asset_id, path, expires_at FROM media_name_reservations
         WHERE tenant = @tenant AND kind = @kind AND name = @name AND expires_at > @now`
      )
      .get({ ...ref, now: new Date().toISOString() }) as
      { asset_id: string; path: string; expires_at: string } | undefined;
    return reservation
      ? { assetId: reservation.asset_id, pending: true, path: reservation.path, expiresAt: reservation.expires_at }
      : null;
  }

  async holdName(ref: MediaNameRef, input: { assetId: string; path: string; expiresAt: string }): Promise<boolean> {
    const reserve = this.db.transaction((): boolean => {
      const now = new Date().toISOString();
      if (
        this.db.prepare(`SELECT 1 FROM media_assets WHERE tenant = @tenant AND kind = @kind AND name = @name`).get(ref)
      ) {
        return false;
      }
      this.db
        .prepare(
          `DELETE FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name AND expires_at <= @now`
        )
        .run({ ...ref, now });
      const held = this.db
        .prepare(
          `SELECT asset_id FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name`
        )
        .get(ref) as { asset_id: string } | undefined;
      if (held && held.asset_id !== input.assetId) {
        return false;
      }
      this.db
        .prepare(
          `INSERT INTO media_name_reservations (tenant, kind, name, asset_id, path, expires_at)
           VALUES (@tenant, @kind, @name, @assetId, @path, @expiresAt)
           ON CONFLICT(tenant, kind, name) DO UPDATE SET path = excluded.path, expires_at = excluded.expires_at`
        )
        .run({ ...ref, ...input });
      return true;
    });
    return reserve();
  }

  async releaseName(ref: MediaNameRef, assetId: string): Promise<void> {
    this.db
      .prepare(
        `DELETE FROM media_name_reservations WHERE tenant = @tenant AND kind = @kind AND name = @name AND asset_id = @assetId`
      )
      .run({ ...ref, assetId });
  }

  async updateAssetMeta(id: string, meta: Record<string, unknown>, updatedAt: string): Promise<void> {
    const result = this.db
      .prepare(`UPDATE media_assets SET meta_json = @metaJson, updated_at = @updatedAt WHERE id = @id`)
      .run({ id, metaJson: JSON.stringify(meta), updatedAt });
    if (result.changes === 0) {
      throw new MediaNotFoundError(`Asset not found: ${id}`);
    }
  }

  async getAsset(id: string): Promise<MediaAsset | null> {
    const row = this.db.prepare(`SELECT * FROM media_assets WHERE id = ?`).get(id) as
      Record<string, unknown> | undefined;
    return row ? rowToAsset(row) : null;
  }

  async listAssets(filter: ListAssetsFilter = {}): Promise<MediaAsset[]> {
    const limit = filter.limit ?? 100;
    const offset = filter.offset ?? 0;
    const tag = typeof filter.tag === 'string' ? filter.tag.trim().toLowerCase() : '';
    const clauses: string[] = ['tenant = ?'];
    const params: unknown[] = [filter.tenant ?? DEFAULT_TENANT];
    if (filter.kind) {
      clauses.push('kind = ?');
      params.push(filter.kind);
    }
    if (tag) {
      // json1: match any element of meta.tags (stored as JSON array).
      clauses.push(`EXISTS (SELECT 1 FROM json_each(json_extract(meta_json, '$.tags')) WHERE lower(value) = ?)`);
      params.push(tag);
    }
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT * FROM media_assets ${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as Record<string, unknown>[];
    return rows.map(rowToAsset);
  }

  async deleteAsset(id: string): Promise<void> {
    this.db.prepare(`DELETE FROM media_name_reservations WHERE asset_id = ?`).run(id);
    this.db.prepare(`DELETE FROM media_assets WHERE id = ?`).run(id);
  }

  async deleteAssetCascade(assetId: string): Promise<void> {
    const cascade = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM media_jobs WHERE asset_id = ?`).run(assetId);
      this.db.prepare(`DELETE FROM media_children WHERE asset_id = ?`).run(assetId);
      this.db.prepare(`DELETE FROM media_name_reservations WHERE asset_id = ?`).run(assetId);
      this.db.prepare(`DELETE FROM media_assets WHERE id = ?`).run(assetId);
    });
    cascade();
  }

  async insertChild(child: MediaChild): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO media_children (id, asset_id, role, variant, recipe_json, status, blob_key, path, meta_json, created_at, updated_at)
         VALUES (@id, @assetId, @role, @variant, @recipeJson, @status, @path, @path, @metaJson, @createdAt, @updatedAt)`
      )
      .run({
        id: child.id,
        assetId: child.assetId,
        role: child.role,
        recipeJson: JSON.stringify(child.recipe),
        status: child.status,
        variant: child.variant,
        path: child.path,
        metaJson: JSON.stringify(child.meta),
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      });
  }

  async insertChildIfAssetExists(child: MediaChild): Promise<boolean> {
    const result = this.db
      .prepare(
        `INSERT INTO media_children (id, asset_id, role, variant, recipe_json, status, blob_key, path, meta_json, created_at, updated_at)
         SELECT @id, @assetId, @role, @variant, @recipeJson, @status, @path, @path, @metaJson, @createdAt, @updatedAt
         WHERE EXISTS (SELECT 1 FROM media_assets WHERE id = @assetId)`
      )
      .run({
        id: child.id,
        assetId: child.assetId,
        role: child.role,
        recipeJson: JSON.stringify(child.recipe),
        status: child.status,
        variant: child.variant,
        path: child.path,
        metaJson: JSON.stringify(child.meta),
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
      });
    return result.changes > 0;
  }

  async insertChildAndJobIfAssetExists(child: MediaChild, job: JobRecord): Promise<boolean> {
    const insert = this.db.transaction(() => {
      const childResult = this.db
        .prepare(
          `INSERT INTO media_children (id, asset_id, role, variant, recipe_json, status, blob_key, path, meta_json, created_at, updated_at)
           SELECT @id, @assetId, @role, @variant, @recipeJson, @status, @path, @path, @metaJson, @createdAt, @updatedAt
           WHERE EXISTS (SELECT 1 FROM media_assets WHERE id = @assetId)`
        )
        .run({
          id: child.id,
          assetId: child.assetId,
          role: child.role,
          recipeJson: JSON.stringify(child.recipe),
          status: child.status,
          variant: child.variant,
          path: child.path,
          metaJson: JSON.stringify(child.meta),
          createdAt: child.createdAt,
          updatedAt: child.updatedAt,
        });
      if (childResult.changes === 0) {
        return false;
      }
      this.db
        .prepare(
          `INSERT INTO media_jobs (id, type, asset_id, child_id, status, attempts, last_error, created_at, started_at, finished_at)
           VALUES (@id, @type, @assetId, @childId, @status, @attempts, @lastError, @createdAt, @startedAt, @finishedAt)`
        )
        .run({
          id: job.id,
          type: job.type,
          assetId: job.assetId,
          childId: job.childId,
          status: job.status,
          attempts: job.attempts,
          lastError: job.lastError,
          createdAt: job.createdAt,
          startedAt: job.startedAt,
          finishedAt: job.finishedAt,
        });
      return true;
    });
    return insert();
  }

  async updateChild(child: MediaChild): Promise<void> {
    this.db
      .prepare(
        `UPDATE media_children
         SET role = @role, variant = @variant, recipe_json = @recipeJson, status = @status, blob_key = @path, path = @path,
             meta_json = @metaJson, updated_at = @updatedAt
         WHERE id = @id`
      )
      .run({
        id: child.id,
        role: child.role,
        recipeJson: JSON.stringify(child.recipe),
        status: child.status,
        variant: child.variant,
        path: child.path,
        metaJson: JSON.stringify(child.meta),
        updatedAt: child.updatedAt,
      });
  }

  async updateChildIfAssetExists(child: MediaChild): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE media_children
         SET role = @role, variant = @variant, recipe_json = @recipeJson, status = @status, blob_key = @path, path = @path,
             meta_json = @metaJson, updated_at = @updatedAt
         WHERE id = @id AND EXISTS (SELECT 1 FROM media_assets WHERE id = @assetId)`
      )
      .run({
        id: child.id,
        assetId: child.assetId,
        role: child.role,
        recipeJson: JSON.stringify(child.recipe),
        status: child.status,
        variant: child.variant,
        path: child.path,
        metaJson: JSON.stringify(child.meta),
        updatedAt: child.updatedAt,
      });
    return result.changes > 0;
  }

  async finalizeRunningJobAndUpdateChildIfAssetExists(
    jobId: string,
    expectedStartedAt: string,
    nextJob: JobRecord,
    child: MediaChild
  ): Promise<'updated' | 'lost-lease' | 'asset-missing'> {
    const finalize = this.db.transaction(() => {
      const jobResult = this.db
        .prepare(
          `UPDATE media_jobs
           SET status = @status, attempts = @attempts, last_error = @lastError,
               started_at = @startedAt, finished_at = @finishedAt
           WHERE id = @id AND status = 'running' AND started_at = @expectedStartedAt
             AND EXISTS (SELECT 1 FROM media_assets WHERE id = @assetId)`
        )
        .run({
          id: jobId,
          assetId: child.assetId,
          expectedStartedAt,
          status: nextJob.status,
          attempts: nextJob.attempts,
          lastError: nextJob.lastError,
          startedAt: nextJob.startedAt,
          finishedAt: nextJob.finishedAt,
        });
      if (jobResult.changes === 0) {
        const assetExists = this.db.prepare(`SELECT 1 FROM media_assets WHERE id = ?`).get(child.assetId);
        return assetExists ? 'lost-lease' : 'asset-missing';
      }
      const childResult = this.db
        .prepare(
          `UPDATE media_children
           SET role = @role, variant = @variant, recipe_json = @recipeJson, status = @status, blob_key = @path, path = @path,
               meta_json = @metaJson, updated_at = @updatedAt
           WHERE id = @id AND asset_id = @assetId`
        )
        .run({
          id: child.id,
          assetId: child.assetId,
          role: child.role,
          recipeJson: JSON.stringify(child.recipe),
          status: child.status,
          variant: child.variant,
          path: child.path,
          metaJson: JSON.stringify(child.meta),
          updatedAt: child.updatedAt,
        });
      if (childResult.changes === 0) {
        throw new Error(`Materialize child missing during finalize: ${child.id}`);
      }
      return 'updated';
    });
    return finalize();
  }

  async getChild(id: string): Promise<MediaChild | null> {
    const row = this.db.prepare(`SELECT * FROM media_children WHERE id = ?`).get(id) as
      Record<string, unknown> | undefined;
    return row ? rowToChild(row) : null;
  }

  async listChildren(assetId: string): Promise<MediaChild[]> {
    const rows = this.db
      .prepare(`SELECT * FROM media_children WHERE asset_id = ? ORDER BY created_at ASC`)
      .all(assetId) as Record<string, unknown>[];
    return rows.map(rowToChild);
  }

  async deleteChild(assetId: string, childId: string): Promise<void> {
    this.db.prepare(`DELETE FROM media_children WHERE id = ? AND asset_id = ?`).run(childId, assetId);
  }

  async deleteChildrenForAsset(assetId: string): Promise<void> {
    this.db.prepare(`DELETE FROM media_children WHERE asset_id = ?`).run(assetId);
  }
}

export class SqliteJobStore implements JobStore {
  constructor(private readonly db: Database.Database) {}

  async insertJob(job: JobRecord): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO media_jobs (id, type, asset_id, child_id, status, attempts, last_error, created_at, started_at, finished_at)
         VALUES (@id, @type, @assetId, @childId, @status, @attempts, @lastError, @createdAt, @startedAt, @finishedAt)`
      )
      .run({
        id: job.id,
        type: job.type,
        assetId: job.assetId,
        childId: job.childId,
        status: job.status,
        attempts: job.attempts,
        lastError: job.lastError,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
      });
  }

  async updateJob(job: JobRecord): Promise<void> {
    this.db
      .prepare(
        `UPDATE media_jobs
         SET status = @status, attempts = @attempts, last_error = @lastError,
             started_at = @startedAt, finished_at = @finishedAt
         WHERE id = @id`
      )
      .run({
        id: job.id,
        status: job.status,
        attempts: job.attempts,
        lastError: job.lastError,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
      });
  }

  async claimQueuedJob(jobId: string, claimed: JobRecord): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE media_jobs
         SET status = @status, attempts = @attempts, last_error = @lastError,
             started_at = @startedAt, finished_at = @finishedAt
         WHERE id = @id AND status = 'queued'`
      )
      .run({
        id: jobId,
        status: claimed.status,
        attempts: claimed.attempts,
        lastError: claimed.lastError,
        startedAt: claimed.startedAt,
        finishedAt: claimed.finishedAt,
      });
    return result.changes > 0;
  }

  async claimStaleRunningJob(jobId: string, previousStartedAt: string, claimed: JobRecord): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE media_jobs
         SET status = @status, attempts = @attempts, last_error = @lastError,
             started_at = @startedAt, finished_at = @finishedAt
         WHERE id = @id AND status = 'running' AND started_at = @previousStartedAt`
      )
      .run({
        id: jobId,
        previousStartedAt,
        status: claimed.status,
        attempts: claimed.attempts,
        lastError: claimed.lastError,
        startedAt: claimed.startedAt,
        finishedAt: claimed.finishedAt,
      });
    return result.changes > 0;
  }

  async finalizeRunningJob(jobId: string, expectedStartedAt: string, next: JobRecord): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE media_jobs
         SET status = @status, attempts = @attempts, last_error = @lastError,
             started_at = @startedAt, finished_at = @finishedAt
         WHERE id = @id AND status = 'running' AND started_at = @expectedStartedAt`
      )
      .run({
        id: jobId,
        expectedStartedAt,
        status: next.status,
        attempts: next.attempts,
        lastError: next.lastError,
        startedAt: next.startedAt,
        finishedAt: next.finishedAt,
      });
    return result.changes > 0;
  }

  async failQueuedJob(jobId: string, failed: JobRecord): Promise<boolean> {
    const result = this.db
      .prepare(
        `UPDATE media_jobs
         SET status = @status, attempts = @attempts, last_error = @lastError,
             started_at = @startedAt, finished_at = @finishedAt
         WHERE id = @id AND status = 'queued'`
      )
      .run({
        id: jobId,
        status: failed.status,
        attempts: failed.attempts,
        lastError: failed.lastError,
        startedAt: failed.startedAt,
        finishedAt: failed.finishedAt,
      });
    return result.changes > 0;
  }

  async deleteJob(jobId: string): Promise<void> {
    this.db.prepare(`DELETE FROM media_jobs WHERE id = ?`).run(jobId);
  }

  async getJob(id: string): Promise<JobRecord | null> {
    const row = this.db.prepare(`SELECT * FROM media_jobs WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ? rowToJob(row) : null;
  }

  async listJobs(filter: { assetId?: string; status?: JobStatus } = {}): Promise<JobRecord[]> {
    if (filter.assetId && filter.status) {
      const rows = this.db
        .prepare(`SELECT * FROM media_jobs WHERE asset_id = ? AND status = ? ORDER BY created_at DESC`)
        .all(filter.assetId, filter.status) as Record<string, unknown>[];
      return rows.map(rowToJob);
    }
    if (filter.assetId) {
      const rows = this.db
        .prepare(`SELECT * FROM media_jobs WHERE asset_id = ? ORDER BY created_at DESC`)
        .all(filter.assetId) as Record<string, unknown>[];
      return rows.map(rowToJob);
    }
    if (filter.status) {
      const rows = this.db
        .prepare(`SELECT * FROM media_jobs WHERE status = ? ORDER BY created_at DESC`)
        .all(filter.status) as Record<string, unknown>[];
      return rows.map(rowToJob);
    }
    const rows = this.db.prepare(`SELECT * FROM media_jobs ORDER BY created_at DESC`).all() as Record<
      string,
      unknown
    >[];
    return rows.map(rowToJob);
  }

  async deleteJobsForAsset(assetId: string): Promise<void> {
    this.db.prepare(`DELETE FROM media_jobs WHERE asset_id = ?`).run(assetId);
  }
}

export class SqliteAuditStore implements AuditStore {
  constructor(private readonly db: Database.Database) {}

  async append(event: AuditEvent): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO media_audit_events (id, occurred_at, action, entity_type, entity_id, payload_json, correlation_id)
         VALUES (@id, @occurredAt, @action, @entityType, @entityId, @payloadJson, @correlationId)`
      )
      .run({
        id: event.id,
        occurredAt: event.occurredAt,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        payloadJson: JSON.stringify(event.payload),
        correlationId: event.correlationId,
      });
  }

  async listByEntity(entityId: string): Promise<AuditEvent[]> {
    const rows = this.db
      .prepare(`SELECT * FROM media_audit_events WHERE entity_id = ? ORDER BY occurred_at ASC`)
      .all(entityId) as Record<string, unknown>[];
    return rows.map(rowToAudit);
  }
}
