<template lang="pug">
video.case-study-media(
  v-if="item.type === 'video'",
  controls,
  muted,
  playsinline,
  preload="none",
  :poster="item.poster",
  :aria-label="item.alt"
)
  source(:src="item.src", type="video/mp4")
  | Your browser does not support embedded video.
UiSvgImg.case-study-media(
  v-else-if="isSvg",
  :src="item.src",
  :alt="item.alt",
  :width="width",
  :height="height",
  :loading="eager ? 'eager' : 'lazy'"
)
NuxtImg.case-study-media(
  v-else,
  :src="item.src",
  :alt="item.alt",
  :width="width",
  :height="height",
  :loading="eager ? 'eager' : 'lazy'"
)
</template>

<script setup lang="ts">
import { isSvgSrc } from '#shared/is-svg-src';
import type { CaseStudy } from '#shared/portfolio-types';

type CaseStudyMedia = CaseStudy['media'][number];

const props = withDefaults(
  defineProps<{
    item: CaseStudyMedia;
    width?: number | string;
    height?: number | string;
    eager?: boolean;
  }>(),
  {
    width: 960,
    height: 540,
    eager: false,
  }
);

const isSvg = computed(() => isSvgSrc(props.item.src));
</script>
