<template lang="pug">
.page-content.portfolio-page.process-page
  header.portfolio-hero
    p.eyebrow-container Process
    h1 AI is part of the work. Judgment stays visible.
    p.lead These sanitized decision cards show how ideas moved through AI-assisted exploration, art direction, implementation, and evidence review.

  section.process-principles(aria-labelledby="process-principles-heading")
    h2#process-principles-heading Working agreement
    ul
      li Prompts are inputs, not authorship or authority.
      li Decisions name the human judgment that changed the work.
      li Public cards omit task identifiers, full transcripts, secrets, file paths, and private business content.

  section.decision-list(aria-label="Sanitized AI decision journal")
    article.decision-card(v-for="card in cards", :key="card.id")
      header
        p
          span {{ card.source }}
          time(:datetime="card.date") {{ formatDate(card.date) }}
        h2 {{ card.title }}
      dl
        div
          dt Starting point
          dd “{{ card.promptExcerpt }}”
        div
          dt Decision
          dd {{ card.decision }}
        div
          dt Result
          dd {{ card.result }}
        div
          dt Learning
          dd {{ card.learning }}
      NuxtLink(v-if="card.caseStudySlug", :to="`/work/${card.caseStudySlug}`") Related case study →
</template>

<script setup lang="ts">
import type { DecisionCard } from '#shared/portfolio-types';
import { isPublicDecisionCard } from '#shared/portfolio-types';

definePageMeta({ breadcrumb: 'Process' });
const { data } = await useContentAsyncData('public-decision-cards', () =>
  fetchContentCollection<DecisionCard[]>('decisionCards', { mode: 'all' })
);
const cards = computed(() =>
  ((data.value ?? []) as DecisionCard[]).filter(isPublicDecisionCard).sort((a, b) => b.date.localeCompare(a.date))
);
const formatDate = (date: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));

usePortfolioSeo({
  title: 'Process — Tamara Mack, Creative Technologist',
  description: 'A sanitized AI decision journal showing how human judgment shapes AI-assisted design and engineering.',
  path: '/process',
});
</script>
