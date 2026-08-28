/**
 * Shared helpers for HTML escaping and code-block tokenization checks.
 */

/**
 * Escapes raw text for safe insertion into HTML code blocks.
 */
export function escapeHtmlText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Returns true when a code block is raw text and should be tokenized.
 */
export function shouldTokenizeCode(codeInnerHtml: string): boolean {
  return !/<\/?[a-z][^>]*>/i.test(codeInnerHtml) && !/class\s*=\s*["'][^"']*token\b/i.test(codeInnerHtml);
}

/**
 * Counts display lines for a code gutter (ignores a single trailing newline).
 */
export function countCodeLines(code: string): number {
  if (!code) {
    return 1;
  }

  const parts = code.split('\n');
  if (parts.length > 1 && parts[parts.length - 1] === '') {
    parts.pop();
  }

  return Math.max(parts.length, 1);
}
