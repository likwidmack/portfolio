import { getCurrentInstance, onBeforeUnmount, watch, type Ref } from 'vue';

/**
 * Asks before a reload or tab close while a Style Studio draft is unapplied.
 * Drafts preview with `persist: false`, so a reload would silently drop them.
 * In-app navigation keeps the draft (it lives in `useState`), so no route guard is needed.
 */
export function useUnsavedDraftGuard(dirty: Ref<boolean>): void {
  if (!import.meta.client) return;

  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    event.preventDefault();
    // Legacy browsers require a returnValue to show the prompt.
    event.returnValue = '';
  };

  const stop = watch(
    dirty,
    (isDirty) => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (isDirty) window.addEventListener('beforeunload', onBeforeUnload);
    },
    { immediate: true }
  );

  // Plugins (app lifetime) have no component instance; components clean up on unmount.
  if (getCurrentInstance()) {
    onBeforeUnmount(() => {
      stop();
      window.removeEventListener('beforeunload', onBeforeUnload);
    });
  }
}
