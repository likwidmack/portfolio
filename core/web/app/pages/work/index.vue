<template lang="pug">
.page-content.portfolio-page.work-index(data-fit="screen")
  AppDepthField(:seed="19", :particle-count="110")
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

  nav.jump-bar(aria-label="Jump to case study")
    span.jump-label Jump to
    a.jump-link(
      v-for="study in studies",
      :key="study.slug",
      :href="`#work-${study.slug}`",
      :class="{ 'jump-link--active': activeSlug === study.slug }",
      @click="onJumpClick($event, study.slug)"
    ) {{ study.title }}

  section.work-grid.layout(data-algo="auto", aria-label="Case studies")
    AppWorkCard(
      v-for="(study, i) in studies",
      :id="`work-${study.slug}`",
      :key="study.slug",
      :study="study",
      :index="i + 1",
      :total="studies.length"
    )

  AppEvidenceExamplesDialog(v-model:visible="evidenceOpen")
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';
import { sortCaseStudies } from '#shared/portfolio-types';
import { SITE_PERSON } from '#shared/site-person';

definePageMeta({ breadcrumb: 'Work' });
const evidenceOpen = ref(false);
const { data } = await useContentAsyncData('case-studies', () =>
  fetchContentCollection<CaseStudy[]>('caseStudies', { mode: 'all' })
);
const studies = computed(() => sortCaseStudies((data.value ?? []) as CaseStudy[]));
const activeSlug = ref<string>('');
const reducedMotion = usePrefersReducedMotion();

watch(
  studies,
  (next) => {
    if (!activeSlug.value && next.length) activeSlug.value = next[0]!.slug;
  },
  { immediate: true }
);

function onJumpClick(event: MouseEvent, slug: string): void {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  activeSlug.value = slug;
  const id = `work-${slug}`;
  history.replaceState(null, '', `#${id}`);
  const behavior = reducedMotion.value ? 'auto' : 'smooth';
  document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
}

usePortfolioSeo({
  title: `Work — ${SITE_PERSON.formal}, Creative Technologist`,
  description:
    'Proof-led case studies across media systems, spatial experiences, data visualization, experience systems, and human-controlled AI.',
  path: '/work',
});
</script>

<style lang="scss" src="./styles/index.scss"></style>
