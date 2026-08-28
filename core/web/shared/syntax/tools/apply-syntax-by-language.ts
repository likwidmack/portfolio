/**
 * Selects the appropriate syntax normalizer for a requested language.
 */
import { applyCppSyntax } from '../apply-cpp-syntax';
import { applyHtmlSyntax } from '../apply-html-syntax';
import { applyMarkdownSyntax } from '../apply-markdown-syntax';
import { applyPythonSyntax } from '../apply-python-syntax';
import { applyScriptSyntax } from '../apply-script-syntax';
import { applyStyleSyntax } from '../apply-style-syntax';
import { applyTerminalSyntax } from '../apply-terminal-syntax';
import { normalizeLanguageAlias } from './html-attr-utils';

/**
 * Signature shared by language-specific syntax applicators.
 */
// eslint-disable-next-line no-unused-vars
type SyntaxApplicator = (_html: string) => string;

/**
 * Maps normalized language identifiers to their syntax applicators.
 */
const LANGUAGE_APPLICATORS: Record<string, SyntaxApplicator> = {
  javascript: applyScriptSyntax,
  typescript: applyScriptSyntax,
  scss: applyStyleSyntax,
  python: applyPythonSyntax,
  bash: applyTerminalSyntax,
  markdown: applyMarkdownSyntax,
  cpp: applyCppSyntax,
  html: applyHtmlSyntax,
};

/**
 * Applies language-specific syntax normalization/highlighting to HTML content.
 *
 * Supported language aliases are resolved through `LANGUAGE_ALIASES`
 * (for example: js -> javascript, css -> scss, md -> markdown, shell -> bash).
 *
 * Unknown or unsupported languages fall back to HTML block normalization.
 */
export function applySyntaxByLanguage(language: string | null | undefined, html: string): string {
  const normalizedLanguage = normalizeLanguageAlias(language ?? null);
  const applySyntax = (normalizedLanguage && LANGUAGE_APPLICATORS[normalizedLanguage]) || applyHtmlSyntax;
  return applySyntax(html);
}
