export function focusElementById(id: string): void {
  if (!import.meta.client) return;
  document.getElementById(id)?.focus();
}
