<template lang="pug">
.page-content.portfolio-page.ai-lab(data-fit="screen")
  header.portfolio-hero
    p.eyebrow-container Human-Controlled AI Lab
    h1 Goal → plan → approval → result
    p.lead Try a transparent agent workflow. The lab shows what it understood, limits the plan, and waits for your approval before creating a brief.
    p.ai-lab__mode
      strong {{ liveAvailable ? 'Live mode available' : 'Replay mode' }}
      |
      | · no prompt text is sent to analytics

  section.ai-lab__workspace(aria-labelledby="lab-workspace-heading")
    h2#lab-workspace-heading Shape a product idea
    form(v-if="state === 'idle'", @submit.prevent="requestPlan")
      label(for="ai-lab-idea") Describe a fuzzy product idea
      textarea#ai-lab-idea(
        v-model="idea",
        maxlength="240",
        rows="5",
        required,
        placeholder="A workspace that helps a creative team turn rough concepts into testable interface directions…"
      )
      .ai-lab__form-meta
        span {{ idea.length }}/240
        UiButton(type="submit", label="Interpret the idea", :disabled="loading || !idea.trim()")

    .ai-lab__loading(v-if="loading", role="status") Preparing the next visible state…

    article.ai-lab__plan(v-if="plan && state === 'planned'", aria-labelledby="interpreted-goal-heading")
      p.eyebrow-container Interpreted goal
      h2#interpreted-goal-heading {{ plan.interpretedGoal }}
      ol
        li(v-for="step in plan.steps", :key="step") {{ step }}
      .ai-lab__pending
        p
          strong Pending action
        p {{ plan.pendingAction }}
      .button-row(aria-label="Approval controls")
        UiButton(label="Approve action", @click="approve")
        UiButton(label="Reject action", variant="outlined", severity="secondary", @click="reject")

    article.ai-lab__rejected(v-if="state === 'rejected'", role="status")
      p.eyebrow-container Action rejected
      h2 Nothing was generated
      p The pending action stopped at the approval gate. You can revise the idea or start over.
      UiButton(label="Start again", variant="outlined", @click="restart")

    article.ai-lab__result(v-if="brief && state === 'complete'", aria-labelledby="prototype-brief-heading")
      p.eyebrow-container Prototype brief
      h2#prototype-brief-heading {{ brief.title }}
      p.lead {{ brief.summary }}
      .ai-lab__result-grid
        section
          h3 Interface
          ul
            li(v-for="item in brief.interface", :key="item") {{ item }}
        section
          h3 Guardrails
          ul
            li(v-for="item in brief.guardrails", :key="item") {{ item }}
      p
        strong Next test:
        |
        | {{ brief.nextStep }}
      UiButton(label="Try another idea", variant="outlined", @click="restart")

    p.ai-lab__fallback(v-if="fallbackMessage", role="status") {{ fallbackMessage }}
</template>

<script setup lang="ts">
import { replayBrief, replayPlan } from '#shared/ai-lab-replay';
import type { AiLabBrief, AiLabCompleteResponse, AiLabPlan, AiLabPlanResponse } from '#shared/ai-lab-types';

definePageMeta({ breadcrumb: 'AI Lab' });
const config = useRuntimeConfig();
const liveAvailable = computed(() => Boolean(config.public.aiLabLiveEnabled));
const idea = ref('');
const loading = ref(false);
const state = ref<'idle' | 'planned' | 'rejected' | 'complete'>('idle');
const plan = ref<AiLabPlan | null>(null);
const brief = ref<AiLabBrief | null>(null);
const token = ref('');
const fallbackMessage = ref('');
const source = ref<'live' | 'replay'>('replay');
const { track } = usePortfolioAnalytics();

const fallbackCopy = (reason?: AiLabPlanResponse['fallbackReason']) => {
  if (!reason) return '';
  if (reason === 'quota')
    return 'The anonymous live quota is complete for today, so the deterministic replay took over.';
  if (reason === 'timeout') return 'The live request took too long, so the deterministic replay took over.';
  if (reason === 'network')
    return 'The network was unavailable, so the deterministic replay took over in this browser.';
  if (reason === 'model') return 'The live response could not be validated, so the deterministic replay took over.';
  return 'This launch-safe replay demonstrates the full approval flow without requiring a live request.';
};

const requestPlan = async () => {
  loading.value = true;
  fallbackMessage.value = '';
  track('lab_start', { mode: liveAvailable.value ? 'live-capable' : 'replay' });
  try {
    const response = await $fetch<AiLabPlanResponse>('/api/ai-lab/plan', {
      method: 'POST',
      body: { idea: idea.value.trim() },
    });
    plan.value = response.plan;
    token.value = response.continuationToken;
    source.value = response.source;
    fallbackMessage.value = fallbackCopy(response.fallbackReason);
    state.value = 'planned';
  } catch {
    plan.value = replayPlan;
    token.value = 'replay';
    source.value = 'replay';
    fallbackMessage.value = fallbackCopy('network');
    state.value = 'planned';
  } finally {
    loading.value = false;
  }
};

const approve = async () => {
  loading.value = true;
  track('lab_approval', { decision: 'approved', source: source.value });
  try {
    const response = await $fetch<AiLabCompleteResponse>('/api/ai-lab/complete', {
      method: 'POST',
      body: { continuationToken: token.value },
    });
    brief.value = response.brief;
    source.value = response.source;
    fallbackMessage.value = fallbackCopy(response.fallbackReason);
    state.value = 'complete';
    track('lab_complete', { source: response.source });
  } catch {
    brief.value = replayBrief;
    source.value = 'replay';
    fallbackMessage.value = fallbackCopy('network');
    state.value = 'complete';
    track('lab_complete', { source: 'replay' });
  } finally {
    loading.value = false;
  }
};

const reject = () => {
  state.value = 'rejected';
  track('lab_approval', { decision: 'rejected', source: source.value });
};

const restart = () => {
  state.value = 'idle';
  plan.value = null;
  brief.value = null;
  token.value = '';
  fallbackMessage.value = '';
};

usePortfolioSeo({
  title: 'Human-Controlled AI Lab — Tamara Mack',
  description:
    'An interactive agent workflow demonstrating interpretation, approval, rejection, recovery, and replay fallback.',
  path: '/ai-lab',
});
</script>
