/**
 * Public barrel for shared syntax helpers, token metadata, and language applicators.
 */
export { applyCppSyntax } from './apply-cpp-syntax';
export { applyHtmlSyntax } from './apply-html-syntax';
export { applyMarkdownSyntax } from './apply-markdown-syntax';
export { applyPythonSyntax } from './apply-python-syntax';
export { applyScriptSyntax } from './apply-script-syntax';
export { applyStyleSyntax } from './apply-style-syntax';
export { applyTerminalSyntax } from './apply-terminal-syntax';
export * from './constants';
export { applySyntaxByLanguage } from './tools/apply-syntax-by-language';
export { countCodeLines, escapeHtmlText, shouldTokenizeCode } from './tools/code-block-utils';
export * from './tools/html-attr-utils';
export { formatCodeBlock, readSyntaxFile, readSyntaxFileAsync } from './tools/read-syntax-file';
export type { SyntaxFileOptions } from './tools/read-syntax-file';
