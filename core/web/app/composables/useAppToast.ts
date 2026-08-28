/**
 * App toast API — PrimeVue ToastService when available, else a native bus for `UiToastHost`.
 */
import { ref } from 'vue';

export type AppToastSeverity = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';

export type AppToastShowInput = {
  detail?: string;
  life?: number;
  severity?: AppToastSeverity;
  summary: string;
};

export type AppToastMessage = AppToastShowInput & {
  id: number;
  severity: AppToastSeverity;
};

export type AppToastApi = {
  /** Alias for `show` — matches PrimeVue `$toast.add` naming. */
  add: (input: AppToastShowInput) => void;
  show: (input: AppToastShowInput) => void;
};

type PrimeToastLike = {
  add: (message: { detail?: string; life?: number; severity?: string; summary?: string }) => void;
};

export const nativeToasts = ref<AppToastMessage[]>([]);

let nextNativeId = 1;
let singleton: AppToastApi | null = null;

function pushNativeToast(message: Omit<AppToastMessage, 'id'>): void {
  const id = nextNativeId++;
  const entry: AppToastMessage = { id, ...message };
  nativeToasts.value = [...nativeToasts.value, entry];
  const life = message.life ?? 3200;
  if (life > 0 && import.meta.client) {
    window.setTimeout(() => {
      nativeToasts.value = nativeToasts.value.filter((toast: AppToastMessage) => toast.id !== id);
    }, life);
  }
}

/** Builds the shared toast API used by the Nuxt plugin and `useAppToast()`. */
export function createAppToastApi(getPrimeToast: () => PrimeToastLike | undefined): AppToastApi {
  const api: AppToastApi = {
    show(input) {
      const severity = input.severity ?? 'info';
      const life = input.life ?? 3200;
      const primeToast = getPrimeToast();
      const canUseClientToast = typeof window !== 'undefined';

      if (primeToast && canUseClientToast) {
        primeToast.add({
          severity,
          summary: input.summary,
          detail: input.detail,
          life,
        });
        return;
      }

      pushNativeToast({
        severity,
        summary: input.summary,
        detail: input.detail,
        life,
      });
    },
    add(input) {
      api.show(input);
    },
  };

  singleton = api;
  return api;
}

/** Global toast — prefers the Nuxt-provided `$toast`, else the plugin singleton. */
export function useAppToast(): AppToastApi {
  const nuxtApp = useNuxtApp();
  const provided = nuxtApp.$toast as AppToastApi | undefined;
  if (provided?.show) {
    return provided;
  }
  if (singleton) {
    return singleton;
  }
  return createAppToastApi(() => undefined);
}
