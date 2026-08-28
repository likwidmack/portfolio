<template lang="pug">
article.gallery-feed-card(
  :id="`post-${post.id}`",
  :data-kind="post.kind",
  :data-platform="platform",
  :data-aspect="aspect"
)
  header.gallery-feed-card__meta
    p.gallery-feed-card__kicker
      span.gallery-feed-card__platform {{ platformLabel }}
      span(aria-hidden="true") ·
      span {{ post.type }}
    h2.gallery-feed-card__title {{ post.title }}
    p.gallery-feed-card__stats(v-if="engagement") {{ engagement }}
  GalleryExhibit.gallery-feed-card__frame(
    :title="post.title",
    :exhibit="post.exhibit",
    :image="post.image",
    :image-alt="post.imageAlt",
    :autoplay="autoplay",
    :eager="eager"
  )
  .gallery-feed-card__body
    p {{ post.summary }}
    p.gallery-feed-card__role(v-if="post.role") {{ post.role }}
    ul.tag-list(v-if="post.stack?.length", aria-label="Stack")
      li(v-for="item in post.stack", :key="item") {{ item }}
    NuxtLink.gallery-feed-card__link(v-if="post.href", :to="post.href") {{ post.hrefLabel || 'Open related' }}
</template>

<script setup lang="ts">
import {
  GALLERY_PLATFORM_LABEL,
  galleryEngagementLabel,
  resolveGalleryAspect,
  resolveGalleryPlatform,
  type GalleryPost,
} from '#shared/gallery-types';

const props = defineProps<{
  autoplay?: boolean;
  eager?: boolean;
  post: GalleryPost;
}>();

const platform = computed(() => resolveGalleryPlatform(props.post));
const aspect = computed(() => resolveGalleryAspect(props.post));
const platformLabel = computed(() => GALLERY_PLATFORM_LABEL[platform.value]);
const engagement = computed(() => galleryEngagementLabel(props.post));
</script>

<style lang="scss" scoped>
.gallery-feed-card {
  display: grid;
  gap: 0.85rem;
  min-height: 0;
  max-width: 100%;
  padding-bottom: 1.5rem;
  scroll-snap-align: start;

  &__kicker,
  &__role {
    margin: 0;
    color: var(--text-color-secondary, inherit);
    font-size: 0.8rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__kicker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
  }

  &__platform {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--border-color, currentColor);
    border-radius: var(--border-radius-pill, 999px);
    color: var(--text-color);
    letter-spacing: 0.08em;
  }

  &__stats {
    margin: 0.25rem 0 0;
    color: var(--portfolio-teal);
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.04em;
  }

  &__title,
  &__body p {
    margin: 0;
    overflow-wrap: anywhere;
  }

  &__frame {
    min-height: min(42vh, 24rem);
    max-width: 100%;
    aspect-ratio: var(--media-ratio, 16 / 9);
    border-radius: 1.1rem;
    overflow: hidden;
  }

  &[data-aspect='tall'] &__frame {
    aspect-ratio: 9 / 16;
    max-width: min(100%, 22rem);
    justify-self: start;
  }

  &[data-aspect='square'] &__frame {
    aspect-ratio: 1 / 1;
  }

  &[data-aspect='wide'] &__frame {
    aspect-ratio: 16 / 9;
  }

  &__body {
    display: grid;
    gap: 0.65rem;
    min-width: 0;
  }

  &__link {
    justify-self: start;
  }

  @media (orientation: landscape) and (min-width: $breakpoint-tablet) {
    grid-template-columns: minmax(0, 1.45fr) minmax(0, 0.85fr);
    grid-template-areas:
      'frame meta'
      'frame body';
    align-items: stretch;
    min-height: 0;
    gap: 1.25rem;
    padding-bottom: 0;

    .gallery-feed-card__meta {
      grid-area: meta;
      min-width: 0;
    }

    .gallery-feed-card__frame {
      grid-area: frame;
      min-height: 0;
      height: 100%;
      aspect-ratio: unset;
      max-width: 100%;
    }

    .gallery-feed-card__body {
      grid-area: body;
      min-width: 0;
    }
  }
}
</style>
