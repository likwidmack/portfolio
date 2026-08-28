/**
 * Code page — editor/repos shelf (workspace packages, not a bio).
 */

export type CodeRepo = {
  description: string;
  href?: string;
  id: string;
  language: string;
  name: string;
  updated: string;
};

export type CodeContent = {
  explorer: string[];
  hero: {
    eyebrow: string;
    lede: string;
    title: string;
  };
  repos: CodeRepo[];
  seo: {
    description: string;
    title: string;
  };
  windowTitle: string;
};

export function codeLanguageLabel(language: string): string {
  return language.trim();
}
