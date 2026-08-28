/**
 * Applies lightweight syntax highlighting to terminal and shell snippets.
 */
import { TERMINAL_KEYWORDS, TERMINAL_LANGUAGES, TERMINAL_OPERATORS, TERMINAL_SYMBOLS } from './constants';
import { applyFixedLanguageSyntax } from './tools/apply-fixed-language-syntax';
import { createNonWordTokenRegex, createTokenStash, wrapToken } from './tools/token-pattern-utils';

const TERMINAL_OPERATOR_REGEX = createNonWordTokenRegex(TERMINAL_OPERATORS);
const TERMINAL_SYMBOL_REGEX = createNonWordTokenRegex(TERMINAL_SYMBOLS);
/**
 * Tokenizes shell-like content using lightweight command-line rules.
 */
function tokenizeTerminalContent(codeInnerHtml: string): string {
  const { stash, restore } = createTokenStash(codeInnerHtml);

  let source = codeInnerHtml;

  // Tokenize in precedence order so strings/comments are not reprocessed.
  source = source.replace(/#[^\n]*/g, (comment) => stash(wrapToken(comment, 'comment')));
  source = source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, (text) => stash(wrapToken(text, 'string')));
  source = source.replace(/\$(?:\{[A-Za-z_]\w*}|[A-Za-z_]\w*)/g, (variable) => stash(wrapToken(variable, 'variable')));
  source = source.replace(/\b\d+\b/g, (num) => stash(wrapToken(num, 'number')));
  if (TERMINAL_OPERATOR_REGEX) {
    source = source.replace(TERMINAL_OPERATOR_REGEX, (operator) => stash(wrapToken(operator, 'operator')));
  }
  if (TERMINAL_SYMBOL_REGEX) {
    source = source.replace(TERMINAL_SYMBOL_REGEX, (symbol) => stash(wrapToken(symbol, 'punctuation')));
  }
  source = source.replace(/\b([A-Za-z_][\w-]*)\b/g, (word) => {
    if (TERMINAL_KEYWORDS.has(word)) return stash(wrapToken(word, 'keyword'));
    return word;
  });

  return restore(source);
}

/**
 * Applies terminal syntax highlighting to HTML content containing code blocks.
 */
export function applyTerminalSyntax(html: string): string {
  return applyFixedLanguageSyntax(html, {
    defaultLanguage: 'bash',
    allowedLanguages: TERMINAL_LANGUAGES,
    tokenize: tokenizeTerminalContent,
  });
}
