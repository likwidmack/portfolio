<template lang="pug">
.gallery-exhibit(:data-kind="kind")
  template(v-if="exhibit?.kind === 'code'")
    UiCodeBlock(
      :code="exhibit.source",
      :language="exhibit.language",
      :line-numbers="exhibit.lineNumbers !== false",
      :aria-label="exhibit.filename || title"
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
    NuxtImg.gallery-exhibit__image(
      :src="exhibit.src",
      :alt="exhibit.alt || title",
      width="720",
      height="900",
      :loading="eager ? 'eager' : 'lazy'",
      sizes="xs:100vw md:420px"
    )
  template(v-else-if="exhibit?.kind === 'viz' && exhibit.diagram")
    AppArchitectureDiagram(
      :caption="exhibit.caption",
      :aria-label="exhibit.diagram.ariaLabel || title",
      :groups="exhibit.diagram.groups",
      :nodes="exhibit.diagram.nodes",
      :edges="exhibit.diagram.edges"
    )
  ul.gallery-exhibit__series(v-else-if="exhibit?.kind === 'viz' && exhibit.series", aria-label="Series")
    li(v-for="point in exhibit.series", :key="point.label")
      span {{ point.label }}
      strong {{ point.value }}
  NuxtImg.gallery-exhibit__image(
    v-else-if="image",
    :src="image",
    :alt="imageAlt || title",
    width="720",
    height="900",
    loading="lazy"
  )
  p.gallery-exhibit__fallback(v-else) {{ title }}
  p.gallery-exhibit__caption(v-if="caption") {{ caption }}
</template>

<script setup lang="ts">
import type { GalleryExhibit } from '#shared/gallery-types';

const props = withDefaults(
  defineProps<{
    autoplay?: boolean;
    eager?: boolean;
    exhibit?: GalleryExhibit;
    image?: string;
    imageAlt?: string;
    title: string;
  }>(),
  {
    autoplay: false,
    eager: false,
    exhibit: undefined,
    image: undefined,
    imageAlt: undefined,
  }
);

const videoEl = ref<HTMLVideoElement | null>(null);
const kind = computed(() => props.exhibit?.kind ?? 'shell');
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
  overflow: hidden;
  background: color-mix(in srgb, var(--surface-color) 70%, transparent);

  &__image,
  &__video {
    width: 100%;
    height: 100%;
    min-height: 16rem;
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
      border-bottom: 1px solid var(--portfolio-rule, currentColor);
    }
  }

  &__caption,
  &__fallback {
    margin: 0;
    padding: 0.65rem 0.85rem;
    font-size: 0.85rem;
  }

  &__caption {
    position: absolute;
    inset: auto 0.65rem 0.65rem;
    border-radius: 0.55rem;
    background: color-mix(in srgb, var(--surface-color) 78%, transparent);
    backdrop-filter: blur(4px);
  }
}
</style>
