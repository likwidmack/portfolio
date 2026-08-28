<template lang="pug">
img(
  v-bind="passthroughAttrs",
  :src="src",
  :alt="alt",
  :width="width",
  :height="height",
  :loading="resolvedLoading",
  :decoding="decoding",
  :fetchpriority="fetchpriority",
  :crossorigin="crossorigin",
  :referrerpolicy="referrerpolicy",
  :usemap="usemap"
)
</template>

<script setup lang="ts">
/**
 * Drop-in surface for NuxtImg props when the asset is SVG.
 * IPX cannot resize/reformat SVG — this renders a native <img> and
 * accepts Nuxt Image props as no-ops so call sites stay symmetric.
 */
defineOptions({ inheritAttrs: false });

type ImgLoading = 'lazy' | 'eager';
type ImgDecoding = 'async' | 'auto' | 'sync';
type ImgFetchPriority = 'high' | 'low' | 'auto';
type ImgCrossOrigin = 'anonymous' | 'use-credentials' | '';

const props = withDefaults(
  defineProps<{
    src: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    loading?: ImgLoading;
    decoding?: ImgDecoding;
    fetchpriority?: ImgFetchPriority;
    crossorigin?: ImgCrossOrigin;
    referrerpolicy?: string;
    usemap?: string;
    /** NuxtImg parity — ignored for SVG (no responsive srcset). */
    sizes?: string;
    densities?: string;
    format?: string;
    quality?: number | string;
    fit?: string;
    preload?: boolean;
    placeholder?: boolean | string;
    provider?: string;
    preset?: string;
    modifiers?: Record<string, unknown>;
    background?: string;
  }>(),
  {
    alt: '',
    decoding: 'async',
    loading: undefined,
  }
);

const attrs = useAttrs();

/** Map Nuxt-style preload / loading onto the native loading attribute. */
const resolvedLoading = computed<ImgLoading>(() => {
  if (props.loading) return props.loading;
  if (props.preload) return 'eager';
  return 'lazy';
});

/**
 * Forward class/style/aria/data-* from the caller; strip anything already
 * bound explicitly so we do not duplicate attributes.
 */
const passthroughAttrs = computed(() => {
  const skip = new Set([
    'src',
    'alt',
    'width',
    'height',
    'loading',
    'decoding',
    'fetchpriority',
    'crossorigin',
    'referrerpolicy',
    'usemap',
    'sizes',
    'densities',
    'format',
    'quality',
    'fit',
    'preload',
    'placeholder',
    'provider',
    'preset',
    'modifiers',
    'background',
  ]);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (skip.has(key)) continue;
    out[key] = value;
  }
  return out;
});
</script>
