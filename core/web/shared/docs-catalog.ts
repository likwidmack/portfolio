export type DocsGroupId = 'all' | 'overview' | 'web' | 'agents' | 'packages' | 'dev' | 'ops';
export type DocsViewMode = 'grid' | 'list';

export type DocsGroupOption = {
  id: DocsGroupId;
  label: string;
};

export type DocsIndexEntry = {
  description?: string;
  path: string;
  stem?: string;
  title?: string;
};

export const DOCS_GROUP_FILTERS: DocsGroupOption[] = [
  { id: 'all', label: 'All' },
  { id: 'overview', label: 'Overview' },
  { id: 'web', label: 'App' },
  { id: 'agents', label: 'Agents' },
  { id: 'packages', label: 'Packages' },
  { id: 'dev', label: 'Developer tooling' },
  { id: 'ops', label: 'Ops & delivery' },
];

export function groupFromDocPath(path: string): Exclude<DocsGroupId, 'all'> {
  const top = path.replace(/^\/+/, '').split('/')[0] ?? '';
  switch (top) {
    case 'web':
      return 'web';
    case 'agents':
      return 'agents';
    case 'packages':
      return 'packages';
    case 'dev':
      return 'dev';
    case 'cicd':
    case 'docker':
    case 'infra':
    case 'contributing':
      return 'ops';
    default:
      return 'overview';
  }
}

export function docHref(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/docs${normalized === '/' ? '' : normalized}`;
}

/** True when `/docs/:slug` has a real article segment (empty splat must not steal `/docs`). */
export function isDocsArticleSlug(slug: unknown): boolean {
  if (Array.isArray(slug)) {
    return slug.some((part) => String(part).trim().length > 0);
  }
  return typeof slug === 'string' && slug.trim().length > 0;
}

export function docTitle(entry: DocsIndexEntry): string {
  if (entry.title?.trim()) {
    return entry.title.trim();
  }
  const leaf = (entry.stem || entry.path || 'Document').split('/').pop() ?? 'Document';
  return leaf.replace(/[-_]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export function filterDocsEntries(entries: DocsIndexEntry[], groupId: DocsGroupId, query: string): DocsIndexEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    const group = groupFromDocPath(entry.path);
    if (groupId !== 'all' && group !== groupId) {
      return false;
    }
    if (!needle) {
      return true;
    }
    const haystack = `${docTitle(entry)} ${entry.description ?? ''} ${entry.path}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function groupDocsEntries(
  entries: DocsIndexEntry[]
): Array<{ group: Exclude<DocsGroupId, 'all'>; items: DocsIndexEntry[] }> {
  const buckets = new Map<Exclude<DocsGroupId, 'all'>, DocsIndexEntry[]>();
  for (const option of DOCS_GROUP_FILTERS) {
    if (option.id !== 'all') {
      buckets.set(option.id, []);
    }
  }
  for (const entry of entries) {
    const group = groupFromDocPath(entry.path);
    buckets.get(group)?.push(entry);
  }
  return DOCS_GROUP_FILTERS.filter(
    (option): option is { id: Exclude<DocsGroupId, 'all'>; label: string } => option.id !== 'all'
  )
    .map((option) => ({
      group: option.id,
      items: buckets.get(option.id) ?? [],
    }))
    .filter((bucket) => bucket.items.length > 0);
}
