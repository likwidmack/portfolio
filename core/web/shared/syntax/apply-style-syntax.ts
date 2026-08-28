/**
 * Applies lightweight syntax highlighting to SCSS-style code blocks.
 */

import { SCSS_KEYWORDS, SCSS_OPERATORS, SCSS_PRIMITIVE_TYPES, SCSS_SYMBOLS, STYLE_LANGUAGES } from './constants';
import { applyFixedLanguageSyntax } from './tools/apply-fixed-language-syntax';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

/**
 * Matches SCSS primitive-like types and literal categories.
 */
const STYLE_LITERALS_REGEX = new RegExp(`\\b(${[...SCSS_PRIMITIVE_TYPES].join('|')})\\b`, 'g');
const STYLE_OPERATOR_REGEX = createNonWordTokenRegex(SCSS_OPERATORS);
const STYLE_SYMBOL_REGEX = createNonWordTokenRegex(SCSS_SYMBOLS);

type StashToken = (value: string) => string;

function stashStyleComments(source: string, stash: StashToken): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (comment) => stash(wrapToken(comment, 'comment')));
}

function stashStyleStrings(source: string, stash: StashToken): string {
  return source.replace(/"[^"\n]*"|'[^'\n]*'/g, (text) => stash(wrapToken(text, 'string')));
}

function stashStyleValues(source: string, stash: StashToken): string {
  return source
    .replace(STYLE_LITERALS_REGEX, (literal) => stash(wrapToken(literal, 'type')))
    .replace(/\$[A-Za-z_-][\w-]*/g, (variable) => stash(wrapToken(variable, 'variable')))
    .replace(/#[A-Fa-f0-9]{3,8}\b/g, (hex) => stash(wrapToken(hex, 'number')))
    .replace(/\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|s|ms)?\b/g, (num) => stash(wrapToken(num, 'number')));
}

function stashStylePunctuation(source: string, stash: StashToken): string {
  if (STYLE_OPERATOR_REGEX) {
    source = source.replace(STYLE_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (STYLE_SYMBOL_REGEX) {
    source = source.replace(STYLE_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  return source;
}

function stashStyleKeywords(source: string, stash: StashToken): string {
  return source
    .replace(/@[A-Za-z-]+/g, (directive) =>
      SCSS_KEYWORDS.has(directive) ? stash(wrapToken(directive, 'keyword')) : directive
    )
    .replace(/\b([A-Za-z_-][\w-]*)\b/g, (word) => (SCSS_KEYWORDS.has(word) ? stash(wrapToken(word, 'keyword')) : word));
}

/**
 * Tokenizes SCSS/CSS content into HTML spans.
 *
 * @param codeInnerHtml The raw style text to tokenize.
 * @returns The tokenized HTML content.
 */
function tokenizeStyleContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);
  const source = stashStyleKeywords(
    stashStylePunctuation(
      stashStyleValues(stashStyleStrings(stashStyleComments(codeInnerHtml, stash), stash), stash),
      stash
    ),
    stash
  );
  return restore(source);
}

/**
 * Applies style syntax highlighting to HTML content containing code blocks.
 *
 * @param html The HTML content to process.
 * @returns The HTML with syntax highlighting applied.
 */
export function applyStyleSyntax(html: string): string {
  return applyFixedLanguageSyntax(html, {
    defaultLanguage: 'scss',
    allowedLanguages: STYLE_LANGUAGES,
    tokenize: tokenizeStyleContent,
  });
}
