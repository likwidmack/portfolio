/**
 * Utilities for reading source files from disk and returning syntax-highlighted
 * <pre><code>…</code></pre> HTML blocks.
 *
 * Language is resolved in this order:
 *   1. Caller-supplied `options.language` (accepts any LANGUAGE_ALIASES key).
 *   2. File extension (mapped via EXTENSION_TO_LANGUAGE below).
 *   3. Falls back to 'plaintext' (block is normalised but not tokenised).
 */

import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

import { applySyntaxByLanguage } from './apply-syntax-by-language';
import { escapeHtmlText } from './code-block-utils';
import { normalizeLanguageAlias } from './html-attr-utils';

// ---------------------------------------------------------------------------
// Extension → canonical language map
// Mirrors LANGUAGE_ALIASES keys so every recognised alias has an entry.
// ---------------------------------------------------------------------------

const EXTENSION_TO_LANGUAGE: Readonly<Record<string, string>> = {
  // JavaScript
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  // TypeScript
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.mts': 'typescript',
  '.cts': 'typescript',
  // Style (canonical: scss)
  '.css': 'scss',
  '.scss': 'scss',
  '.sass': 'scss',
  // Python
  '.py': 'python',
  '.pyw': 'python',
  // Shell / Bash
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'bash',
  // C / C++
  '.c': 'cpp',
  '.cc': 'cpp',
  '.cpp': 'cpp',
  '.cxx': 'cpp',
  '.h': 'cpp',
  '.hpp': 'cpp',
  // HTML
  '.html': 'html',
  '.htm': 'html',
  // Markdown
  '.md': 'markdown',
  '.markdown': 'markdown',
  '.mdown': 'markdown',
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function languageFromPath(filePath: string): string | null {
  const ext = extname(filePath).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] ?? null;
}

function resolveLanguage(filePath: string, options?: SyntaxFileOptions): string {
  return normalizeLanguageAlias(options?.language ?? null) ?? languageFromPath(filePath) ?? 'plaintext';
}

/**
 * Wraps raw source text in a labeled <pre><code> block.
 *
 * Pre-labeling the block preserves the caller/extension-supplied language
 * in the final output even for tokenizers that auto-detect (e.g., applyScriptSyntax
 * distinguishes JS from TS by content heuristics). By supplying data-language and
 * the language-* class up-front, the tokenizer reads them instead of guessing.
 */
function buildPreBlock(rawText: string, language: string): string {
  const escaped = escapeHtmlText(rawText);
  const preAttrs = ` class="syntax-block language-${language}" data-language="${language}"`;
  const codeAttrs = ` class="syntax-code language-${language}"`;
  return `<pre${preAttrs}><code${codeAttrs}>${escaped}</code></pre>`;
}

function renderSyntaxBlock(rawText: string, language: string): string {
  return applySyntaxByLanguage(language, buildPreBlock(rawText, language));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface SyntaxFileOptions {
  /**
   * Override the auto-detected language.
   * Accepts any alias defined in LANGUAGE_ALIASES (e.g. 'js', 'css', 'sh').
   */
  language?: string;
}

/**
 * Reads a source file, applies syntax highlighting, and returns the formatted
 * `<pre><code>…</code></pre>` HTML block.
 *
 * @param filePath Absolute or relative path to the source file.
 * @param options  Optional configuration.
 * @returns A syntax-highlighted HTML string ready for insertion into a page.
 *
 * @example
 * const html = readSyntaxFile('./src/utils.ts');
 * const html = readSyntaxFile('./styles/main.css', { language: 'scss' });
 */
export function readSyntaxFile(filePath: string, options?: SyntaxFileOptions): string {
  const rawText = readFileSync(filePath, 'utf-8');
  const language = resolveLanguage(filePath, options);
  return renderSyntaxBlock(rawText, language);
}

/**
 * Async variant of {@link readSyntaxFile}.
 *
 * @param filePath Absolute or relative path to the source file.
 * @param options  Optional configuration.
 * @returns A Promise resolving to the syntax-highlighted HTML string.
 *
 * @example
 * const html = await readSyntaxFileAsync('./src/utils.ts');
 */
export async function readSyntaxFileAsync(filePath: string, options?: SyntaxFileOptions): Promise<string> {
  const rawText = await readFile(filePath, 'utf-8');
  const language = resolveLanguage(filePath, options);
  return renderSyntaxBlock(rawText, language);
}

/**
 * Formats raw source text as a syntax-highlighted `<pre><code>…</code></pre>` block
 * without reading from disk.
 *
 * Use this when you already have the source string (e.g. from a database or CMS).
 *
 * @param rawText  The raw source code string.
 * @param language The language identifier (accepts any LANGUAGE_ALIASES key).
 * @returns A syntax-highlighted HTML string.
 *
 * @example
 * const snippet = 'const x: number = 42;';
 * const html = formatCodeBlock(snippet, 'ts');
 */
export function formatCodeBlock(rawText: string, language: string): string {
  const canonical = normalizeLanguageAlias(language) ?? language;
  return renderSyntaxBlock(rawText, canonical);
}
