/**
 * Public source repository for every code / doc link the portfolio shows
 * (repo rule: public links point to likwidmack/portfolio, never the private source repo).
 * See docs/agents/README.md → "Public GitHub links".
 */
export const PUBLIC_REPO = {
  owner: 'likwidmack',
  name: 'portfolio',
  branch: 'main',
  url: 'https://github.com/likwidmack/portfolio',
} as const;

const clean = (path: string) => path.replace(/^\.?\/+/, '').replace(/\/+$/, '');

/** Link to a file on the public repo's default branch (`…/blob/main/<path>`). */
export function publicSourceUrl(path: string): string {
  return `${PUBLIC_REPO.url}/blob/${PUBLIC_REPO.branch}/${clean(path)}`;
}

/** Link to a folder on the public repo's default branch (`…/tree/main/<path>`); empty path = repo root. */
export function publicTreeUrl(path = ''): string {
  const folder = clean(path);
  return folder ? `${PUBLIC_REPO.url}/tree/${PUBLIC_REPO.branch}/${folder}` : PUBLIC_REPO.url;
}
