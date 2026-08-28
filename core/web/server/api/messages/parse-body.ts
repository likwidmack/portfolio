/**
 * Pure request-body parsing for POST /api/messages.
 */
import type { CreateContactMessageInput } from '../../db/types';

const NAME_MAX = 100;
const EMAIL_MAX = 254;
const BODY_MAX = 5000;

/** Practical email shape check — not full RFC 5322, enough to reject obvious junk. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export type ParseCreateMessageBodyResult =
  { ok: true; value: CreateContactMessageInput } | { ok: false; message: string };

/**
 * Validate and normalize a create-message body.
 * Trims whitespace; rejects null/partial/blank fields, bad emails, and oversized values.
 */
export const parseCreateContactMessageBody = (body: unknown): ParseCreateMessageBodyResult => {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      message: 'Invalid body: name, email, and body are required non-empty strings',
    };
  }

  const candidate = body as Partial<CreateContactMessageInput>;
  if (!isNonEmptyString(candidate.name) || !isNonEmptyString(candidate.email) || !isNonEmptyString(candidate.body)) {
    return {
      ok: false,
      message: 'Invalid body: name, email, and body are required non-empty strings',
    };
  }

  const name = candidate.name.trim();
  const email = candidate.email.trim().toLowerCase();
  const messageBody = candidate.body.trim();

  if (name.length > NAME_MAX) {
    return { ok: false, message: `Name must be at most ${NAME_MAX} characters` };
  }
  if (email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return { ok: false, message: 'Email must be a valid address of at most 254 characters' };
  }
  if (messageBody.length > BODY_MAX) {
    return { ok: false, message: `Body must be at most ${BODY_MAX} characters` };
  }

  return {
    ok: true,
    value: {
      name,
      email,
      body: messageBody,
    },
  };
};
