/**
 * Shared HTML attribute manipulation utilities for syntax normalization.
 * Used by applyHtmlSyntax and applyScriptSyntax to reduce code duplication.
 *
 * These utilities operate directly on raw attribute strings (e.g., 'class="foo" data-id="123"')
 * to ensure compatibility in non-DOM environments like server-side rendering or edge functions.
 */

import { LANGUAGE_ALIASES } from '../constants';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extracts the value of a specific attribute from an attribute string.
 *
 * @param attrs The raw attribute string of an HTML tag.
 * @param name The name of the attribute to retrieve.
 * @returns The attribute value or null if not found.
 */
export function getAttributeValue(attrs: string, name: string): string | null {
  const escapedName = escapeRegex(name);
  const match = attrs.match(new RegExp(`(?:^|\\s)${escapedName}\\s*=\\s*(["'])(.*?)\\1`, 'i'));
  return match ? match[2] : null;
}

/**
 * Sets or updates an attribute value within an attribute string.
 *
 * @param attrs The raw attribute string of an HTML tag.
 * @param name The name of the attribute to set.
 * @param value The value to assign to the attribute.
 * @returns The updated attribute string.
 */
export function setAttributeValue(attrs: string, name: string, value: string): string {
  const escapedName = escapeRegex(name);
  const attrRegex = new RegExp(`(^|\\s)${escapedName}\\s*=\\s*(["']).*?\\2`, 'i');
  if (attrRegex.test(attrs)) {
    return attrs.replace(attrRegex, (_full, leadingWhitespace: string) => `${leadingWhitespace}${name}="${value}"`);
  }

  return `${attrs} ${name}="${value}"`;
}

/**
 * Merges new class names into the 'class' attribute, avoiding duplicates.
 *
 * @param attrs The raw attribute string of an HTML tag.
 * @param newClasses One or more class names to add.
 * @returns The updated attribute string with the merged classes.
 */
export function mergeClassNames(attrs: string, ...newClasses: string[]): string {
  const existing = getAttributeValue(attrs, 'class') ?? '';
  const classes = new Set(existing.split(/\s+/).filter(Boolean));

  for (const className of newClasses) {
    if (className) classes.add(className);
  }

  return setAttributeValue(attrs, 'class', Array.from(classes).join(' '));
}

/**
 * Specifically sets a 'language-*' class, removing any existing language classes first.
 *
 * @param attrs The raw attribute string of an HTML tag.
 * @param language The language identifier (e.g., 'typescript').
 * @returns The updated attribute string with the language class applied.
 */
export function setLanguageClass(attrs: string, language: string): string {
  const existing = getAttributeValue(attrs, 'class') ?? '';
  const classes = existing
    .split(/\s+/)
    .filter(Boolean)
    .filter((className) => !/^language-/i.test(className));

  classes.push(`language-${language}`);
  return setAttributeValue(attrs, 'class', classes.join(' '));
}

/**
 * Resolves a normalized language name from a 'class' attribute value.
 * Searches for 'language-*' patterns and applies a normalizer function.
 *
 * @param classValue The full value of the 'class' attribute.
 * @param normalizer A function that maps raw language strings to canonical names.
 * @returns The normalized language name or null if no valid language class is found.
 */
export function languageFromClassValue(
  classValue: string | null,
  // eslint-disable-next-line no-unused-vars
  normalizer: (lang: string) => string | null
): string | null {
  if (!classValue) return null;

  for (const className of classValue.split(/\s+/)) {
    const match = /^language-(.+)$/i.exec(className.trim());
    if (!match) continue;

    const normalized = normalizer(match[1]);
    if (normalized) return normalized;
  }

  return null;
}

/**
 * Converts aliases and non-canonical names into normalized language tokens.
 *
 * @param rawLanguage The language string to normalize (e.g., 'js', 'htm').
 * @returns The canonical language name (e.g., 'javascript', 'html') or null.
 */
export function normalizeLanguageAlias(rawLanguage: string | null): string | null {
  if (!rawLanguage) return null;
  const cleaned = rawLanguage.trim().toLowerCase();
  if (!cleaned) return null;
  return LANGUAGE_ALIASES[cleaned] ?? cleaned;
}

/**
 * Adds a base syntax class, normalized language class, and data-language attribute.
 */
export function setLanguageClasses(attrs: string, language: string, baseClass: string): string {
  let next = mergeClassNames(attrs, baseClass);
  next = setLanguageClass(next, language);
  return setAttributeValue(next, 'data-language', language);
}
