/**
 * Applies lightweight syntax highlighting to Python code blocks.
 */

import {
  PYTHON_KEYWORDS,
  PYTHON_LANGUAGES,
  PYTHON_OPERATORS,
  PYTHON_PRIMITIVE_TYPES,
  PYTHON_SYMBOLS,
} from './constants';
import { applyFixedLanguageSyntax } from './tools/apply-fixed-language-syntax';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

/**
 * Matches Python primitive types and literal-like built-ins.
 */
const PYTHON_LITERALS_REGEX = new RegExp(`\\b(${[...PYTHON_PRIMITIVE_TYPES].join('|')})\\b`, 'g');
const PYTHON_OPERATOR_REGEX = createNonWordTokenRegex(PYTHON_OPERATORS);
const PYTHON_SYMBOL_REGEX = createNonWordTokenRegex(PYTHON_SYMBOLS);

type StashToken = (value: string) => string;

function stashPythonComments(source: string, stash: StashToken): string {
  return source.replace(/#[^\n]*/g, (comment) => stash(wrapToken(comment, 'comment')));
}

function stashPythonStrings(source: string, stash: StashToken): string {
  return source.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (text) =>
    stash(wrapToken(text, 'string'))
  );
}

function stashPythonValues(source: string, stash: StashToken): string {
  return source
    .replace(PYTHON_LITERALS_REGEX, (literal) => stash(wrapToken(literal, 'type')))
    .replace(/\b\d+(?:\.\d+)?\b/g, (num) => stash(wrapToken(num, 'number')));
}

function stashPythonPunctuation(source: string, stash: StashToken): string {
  if (PYTHON_OPERATOR_REGEX) {
    source = source.replace(PYTHON_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (PYTHON_SYMBOL_REGEX) {
    source = source.replace(PYTHON_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  return source;
}

function stashPythonKeywords(source: string, stash: StashToken): string {
  return source.replace(/\b([A-Za-z_]\w*)\b/g, (word) =>
    PYTHON_KEYWORDS.has(word) ? stash(wrapToken(word, 'keyword reserved')) : word
  );
}

/**
 * Tokenizes Python content into HTML spans.
 *
 * @param codeInnerHtml The raw Python text to tokenize.
 * @returns The tokenized HTML content.
 */
function tokenizePythonContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);
  const source = stashPythonKeywords(
    stashPythonPunctuation(
      stashPythonValues(stashPythonStrings(stashPythonComments(codeInnerHtml, stash), stash), stash),
      stash
    ),
    stash
  );
  return restore(source);
}

/**
 * Applies Python syntax highlighting to HTML content containing code blocks.
 *
 * @param html The HTML content to process.
 * @returns The HTML with syntax highlighting applied.
 */
export function applyPythonSyntax(html: string): string {
  return applyFixedLanguageSyntax(html, {
    defaultLanguage: 'python',
    allowedLanguages: PYTHON_LANGUAGES,
    tokenize: tokenizePythonContent,
  });
}
