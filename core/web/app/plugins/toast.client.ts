/**
 * Registers PrimeVue ToastService and exposes app toast globally as `$toast`.
 *
 * Usage anywhere:
 * - `const { $toast } = useNuxtApp(); $toast.show({ summary: 'Saved' })`
 * - `useAppToast().show({ summary: 'Saved' })`
 * - template / Options API: `this.$toast.show(...)`
 *
 * Note: `nuxtApp.provide('toast')` defines `$toast` as a getter-only property on
 * `globalProperties` — do not reassign `$toast` after provide.
 */
import ToastService from 'primevue/toastservice';

import { createAppToastApi, type AppToastApi } from '../composables/useAppToast';

/**
 * Minimal shape of PrimeVue's toast service as exposed on
 * `app.config.globalProperties.$toast`.
 *
 * We only depend on the `add` method + optional helpers — the concrete
 * PrimeVue runtime provides the full API at mount time.
 */
type PrimeToastLike = {
  add: (message: Record<string, unknown>) => void;
  remove?: (message: Record<string, unknown>) => void;
  removeAllGroups?: () => void;
  removeGroup?: (group: string) => void;
};

export default defineNuxtPlugin({
  name: 'app-toast',
  setup(nuxtApp) {
    nuxtApp.vueApp.use(ToastService);

    // Capture PrimeVue's service object before Nuxt wraps `$toast` as a getter.
    const primeToast = nuxtApp.vueApp.config.globalProperties.$toast as PrimeToastLike | undefined;
    // Create the wrapper API used by the app. `createAppToastApi` accepts a
    // getter so that the underlying PrimeVue service can be resolved lazily
    // (PrimeVue installs it when the Vue app is mounted). The wrapper normalises
    // our own `show/add` helpers while delegating to PrimeVue where available.
    const toastApi = createAppToastApi(() => (typeof primeToast?.add === 'function' ? primeToast : undefined));

    const toast = {
      ...(primeToast ?? {}),
      show: toastApi.show,
      add: toastApi.add,
    } as AppToastApi & PrimeToastLike;

    // → `useNuxtApp().$toast` and getter-only `globalProperties.$toast`
    nuxtApp.provide('toast', toast);
  },
});
