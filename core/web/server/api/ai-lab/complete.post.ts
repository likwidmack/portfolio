import { defineEventHandler, readBody } from 'h3';

import { replayBrief } from '#shared/ai-lab-replay';
import type { AiLabCompleteResponse } from '#shared/ai-lab-types';
import { createLiveBrief } from '../../utils/ai-lab-openai';
import {
  consumeAnonymousQuota,
  consumeContinuation,
  isContinuationSpent,
  verifyContinuation,
} from '../../utils/ai-lab-security';

export default defineEventHandler(async (event): Promise<AiLabCompleteResponse> => {
  const body = await readBody<{ continuationToken?: unknown }>(event);
  const token = typeof body?.continuationToken === 'string' ? body.continuationToken : '';
  if (token === 'replay') return { source: 'replay', brief: replayBrief, fallbackReason: 'disabled' };

  const config = useRuntimeConfig(event);
  const apiKey = String(config.openaiApiKey || '');
  const secret = String(config.aiLabSigningSecret || '');
  if (!apiKey || !secret || !config.public.aiLabLiveEnabled) {
    return { source: 'replay', brief: replayBrief, fallbackReason: 'credentials' };
  }

  // Fail closed before burning quota on garbage/expired or already-spent tokens.
  if (!verifyContinuation(token, secret)) {
    throw createError({ statusCode: 400, statusMessage: 'Continuation token is invalid or expired' });
  }
  if (isContinuationSpent(event, token, secret)) {
    throw createError({ statusCode: 400, statusMessage: 'Continuation token was already used' });
  }

  if (!consumeAnonymousQuota(event, secret)) {
    return { source: 'replay', brief: replayBrief, fallbackReason: 'quota' };
  }

  const continuation = consumeContinuation(event, token, secret);
  if (!continuation) {
    throw createError({ statusCode: 400, statusMessage: 'Continuation token was already used' });
  }

  try {
    const brief = await createLiveBrief(
      continuation.idea,
      continuation.plan,
      apiKey,
      String(config.openaiModel || 'gpt-5.6-luna')
    );
    return { source: 'live', brief };
  } catch (error) {
    const fallbackReason = error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'model';
    return { source: 'replay', brief: replayBrief, fallbackReason };
  }
});
