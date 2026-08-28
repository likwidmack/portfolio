/**
 * Map markdown blog body to sanitized HTML for SSR display.
 */
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const ALLOWED_TAGS = [...sanitizeHtml.defaults.allowedTags, 'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];

/**
 * Render markdown to sanitized HTML. Safe for `v-html` on public post pages.
 */
export const renderBlogMarkdown = (markdown: string): string => {
  const raw = marked.parse(markdown ?? '', { async: false }) as string;
  return sanitizeHtml(raw, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'title'],
      a: ['href', 'name', 'target', 'rel'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
};
