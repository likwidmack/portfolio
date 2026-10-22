/**
 * Focus return for disclosure panels that unmount on close (the primary Menu sheet).
 *
 * WAI-ARIA disclosure / menu-button pattern: `Esc` always returns focus to the trigger. Any other
 * close returns it only when focus was inside the panel (it would otherwise fall to `<body>` when
 * the panel unmounts), except a link activation that navigates (`navigate` — the new page owns
 * focus then) and an outside click (focus already moved to what was clicked). A panel link that
 * does **not** leave the page (`stay`: a `mailto:` link, or the link to the current page) always
 * returns focus — nothing else will take it once the panel unmounts.
 */
export type DisclosureCloseReason = 'escape' | 'navigate' | 'stay' | 'outside' | 'toggle' | 'other';

export function shouldReturnFocus(reason: DisclosureCloseReason, focusWasInPanel: boolean): boolean {
  if (reason === 'escape' || reason === 'stay') return true;
  if (reason === 'navigate' || reason === 'outside') return false;
  return focusWasInPanel;
}

/** True when the document's focus is inside `panel` (call before the panel unmounts). */
export function focusIsInside(panel: Element | null | undefined, doc: Document = document): boolean {
  const active = doc.activeElement;
  return Boolean(panel && active && panel.contains(active));
}

/** Focus `trigger` when the close calls for it; returns whether it moved focus. */
export function returnFocusToTrigger(
  trigger: HTMLElement | null | undefined,
  reason: DisclosureCloseReason,
  focusWasInPanel: boolean
): boolean {
  if (!trigger || !shouldReturnFocus(reason, focusWasInPanel)) return false;
  trigger.focus();
  return trigger.ownerDocument.activeElement === trigger;
}
