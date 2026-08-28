// @vitest-environment node

import type { AdminBlogApi } from '@tgmc/web-layer-admin/server/utils/admin-blog-api';
import { requireAdminBlog, requirePostId } from '@tgmc/web-layer-admin/server/utils/admin-handler';
import type { H3Event } from 'h3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useRuntimeConfig = vi.fn();

vi.stubGlobal('useRuntimeConfig', useRuntimeConfig);

function makeEvent(partial: { authorization?: string; id?: string; adminBlog?: AdminBlogApi }): H3Event {
  return {
    context: {
      adminBlog: partial.adminBlog,
      params: partial.id ? { id: partial.id } : {},
    },
    node: {
      req: {
        headers: {
          authorization: partial.authorization,
        },
      },
    },
  } as unknown as H3Event;
}

describe('requireAdminBlog', () => {
  beforeEach(() => {
    useRuntimeConfig.mockReturnValue({ adminToken: 'secret' });
  });

  it('throws when host plugin did not inject adminBlog', () => {
    const event = makeEvent({ authorization: 'Bearer secret' });
    expect(() => requireAdminBlog(event)).toThrow(/not configured/i);
  });

  it('throws 401 when bearer token is wrong', () => {
    const api = { listAllPosts: vi.fn() } as unknown as AdminBlogApi;
    const event = makeEvent({ authorization: 'Bearer nope', adminBlog: api });
    try {
      requireAdminBlog(event);
      expect.unreachable('expected throw');
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(401);
    }
  });

  it('returns the injected API when auth succeeds', () => {
    const api = {
      listAllPosts: vi.fn(async () => []),
    } as unknown as AdminBlogApi;
    const event = makeEvent({ authorization: 'Bearer secret', adminBlog: api });
    expect(requireAdminBlog(event)).toBe(api);
  });
});

describe('requirePostId', () => {
  it('returns :id from the router', () => {
    const event = makeEvent({ id: 'post-1' });
    // getRouterParam reads from event.context.params in h3
    expect(requirePostId(event)).toBe('post-1');
  });

  it('throws 400 when id is missing', () => {
    const event = makeEvent({});
    try {
      requirePostId(event);
      expect.unreachable('expected throw');
    } catch (error) {
      expect((error as { statusCode?: number }).statusCode).toBe(400);
    }
  });
});
