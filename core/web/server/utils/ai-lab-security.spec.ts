import { beforeEach, describe, expect, it, vi } from 'vitest';

import { replayPlan } from '#shared/ai-lab-replay';

import { consumeContinuation, createContinuation, isContinuationSpent, verifyContinuation } from './ai-lab-security';

const cookies = vi.hoisted(() => new Map<string, string>());

vi.mock('h3', () => ({
  getCookie: (_event: unknown, name: string) => cookies.get(name),
  setCookie: (_event: unknown, name: string, value: string) => {
    cookies.set(name, value);
  },
}));

describe('AI Lab continuation tokens', () => {
  const secret = 'test-signing-secret-with-enough-entropy';
  const now = Date.UTC(2026, 7, 2);
  const event = {} as never;

  beforeEach(() => {
    cookies.clear();
  });

  it('round-trips a short-lived signed continuation with a jti', () => {
    const token = createContinuation('A transparent creative workspace', replayPlan, secret, now);
    expect(verifyContinuation(token, secret, now + 1000)).toMatchObject({
      idea: 'A transparent creative workspace',
      plan: replayPlan,
      jti: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i),
    });
  });

  it('rejects tampered and expired tokens', () => {
    const token = createContinuation('A transparent creative workspace', replayPlan, secret, now);
    expect(verifyContinuation(`${token}x`, secret, now + 1000)).toBeNull();
    expect(verifyContinuation(token, secret, now + 11 * 60 * 1000)).toBeNull();
  });

  it('allows a continuation once then rejects replay on consume', () => {
    const token = createContinuation('A transparent creative workspace', replayPlan, secret, now);
    expect(isContinuationSpent(event, token, secret, now + 500)).toBe(false);
    expect(consumeContinuation(event, token, secret, now + 1000)?.idea).toBe('A transparent creative workspace');
    expect(isContinuationSpent(event, token, secret, now + 1500)).toBe(true);
    expect(consumeContinuation(event, token, secret, now + 2000)).toBeNull();
  });
});
