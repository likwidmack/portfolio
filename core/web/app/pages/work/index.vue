<template lang="pug">
.page-content.portfolio-page.work-index
  header.portfolio-hero
    p.eyebrow-container Selected work
    h1 Proof-led stories
    p.lead Shipped media engineering, spatial prototypes, data visualization, experience systems, and human-controlled AI — each connected to inspectable artifacts.
    .button-row
      UiButton(
        label="Browse evidence examples",
        type="button",
        severity="secondary",
        variant="outlined",
        aria-label="Browse code, data, and styles evidence examples",
        @click="evidenceOpen = true"
      )

  section.work-grid(aria-label="Case studies")
    AppWorkCard(v-for="study in studies", :key="study.slug", :study="study")

  AppEvidenceExamplesDialog(v-model:visible="evidenceOpen")
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';
import { sortCaseStudies } from '#shared/portfolio-types';

definePageMeta({ breadcrumb: 'Work' });
const evidenceOpen = ref(false);
const { data } = await useContentAsyncData('case-studies', () =>
  fetchContentCollection<CaseStudy[]>('caseStudies', { mode: 'all' })
);
const studies = computed(() => sortCaseStudies((data.value ?? []) as CaseStudy[]));

usePortfolioSeo({
  title: 'Work — Tamara Mack, Creative Technologist',
  description:
    'Proof-led case studies across media systems, spatial experiences, data visualization, experience systems, and human-controlled AI.',
  path: '/work',
});
</script>
