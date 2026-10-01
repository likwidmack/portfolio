/**
 * Resolve any CSS colour (hex, rgb(), `var(--x)`, `color-mix(in oklab, …)`, oklab(), …) to
 * `#rrggbb` as the browser paints it. Theme roles are derived at runtime with `color-mix()`
 * (five-input model), so reading a custom property's raw value no longer yields a hex —
 * paint a 1×1 pixel and read it back instead. Browser-only; returns `null` on the server,
 * without a 2D canvas, or for fully transparent colours.
 */
export function resolveCssColorToHex(color: string, context: Element = document.documentElement): string | null {
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('span');
  probe.style.color = color;
  probe.style.display = 'none';
  context.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx || !computed) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  if (!a) return null;
  return `#${[r, g, b].map((v) => (v ?? 0).toString(16).padStart(2, '0')).join('')}`;
}
