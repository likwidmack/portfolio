// @vitest-environment node

import { describe, expect, it, vi } from 'vitest';
import type { BlogPost, BlogPostStore } from '../../db/blog-types';
import { createBlogPostFromBody, getPublishedPostBySlug, listPublishedPosts, updateBlogPostFromBody } from './service';
import { blogPostStoreOptionsFromRuntimeConfig } from './store-options';

const sample: BlogPost = {
  id: '1',
  slug: 'hello',
  title: 'Hello',
  excerpt: 'Ex',
  body: '# Hi',
  status: 'published',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  publishedAt: '2026-01-01T00:00:00.000Z',
};

describe('blogPostStoreOptionsFromRuntimeConfig', () => {
  it('maps runtime config fields', () => {
    expect(
      blogPostStoreOptionsFromRuntimeConfig(
        {
          public: { sysEnv: 'test' },
          databaseUrl: 'postgres://db',
          dynamoPostsTable: 'Posts',
          awsRegion: 'us-west-2',
        },
        'local'
      )
    ).toEqual({
      sysEnv: 'test',
      databaseUrl: 'postgres://db',
      dynamoPostsTable: 'Posts',
      awsRegion: 'us-west-2',
    });
  });

  it('treats empty baked runtimeConfig strings as unset', () => {
    expect(
      blogPostStoreOptionsFromRuntimeConfig(
        {
          public: { sysEnv: '' },
          databaseUrl: '',
          dynamoPostsTable: '',
          awsRegion: '  ',
        },
        'production'
      )
    ).toEqual({
      sysEnv: 'production',
      databaseUrl: undefined,
      dynamoPostsTable: undefined,
      awsRegion: undefined,
    });
  });
});

describe('posts service', () => {
  it('lists published posts via the store', async () => {
    const store: BlogPostStore = {
      listPublished: vi.fn(async () => [sample]),
      listAll: vi.fn(),
      getBySlug: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(listPublishedPosts(store)).resolves.toEqual([sample]);
  });

  it('hides drafts from public slug lookup', async () => {
    const store: BlogPostStore = {
      listPublished: vi.fn(),
      listAll: vi.fn(),
      getBySlug: vi.fn(async () => ({ ...sample, status: 'draft', publishedAt: null })),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    await expect(getPublishedPostBySlug(store, 'hello')).resolves.toBeNull();
  });

  it('creates on valid body and surfaces validation failures', async () => {
    const store: BlogPostStore = {
      listPublished: vi.fn(),
      listAll: vi.fn(),
      getBySlug: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(async (input) => ({
        ...sample,
        ...input,
        excerpt: input.excerpt ?? '',
        status: input.status ?? 'draft',
        id: 'new',
        publishedAt: input.status === 'published' ? sample.publishedAt : null,
      })),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const created = await createBlogPostFromBody(store, {
      title: 'Hello',
      slug: 'hello',
      body: 'Hi',
    });
    expect(created.ok).toBe(true);
    expect(store.create).toHaveBeenCalledOnce();

    const invalid = await createBlogPostFromBody(store, { title: 'Hello' });
    expect(invalid.ok).toBe(false);
    expect(store.create).toHaveBeenCalledOnce();
  });

  it('updates and returns not found', async () => {
    const store: BlogPostStore = {
      listPublished: vi.fn(),
      listAll: vi.fn(),
      getBySlug: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(async () => null),
      delete: vi.fn(),
    };

    const missing = await updateBlogPostFromBody(store, 'missing', { title: 'X' });
    expect(missing).toEqual({
      ok: false,
      code: 'NOT_FOUND',
      message: 'Post not found',
    });
  });
});
