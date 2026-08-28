/**
 * Load a Nuxt Content collection via Nitro (server SQLite), not the client WASM DB.
 * See docs/web/features/page-data-loading.md.
 */
export type ContentCollectionName =
  'home' | 'resume' | 'product' | 'gallery' | 'docs' | 'caseStudies' | 'decisionCards';

export type FetchContentCollectionOptions = {
  mode?: 'first' | 'all';
  path?: string;
  slug?: string;
};

export function fetchContentCollection<T>(
  collection: ContentCollectionName,
  options: FetchContentCollectionOptions = {}
): Promise<T> {
  const { mode = 'first', path, slug } = options;
  return $fetch<T>(`/api/content/${collection}`, {
    query: {
      mode,
      ...(slug ? { slug } : {}),
      ...(path ? { path } : {}),
    },
  });
}
