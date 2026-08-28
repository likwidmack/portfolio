/**
 * Utilities for applying syntax highlighting to languages with fixed rule sets.
 */

import { CODE_BLOCK_REGEX, PRE_BLOCK_REGEX } from '../constants';
import { escapeHtmlText, shouldTokenizeCode } from './code-block-utils';
import {
  getAttributeValue,
  languageFromClassValue,
  mergeClassNames,
  normalizeLanguageAlias,
  setLanguageClasses,
} from './html-attr-utils';

/**
 * Options for fixed language syntax processing.
 */
type FixedSyntaxOptions<TLanguage extends string> = {
  /** The language to fallback to if no language is detected. */
  defaultLanguage: TLanguage;
  /** The set of languages that this utility is allowed to process. */
  allowedLanguages: ReadonlySet<TLanguage>;
  /** Function to tokenize the inner content of a code block. */
  // eslint-disable-next-line no-unused-vars
  tokenize: (codeInnerHtml: string, language: TLanguage) => string;
};

/**
 * Resolves the language from HTML attributes, matching against allowed languages.
 *
 * @param attrs The attribute string.
 * @param allowedLanguages The set of languages to match against.
 * @returns The resolved language or null.
 */
function resolveLanguageFromAttrs<TLanguage extends string>(
  attrs: string,
  allowedLanguages: ReadonlySet<TLanguage>
): TLanguage | null {
  const fromData = normalizeLanguageAlias(getAttributeValue(attrs, 'data-language'));
  if (fromData && allowedLanguages.has(fromData as TLanguage)) {
    return fromData as TLanguage;
  }

  const fromClass = languageFromClassValue(getAttributeValue(attrs, 'class'), normalizeLanguageAlias);
  if (fromClass && allowedLanguages.has(fromClass as TLanguage)) {
    return fromClass as TLanguage;
  }

  return null;
}

function normalizeFixedCodeMarkup<TLanguage extends string>(
  codeAttrs: string,
  codeInnerHtml: string,
  options: FixedSyntaxOptions<TLanguage>,
  preferredLanguage?: TLanguage
): string {
  const language =
    preferredLanguage ?? resolveLanguageFromAttrs(codeAttrs, options.allowedLanguages) ?? options.defaultLanguage;
  const highlightedCode = shouldTokenizeCode(codeInnerHtml) ? options.tokenize(codeInnerHtml, language) : codeInnerHtml;
  const updatedCodeAttrs = setLanguageClasses(codeAttrs, language, 'syntax-code');
  return `<code${updatedCodeAttrs}>${highlightedCode}</code>`;
}

function normalizeFixedPreMarkup<TLanguage extends string>(
  preAttrs: string,
  preContent: string,
  options: FixedSyntaxOptions<TLanguage>
): string {
  const preLanguage = resolveLanguageFromAttrs(preAttrs, options.allowedLanguages) ?? options.defaultLanguage;
  const updatedPreAttrs = setLanguageClasses(mergeClassNames(preAttrs, 'syntax-block'), preLanguage, 'syntax-block');
  const updatedPreContent = preContent.replace(
    CODE_BLOCK_REGEX,
    (_fullCode: string, codeAttrs: string, codeInnerHtml: string) =>
      normalizeFixedCodeMarkup(codeAttrs || '', codeInnerHtml || '', options, preLanguage)
  );
  return `<pre${updatedPreAttrs}>${updatedPreContent}</pre>`;
}

/**
 * Applies syntax highlighting and normalization to code blocks in an HTML string
 * for a fixed set of languages.
 *
 * @param html The HTML content to process.
 * @param options Configuration for language detection and tokenization.
 * @returns The processed HTML string.
 */
export function applyFixedLanguageSyntax<TLanguage extends string>(
  html: string,
  options: FixedSyntaxOptions<TLanguage>
): string {
  if (!html) return html;

  const hasPreOrCode = /<(pre|code)\b/i.test(html);
  if (!hasPreOrCode) {
    const language = options.defaultLanguage;
    const preAttrs = ` class="syntax-block language-${language}" data-language="${language}"`;
    return `<pre${preAttrs}>${normalizeFixedCodeMarkup('', escapeHtmlText(html), options, language)}</pre>`;
  }

  const withNormalizedPreBlocks = html.replace(PRE_BLOCK_REGEX, (_full, preAttrs, preContent) =>
    normalizeFixedPreMarkup(preAttrs || '', preContent || '', options)
  );

  return withNormalizedPreBlocks.replace(CODE_BLOCK_REGEX, (_full, codeAttrs, codeInnerHtml) =>
    normalizeFixedCodeMarkup(codeAttrs || '', codeInnerHtml || '', options)
  );
}
