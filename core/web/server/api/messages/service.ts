/**
 * Message API orchestration (store + body parsing) — kept free of h3/Nuxt so Vitest can cover it.
 */
import type { ContactMessage, MessageStore } from '../../db/types';
import { parseCreateContactMessageBody, type ParseCreateMessageBodyResult } from './parse-body';

export type CreateContactMessageResult =
  { ok: true; value: ContactMessage } | Extract<ParseCreateMessageBodyResult, { ok: false }>;

export const listContactMessages = (store: MessageStore): Promise<ContactMessage[]> => store.list();

export const deleteContactMessage = async (store: MessageStore, id: string): Promise<boolean> => store.delete(id);

export const createContactMessageFromBody = async (
  store: MessageStore,
  body: unknown
): Promise<CreateContactMessageResult> => {
  const parsed = parseCreateContactMessageBody(body);
  if (!parsed.ok) {
    return parsed;
  }
  const value = await store.create(parsed.value);
  return { ok: true, value };
};
