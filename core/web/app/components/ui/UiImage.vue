<template lang="pug">
.ui-image(
  :class="{ 'ui-image--loaded': loaded, 'ui-image--reduced-motion': prefersReducedMotion }",
  :style="frameStyle"
)
  img.ui-image__lqip(v-if="lqip", :src="lqip", alt="", aria-hidden="true", decoding="async")
  NuxtImg.ui-image__img(
    :src="src",
    :alt="alt",
    :width="width",
    :height="height",
    :loading="loading",
    :sizes="sizes",
    @load="onLoad"
  )
</template>

<script setup lang="ts">
/**
 * Raster image with dominant-color / LQIP placeholder and NuxtImg fade-in.
 * SVG diagrams continue to use `UiSvgImg`.
 */
import { pickContrastingInk } from '@tgmc/theme';
import { aspectRatio as computeAspect } from '@tgmc/utilities/universal';

type ImgLoading = 'lazy' | 'eager';

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    sizes?: string;
    loading?: ImgLoading;
    lqip?: string;
    dominantColor?: string;
    /** CSS aspect-ratio value, e.g. `16 / 9`. */
    aspectRatio?: string;
  }>(),
  {
    alt: '',
    loading: 'lazy',
    sizes: undefined,
    lqip: undefined,
    dominantColor: undefined,
    aspectRatio: undefined,
  }
);

const loaded = ref(false);
const prefersReducedMotion = ref(false);

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
});

watch(
  () => props.src,
  () => {
    loaded.value = false;
  }
);

const resolvedAspect = computed(() => {
  if (props.aspectRatio) return props.aspectRatio;
  const w = Number(props.width);
  const h = Number(props.height);
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return computeAspect(w, h).css;
  }
  return undefined;
});

const frameStyle = computed(() => {
  const style: Record<string, string> = {};
  // The placeholder is the image's own dominant colour (image data) with an ink that reads on it;
  // without one the stylesheet paints the theme surface / text colours.
  if (props.dominantColor) {
    style.backgroundColor = props.dominantColor;
    try {
      style.color = pickContrastingInk({ backgroundColor: props.dominantColor });
    } catch {
      // Unparseable colour: keep the stylesheet's text colour.
    }
  }
  if (resolvedAspect.value) {
    style.aspectRatio = resolvedAspect.value;
  }
  return style;
});

const onLoad = () => {
  loaded.value = true;
};
</script>

<style lang="scss" src="./UiImage.scss" scoped></style>
