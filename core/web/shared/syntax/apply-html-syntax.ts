/**
 * Utilities for normalizing HTML structure around code blocks to support syntax highlighting.
 *
 * This module ensures that <pre> and <code> tags have consistent CSS classes and data attributes
 * based on their detected language, which allows CSS-based syntax highlighters to target them correctly.
 *
 * Implementation is strictly string-based (no DOM parser) for server/runtime portability.
 */

import { CODE_TAG_REGEX, CODE_TAG_REPLACE_REGEX, PRE_BLOCK_REGEX } from './constants';
import {
  getAttributeValue,
  languageFromClassValue,
  mergeClassNames,
  normalizeLanguageAlias,
  setAttributeValue,
  setLanguageClass,
} from './tools/html-attr-utils';

/**
 * Resolves the language for a code block based on attribute precedence.
 *
 * Precedence:
 * 1. <pre data-language="...">
 * 2. <pre class="language-...">
 * 3. <code data-language="...">
 * 4. <code class="language-...">
 *
 * @param preAttrs Attributes string of the <pre> tag.
 * @param codeAttrs Attributes string of the <code> tag (if present).
 * @returns The resolved canonical language name or null.
 */
function resolveNormalizedLanguage(preAttrs: string, codeAttrs: string | null): string | null {
  return (
    normalizeLanguageAlias(getAttributeValue(preAttrs, 'data-language')) ??
    languageFromClassValue(getAttributeValue(preAttrs, 'class'), normalizeLanguageAlias) ??
    normalizeLanguageAlias(codeAttrs ? getAttributeValue(codeAttrs, 'data-language') : null) ??
    languageFromClassValue(codeAttrs ? getAttributeValue(codeAttrs, 'class') : null, normalizeLanguageAlias)
  );
}

/**
 * Updates <pre> tag attributes with syntax-related metadata.
 *
 * @param preAttrs The original attribute string of the <pre> tag.
 * @param normalizedLanguage The resolved language for the block.
 * @returns The updated attribute string.
 */
function normalizePreAttributes(preAttrs: string, normalizedLanguage: string | null): string {
  let updatedPreAttrs = mergeClassNames(preAttrs || '', 'syntax-block');

  if (!normalizedLanguage) {
    return updatedPreAttrs;
  }

  updatedPreAttrs = setLanguageClass(updatedPreAttrs, normalizedLanguage);
  return setAttributeValue(updatedPreAttrs, 'data-language', normalizedLanguage);
}

/**
 * Synchronizes the <code> tag's language class with the resolved block language.
 *
 * @param preContent The full inner content of the <pre> block.
 * @param normalizedLanguage The language to apply to the <code> tag.
 * @param codeTagMatch The regex match result for the <code> tag.
 * @returns The <pre> content with updated <code> tag.
 */
function normalizeCodeTagLanguage(
  preContent: string,
  normalizedLanguage: string,
  codeTagMatch: RegExpMatchArray
): string {
  const rawCodeAttrs = codeTagMatch[1] || '';
  const codeInnerHtml = codeTagMatch[2] || '';
  const updatedCodeAttrs = setLanguageClass(rawCodeAttrs, normalizedLanguage);

  return preContent.replace(CODE_TAG_REPLACE_REGEX, `<code${updatedCodeAttrs}>${codeInnerHtml}</code>`);
}

/**
 * Normalizes a single <pre> block, updating both its own and nested <code> attributes.
 *
 * @param preAttrs Attributes string of the <pre> tag.
 * @param preContent Inner content of the <pre> tag.
 * @returns The full normalized <pre> block HTML.
 */
function normalizePreBlock(preAttrs: string, preContent: string): string {
  const safePreAttrs = preAttrs || '';
  const safePreContent = preContent || '';

  const codeTagMatch = safePreContent.match(CODE_TAG_REGEX);
  const codeAttrs = codeTagMatch ? codeTagMatch[1] : null;
  const normalizedLanguage = resolveNormalizedLanguage(safePreAttrs, codeAttrs);

  const updatedPreAttrs = normalizePreAttributes(safePreAttrs, normalizedLanguage);
  const updatedContent =
    normalizedLanguage && codeTagMatch
      ? normalizeCodeTagLanguage(safePreContent, normalizedLanguage, codeTagMatch)
      : safePreContent;

  return `<pre${updatedPreAttrs}>${updatedContent}</pre>`;
}

/**
 * Scans an HTML string for <pre> blocks and applies syntax highlighting metadata.
 *
 * Each <pre> block is updated to include:
 * - `class="syntax-block"`
 * - `class="language-<lang>"` (if detected)
 * - `data-language="<lang>"` (if detected)
 *
 * Nested <code> tags are also synchronized with the detected language.
 *
 * @param html The raw HTML content to process.
 * @returns The HTML with normalized syntax blocks.
 */
export function applyHtmlSyntax(html: string): string {
  if (!html || !html.includes('<pre')) {
    return html;
  }

  // Normalize every pre block while leaving unrelated markup untouched.
  return html.replace(PRE_BLOCK_REGEX, (_fullMatch, preAttrs, preContent) => normalizePreBlock(preAttrs, preContent));
}
