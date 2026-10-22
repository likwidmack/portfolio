// @vitest-environment node

import { rejectedTokenMessage, signInErrorMessage } from '@tgmc/web-layer-admin/app/utils/admin-sign-in-messages';
import { describe, expect, it } from 'vitest';

describe('rejectedTokenMessage', () => {
  it('shows the server reason, unless it is the generic Unauthorized', () => {
    expect(rejectedTokenMessage('Admin writes are disabled (ADMIN_TOKEN not configured)')).toBe(
      'Admin writes are disabled (ADMIN_TOKEN not configured)'
    );
    expect(rejectedTokenMessage('Unauthorized')).toBe('That token is not valid for this environment.');
    expect(rejectedTokenMessage(undefined)).toBe('That token is not valid for this environment.');
    expect(rejectedTokenMessage('  ')).toBe('That token is not valid for this environment.');
  });
});

describe('signInErrorMessage', () => {
  it('tells an unreachable server, a server error and another refusal apart', () => {
    expect(signInErrorMessage(new TypeError('fetch failed'))).toBe('Could not reach the admin server — try again.');
    expect(signInErrorMessage({ statusCode: 500, statusMessage: 'Server Error' })).toBe(
      'The admin server failed (500: Server Error) — check its logs, then try again.'
    );
    expect(signInErrorMessage({ statusCode: 503 })).toBe(
      'The admin server failed (503) — check its logs, then try again.'
    );
    expect(signInErrorMessage({ statusCode: 403, statusMessage: 'Forbidden' })).toBe(
      'The admin server refused the check (403: Forbidden).'
    );
  });
});
