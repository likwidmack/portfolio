/**
 * POST /api/messages — create a contact message via the env-selected MessageStore.
 */
import { createError, defineEventHandler, readBody } from 'h3';
import { getMessageStore } from '../../db';
import { allowMessageCreate } from './rate-limit';
import { createContactMessageFromBody } from './service';
import { messageStoreOptionsFromRuntimeConfig } from './store-options';

export default defineEventHandler(async (event) => {
  if (!allowMessageCreate(event)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many messages from this client. Try again later.',
    });
  }

  const body = await readBody(event);
  const config = useRuntimeConfig(event);
  const store = getMessageStore(messageStoreOptionsFromRuntimeConfig(config));
  const result = await createContactMessageFromBody(store, body);

  if (!result.ok) {
    throw createError({
      statusCode: 400,
      statusMessage: result.message,
    });
  }

  return result.value;
});
