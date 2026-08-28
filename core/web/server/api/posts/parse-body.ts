/**
 * Pure request-body parsing for blog post create/update.
 */
import { normalizeSlug } from '../../../shared/blog-types';
import type { BlogPostStatus, CreateBlogPostInput, UpdateBlogPostInput } from '../../db/blog-types';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isStatus = (value: unknown): value is BlogPostStatus => value === 'draft' || value === 'published';

export type ParseCreatePostBodyResult = { ok: true; value: CreateBlogPostInput } | { ok: false; message: string };

export type ParseUpdatePostBodyResult = { ok: true; value: UpdateBlogPostInput } | { ok: false; message: string };

export { normalizeSlug };

type Fail = { ok: false; message: string };
type OkField<T> = { ok: true; value: T };

const fail = (message: string): Fail => ({ ok: false, message });

const asRecord = (body: unknown): Record<string, unknown> | null => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }
  return body as Record<string, unknown>;
};

const parseRequiredSlug = (raw: string): OkField<string> | Fail => {
  const slug = normalizeSlug(raw);
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return fail('Invalid slug: use lowercase letters, numbers, and hyphens');
  }
  return { ok: true, value: slug };
};

const validateCreateRequiredStrings = (
  candidate: Record<string, unknown>
): OkField<{ title: string; slug: string; body: string }> | Fail => {
  if (!isNonEmptyString(candidate.title) || !isNonEmptyString(candidate.slug) || !isNonEmptyString(candidate.body)) {
    return fail('Invalid body: title, slug, and body are required non-empty strings');
  }
  return { ok: true, value: { title: candidate.title, slug: candidate.slug, body: candidate.body } };
};

const validateCreateOptionalMeta = (candidate: Record<string, unknown>): Fail | null => {
  if (candidate.status !== undefined && !isStatus(candidate.status)) {
    return fail('Invalid status: must be "draft" or "published"');
  }
  if (candidate.excerpt !== undefined && typeof candidate.excerpt !== 'string') {
    return fail('Invalid excerpt: must be a string');
  }
  return null;
};

/**
 * Validate and normalize a create-post body.
 */
export const parseCreateBlogPostBody = (body: unknown): ParseCreatePostBodyResult => {
  const candidate = asRecord(body);
  if (!candidate) {
    return fail('Invalid body: title, slug, and body are required');
  }

  const required = validateCreateRequiredStrings(candidate);
  if (!required.ok) {
    return required;
  }

  const slugResult = parseRequiredSlug(required.value.slug);
  if (!slugResult.ok) {
    return slugResult;
  }

  const metaError = validateCreateOptionalMeta(candidate);
  if (metaError) {
    return metaError;
  }

  return {
    ok: true,
    value: {
      title: required.value.title.trim(),
      slug: slugResult.value,
      body: required.value.body.trim(),
      excerpt: typeof candidate.excerpt === 'string' ? candidate.excerpt.trim() : '',
      status: isStatus(candidate.status) ? candidate.status : 'draft',
    },
  };
};

const applyOptionalTitle = (candidate: Record<string, unknown>, value: UpdateBlogPostInput): Fail | null => {
  if (candidate.title === undefined) return null;
  if (!isNonEmptyString(candidate.title)) return fail('Invalid title: must be a non-empty string');
  value.title = candidate.title.trim();
  return null;
};

const applyOptionalSlug = (candidate: Record<string, unknown>, value: UpdateBlogPostInput): Fail | null => {
  if (candidate.slug === undefined) return null;
  if (!isNonEmptyString(candidate.slug)) return fail('Invalid slug: must be a non-empty string');
  const slugResult = parseRequiredSlug(candidate.slug);
  if (!slugResult.ok) return slugResult;
  value.slug = slugResult.value;
  return null;
};

const applyOptionalBody = (candidate: Record<string, unknown>, value: UpdateBlogPostInput): Fail | null => {
  if (candidate.body === undefined) return null;
  if (!isNonEmptyString(candidate.body)) return fail('Invalid body: must be a non-empty string');
  value.body = candidate.body.trim();
  return null;
};

const applyOptionalExcerpt = (candidate: Record<string, unknown>, value: UpdateBlogPostInput): Fail | null => {
  if (candidate.excerpt === undefined) return null;
  if (typeof candidate.excerpt !== 'string') return fail('Invalid excerpt: must be a string');
  value.excerpt = candidate.excerpt.trim();
  return null;
};

const applyOptionalStatus = (candidate: Record<string, unknown>, value: UpdateBlogPostInput): Fail | null => {
  if (candidate.status === undefined) return null;
  if (!isStatus(candidate.status)) return fail('Invalid status: must be "draft" or "published"');
  value.status = candidate.status;
  return null;
};

/**
 * Validate and normalize an update-post body (partial).
 */
export const parseUpdateBlogPostBody = (body: unknown): ParseUpdatePostBodyResult => {
  const candidate = asRecord(body);
  if (!candidate) {
    return fail('Invalid body: expected an object');
  }

  const value: UpdateBlogPostInput = {};
  const fieldError =
    applyOptionalTitle(candidate, value) ??
    applyOptionalSlug(candidate, value) ??
    applyOptionalBody(candidate, value) ??
    applyOptionalExcerpt(candidate, value) ??
    applyOptionalStatus(candidate, value);

  if (fieldError) {
    return fieldError;
  }

  if (Object.keys(value).length === 0) {
    return fail('Invalid body: provide at least one field to update');
  }

  return { ok: true, value };
};
