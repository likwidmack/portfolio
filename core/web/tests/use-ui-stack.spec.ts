import { describe, expect, it } from 'vitest';

import { resolveUiStack } from '../app/composables/useUiStack';

describe('resolveUiStack', () => {
  it('honors preferred stack when available', () => {
    expect(resolveUiStack({ preferred: 'primevue', primevueAvailable: true, foundationAvailable: true })).toBe(
      'primevue'
    );
    expect(resolveUiStack({ preferred: 'foundation', primevueAvailable: true, foundationAvailable: true })).toBe(
      'foundation'
    );
    expect(resolveUiStack({ preferred: 'native', primevueAvailable: true, foundationAvailable: true })).toBe('native');
  });

  it('falls back when preferred is unavailable', () => {
    expect(resolveUiStack({ preferred: 'foundation', primevueAvailable: true, foundationAvailable: false })).toBe(
      'primevue'
    );
    expect(resolveUiStack({ preferred: 'primevue', primevueAvailable: false, foundationAvailable: true })).toBe(
      'foundation'
    );
    expect(resolveUiStack({ preferred: 'primevue', primevueAvailable: false, foundationAvailable: false })).toBe(
      'native'
    );
  });
});
