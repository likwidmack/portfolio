/**
 * True when `src` points at an SVG (path or query/hash after `.svg`).
 * Used to skip `@nuxt/image` / IPX, which does not optimize SVG.
 */
export function isSvgSrc(src: string): boolean {
  return /\.svg(?:$|[?#])/i.test(src);
}
