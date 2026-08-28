import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Unit tests for the global toast API (native bus path — no Nuxt/PrimeVue inject).
 */
describe('createAppToastApi', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('uses PrimeVue add when available', async () => {
    const { createAppToastApi } = await import('../app/composables/useAppToast');
    const add = vi.fn();
    const toast = createAppToastApi(() => ({ add }));

    toast.show({
      summary: 'Saved',
      detail: 'Product updated',
      severity: 'success',
      life: 1000,
    });

    expect(add).toHaveBeenCalledTimes(1);
    expect(add).toHaveBeenCalledWith({
      summary: 'Saved',
      detail: 'Product updated',
      severity: 'success',
      life: 1000,
    });
  });

  it('falls back to the native toast bus without PrimeVue', async () => {
    const { createAppToastApi, nativeToasts } = await import('../app/composables/useAppToast');
    nativeToasts.value = [];
    const toast = createAppToastApi(() => undefined);

    toast.add({
      summary: 'Heads up',
      detail: 'Native path',
      severity: 'info',
      life: 0,
    });

    expect(nativeToasts.value).toHaveLength(1);
    expect(nativeToasts.value[0]).toMatchObject({
      summary: 'Heads up',
      detail: 'Native path',
      severity: 'info',
    });
  });
});
