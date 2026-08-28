/**
 * Code page — editor/repos shelf (workspace packages, not a bio).
 * Snippet browser rows load from the `code` Content collection (`content/code.json`
 * → `/api/content/code`). Source is stored as lines so regex and template
 * literals stay decoded in JSON (no nested Vue backtick escapes).
 */

export type CodeRepo = {
  description: string;
  href?: string;
  id: string;
  language: string;
  name: string;
  updated: string;
};

export type CodeSample = {
  dependencies: string;
  description: string;
  file: string;
  id: string;
  language: string;
  module: string;
  /** Source lines as stored in the Content DB; join before highlighting. */
  source: string[];
  style: string;
  usedIn: string;
};

export type CodeContent = {
  explorer: string[];
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
  windowTitle: string;
};

export function codeLanguageLabel(language: string): string {
  return language.trim();
}

/** Flatten Content-DB source lines for UiCodeBlock. */
export function joinCodeSampleSource(source: readonly string[]): string {
  return source.join('\n');
}
