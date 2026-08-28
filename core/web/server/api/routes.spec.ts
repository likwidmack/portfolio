// @vitest-environment node

/**
 * Thin Nitro handler wiring tests — services/adapters are covered elsewhere.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const allowMessageCreate = vi.fn();
const createContactMessageFromBody = vi.fn();
const getMessageStore = vi.fn();
const messageStoreOptionsFromRuntimeConfig = vi.fn();
const listPublishedPosts = vi.fn();
const getBlogPostStore = vi.fn();
const blogPostStoreOptionsFromRuntimeConfig = vi.fn();
const useRuntimeConfig = vi.fn();
const readBody = vi.fn();

vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);

vi.mock('h3', async (importOriginal) => {
  const actual = await importOriginal<typeof import('h3')>();
  return {
    ...actual,
    defineEventHandler: (fn: unknown) => fn,
    readBody: (...args: unknown[]) => readBody(...args),
    createError: (input: { statusCode: number; statusMessage: string }) => {
      const error = new Error(input.statusMessage) as Error & { statusCode: number };
      error.statusCode = input.statusCode;
      return error;
    },
  };
});

vi.mock('../../server/db', () => ({
  getMessageStore: (...args: unknown[]) => getMessageStore(...args),
}));
vi.mock('../../server/db/blog-store', () => ({
  getBlogPostStore: (...args: unknown[]) => getBlogPostStore(...args),
}));
vi.mock('../../server/api/messages/rate-limit', () => ({
  allowMessageCreate: (...args: unknown[]) => allowMessageCreate(...args),
}));
vi.mock('../../server/api/messages/service', () => ({
  createContactMessageFromBody: (...args: unknown[]) => createContactMessageFromBody(...args),
}));
vi.mock('../../server/api/messages/store-options', () => ({
  messageStoreOptionsFromRuntimeConfig: (...args: unknown[]) => messageStoreOptionsFromRuntimeConfig(...args),
}));
vi.mock('../../server/api/posts/service', () => ({
  listPublishedPosts: (...args: unknown[]) => listPublishedPosts(...args),
}));
vi.mock('../../server/api/posts/store-options', () => ({
  blogPostStoreOptionsFromRuntimeConfig: (...args: unknown[]) => blogPostStoreOptionsFromRuntimeConfig(...args),
}));

describe('Nitro route handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useRuntimeConfig.mockReturnValue({ adminToken: 'secret', public: { sysEnv: 'local' } });
    messageStoreOptionsFromRuntimeConfig.mockReturnValue({ sysEnv: 'local' });
    blogPostStoreOptionsFromRuntimeConfig.mockReturnValue({ sysEnv: 'local' });
    getMessageStore.mockReturnValue({ create: vi.fn(), list: vi.fn() });
    getBlogPostStore.mockReturnValue({ listPublished: vi.fn() });
  });

  it('POST /api/messages returns 429 when rate-limited', async () => {
    allowMessageCreate.mockReturnValue(false);
    const handler = (await import('../../server/api/messages/index.post')).default as (
      _event: unknown
    ) => Promise<unknown>;
    await expect(handler({})).rejects.toMatchObject({ statusCode: 429 });
  });

  it('POST /api/messages creates a message when allowed', async () => {
    allowMessageCreate.mockReturnValue(true);
    readBody.mockResolvedValue({ name: 'A', email: 'a@b.co', body: 'Hi' });
    createContactMessageFromBody.mockResolvedValue({
      ok: true,
      value: { id: '1', name: 'A', email: 'a@b.co', body: 'Hi', createdAt: 't' },
    });
    const handler = (await import('../../server/api/messages/index.post')).default as (
      _event: unknown
    ) => Promise<unknown>;
    await expect(handler({})).resolves.toMatchObject({ id: '1', name: 'A' });
  });

  it('GET /api/posts lists published posts', async () => {
    listPublishedPosts.mockResolvedValue([{ id: 'p1', slug: 'a', title: 'A' }]);
    const handler = (await import('../../server/api/posts/index.get')).default as (_event: unknown) => Promise<unknown>;
    await expect(handler({})).resolves.toEqual([{ id: 'p1', slug: 'a', title: 'A' }]);
    expect(listPublishedPosts).toHaveBeenCalled();
  });
});
