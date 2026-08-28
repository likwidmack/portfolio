<template lang="pug">
.page-content.portfolio-page.gallery-page(data-fit="screen")
  header.portfolio-hero
    p.eyebrow-container {{ content.hero.eyebrow }}
    h1 {{ content.hero.title }}
    p.lead {{ content.hero.lede }}

  AppBrowseToolbar(
    v-model:view="viewMode",
    v-model:group="groupId",
    v-model:kind="kindId",
    :views="viewOptions",
    :groups="groupOptions",
    :kinds="kindOptions",
    view-label="View",
    group-label="Group",
    kind-label="Filter"
  )
  p.gallery-page__count {{ visiblePosts.length }} {{ visiblePosts.length === 1 ? 'post' : 'posts' }}

  section.gallery-feed(v-if="viewMode === 'feed'", ref="feedEl", aria-label="Gallery feed", tabindex="0")
    GalleryFeedCard(
      v-for="(post, index) in visiblePosts",
      :key="post.id",
      :post="post",
      :autoplay="activePostId === post.id",
      :eager="index < 2"
    )

  section.gallery-grid(v-else, aria-label="Social feed grid")
    button.gallery-grid__tile(
      v-for="tile in gridTiles",
      :key="tile.post.id",
      type="button",
      :data-aspect="tile.aspect",
      :aria-label="`Open ${tile.post.title} in feed`",
      @click="openInFeed(tile.post.id)"
    )
      .gallery-grid__media
        GalleryExhibit(
          :title="tile.post.title",
          :exhibit="tile.post.exhibit",
          :image="tile.post.image",
          :image-alt="tile.post.imageAlt"
        )
        span.gallery-grid__platform {{ tile.platformLabel }}
      .gallery-grid__meta
        span.gallery-grid__label {{ tile.post.title }}
        span.gallery-grid__stats(v-if="tile.engagement") {{ tile.engagement }}

  p(v-if="!visiblePosts.length") No posts match this filter.

  section#gallery-cta(aria-labelledby="gallery-cta-heading")
    p.eyebrow-container keep going
    h2#gallery-cta-heading {{ content.cta.heading }}
    p.lead {{ content.cta.lede }}
    .button-row
      UiButton(as="a", :href="content.cta.primaryHref", icon="pi pi-send", :label="content.cta.primaryLabel")
</template>

<script setup lang="ts">
import {
  filterGalleryPosts,
  flattenGalleryPosts,
  GALLERY_KIND_FILTERS,
  GALLERY_PLATFORM_LABEL,
  galleryEngagementLabel,
  resolveGalleryAspect,
  resolveGalleryPlatform,
  type GalleryContent,
  type GalleryFilterKind,
  type GalleryViewMode,
} from '#shared/gallery-types';

definePageMeta({ breadcrumb: 'Gallery' });

const { data: galleryContent } = await useContentAsyncData('gallery-content', () =>
  fetchContentCollection<GalleryContent>('gallery', { mode: 'first' })
);

if (!galleryContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Gallery content not found' });
}

const content = computed(() => galleryContent.value as GalleryContent);
const posts = computed(() => flattenGalleryPosts(content.value));
const viewMode = ref<GalleryViewMode>('grid');
const groupId = ref('all');
const kindId = ref<GalleryFilterKind>('all');
const activePostId = ref<string>('');
const feedEl = ref<HTMLElement | null>(null);

const viewOptions = [
  { id: 'grid', label: 'Grid' },
  { id: 'feed', label: 'Feed' },
];
const kindOptions = GALLERY_KIND_FILTERS;
const groupOptions = computed(() => [
  { id: 'all', label: 'All' },
  ...content.value.categories.map((category) => ({ id: category.id, label: category.label })),
]);
const visiblePosts = computed(() => filterGalleryPosts(posts.value, groupId.value, kindId.value));

/**
 * Precompute grid tile fields in script. Template-only imports of these helpers are
 * dropped by `<script setup>` unused-import elision when the template is Pug, which
 * leaves `_ctx.resolveGalleryAspect` undefined at render (see GalleryFeedCard).
 */
const gridTiles = computed(() =>
  visiblePosts.value.map((post) => {
    const platform = resolveGalleryPlatform(post);
    return {
      aspect: resolveGalleryAspect(post),
      engagement: galleryEngagementLabel(post),
      platformLabel: GALLERY_PLATFORM_LABEL[platform],
      post,
    };
  })
);
usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/gallery',
});

function openInFeed(id: string): void {
  viewMode.value = 'feed';
  nextTick(() => {
    document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    activePostId.value = id;
  });
}

let feedObserver: IntersectionObserver | null = null;

function observeFeed(): void {
  feedObserver?.disconnect();
  feedObserver = null;
  if (!import.meta.client || viewMode.value !== 'feed') {
    return;
  }
  const root = feedEl.value;
  const cards = root?.querySelectorAll('article[id^="post-"]') ?? [];
  if (!cards.length) {
    return;
  }
  feedObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const id = visible?.target instanceof HTMLElement ? visible.target.id.replace(/^post-/, '') : '';
      if (id) {
        activePostId.value = id;
      }
    },
    { root: null, threshold: [0.45, 0.7] }
  );
  for (const card of cards) {
    feedObserver.observe(card);
  }
}

onMounted(observeFeed);
watch([viewMode, visiblePosts], () => {
  if (import.meta.client) {
    nextTick(observeFeed);
  }
});
onBeforeUnmount(() => {
  feedObserver?.disconnect();
  feedObserver = null;
});
</script>

<style lang="scss" scoped>
.gallery-page {
  display: grid;
  gap: var(--section-gap, 2rem);
  width: 100%;
}

.gallery-feed {
  display: grid;
  gap: 2rem;
  width: 100%;
  max-width: none;
  min-height: max(24rem, calc(var(--page-fill-min, 100dvh) * 0.7));
  scroll-snap-type: y proximity;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
  gap: 0.75rem;
  width: 100%;

  &__tile {
    display: grid;
    grid-template-rows: minmax(0, 1fr) auto;
    padding: 0;
    border: 1px solid var(--border-color, var(--portfolio-rule));
    border-radius: var(--border-radius-md, 0.75rem);
    background: var(--surface-color, var(--main-background-secondary));
    color: inherit;
    cursor: pointer;
    text-align: left;
    min-width: 0;
    max-width: 100%;
    overflow: hidden;

    &[data-aspect='tall'] {
      aspect-ratio: 9 / 16;
    }

    &[data-aspect='wide'] {
      aspect-ratio: 16 / 10;
    }

    &[data-aspect='square'] {
      aspect-ratio: 1 / 1;
    }

    &:hover .gallery-grid__platform,
    &:focus-visible .gallery-grid__platform {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }

    &:focus-visible {
      outline: 2px solid var(--focus-ring, var(--primary-color));
      outline-offset: 2px;
    }
  }

  &__media {
    position: relative;
    min-height: 0;
    overflow: hidden;
  }

  &__media :deep(img),
  &__media :deep(video),
  &__media :deep(.gallery-exhibit) {
    min-height: 0;
    max-width: 100%;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__platform {
    position: absolute;
    left: 0.55rem;
    bottom: 0.55rem;
    z-index: 1;
    display: inline-flex;
    padding: 0.2rem 0.5rem;
    border: 1px solid color-mix(in srgb, var(--text-color) 35%, transparent);
    border-radius: var(--border-radius-pill, 999px);
    background: color-mix(in srgb, var(--main-background) 78%, transparent);
    color: var(--text-color);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  &__meta {
    display: grid;
    gap: 0.2rem;
    padding: 0.55rem 0.65rem 0.7rem;
    min-width: 0;
  }

  &__label {
    font-size: 0.85rem;
    font-weight: 600;
    min-width: 0;
    overflow-wrap: anywhere;
  }

  &__stats {
    color: var(--portfolio-teal);
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.03em;
  }

  @media (min-width: $breakpoint-tablet) {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
  }

  @media (orientation: landscape) and (min-width: $breakpoint-standard) {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr));
  }
}

.gallery-page__count {
  margin: 0 0 1rem;
  color: var(--text-color-secondary, inherit);
  font-size: 0.85rem;
}
</style>
