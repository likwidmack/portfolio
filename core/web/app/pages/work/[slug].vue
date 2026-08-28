<template lang="pug">
.page-content.portfolio-page.case-study(v-if="study")
  NuxtLink.back-link(to="/work") ← All work
  header.portfolio-hero
    p.eyebrow-container {{ study.category }}
    h1 {{ study.title }}
    p.lead {{ study.summary }}
    p.case-study__meta {{ study.role }} · {{ study.timeframe }}
    span.case-study__privacy(v-if="study.confidentiality === 'sanitized'") Sanitized case study

  figure.case-study__media(v-if="study.media[0]")
    AppCaseStudyMedia(:item="study.media[0]", width="1440", height="810", eager)
    figcaption(v-if="study.media[0].caption") {{ study.media[0].caption }}

  .case-study__body
    section(aria-labelledby="problem-heading")
      p.eyebrow-container Context
      h2#problem-heading The problem
      p.lead {{ study.problem }}

    section(aria-labelledby="constraints-heading")
      h2#constraints-heading Constraints
      ul.case-study__list
        li(v-for="constraint in study.constraints", :key="constraint") {{ constraint }}

    section(aria-labelledby="approach-heading")
      h2#approach-heading Approach
      ol.case-study__list
        li(v-for="step in study.approach", :key="step") {{ step }}

    section(aria-labelledby="evidence-heading")
      h2#evidence-heading Evidence
      dl.evidence-grid
        div(v-for="item in study.evidence", :key="item.label")
          dt {{ item.label }}
          dd {{ item.value }}
      .button-row.case-study__evidence-actions
        UiButton(
          label="Browse evidence examples",
          type="button",
          severity="secondary",
          variant="outlined",
          aria-label="Browse code, data, and styles evidence examples",
          @click="evidenceOpen = true"
        )

    section(v-if="study.media.length > 1", aria-labelledby="artifacts-heading")
      h2#artifacts-heading Artifacts
      .artifact-grid
        figure(v-for="item in study.media.slice(1)", :key="item.src")
          AppCaseStudyMedia(:item="item")
          figcaption(v-if="item.caption") {{ item.caption }}

    section(aria-labelledby="technology-heading")
      h2#technology-heading Technology
      ul.tag-list
        li(v-for="technology in study.technologies", :key="technology") {{ technology }}

    nav.case-study__links(aria-label="Case study links")
      NuxtLink(v-for="link in study.links", :key="link.href", :to="link.href") {{ link.label }} →

  AppEvidenceExamplesDialog(v-model:visible="evidenceOpen")
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ''));

const { data } = await useContentAsyncData(
  () => `case-study-${slug.value}`,
  () => fetchContentCollection<CaseStudy>('caseStudies', { mode: 'first', slug: slug.value }),
  { watch: [slug] }
);

const study = computed(() => (data.value ?? null) as CaseStudy | null);
const evidenceOpen = ref(false);

if (!study.value) {
  throw createError({ statusCode: 404, statusMessage: 'Case study not found' });
}

const { track } = usePortfolioAnalytics();
onMounted(() => {
  if (study.value) track('work_view', { slug: study.value.slug });
});

usePortfolioSeo({
  title: `${study.value.title} — Tamara Mack`,
  description: study.value.summary,
  path: `/work/${study.value.slug}`,
  image: study.value.media[0]?.src,
});
</script>
