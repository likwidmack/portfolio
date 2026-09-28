/** Toolbar state shared by Gallery and Docs (`AppBrowseToolbar`). */
/** `item` is optional: pages with a list + detail keep the selected entry in the URL too. */
export type BrowseState = { view: string; group: string; kind: string; query: string; item?: string };

/** Route query keys owned by the toolbar; any other key (e.g. `specimen`) is left untouched. */
/** `item` = the selected entry on pages with a list + detail (e.g. /code snippet). */
export const BROWSE_QUERY_KEYS = ['view', 'group', 'kind', 'q', 'item'] as const;

const first = (value: unknown): string | undefined => {
  const candidate = Array.isArray(value) ? value[0] : value;
  return typeof candidate === 'string' && candidate.length > 0 ? candidate : undefined;
};

/** Route query → toolbar state (`q` carries the search text). */
export function readBrowseQuery(query: Record<string, unknown>, defaults: BrowseState): BrowseState {
  return {
    view: first(query.view) ?? defaults.view,
    group: first(query.group) ?? defaults.group,
    kind: first(query.kind) ?? defaults.kind,
    query: first(query.q) ?? defaults.query,
    ...(defaults.item !== undefined ? { item: first(query.item) ?? defaults.item } : {}),
  };
}

/** Toolbar state → minimal route query (defaults omitted so clean URLs stay clean). */
export function writeBrowseQuery(state: BrowseState, defaults: BrowseState): Record<string, string> {
  const out: Record<string, string> = {};
  if (state.view !== defaults.view) out.view = state.view;
  if (state.group !== defaults.group) out.group = state.group;
  if (state.kind !== defaults.kind) out.kind = state.kind;
  const query = state.query.trim();
  if (query) out.q = query;
  if (state.item && state.item !== defaults.item) out.item = state.item;
  return out;
}

/**
 * `NuxtPage` key: the full path minus toolbar-owned query keys, so filter / search / view
 * changes (written with `router.replace`) update the page in place instead of remounting it,
 * while every other path, query or hash change still remounts (see `app/app.vue`).
 */
export function pageKeyFor(route: { path: string; query: Record<string, unknown>; hash?: string }): string {
  const owned = BROWSE_QUERY_KEYS as readonly string[];
  const rest = Object.keys(route.query)
    .filter((key) => !owned.includes(key))
    .sort()
    .map((key) => {
      const value = route.query[key];
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(String(item ?? ''))}`).join('&');
    })
    .filter(Boolean)
    .join('&');
  return `${route.path}${rest ? `?${rest}` : ''}${route.hash ?? ''}`;
}

/** True when a filter (not the view mode) differs from its default — shows "Clear filters". */
export function isFiltered(state: BrowseState, defaults: BrowseState): boolean {
  return state.group !== defaults.group || state.kind !== defaults.kind || state.query.trim() !== '';
}
