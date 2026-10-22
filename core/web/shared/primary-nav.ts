/**
 * Primary rail shown inline in the site header from the tablet breakpoint up (and in the
 * Menu sheet below it). Docs, AI Lab and Process stay in the Work sub-nav (`AppWorkSubNav`).
 */
export const PRIMARY_NAV_ITEMS = [
  { to: '/work', label: 'Work' },
  { to: '/about', label: 'About' },
  { to: '/gallery', label: 'Gallery' },
  { to: '/blog', label: 'Writing' },
  { to: '/code', label: 'Code' },
] as const;

export type PrimaryNavItem = (typeof PRIMARY_NAV_ITEMS)[number];

/** Exact match or a child route (`/work/x` under `/work`), never a prefix sibling (`/workshop`). */
export function isNavItemActive(path: string, to: string): boolean {
  return path === to || path.startsWith(`${to}/`);
}

/**
 * True when following a link to `to` from `path` does not change the page (the link to the current
 * page): the Menu sheet then returns focus to its trigger instead of leaving it to the next page.
 * Exact path only (trailing slash ignored) — `/work` from `/work/x` navigates.
 */
export function linkStaysOnPage(path: string, to: string): boolean {
  const trim = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') : p);
  return trim(path) === trim(to);
}
