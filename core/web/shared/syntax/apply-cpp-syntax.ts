/**
 * Applies lightweight syntax highlighting to C++ code blocks.
 */

import { CPP_KEYWORDS, CPP_LANGUAGES, CPP_OPERATORS, CPP_SYMBOLS } from './constants';
import { applyFixedLanguageSyntax } from './tools/apply-fixed-language-syntax';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

const CPP_OPERATOR_REGEX = createNonWordTokenRegex(CPP_OPERATORS);
const CPP_SYMBOL_REGEX = createNonWordTokenRegex(CPP_SYMBOLS);

type StashToken = (value: string) => string;

function stashCppComments(source: string, stash: StashToken): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (comment) => stash(wrapToken(comment, 'comment')))
    .replace(/\/\/[^\n]*/g, (comment) => stash(wrapToken(comment, 'comment')));
}

function stashCppStrings(source: string, stash: StashToken): string {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (text) => stash(wrapToken(text, 'string')));
}

function stashCppNumbers(source: string, stash: StashToken): string {
  return source.replace(/\b\d+(?:\.\d+)?\b/g, (num) => stash(wrapToken(num, 'number')));
}

function stashCppPunctuation(source: string, stash: StashToken): string {
  if (CPP_OPERATOR_REGEX) {
    source = source.replace(CPP_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (CPP_SYMBOL_REGEX) {
    source = source.replace(CPP_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  return source;
}

function stashCppDirectives(source: string, stash: StashToken): string {
  return source.replace(/#\s*(include|define|if|ifdef|ifndef|endif|pragma)\b/g, (directive) =>
    stash(wrapToken(directive, 'keyword preprocessor'))
  );
}

function stashCppKeywords(source: string, stash: StashToken): string {
  return source.replace(/\b([A-Za-z_]\w*)\b/g, (word) =>
    CPP_KEYWORDS.has(word) ? stash(wrapToken(word, 'keyword reserved')) : word
  );
}

/**
 * Tokenizes C++ content into HTML spans.
 *
 * @param codeInnerHtml The raw C++ text to tokenize.
 * @returns The tokenized HTML content.
 */
function tokenizeCppContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);
  const source = stashCppKeywords(
    stashCppDirectives(
      stashCppPunctuation(
        stashCppNumbers(stashCppStrings(stashCppComments(codeInnerHtml, stash), stash), stash),
        stash
      ),
      stash
    ),
    stash
  );
  return restore(source);
}

/**
 * Applies C++ syntax highlighting to HTML content containing code blocks.
 *
 * @param html The HTML content to process.
 * @returns The HTML with syntax highlighting applied.
 */
export function applyCppSyntax(html: string): string {
  return applyFixedLanguageSyntax(html, {
    defaultLanguage: 'cpp',
    allowedLanguages: CPP_LANGUAGES,
    tokenize: tokenizeCppContent,
  });
}
