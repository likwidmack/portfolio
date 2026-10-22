<template lang="pug">
.gallery-exhibit(:data-kind="kind")
  template(v-if="exhibit?.kind === 'code'")
    UiCodeBlock(
      :code="exhibit.source",
      :language="exhibit.language",
      :line-numbers="exhibit.lineNumbers !== false",
      :aria-label="exhibit.filename || title",
      :focusable="codeFocusable"
    )
  template(v-else-if="exhibit?.kind === 'media' && exhibit.mediaType === 'video'")
    video.gallery-exhibit__video(
      ref="videoEl",
      :src="exhibit.src",
      :poster="exhibit.poster",
      :aria-label="exhibit.alt || title",
      muted,
      loop,
      playsinline,
      preload="metadata",
      controls
    )
  template(v-else-if="exhibit?.kind === 'media'")
    UiImage.gallery-exhibit__image(
      :src="exhibit.src",
      :alt="exhibit.alt || title",
      width="720",
      height="900",
      :loading="eager ? 'eager' : 'lazy'",
      sizes="xs:100vw md:420px",
      :lqip="exhibit.lqip",
      :dominant-color="exhibit.dominantColor",
      :aspect-ratio="exhibit.aspectCss"
    )
  template(v-else-if="exhibit?.kind === 'viz' && exhibit.diagram")
    AppArchitectureDiagram(
      :caption="captionPlacement === 'inside' ? exhibit.caption : undefined",
      :aria-label="exhibit.diagram.ariaLabel || title",
      :groups="exhibit.diagram.groups",
      :nodes="exhibit.diagram.nodes",
      :edges="exhibit.diagram.edges"
    )
  ul.gallery-exhibit__series(v-else-if="exhibit?.kind === 'viz' && exhibit.series", aria-label="Series")
    li(v-for="point in exhibit.series", :key="point.label")
      span {{ point.label }}
      strong {{ point.value }}
  UiImage.gallery-exhibit__image(
    v-else-if="image",
    :src="image",
    :alt="imageAlt || title",
    width="720",
    height="900",
    loading="lazy"
  )
  p.gallery-exhibit__fallback(v-else) {{ title }}
  //- The diagram renders its own figcaption: no second (overlapping) caption on top of it.
  p.gallery-exhibit__caption(v-if="caption && !hasDiagram && captionPlacement === 'inside'") {{ caption }}
</template>

<script setup lang="ts">
import type { GalleryExhibit } from '#shared/gallery-types';

const props = withDefaults(
  defineProps<{
    autoplay?: boolean;
    /** `none`: the host shows the caption itself (the gallery grid puts it in the tile meta). */
    captionPlacement?: 'inside' | 'none';
    /**
     * `false` in the gallery grid: the code is a cropped preview and the tile's "Open in feed"
     * button is the keyboard target, so the frame is not a tab stop (its ring would be clipped).
     */
    codeFocusable?: boolean;
    eager?: boolean;
    exhibit?: GalleryExhibit;
    image?: string;
    imageAlt?: string;
    title: string;
  }>(),
  {
    autoplay: false,
    captionPlacement: 'inside',
    codeFocusable: true,
    eager: false,
    exhibit: undefined,
    image: undefined,
    imageAlt: undefined,
  }
);

const videoEl = ref<HTMLVideoElement | null>(null);
const kind = computed(() => props.exhibit?.kind ?? 'shell');
const hasDiagram = computed(() => props.exhibit?.kind === 'viz' && Boolean(props.exhibit.diagram));
const caption = computed(() => (props.exhibit && 'caption' in props.exhibit ? props.exhibit.caption : undefined));

watch(
  () => [props.autoplay, videoEl.value] as const,
  async ([shouldPlay, video]) => {
    if (!(video instanceof HTMLVideoElement)) {
      return;
    }
    if (shouldPlay) {
      try {
        await video.play();
      } catch {
        // Autoplay can be blocked; controls remain available.
      }
      return;
    }
    video.pause();
  }
);
</script>

<style lang="scss" scoped>
.gallery-exhibit {
  position: relative;
  display: grid;
  min-height: 16rem;
  // Clip media/shell only — code frames need a visible outward focus ring (2px offset).
  overflow: visible;
  background: color-mix(in srgb, var(--theme-surface-color) 70%, transparent);

  &:not([data-kind='code']) {
    overflow: hidden;
  }

  &__image,
  &__video {
    width: 100%;
    height: 100%;
    min-height: 16rem;
    object-fit: cover;
  }

  &__image {
    display: block;
  }

  // The video fills the exhibit (the gallery tile sizes the exhibit). UiImage's photo already
  // covers its frame — no reaching into it.
  video {
    min-height: 0;
    max-width: 100%;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__series {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 1.25rem;
    list-style: none;

    li {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      padding-block: 0.35rem;
      border-bottom: 1px solid var(--portfolio-rule-color, currentColor);
    }
  }

  &__caption,
  &__fallback {
    @include portfolio-type-meta;
    margin: 0;
    padding: 0.65rem 0.85rem;
    font-size: 0.85rem;
    letter-spacing: 0.02em;
  }

  // Over a photo / video the caption floats on a frosted chip at the bottom. Over text (series,
  // code, the fallback title) it would cover words, so there it takes its own row under the
  // content: when the exhibit's height is fixed, the content crops / scrolls above it, never it.
  &__caption {
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--theme-surface-color) 78%, transparent);
  }

  &:is([data-kind='code'], [data-kind='viz']) {
    grid-template-rows: minmax(0, 1fr) auto;
  }

  &:is([data-kind='media'], [data-kind='shell']) &__caption {
    position: absolute;
    inset: auto 0.65rem 0.65rem;
    backdrop-filter: blur(4px);
  }
}
</style>
