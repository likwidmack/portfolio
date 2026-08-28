/**
 * PostgreSQL BlogPostStore adapter for SYS_ENV=development (pg pool).
 */
import { Pool, type Pool as PgPool } from 'pg';
import { createSecureId } from '../utils/secure-id';
import { POSTS_MIGRATION_SQL, resolveCreateFields, resolveUpdateFields, rethrowIfSlugConflict } from './blog-helpers';
import type { BlogPost, BlogPostStore, CreateBlogPostInput, UpdateBlogPostInput } from './blog-types';
import { BlogPostSlugConflictError } from './blog-types';
import { nonEmpty } from './env-value';

export interface PostgresBlogStoreOptions {
  databaseUrl?: string;
  /** Optional injected pool for tests. */
  pool?: PgPool;
}

type PostRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
  published_at: string | null;
};

const POST_COLUMNS = 'id, slug, title, excerpt, body, status, created_at, updated_at, published_at';

const mapRow = (row: PostRow): BlogPost => ({
  id: row.id,
  slug: row.slug,
  title: row.title,
  excerpt: row.excerpt,
  body: row.body,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  publishedAt: row.published_at,
});

type PostgresBlogStoreContext = {
  pool: PgPool;
  ensureSchema: () => Promise<void>;
};

const listPublished = async ({ pool, ensureSchema }: PostgresBlogStoreContext): Promise<BlogPost[]> => {
  await ensureSchema();
  const result = await pool.query<PostRow>(
    `SELECT ${POST_COLUMNS} FROM posts WHERE status = 'published' ORDER BY published_at DESC`
  );
  return result.rows.map(mapRow);
};

const listAll = async ({ pool, ensureSchema }: PostgresBlogStoreContext): Promise<BlogPost[]> => {
  await ensureSchema();
  const result = await pool.query<PostRow>(`SELECT ${POST_COLUMNS} FROM posts ORDER BY updated_at DESC`);
  return result.rows.map(mapRow);
};

const getBySlug = async ({ pool, ensureSchema }: PostgresBlogStoreContext, slug: string): Promise<BlogPost | null> => {
  await ensureSchema();
  const result = await pool.query<PostRow>(`SELECT ${POST_COLUMNS} FROM posts WHERE slug = $1`, [slug]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const getById = async ({ pool, ensureSchema }: PostgresBlogStoreContext, id: string): Promise<BlogPost | null> => {
  await ensureSchema();
  const result = await pool.query<PostRow>(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1`, [id]);
  return result.rows[0] ? mapRow(result.rows[0]) : null;
};

const createPost = async (
  { pool, ensureSchema }: PostgresBlogStoreContext,
  input: CreateBlogPostInput
): Promise<BlogPost> => {
  await ensureSchema();
  const fields = resolveCreateFields(input);
  const existing = await pool.query<{ id: string }>(`SELECT id FROM posts WHERE slug = $1`, [fields.slug]);
  if (existing.rows[0]) {
    throw new BlogPostSlugConflictError(fields.slug);
  }

  const post: BlogPost = { id: createSecureId(), ...fields };
  try {
    await pool.query(
      `INSERT INTO posts (id, slug, title, excerpt, body, status, created_at, updated_at, published_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        post.id,
        post.slug,
        post.title,
        post.excerpt,
        post.body,
        post.status,
        post.createdAt,
        post.updatedAt,
        post.publishedAt,
      ]
    );
  } catch (error) {
    rethrowIfSlugConflict(error, fields.slug);
  }
  return post;
};

const updatePost = async (
  { pool, ensureSchema }: PostgresBlogStoreContext,
  id: string,
  input: UpdateBlogPostInput
): Promise<BlogPost | null> => {
  await ensureSchema();
  const existingResult = await pool.query<PostRow>(`SELECT ${POST_COLUMNS} FROM posts WHERE id = $1`, [id]);
  const existing = existingResult.rows[0];
  if (!existing) {
    return null;
  }

  const fields = resolveUpdateFields(mapRow(existing), input);
  if (fields.slug !== existing.slug) {
    const conflict = await pool.query<{ id: string }>(`SELECT id FROM posts WHERE slug = $1 AND id <> $2`, [
      fields.slug,
      id,
    ]);
    if (conflict.rows[0]) {
      throw new BlogPostSlugConflictError(fields.slug);
    }
  }

  const post: BlogPost = { id, createdAt: existing.created_at, ...fields };
  try {
    await pool.query(
      `UPDATE posts SET slug = $1, title = $2, excerpt = $3, body = $4,
        status = $5, updated_at = $6, published_at = $7
       WHERE id = $8`,
      [post.slug, post.title, post.excerpt, post.body, post.status, post.updatedAt, post.publishedAt, post.id]
    );
  } catch (error) {
    rethrowIfSlugConflict(error, fields.slug);
  }
  return post;
};

const deletePost = async ({ pool, ensureSchema }: PostgresBlogStoreContext, id: string): Promise<boolean> => {
  await ensureSchema();
  const result = await pool.query(`DELETE FROM posts WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
};

const closeStore = async ({ pool }: PostgresBlogStoreContext): Promise<void> => pool.end();

/**
 * Create a Postgres-backed BlogPostStore. Runs the posts migration on first use.
 */
export const createPostgresBlogPostStore = (options: PostgresBlogStoreOptions = {}): BlogPostStore => {
  const connectionString =
    nonEmpty(options.databaseUrl) ??
    nonEmpty(process.env.NUXT_DATABASE_URL) ??
    nonEmpty(process.env.DATABASE_URL) ??
    '';

  if (!options.pool && !connectionString) {
    throw new Error('Postgres BlogPostStore requires DATABASE_URL (or an injected pool)');
  }

  const pool = options.pool ?? new Pool({ connectionString });
  let migrated = false;

  const ensureSchema = async (): Promise<void> => {
    if (migrated) {
      return;
    }
    await pool.query(POSTS_MIGRATION_SQL);
    migrated = true;
  };
  const context: PostgresBlogStoreContext = { pool, ensureSchema };

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
