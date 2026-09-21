import { afterEach, describe, expect, it } from 'vitest';

import { Theme, getToken, resetTokens, updateTokens } from '@tgmc/theme/tokens';

describe('Theme adapter parity', () => {
  afterEach(() => {
    resetTokens({ dryRun: true });
  });

  it('Theme.update mirrors updateTokens for a primary patch', () => {
    updateTokens({ '--primary-color': '#111111' }, { dryRun: true, source: 'test-a' });
    expect(getToken('--primary-color')).toBe('#111111');

    Theme.update({ '--primary-color': '#222222' }, { dryRun: true, source: 'test-b' });
    expect(getToken('--primary-color')).toBe('#222222');
  });
});
