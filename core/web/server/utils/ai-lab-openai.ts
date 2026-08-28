import type { AiLabBrief, AiLabPlan } from '#shared/ai-lab-types';

type OpenAiResponse = {
  output?: Array<{
    type?: string;
    name?: string;
    call_id?: string;
    arguments?: string;
    content?: Array<{ type?: string; text?: string }>;
  }>;
};

const tools = [
  {
    type: 'function',
    name: 'lookup_ui_pattern',
    description: 'Look up one read-only UI pattern for transparent or approval-based agent interactions.',
    parameters: {
      type: 'object',
      properties: { pattern: { type: 'string', enum: ['approval', 'recovery', 'transparency'] } },
      required: ['pattern'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    type: 'function',
    name: 'find_related_case_study',
    description: 'Find one related public portfolio case study by topic.',
    parameters: {
      type: 'object',
      properties: {
        topic: {
          type: 'string',
          enum: ['media', 'innovation', 'agent-ui', 'spatial', 'visualization', 'ux'],
        },
      },
      required: ['topic'],
      additionalProperties: false,
    },
    strict: true,
  },
] as const;

const planSchema = {
  type: 'object',
  properties: {
    interpretedGoal: { type: 'string', maxLength: 360 },
    steps: { type: 'array', minItems: 1, maxItems: 3, items: { type: 'string', maxLength: 180 } },
    pendingAction: { type: 'string', maxLength: 220 },
  },
  required: ['interpretedGoal', 'steps', 'pendingAction'],
  additionalProperties: false,
} as const;

const briefSchema = {
  type: 'object',
  properties: {
    title: { type: 'string', maxLength: 120 },
    summary: { type: 'string', maxLength: 480 },
    interface: { type: 'array', minItems: 3, maxItems: 5, items: { type: 'string', maxLength: 180 } },
    guardrails: { type: 'array', minItems: 2, maxItems: 4, items: { type: 'string', maxLength: 180 } },
    nextStep: { type: 'string', maxLength: 220 },
  },
  required: ['title', 'summary', 'interface', 'guardrails', 'nextStep'],
  additionalProperties: false,
} as const;

function toolOutput(name: string | undefined, argsText: string | undefined): string {
  let args: Record<string, string>;
  try {
    args = JSON.parse(argsText || '{}') as Record<string, string>;
  } catch {
    return JSON.stringify({ found: false });
  }
  if (name === 'lookup_ui_pattern') {
    const patterns = {
      approval: 'Show the exact pending action, its scope, and separate approve/reject controls.',
      recovery: 'Preserve the idea and offer restart, revise, or deterministic fallback after failure.',
      transparency: 'Separate interpreted goal, plan, pending action, and result into named states.',
    };
    return JSON.stringify({ found: true, pattern: patterns[args.pattern as keyof typeof patterns] });
  }
  if (name === 'find_related_case_study') {
    const studies = {
      media: { slug: 'media-systems', title: 'Media Systems' },
      innovation: { slug: 'innovation-prototyping', title: 'Innovation Prototyping' },
      'agent-ui': { slug: 'human-controlled-ai-lab', title: 'Human-Controlled AI Lab' },
      spatial: { slug: 'spatial-experiences', title: 'Spatial Experiences' },
      visualization: { slug: 'data-visualization', title: 'Data Visualization' },
      ux: { slug: 'experience-systems', title: 'Experience Systems' },
    };
    return JSON.stringify({ found: true, study: studies[args.topic as keyof typeof studies] });
  }
  return JSON.stringify({ found: false });
}

function extractJson<T>(response: OpenAiResponse): T {
  const text = response.output?.flatMap((item) => item.content ?? []).find((item) => item.type === 'output_text')?.text;
  if (!text) throw new Error('Malformed model output');
  return JSON.parse(text) as T;
}

async function requestOpenAi(apiKey: string, body: Record<string, unknown>, timeoutMs = 8000): Promise<OpenAiResponse> {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`OpenAI request failed: ${response.status}`);
  return (await response.json()) as OpenAiResponse;
}

export async function createLivePlan(idea: string, apiKey: string, model: string): Promise<AiLabPlan> {
  const baseInput = [
    {
      role: 'system',
      content:
        'Interpret a fuzzy product idea for a human-controlled AI interface. Return at most three concrete steps and exactly one pending, reversible action. Do not claim outcomes or expose chain-of-thought.',
    },
    { role: 'user', content: idea },
  ];
  const request = {
    model,
    store: false,
    reasoning: { effort: 'low' },
    max_output_tokens: 500,
    input: baseInput,
    tools,
    text: { format: { type: 'json_schema', name: 'ai_lab_plan', strict: true, schema: planSchema } },
  };
  let response = await requestOpenAi(apiKey, request);
  const calls = (response.output ?? []).filter((item) => item.type === 'function_call');
  if (calls.length) {
    const outputs = calls.map((call) => ({
      type: 'function_call_output',
      call_id: call.call_id,
      output: toolOutput(call.name, call.arguments),
    }));
    response = await requestOpenAi(apiKey, {
      ...request,
      input: [...baseInput, ...(response.output ?? []), ...outputs],
    });
  }
  const plan = extractJson<AiLabPlan>(response);
  if (!plan.steps.length || plan.steps.length > 3) throw new Error('Invalid plan steps');
  return plan;
}

export async function createLiveBrief(
  idea: string,
  plan: AiLabPlan,
  apiKey: string,
  model: string
): Promise<AiLabBrief> {
  const response = await requestOpenAi(apiKey, {
    model,
    store: false,
    reasoning: { effort: 'low' },
    max_output_tokens: 650,
    input: [
      {
        role: 'system',
        content:
          'Create a concise prototype brief only after approval. Keep the interface human-controlled, make failure recoverable, and state practical guardrails.',
      },
      { role: 'user', content: JSON.stringify({ idea, approvedPlan: plan }) },
    ],
    text: { format: { type: 'json_schema', name: 'ai_lab_brief', strict: true, schema: briefSchema } },
  });
  return extractJson<AiLabBrief>(response);
}
