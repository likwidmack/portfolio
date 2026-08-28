import type { NuxtError } from 'nuxt/app';

export type ErrorSnapshot = {
  statusCode: number | null;
  statusMessage: string;
  message: string;
  dataSerialized: string;
  trace: string;
  origin: string;
  scope: string;
};

export function serializeErrorData(data: unknown): string {
  if (!data) {
    return '';
  }
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return '[unserializable error.data]';
  }
}

function causeTrace(cause: unknown): string {
  if (!cause || typeof cause !== 'object') {
    return '';
  }
  const record = cause as { stack?: unknown; message?: unknown };
  const causeStack = typeof record.stack === 'string' ? record.stack : '';
  const causeMessage = typeof record.message === 'string' ? record.message : '';
  return [causeMessage, causeStack].filter(Boolean).join('\n');
}

function combineTrace(primaryStack: string, causedBy: string): string {
  return [primaryStack, causedBy].filter(Boolean).join('\n\nCaused by:\n\n');
}

function readDataString(data: unknown, key: string): string {
  if (!data || typeof data !== 'object') {
    return '';
  }
  const value = (data as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : '';
}

export function buildErrorSnapshot(error: NuxtError & { data?: unknown; cause?: unknown }): ErrorSnapshot {
  const primaryStack = typeof error.stack === 'string' ? error.stack : '';
  return {
    statusCode: typeof error.statusCode === 'number' ? error.statusCode : null,
    statusMessage: error.statusMessage || '',
    message: error.message || '',
    dataSerialized: serializeErrorData(error.data),
    trace: combineTrace(primaryStack, causeTrace(error.cause)),
    origin: readDataString(error.data, 'origin'),
    scope: readDataString(error.data, 'scope'),
  };
}

export function statusTagSeverityFor(code: number | null): 'danger' | 'warn' | 'success' {
  const status = code ?? 0;
  if (status >= 500) return 'danger';
  if (status >= 400) return 'warn';
  return 'success';
}

const HTML_HINT_PATTERN =
  /(html|template|parse|parser|invalid end tag|unexpected closing tag|missing end tag|doctype)/i;

export function htmlTemplateHint(message: string, trace: string): string {
  if (!HTML_HINT_PATTERN.test(message) && !HTML_HINT_PATTERN.test(trace)) {
    return '';
  }
  return 'Detected an HTML/template parsing failure. Check page markup for mismatched tags, missing closing tags, or malformed attributes.';
}

export function isPageOriginatedError(input: {
  trace: string;
  routePath: string;
  origin: string;
  scope: string;
  htmlHint: string;
}): boolean {
  const { trace, routePath, origin, scope, htmlHint } = input;
  const cameFromPageStack =
    trace.includes('/app/pages/') || trace.includes('\\app\\pages\\') || trace.includes(`${routePath}.vue`);
  const taggedAsPage = ['page', 'pages'].includes(origin) || ['page', 'pages'].includes(scope);
  return taggedAsPage || cameFromPageStack || !!htmlHint;
}
