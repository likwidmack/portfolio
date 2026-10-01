/**
 * Phone disclosure for the on-page nav (`AppPageNav`, `AppWorkSubNav`): below the tablet
 * breakpoint the link list collapses behind one labelled toggle button (no sideways-scrolling
 * row). CSS hides the list while closed and always shows it from tablet up, so SSR and the first
 * paint are right without JS; `Esc` closes it and returns focus to the toggle.
 *
 * Close on `route.path` only — hash-only changes (in-page anchors, scroll restoration) must not
 * collapse the disclosure mid-gesture. Panel links already set `open = false` on click.
 */
export function usePageNavDisclosure() {
  const open = ref(false);
  const listId = useId();

  function closeAndFocus(event: KeyboardEvent): void {
    if (!open.value) return;
    open.value = false;
    const root = (event.currentTarget as HTMLElement | null) ?? null;
    root?.querySelector<HTMLButtonElement>('.page-nav__toggle')?.focus();
  }

  function toggleOpen(event: MouseEvent): void {
    event.stopPropagation();
    open.value = !open.value;
  }

  // Close on client-side path navigation (a route sub-nav link, or back / forward).
  const route = useRoute();
  watch(
    () => route.path,
    () => {
      open.value = false;
    }
  );

  return { open, listId, closeAndFocus, toggleOpen };
}
