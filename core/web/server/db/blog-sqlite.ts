/**
 * SQLite BlogPostStore adapter for SYS_ENV=local (better-sqlite3).
 */
import type Database from 'better-sqlite3';
import { createSecureId } from '../utils/secure-id';
import { POSTS_MIGRATION_SQL, resolveCreateFields, resolveUpdateFields, rethrowIfSlugConflict } from './blog-helpers';
import type { BlogPost, BlogPostStore, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';
import { BlogPostSlugConflictError } from './blog-types';
import { nonEmpty } from './env-value';
import { openSqliteDatabase, resolveSqlitePath } from './sqlite';

export interface SqliteBlogStoreOptions {
  /** `file:./path` or absolute filesystem path. Defaults to `./data/local.sqlite`. */
  databaseUrl?: string;
}

const POST_SELECT = `id, slug, title, excerpt, body, status,
            created_at AS createdAt, updated_at AS updatedAt, published_at AS publishedAt`;

type SqliteStatement = ReturnType<Database.Database['prepare']>;

type SqliteBlogStoreContext = {
  db: Database.Database;
  selectById: SqliteStatement;
  selectBySlug: SqliteStatement;
  listPublishedStmt: SqliteStatement;
  listAllStmt: SqliteStatement;
  insertStmt: SqliteStatement;
  updateStmt: SqliteStatement;
  deleteStmt: SqliteStatement;
};

const listPublished = async ({ listPublishedStmt }: SqliteBlogStoreContext): Promise<BlogPost[]> =>
  listPublishedStmt.all() as BlogPost[];

const listAll = async ({ listAllStmt }: SqliteBlogStoreContext): Promise<BlogPost[]> => listAllStmt.all() as BlogPost[];

const getBySlug = async ({ selectBySlug }: SqliteBlogStoreContext, slug: string): Promise<BlogPost | null> =>
  (selectBySlug.get(slug) as BlogPost | undefined) ?? null;

const getById = async ({ selectById }: SqliteBlogStoreContext, id: string): Promise<BlogPost | null> =>
  (selectById.get(id) as BlogPost | undefined) ?? null;

const createPost = async (
  { selectBySlug, insertStmt }: SqliteBlogStoreContext,
  input: CreateBlogPostInput
): Promise<BlogPost> => {
  const fields = resolveCreateFields(input);
  const existing = selectBySlug.get(fields.slug) as BlogPost | undefined;
  if (existing) {
    throw new BlogPostSlugConflictError(fields.slug);
  }

  const post: BlogPost = { id: createSecureId(), ...fields };
  try {
    insertStmt.run(post);
  } catch (error) {
    rethrowIfSlugConflict(error, fields.slug);
  }
  return post;
};

const updatePost = async (
  { selectById, selectBySlug, updateStmt }: SqliteBlogStoreContext,
  id: string,
  input: UpdateBlogPostInput
): Promise<BlogPost | null> => {
  const existing = selectById.get(id) as BlogPost | undefined;
  if (!existing) {
    return null;
  }

  const fields = resolveUpdateFields(existing, input);
  if (fields.slug !== existing.slug) {
    const conflict = selectBySlug.get(fields.slug) as BlogPost | undefined;
    if (conflict && conflict.id !== id) {
      throw new BlogPostSlugConflictError(fields.slug);
    }
  }

  const post: BlogPost = { id, createdAt: existing.createdAt, ...fields };
  try {
    updateStmt.run(post);
  } catch (error) {
    rethrowIfSlugConflict(error, fields.slug);
  }
  return post;
};

const deletePost = async ({ deleteStmt }: SqliteBlogStoreContext, id: string): Promise<boolean> =>
  deleteStmt.run(id).changes > 0;

const closeStore = ({ db }: SqliteBlogStoreContext): void => {
  db.close();
};

/**
 * Create a SQLite-backed BlogPostStore. Ensures parent directory and schema exist.
 */
export const createSqliteBlogPostStore = (options: SqliteBlogStoreOptions = {}): BlogPostStore => {
  const dbPath = resolveSqlitePath(
    nonEmpty(options.databaseUrl) ??
      nonEmpty(process.env.NUXT_DATABASE_URL) ??
      nonEmpty(process.env.DATABASE_URL) ??
      'file:./data/local.sqlite'
  );
  const db = openSqliteDatabase(dbPath);
  db.exec(POSTS_MIGRATION_SQL);

  const selectById = db.prepare(`SELECT ${POST_SELECT} FROM posts WHERE id = ?`);
  const selectBySlug = db.prepare(`SELECT ${POST_SELECT} FROM posts WHERE slug = ?`);
  const listPublishedStmt = db.prepare(
    `SELECT ${POST_SELECT} FROM posts WHERE status = 'published' ORDER BY published_at DESC`
  );
  const listAllStmt = db.prepare(`SELECT ${POST_SELECT} FROM posts ORDER BY updated_at DESC`);
  const insertStmt = db.prepare(
    `INSERT INTO posts (id, slug, title, excerpt, body, status, created_at, updated_at, published_at)
     VALUES (@id, @slug, @title, @excerpt, @body, @status, @createdAt, @updatedAt, @publishedAt)`
  );
  const updateStmt = db.prepare(
    `UPDATE posts SET slug = @slug, title = @title, excerpt = @excerpt, body = @body,
      status = @status, updated_at = @updatedAt, published_at = @publishedAt
     WHERE id = @id`
  );
  const deleteStmt = db.prepare(`DELETE FROM posts WHERE id = ?`);
  const context: SqliteBlogStoreContext = {
    db,
    selectById,
    selectBySlug,
    listPublishedStmt,
    listAllStmt,
    insertStmt,
    updateStmt,
    deleteStmt,
  };

  return {
    listPublished: () => listPublished(context),
    listAll: () => listAll(context),
    getBySlug: (slug) => getBySlug(context, slug),
    getById: (id) => getById(context, id),
    create: (input) => createPost(context, input),
    update: (id, input) => updatePost(context, id, input),
    delete: (id) => deletePost(context, id),
    close: () => closeStore(context),
  };
};
