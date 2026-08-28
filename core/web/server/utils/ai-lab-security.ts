import { createHmac, timingSafeEqual } from 'node:crypto';

import type { H3Event } from 'h3';
import { getCookie, setCookie } from 'h3';

import type { AiLabPlan } from '#shared/ai-lab-types';
import { createSecureId } from './secure-id';

type Continuation = {
  v: 1;
  jti: string;
  exp: number;
  idea: string;
  plan: AiLabPlan;
};

type Quota = {
  v: 1;
  id: string;
  count: number;
  exp: number;
};

/** Signed list of one-time continuation ids already spent on /complete. */
type Spent = {
  v: 1;
  ids: string[];
  exp: number;
};

const QUOTA_COOKIE = 'tgmc-ai-lab-quota';
const SPENT_COOKIE = 'tgmc-ai-lab-spent';
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_SPENT_IDS = 32;

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseSigned<T>(token: string, secret: string): T | null {
  const [payload, signature] = token.split('.');
  if (!payload || !signature || !safeEqual(sign(payload, secret), signature)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function setSignedCookie(event: H3Event, name: string, value: unknown, secret: string, maxAgeSeconds: number): void {
  const payload = encode(value);
  setCookie(event, name, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/ai-lab',
    maxAge: maxAgeSeconds,
  });
}

export function createContinuation(idea: string, plan: AiLabPlan, secret: string, now = Date.now()): string {
  const payload = encode({
    v: 1,
    jti: createSecureId(),
    exp: now + 10 * 60 * 1000,
    idea,
    plan,
  } satisfies Continuation);
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyContinuation(token: string, secret: string, now = Date.now()): Continuation | null {
  const value = parseSigned<Continuation>(token, secret);
  if (
    !value ||
    value.v !== 1 ||
    typeof value.jti !== 'string' ||
    !value.jti ||
    value.exp <= now ||
    value.idea.length > 240 ||
    value.plan.steps.length > 3
  ) {
    return null;
  }
  return value;
}

function readSpent(event: H3Event, secret: string, now: number): Spent {
  const existing = getCookie(event, SPENT_COOKIE);
  const parsed = existing ? parseSigned<Spent>(existing, secret) : null;
  return parsed && parsed.v === 1 && parsed.exp > now ? parsed : { v: 1, ids: [], exp: now + DAY_MS };
}

/**
 * True when this continuation's `jti` is already on the spent cookie.
 * Does not mutate cookies — use before burning anonymous quota on `/complete`.
 */
export function isContinuationSpent(event: H3Event, token: string, secret: string, now = Date.now()): boolean {
  const continuation = verifyContinuation(token, secret, now);
  if (!continuation) return false;
  return readSpent(event, secret, now).ids.includes(continuation.jti);
}

/**
 * Verify a continuation and mark its `jti` spent so `/complete` cannot replay the same token.
 * Returns null when the token is invalid, expired, or already consumed.
 */
export function consumeContinuation(
  event: H3Event,
  token: string,
  secret: string,
  now = Date.now()
): Continuation | null {
  const continuation = verifyContinuation(token, secret, now);
  if (!continuation) return null;

  const spent = readSpent(event, secret, now);
  if (spent.ids.includes(continuation.jti)) return null;

  spent.ids = [...spent.ids, continuation.jti].slice(-MAX_SPENT_IDS);
  setSignedCookie(event, SPENT_COOKIE, spent, secret, Math.ceil((spent.exp - now) / 1000));
  return continuation;
}

/** HMAC-signed anonymous daily quota. The cookie contains no prompt or transcript data. */
export function consumeAnonymousQuota(event: H3Event, secret: string, limit = 5, now = Date.now()): boolean {
  const existing = getCookie(event, QUOTA_COOKIE);
  const parsed = existing ? parseSigned<Quota>(existing, secret) : null;
  const current =
    parsed && parsed.v === 1 && parsed.exp > now
      ? parsed
      : { v: 1 as const, id: createSecureId(), count: 0, exp: now + DAY_MS };

  if (current.count >= limit) return false;
  current.count += 1;
  setSignedCookie(event, QUOTA_COOKIE, current, secret, Math.ceil((current.exp - now) / 1000));
  return true;
}
