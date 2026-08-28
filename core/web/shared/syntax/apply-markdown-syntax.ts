/**
 * Applies lightweight syntax highlighting to Markdown code blocks.
 */

import { MARKDOWN_KEYWORDS, MARKDOWN_LANGUAGES, MARKDOWN_OPERATORS, MARKDOWN_SYMBOLS } from './constants';
import { applyFixedLanguageSyntax } from './tools/apply-fixed-language-syntax';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

const MARKDOWN_OPERATOR_REGEX = createNonWordTokenRegex(MARKDOWN_OPERATORS);
const MARKDOWN_SYMBOL_REGEX = createNonWordTokenRegex(MARKDOWN_SYMBOLS);

type StashToken = (value: string) => string;

function stashMarkdownBlocks(source: string, stash: StashToken): string {
  return source
    .split('\n')
    .map((line) => {
      if (/^\s*#{1,6}\s/.test(line)) return stash(wrapToken(line, 'keyword heading'));
      if (/^\s*>\s?/.test(line)) return stash(wrapToken(line, 'comment quote'));
      if (/^\s*([-*+]|\d+\.)\s+/.test(line)) return stash(wrapToken(line, 'keyword list'));
      return line;
    })
    .join('\n');
}

function stashMarkdownInlineCode(source: string, stash: StashToken): string {
  return source.replace(/`[^`\n]+`/g, (inlineCode) => stash(wrapToken(inlineCode, 'string')));
}

function stashMarkdownEmphasis(source: string, stash: StashToken): string {
  return source
    .replace(/\*\*[^*\n]+\*\*|__[^_\n]+__/g, (strong) => stash(wrapToken(strong, 'keyword strong')))
    .replace(/(?<!\*)\*[^*\n]+\*(?!\*)|(?<!_)_[^_\n]+_(?!_)/g, (emphasis) =>
      stash(wrapToken(emphasis, 'keyword emphasis'))
    );
}

function stashMarkdownLinks(source: string, stash: StashToken): string {
  return source.replace(/\[([^]]+)]\(([^)]+)\)/g, (_full, label: string, href: string) => {
    const labelToken = wrapToken(`[${label}]`, MARKDOWN_KEYWORDS.has('link') ? 'keyword link' : 'keyword');
    const hrefToken = wrapToken(`(${href})`, 'string');
    return stash(`${labelToken}${hrefToken}`);
  });
}

function stashMarkdownPunctuation(source: string, stash: StashToken): string {
  if (MARKDOWN_OPERATOR_REGEX) {
    source = source.replace(MARKDOWN_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (MARKDOWN_SYMBOL_REGEX) {
    source = source.replace(MARKDOWN_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  return source;
}

/**
 * Tokenizes Markdown content into HTML spans.
 *
 * @param codeInnerHtml The raw Markdown text to tokenize.
 * @returns The tokenized HTML content.
 */
function tokenizeMarkdownContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);
  const source = stashMarkdownPunctuation(
    stashMarkdownLinks(
      stashMarkdownEmphasis(stashMarkdownInlineCode(stashMarkdownBlocks(codeInnerHtml, stash), stash), stash),
      stash
    ),
    stash
  );
  return restore(source);
}

/**
 * Applies Markdown syntax highlighting to HTML content containing code blocks.
 *
 * @param html The HTML content to process.
 * @returns The HTML with syntax highlighting applied.
 */
export function applyMarkdownSyntax(html: string): string {
  return applyFixedLanguageSyntax(html, {
    defaultLanguage: 'markdown',
    allowedLanguages: MARKDOWN_LANGUAGES,
    tokenize: tokenizeMarkdownContent,
  });
}
