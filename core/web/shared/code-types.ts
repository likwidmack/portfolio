/**
 * Code page — selected snippets from the monorepo plus the packages they live in.
 * Rows load from the `code` Content collection (`content/code.json` → `/api/content/code`).
 * Source is stored as lines so regex and template literals stay decoded in JSON
 * (no nested Vue backtick escapes). Public links go to likwidmack/portfolio (`public-repo.ts`).
 */
import { publicSourceUrl, publicTreeUrl } from './public-repo';

export type CodeRepo = {
  description: string;
  id: string;
  language: string;
  name: string;
  /** Repo-relative folder on the public repo; '' = repo root. */
  path: string;
};

export type CodeSample = {
  dependencies: string;
  description: string;
  file: string;
  id: string;
  language: string;
  module: string;
  /** Repo-relative file path on the public repo. */
  path: string;
  /** Source lines as stored in the Content DB; join before highlighting. */
  source: string[];
  style: string;
  /** Plain-language name for the snippet list. */
  title: string;
  usedIn: string;
};

export type CodeContent = {
  hero: {
    eyebrow: string;
    lede: string;
    title: string;
  };
  repos: CodeRepo[];
  samples: CodeSample[];
  seo: {
    description: string;
    title: string;
  };
};

/** Package facet option for the browse toolbar (`count` = snippets in that package). */
export type CodePackageOption = { id: string; label: string; count: number };

export function codeLanguageLabel(language: string): string {
  return language.trim();
}

/** Flatten Content-DB source lines for UiCodeBlock. */
export function joinCodeSampleSource(source: readonly string[]): string {
  return source.join('\n');
}

/** "View source ↗" target for a snippet on the public repo. */
export function codeSampleSourceUrl(sample: Pick<CodeSample, 'path'>): string {
  return publicSourceUrl(sample.path);
}

/** Package card target on the public repo (folder, or repo root for ''). */
export function codeRepoUrl(repo: Pick<CodeRepo, 'path'>): string {
  return publicTreeUrl(repo.path);
}

/** "All" plus one option per package, in first-appearance order, with snippet counts. */
export function codePackageOptions(samples: readonly Pick<CodeSample, 'module'>[]): CodePackageOption[] {
  const counts = new Map<string, number>();
  for (const sample of samples) counts.set(sample.module, (counts.get(sample.module) ?? 0) + 1);
  return [
    { id: 'all', label: 'All', count: samples.length },
    ...[...counts.entries()].map(([module, count]) => ({ id: module, label: module, count })),
  ];
}

/** Snippets for the selected package (`'all'` or an unknown id → every snippet). */
export function filterCodeSamples<T extends Pick<CodeSample, 'module'>>(samples: readonly T[], pkg: string): T[] {
  if (pkg === 'all' || !samples.some((sample) => sample.module === pkg)) return [...samples];
  return samples.filter((sample) => sample.module === pkg);
}

/** The selected snippet if it is visible, else the first visible one (keeps selection valid after filtering). */
export function resolveActiveSample<T extends Pick<CodeSample, 'id'>>(
  visible: readonly T[],
  id: string
): T | undefined {
  return visible.find((sample) => sample.id === id) ?? visible[0];
}
