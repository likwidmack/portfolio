import type { AppToastApi } from '~/composables/useAppToast';

declare module '#app' {
  interface NuxtApp {
    $toast: AppToastApi;
  }
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $toast: AppToastApi;
  }
}

declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $toast: AppToastApi;
  }
}

export {};
