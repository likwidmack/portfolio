export type AiLabPlan = {
  interpretedGoal: string;
  steps: string[];
  pendingAction: string;
};

export type AiLabBrief = {
  title: string;
  summary: string;
  interface: string[];
  guardrails: string[];
  nextStep: string;
};

export type AiLabFallbackReason = 'credentials' | 'disabled' | 'model' | 'network' | 'quota' | 'timeout';

export type AiLabPlanResponse = {
  source: 'live' | 'replay';
  plan: AiLabPlan;
  continuationToken: string;
  fallbackReason?: AiLabFallbackReason;
};

export type AiLabCompleteResponse = {
  source: 'live' | 'replay';
  brief: AiLabBrief;
  fallbackReason?: AiLabFallbackReason;
};
