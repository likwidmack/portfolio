<template lang="pug">
article.work-card.layout(data-algo="split", :data-layout="layout")
  //- One link per card: the title link is stretched over the whole card (see AppWorkCard.scss).
  .work-card__media(v-if="cardMedia", :class="{ 'work-card__media--diagram': isDiagramThumb }")
    //- SVGs skip IPX via UiSvgImg; rasters use UiImage (LQIP / dominant placeholder + NuxtImg).
    UiSvgImg(
      v-if="isDiagramThumb",
      :src="cardMedia.src",
      :alt="cardMedia.alt",
      width="640",
      height="400",
      loading="lazy"
    )
    //- @nuxt/image sizes use screen:width tokens (xs:100vw), not CSS media-query syntax.
    UiImage(
      v-else,
      :src="cardMedia.src",
      :alt="cardMedia.alt",
      width="640",
      height="400",
      loading="lazy",
      sizes="xs:100vw md:360px",
      :lqip="cardMedia.lqip",
      :dominant-color="cardMedia.dominantColor",
      :aspect-ratio="cardMedia.aspectCss"
    )
  .work-card__body
    .work-card__topline
      p.work-card__category {{ study.category }}
      span.work-card__index(v-if="index && total") {{ String(index).padStart(2, '0') }} / {{ String(total).padStart(2, '0') }}
    h3
      NuxtLink.work-card__title-link(:to="`/work/${study.slug}`", @click="trackWorkView") {{ study.title }}
    p {{ study.summary }}
    dl
      div
        dt Role
        dd {{ study.role }}
      div
        dt Evidence
        dd {{ study.evidence[0]?.value }}
    ul.work-card__tech.layout(data-algo="cluster", aria-label="Technologies")
      li(v-for="technology in study.technologies.slice(0, 4)", :key="technology") {{ technology }}
    span.work-card__link(aria-hidden="true") Read the story →
</template>

<script setup lang="ts">
import { isSvgSrc } from '#shared/is-svg-src';
import { getCaseStudyCardMedia, type CaseStudy } from '#shared/portfolio-types';

const props = withDefaults(
  defineProps<{
    study: CaseStudy;
    index?: number;
    total?: number;
    /** `stack` = media over body; `row` = media | body from tablet up (the /work list). */
    layout?: 'stack' | 'row';
  }>(),
  { index: undefined, total: undefined, layout: 'stack' }
);
const { track } = usePortfolioAnalytics();

const cardMedia = computed(() => getCaseStudyCardMedia(props.study));
const isDiagramThumb = computed(() => isSvgSrc(cardMedia.value?.src ?? ''));

const trackWorkView = () => track('work_view', { slug: props.study.slug });
</script>

<style lang="scss" src="./AppWorkCard.scss" scoped></style>
