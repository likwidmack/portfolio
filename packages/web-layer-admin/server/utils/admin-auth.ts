/**
 * Admin Bearer-token gate for write APIs (env-gated shared secret).
 */
import { createError, getHeader, type H3Event } from 'h3';
import { timingSafeEqual } from 'node:crypto';

/**
 * Constant-time string compare (pads to equal length buffers).
 */
export const secureCompare = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
};

/**
 * Extract Bearer token from an Authorization header value.
 */
export const parseBearerToken = (authorization: string | undefined): string | null => {
  if (!authorization) {
    return null;
  }
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
};

export type AssertAdminTokenResult = { ok: true } | { ok: false; statusCode: 401; statusMessage: string };

/**
 * Validate admin token against configured secret. Fail closed when secret is empty.
 */
export const assertAdminToken = (
  expectedToken: string | undefined,
  authorizationHeader: string | undefined
): AssertAdminTokenResult => {
  const expected = (expectedToken ?? '').trim();
  if (!expected) {
    return {
      ok: false,
      statusCode: 401,
      statusMessage: 'Admin writes are disabled (ADMIN_TOKEN not configured)',
    };
  }

  const provided = parseBearerToken(authorizationHeader);
  if (!provided || !secureCompare(provided, expected)) {
    return {
      ok: false,
      statusCode: 401,
      statusMessage: 'Unauthorized',
    };
  }

  return { ok: true };
};

/**
 * Resolve admin token from runtime config with process.env fallbacks (Docker/Lambda).
 */
export const resolveAdminToken = (configured: string | undefined): string => {
  const fromEnv = [process.env.NUXT_ADMIN_TOKEN, process.env.ADMIN_TOKEN]
    .map((value) => value?.trim())
    .find((value) => value);
  return fromEnv || (configured ?? '').trim();
};

/**
 * Require a valid admin Bearer token on an H3 event or throw 401.
 */
export const requireAdminToken = (event: H3Event, adminToken: string | undefined): void => {
  const result = assertAdminToken(resolveAdminToken(adminToken), getHeader(event, 'authorization'));
  if (!result.ok) {
    throw createError({
      statusCode: result.statusCode,
      statusMessage: result.statusMessage,
    });
  }
};
