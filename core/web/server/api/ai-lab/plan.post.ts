import { defineEventHandler, readBody } from 'h3';

import { replayPlan } from '#shared/ai-lab-replay';
import type { AiLabPlanResponse } from '#shared/ai-lab-types';
import { createLivePlan } from '../../utils/ai-lab-openai';
import { consumeAnonymousQuota, createContinuation } from '../../utils/ai-lab-security';

export default defineEventHandler(async (event): Promise<AiLabPlanResponse> => {
  const body = await readBody<{ idea?: unknown }>(event);
  const idea = typeof body?.idea === 'string' ? body.idea.trim() : '';
  if (!idea || idea.length > 240) {
    throw createError({ statusCode: 400, statusMessage: 'Idea must be between 1 and 240 characters' });
  }

  const config = useRuntimeConfig(event);
  const apiKey = String(config.openaiApiKey || '');
  const secret = String(config.aiLabSigningSecret || '');
  const liveEnabled = Boolean(config.public.aiLabLiveEnabled && apiKey && secret);
  if (!liveEnabled) {
    return { source: 'replay', plan: replayPlan, continuationToken: 'replay', fallbackReason: 'disabled' };
  }
  if (!consumeAnonymousQuota(event, secret)) {
    return { source: 'replay', plan: replayPlan, continuationToken: 'replay', fallbackReason: 'quota' };
  }

  try {
    const plan = await createLivePlan(idea, apiKey, String(config.openaiModel || 'gpt-5.6-luna'));
    return { source: 'live', plan, continuationToken: createContinuation(idea, plan, secret) };
  } catch (error) {
    const fallbackReason = error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'model';
    return { source: 'replay', plan: replayPlan, continuationToken: 'replay', fallbackReason };
  }
});
