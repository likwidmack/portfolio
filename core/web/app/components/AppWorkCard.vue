<template lang="pug">
article.work-card
  NuxtLink.work-card__media(
    v-if="cardMedia",
    :class="{ 'work-card__media--diagram': isDiagramThumb }",
    :to="`/work/${study.slug}`",
    :aria-label="`Open ${study.title} story image`",
    @click="trackWorkView"
  )
    //- SVGs skip IPX via UiSvgImg; rasters keep Nuxt Image.
    UiSvgImg(
      v-if="isDiagramThumb",
      :src="cardMedia.src",
      :alt="cardMedia.alt",
      width="640",
      height="400",
      loading="lazy"
    )
    //- @nuxt/image sizes use screen:width tokens (xs:100vw), not CSS media-query syntax.
    NuxtImg(
      v-else,
      :src="cardMedia.src",
      :alt="cardMedia.alt",
      width="640",
      height="400",
      loading="lazy",
      sizes="xs:100vw md:360px"
    )
  .work-card__body
    p.work-card__category {{ study.category }}
    h3
      NuxtLink(:to="`/work/${study.slug}`", @click="trackWorkView") {{ study.title }}
    p {{ study.summary }}
    dl
      div
        dt Role
        dd {{ study.role }}
      div
        dt Evidence
        dd {{ study.evidence[0]?.value }}
    ul.work-card__tech(aria-label="Technologies")
      li(v-for="technology in study.technologies.slice(0, 4)", :key="technology") {{ technology }}
    NuxtLink.work-card__link(:to="`/work/${study.slug}`", @click="trackWorkView")
      | Read the story
      span(aria-hidden="true") ↗
</template>

<script setup lang="ts">
import { isSvgSrc } from '#shared/is-svg-src';
import { getCaseStudyCardMedia, type CaseStudy } from '#shared/portfolio-types';

const props = defineProps<{ study: CaseStudy }>();
const { track } = usePortfolioAnalytics();

const cardMedia = computed(() => getCaseStudyCardMedia(props.study));
const isDiagramThumb = computed(() => isSvgSrc(cardMedia.value?.src ?? ''));

const trackWorkView = () => track('work_view', { slug: props.study.slug });
</script>
