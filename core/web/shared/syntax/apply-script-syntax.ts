/**
 * Applies lightweight syntax highlighting and normalization to JavaScript and TypeScript blocks.
 */

import {
  CODE_BLOCK_REGEX,
  PRE_BLOCK_REGEX,
  SCRIPT_KEYWORDS,
  SCRIPT_OPERATORS,
  SCRIPT_PRIMITIVE_TYPES,
  SCRIPT_SYMBOLS,
} from './constants';
import { escapeHtmlText, shouldTokenizeCode } from './tools/code-block-utils';
import {
  getAttributeValue,
  languageFromClassValue,
  mergeClassNames,
  normalizeLanguageAlias,
  setLanguageClasses,
} from './tools/html-attr-utils';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

/**
 * Extra global literals tokenized as constants but not represented as primitive types.
 */
const SCRIPT_LITERAL_EXTRAS = new Set(['NaN', 'Infinity']);

/**
 * Matches primitive-like literals and constant globals in JS/TS source.
 */
const SCRIPT_LITERALS_REGEX = new RegExp(
  `\\b(${[...SCRIPT_PRIMITIVE_TYPES, ...SCRIPT_LITERAL_EXTRAS].join('|')})\\b`,
  'g'
);
const SCRIPT_OPERATOR_REGEX = createNonWordTokenRegex(SCRIPT_OPERATORS);
const SCRIPT_SYMBOL_REGEX = createNonWordTokenRegex(SCRIPT_SYMBOLS);

type StashToken = (value: string) => string;

function stashScriptComments(source: string, stash: StashToken): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => stash(wrapToken(comment, 'comment')))
    .replace(/\/\/[^\n]*/g, (comment) => stash(wrapToken(comment, 'comment')));
}

function stashScriptStrings(source: string, stash: StashToken): string {
  return source.replace(/`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (text) =>
    stash(wrapToken(text, 'string'))
  );
}

function stashScriptDeclarations(source: string, stash: StashToken): string {
  return source
    .replace(
      /\b(function|class|interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g,
      (_full, reservedWord: string, identifier: string) =>
        stash(
          `${wrapToken(reservedWord, 'keyword reserved')} ${wrapToken(identifier, reservedWord === 'function' ? 'function identifier' : 'class-name identifier')}`
        )
    )
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)/g, (_full, reservedWord: string, identifier: string) =>
      stash(`${wrapToken(reservedWord, 'keyword reserved')} ${wrapToken(identifier, 'variable identifier')}`)
    );
}

function stashScriptLiterals(source: string, stash: StashToken): string {
  return source
    .replace(SCRIPT_LITERALS_REGEX, (literal) => stash(wrapToken(literal, 'constant')))
    .replace(/\b\d+(?:\.\d+)?\b/g, (num) => stash(wrapToken(num, 'number')));
}

function stashScriptPunctuation(source: string, stash: StashToken): string {
  if (SCRIPT_OPERATOR_REGEX) {
    source = source.replace(SCRIPT_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (SCRIPT_SYMBOL_REGEX) {
    source = source.replace(SCRIPT_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  return source;
}

function stashScriptIdentifiers(source: string, stash: StashToken): string {
  return source
    .replace(/\b([A-Za-z_$][\w$]*)(?=\s*\()/g, (name) =>
      SCRIPT_KEYWORDS.has(name) ? name : stash(wrapToken(name, 'function identifier'))
    )
    .replace(/\b([A-Za-z_$][\w$]*)(?=\s*=)/g, (name) =>
      SCRIPT_KEYWORDS.has(name) ? name : stash(wrapToken(name, 'identifier variable'))
    )
    .replace(/\b([A-Za-z_$][\w$]*)(?=\s*\.)/g, (name) =>
      SCRIPT_KEYWORDS.has(name) ? name : stash(wrapToken(name, 'identifier variable'))
    )
    .replace(/\b([A-Za-z_$][\w$]*)\b/g, (word) =>
      SCRIPT_KEYWORDS.has(word) ? stash(wrapToken(word, 'keyword reserved')) : word
    );
}

/**
 * Heuristically detects if the provided script text is TypeScript or JavaScript.
 *
 * @param text The script content to analyze.
 * @returns 'typescript' if TypeScript signals are found, otherwise 'javascript'.
 */
function detectScriptLanguage(text: string): 'javascript' | 'typescript' {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const tsSignals = [
    /\binterface\s+\w+/,
    /\btype\s+\w+\s*=/,
    /\b(enum|namespace)\s+\w+/,
    /:\s*[A-Z][A-Za-z0-9_<>,[\]\s|&?]*/,
    /\bas\s+const\b/,
    /\bimport\s+type\b/,
  ];

  return tsSignals.some((pattern) => pattern.test(normalized)) ? 'typescript' : 'javascript';
}

/**
 * Tokenizes JavaScript/TypeScript content into HTML spans.
 *
 * @param codeInnerHtml The raw script text to tokenize.
 * @returns The tokenized HTML content.
 */
function tokenizeScriptContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);

  const source = stashScriptIdentifiers(
    stashScriptPunctuation(
      stashScriptLiterals(
        stashScriptDeclarations(stashScriptStrings(stashScriptComments(codeInnerHtml, stash), stash), stash),
        stash
      ),
      stash
    ),
    stash
  );
  return restore(source);
}

/**
 * Resolves the language from HTML attributes or content heuristics.
 *
 * @param attrs The attribute string of the HTML element.
 * @param codeText The content of the code block for heuristic detection.
 * @returns The resolved language name.
 */
function normalizeLanguageFromAttrs(attrs: string, codeText: string): 'javascript' | 'typescript' {
  const resolved =
    (normalizeLanguageAlias(getAttributeValue(attrs, 'data-language')) as 'javascript' | 'typescript' | null) ??
    (languageFromClassValue(getAttributeValue(attrs, 'class'), normalizeLanguageAlias) as
      'javascript' | 'typescript' | null);

  return resolved ?? detectScriptLanguage(codeText);
}

/**
 * Normalizes and highlights a single <code> block.
 *
 * @param codeAttrs The attributes of the <code> tag.
 * @param codeInnerHtml The inner HTML content of the <code> tag.
 * @param preferredLanguage An optional language to use instead of auto-detection.
 * @returns The normalized <code> tag with highlighted content.
 */
function normalizeCodeMarkup(
  codeAttrs: string,
  codeInnerHtml: string,
  preferredLanguage?: 'javascript' | 'typescript'
): string {
  const language = preferredLanguage ?? normalizeLanguageFromAttrs(codeAttrs, codeInnerHtml);
  const highlightedCode = shouldTokenizeCode(codeInnerHtml) ? tokenizeScriptContent(codeInnerHtml) : codeInnerHtml;
  const updatedCodeAttrs = setLanguageClasses(codeAttrs, language, 'syntax-code');
  return `<code${updatedCodeAttrs}>${highlightedCode}</code>`;
}

/**
 * Normalizes a single <pre> block and any nested <code> elements inside it.
 *
 * @param preAttrs The attributes of the <pre> tag.
 * @param preContent The content inside the <pre> tag.
 * @returns The normalized <pre> block.
 */
function normalizePreMarkup(preAttrs: string, preContent: string): string {
  const firstCodeMatch = preContent.match(/<code\b([^>]*)>([\s\S]*?)<\/code>/i);
  const codeText = firstCodeMatch ? firstCodeMatch[2] : preContent;
  const preLanguage = normalizeLanguageFromAttrs(preAttrs, codeText);

  const updatedPreAttrs = setLanguageClasses(mergeClassNames(preAttrs, 'syntax-block'), preLanguage, 'syntax-block');

  const updatedPreContent = preContent.replace(CODE_BLOCK_REGEX, (_full, codeAttrs, codeInnerHtml) =>
    normalizeCodeMarkup(codeAttrs || '', codeInnerHtml || '', preLanguage)
  );

  return `<pre${updatedPreAttrs}>${updatedPreContent}</pre>`;
}

/**
 * Applies script syntax highlighting and normalization to code blocks in an HTML string.
 *
 * @param html The HTML content or raw script to process.
 * @returns The HTML with syntax highlighting spans and metadata classes.
 */
export function applyScriptSyntax(html: string): string {
  if (!html) return html;

  const hasPreOrCode = /<(pre|code)\b/i.test(html);
  if (!hasPreOrCode) {
    const language = detectScriptLanguage(html);
    const preAttrs = ` class="syntax-block language-${language}" data-language="${language}"`;
    return `<pre${preAttrs}>${normalizeCodeMarkup('', escapeHtmlText(html), language)}</pre>`;
  }

  const withNormalizedPreBlocks = html.replace(PRE_BLOCK_REGEX, (_full, preAttrs, preContent) =>
    normalizePreMarkup(preAttrs || '', preContent || '')
  );

  return withNormalizedPreBlocks.replace(CODE_BLOCK_REGEX, (_fullMatch, codeAttrs, codeInnerHtml) =>
    normalizeCodeMarkup(codeAttrs || '', codeInnerHtml || '')
  );
}
