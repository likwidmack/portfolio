import type { AiLabBrief, AiLabPlan } from './ai-lab-types';

/** Launch-safe replay shared by the Nitro handlers and browser network fallback. */
export const replayPlan: AiLabPlan = {
  interpretedGoal:
    'Turn a fuzzy product idea into a small interface concept where the AI explains its interpretation and waits before taking action.',
  steps: [
    'Reflect the intended user, job, and uncertainty in plain language.',
    'Propose one reversible interface action and show what it will produce.',
    'Ask for approval before generating the prototype brief.',
  ],
  pendingAction: 'Create a concise prototype brief with interface states, guardrails, and a first test.',
};

export const replayBrief: AiLabBrief = {
  title: 'A transparent co-creation workspace',
  summary:
    'A focused interface that interprets the idea, names assumptions, and keeps generation behind an explicit approval gate.',
  interface: [
    'Goal card with the interpreted audience and job to be done',
    'Three-step plan with one clearly labeled pending action',
    'Approve and reject controls with visible consequences',
    'Result brief with restart and revision paths',
  ],
  guardrails: [
    'Never hide a side effect behind conversational copy',
    'Keep the first action reversible and scoped',
    'Use a replay fallback when live generation is unavailable',
  ],
  nextStep:
    'Test the approval language with three people and note where expectations differ from the generated result.',
};
