// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import cdnMiddleware from '../server/middleware/cdn';

/** Nitro auto-imports the middleware uses, stubbed before it loads. */
const nitro = vi.hoisted(() => {
  const state = { cdnUrl: 'https://shared-cdn.example.com', redirects: [] as Array<[string, number]> };
  Object.assign(globalThis, {
    defineEventHandler: (handler: unknown) => handler,
    useRuntimeConfig: () => ({ public: { cdnUrl: state.cdnUrl } }),
    getMethod: () => 'GET',
    getHeader: () => undefined,
    sendRedirect: (_event: unknown, location: string, code: number) => {
      state.redirects.push([location, code]);
      return location;
    },
  });
  return state;
});

const ENV_KEYS = ['DATA_BACKEND', 'SYS_ENV', 'AWS_LAMBDA_FUNCTION_NAME', 'MEDIA_PUBLIC_BASE_URL'] as const;

describe('CDN middleware and the /m/** media stand-in', () => {
  const saved: Record<string, string | undefined> = {};
  const run = (url: string) => (cdnMiddleware as unknown as (event: unknown) => unknown)({ node: { req: { url } } });

  beforeEach(() => {
    for (const key of ENV_KEYS) {
      saved[key] = process.env[key];
      Reflect.deleteProperty(process.env, key);
    }
    nitro.redirects.length = 0;
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (saved[key] == null) Reflect.deleteProperty(process.env, key);
      else process.env[key] = saved[key];
    }
  });

  it('does not redirect /m/ on a filesystem backend, so the local stand-in answers', () => {
    process.env.DATA_BACKEND = 'sqlite';
    run('/m/pf/i/hero@t.webp');
    expect(nitro.redirects).toEqual([]);
    run('/_nuxt/entry.js');
    expect(nitro.redirects).toEqual([['https://shared-cdn.example.com/_nuxt/entry.js', 302]]);
  });

  it("redirects /m/ to the media public base on AWS (the stack's own distribution)", () => {
    process.env.SYS_ENV = 'test';
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'portfolio-test-nitro';
    process.env.MEDIA_PUBLIC_BASE_URL = 'https://d9own.cloudfront.net';
    run('/m/pf/i/hero.png');
    expect(nitro.redirects).toEqual([['https://d9own.cloudfront.net/m/pf/i/hero.png', 302]]);
  });

  describe('without a static-asset CDN URL', () => {
    beforeEach(() => {
      nitro.cdnUrl = '';
    });
    afterEach(() => {
      nitro.cdnUrl = 'https://shared-cdn.example.com';
    });

    it('still sends /m/ to the media base when local media is off', () => {
      process.env.DATA_BACKEND = 'dynamodb';
      process.env.MEDIA_PUBLIC_BASE_URL = 'http://localhost:4430/portfolio-assets';
      run('/m/pf/i/hero.png');
      expect(nitro.redirects).toEqual([['http://localhost:4430/portfolio-assets/m/pf/i/hero.png', 302]]);
    });

    it('leaves everything else (and local media) alone', () => {
      process.env.DATA_BACKEND = 'dynamodb';
      process.env.MEDIA_PUBLIC_BASE_URL = 'http://localhost:4430/portfolio-assets';
      run('/_nuxt/entry.js');
      process.env.DATA_BACKEND = 'sqlite';
      run('/m/pf/i/hero.png');
      expect(nitro.redirects).toEqual([]);
    });
  });

  it('keeps the Lambda guard: a filesystem backend resolved on Lambda still redirects', () => {
    process.env.DATA_BACKEND = 'sqlite';
    process.env.AWS_LAMBDA_FUNCTION_NAME = 'portfolio-test-nitro';
    run('/m/pf/i/hero.png');
    expect(nitro.redirects).toEqual([['https://shared-cdn.example.com/m/pf/i/hero.png', 302]]);
  });
});
