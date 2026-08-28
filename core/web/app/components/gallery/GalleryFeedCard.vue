<template lang="pug">
article.gallery-feed-card(:id="`post-${post.id}`", :data-kind="post.kind")
  header.gallery-feed-card__meta
    p.gallery-feed-card__kicker {{ post.categoryLabel }} · {{ post.type }}
    h2.gallery-feed-card__title {{ post.title }}
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
import type { GalleryPost } from '#shared/gallery-types';

defineProps<{
  autoplay?: boolean;
  eager?: boolean;
  post: GalleryPost;
}>();
</script>

<style lang="scss" scoped>
.gallery-feed-card {
  display: grid;
  gap: 0.85rem;
  min-height: min(78vh, 46rem);
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

  &__title,
  &__body p {
    margin: 0;
  }

  &__frame {
    min-height: min(58vh, 32rem);
    border-radius: 1.1rem;
    overflow: hidden;
  }

  &__body {
    display: grid;
    gap: 0.65rem;
  }

  &__link {
    justify-self: start;
  }
}
</style>
