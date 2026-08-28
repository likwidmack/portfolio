<template lang="pug">
.page-content.portfolio-page.home
  header.home-hero
    .home-hero__copy
      p.eyebrow-container {{ content.hero.eyebrow }}
      p.home-hero__name {{ content.hero.brand }}
      h1 {{ content.hero.title }}
      p.home-hero__lede {{ content.hero.lede }}
      p.home-hero__availability {{ content.hero.availability }}
      .button-row
        UiButton(as="a", :href="content.hero.primaryActionHref", :label="content.hero.primaryActionLabel")
        UiButton(
          as="a",
          :href="content.hero.secondaryActionHref",
          :label="content.hero.secondaryActionLabel",
          variant="outlined",
          severity="secondary"
        )
    figure.home-hero__visual
      span.home-hero__signature {{ content.hero.signature }}
      img(
        src="/img/tesseract/schlegel-wireframe-8-cell.png",
        alt="Tesseract wireframe representing multidimensional interface systems",
        width="720",
        height="720",
        loading="eager",
        fetchpriority="high"
      )
      figcaption {{ content.hero.visualCaption }}

  section.home-section(aria-labelledby="featured-work-heading")
    header.section-intro
      p.eyebrow-container {{ content.featuredWork.eyebrow }}
      h2#featured-work-heading {{ content.featuredWork.heading }}
      p.lead {{ content.featuredWork.lede }}
    .work-grid
      AppWorkCard(v-for="study in featuredStudies", :key="study.slug", :study="study")

  section.home-section(aria-labelledby="principles-heading")
    header.section-intro
      p.eyebrow-container {{ content.principles.eyebrow }}
      h2#principles-heading {{ content.principles.heading }}
      p.lead {{ content.principles.lede }}
    .principle-grid
      article(v-for="(item, index) in content.principles.items", :key="item.title")
        span {{ String(index + 1).padStart(2, '0') }}
        h3 {{ item.title }}
        p {{ item.body }}

  section.home-cta(aria-labelledby="home-cta-heading")
    p.eyebrow-container {{ content.cta.eyebrow }}
    h2#home-cta-heading {{ content.cta.heading }}
    p.lead {{ content.cta.lede }}
    .button-row
      UiButton(as="a", :href="content.cta.primaryHref", :label="content.cta.primaryLabel", @click="trackContact")
      UiButton(
        as="a",
        :href="content.cta.secondaryHref",
        :label="content.cta.secondaryLabel",
        variant="outlined",
        severity="secondary"
      )
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';
import { sortCaseStudies } from '#shared/portfolio-types';
import type { Collections } from '@nuxt/content';

type HomeContent = Collections['home'];
definePageMeta({ breadcrumb: 'Home' });

const { data: homeContent } = await useContentAsyncData('home-content', () =>
  fetchContentCollection<HomeContent>('home', { mode: 'first' })
);
const { data: caseStudyData } = await useContentAsyncData('home-case-studies', () =>
  fetchContentCollection<CaseStudy[]>('caseStudies', { mode: 'all' })
);

if (!homeContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Home content not found' });
}

const content = computed(() => homeContent.value as HomeContent);
const featuredStudies = computed(() => {
  const requested = new Set(content.value.featuredWork.slugs);
  return sortCaseStudies(((caseStudyData.value ?? []) as CaseStudy[]).filter((study) => requested.has(study.slug)));
});
const { track } = usePortfolioAnalytics();
const trackContact = () => track('contact_click', { placement: 'home' });

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/',
});
</script>
