/**
 * Modal background: make everything outside `el` inert — every sibling of `el` and of each of its
 * ancestors up to `<body>` — so Tab, the virtual cursor and pointer input cannot reach content
 * hidden behind a full-screen overlay (WCAG 2.4.3 / 2.4.11). Elements that were already inert stay
 * inert on restore. Returns an idempotent restore function.
 *
 * Siblings matching `keep` stay live: by default live regions and teleport hosts
 * ({@link INERT_OUTSIDE_KEEP}) — a toast or the route announcer must still be announced while the
 * overlay is open. **`keep` must match announcement-only nodes:** a kept subtree is not inert, so
 * its links and controls stay reachable (Tab, virtual cursor, pointer) behind the modal. Never
 * keep a container of interactive content; if a teleport host can hold controls, close or inert
 * them separately.
 *
 * Used by the /gallery feed dialog (`pages/gallery/index.vue`). PrimeVue Dialog / Drawer manage
 * their own focus trap; this is for page-owned overlays.
 */
export const INERT_OUTSIDE_KEEP =
  '[aria-live], [role="status"], [role="alert"], .p-toast, .ui-toast-host, #teleports, #__nuxt-route-announcer';

export function inertOutside(el: Element, keep: string = INERT_OUTSIDE_KEEP): () => void {
  const added: Element[] = [];
  const body = el.ownerDocument.body;
  for (let node: Element | null = el; node && node !== body && node.parentElement; node = node.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (sibling === node || sibling.hasAttribute('inert')) continue;
      if (/^(SCRIPT|STYLE|TEMPLATE|LINK|META|NOSCRIPT)$/.test(sibling.tagName)) continue;
      if (keep && sibling.matches(keep)) continue;
      sibling.setAttribute('inert', '');
      added.push(sibling);
    }
    if (node.parentElement === body) break;
  }
  return () => {
    for (const sibling of added.splice(0)) sibling.removeAttribute('inert');
  };
}
