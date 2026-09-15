<template lang="pug">
.page-content.portfolio-page.home(data-fit="screen")
  AppDepthField(:seed="7", :particle-count="120")
  header.home-hero.layout(data-algo="split")
    .home-hero__copy
      p.eyebrow-container {{ content.hero.eyebrow }}
      p.home-hero__name {{ content.hero.brand }}
      h1
        | {{ content.hero.title }}
        |
        span.home-hero__title-accent {{ content.hero.titleAccent }}
      p.home-hero__lede {{ content.hero.lede }}
      ul.home-hero__stats.layout(data-algo="cluster", aria-label="Career highlights")
        li(v-for="stat in content.hero.stats", :key="stat.label")
          strong {{ stat.value }}
          span {{ stat.label }}
      .button-row
        UiButton(as="a", :href="content.hero.primaryActionHref", :label="content.hero.primaryActionLabel")
        UiButton(
          as="a",
          :href="profile.downloads.generalResume",
          :label="content.hero.secondaryActionLabel",
          variant="outlined",
          severity="secondary",
          download
        )
      ul.home-hero__disciplines.layout(data-algo="cluster", aria-label="Disciplines")
        li(v-for="discipline in content.hero.disciplines", :key="discipline") {{ discipline }}
    .home-hero__visual
      AppOrbitStage(:studies="featuredStudies")
      p.home-hero__currently
        strong {{ content.hero.currentlyLabel }}
        | {{ content.hero.availability }}
      p.home-hero__brand {{ content.hero.brand }}

  ul.home-hero__tags.layout(data-algo="cluster", aria-label="Areas of focus")
    li(v-for="tag in content.hero.tags", :key="tag") {{ tag }}

  section.home-section(aria-labelledby="featured-work-heading")
    header.section-intro.section-intro--split.layout(data-algo="cluster")
      div
        p.eyebrow-container {{ content.featuredWork.eyebrow }}
        h2#featured-work-heading {{ content.featuredWork.heading }}
        p.lead {{ content.featuredWork.lede }}
      NuxtLink.section-intro__view-all(to="/work") View all ({{ featuredStudies.length }}) →
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
      UiButton(as="a", :href="contactMailto", :label="content.cta.primaryLabel", @click="trackContact")
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
import { mailtoHref } from '#shared/site-person';
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
const { profile } = useSiteProfile();
const contactMailto = computed(() => mailtoHref(profile.value.contact.email));
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

<style lang="scss" src="./index.scss"></style>
