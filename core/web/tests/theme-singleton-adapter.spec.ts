import { afterEach, describe, expect, it } from 'vitest';

import { Theme, getToken } from '@tgmc/theme/tokens';

describe('Theme adapter parity', () => {
  afterEach(() => {
    Theme.reset({ dryRun: true });
  });

  it('Theme.apply paints a primary patch (dryRun)', () => {
    Theme.apply({ '--theme-primary-color': '#111111' }, { dryRun: true, source: 'test-a' });
    expect(getToken('--theme-primary-color')).toBe('#111111');
  });

  it('an old key is accepted and stored under its new name only (colour system Task 8, R-T8c)', () => {
    const tokens = Theme.apply({ '--primary-color': '#222222' }, { dryRun: true, source: 'test-b' });
    expect(tokens['--theme-primary-color']).toBe('#222222');
    expect(tokens['--primary-color']).toBeUndefined();
    expect(getToken('--primary-color')).toBe('#222222');
  });
});
