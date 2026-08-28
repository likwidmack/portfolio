<template lang="pug">
.page-content.portfolio-page.gallery-page
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

  section.gallery-grid(v-else, aria-label="Gallery grid")
    button.gallery-grid__tile(
      v-for="post in visiblePosts",
      :key="post.id",
      type="button",
      :aria-label="`Open ${post.title} in feed`",
      @click="openInFeed(post.id)"
    )
      GalleryExhibit(:title="post.title", :exhibit="post.exhibit", :image="post.image", :image-alt="post.imageAlt")
      span.gallery-grid__label {{ post.title }}

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
const viewMode = ref<GalleryViewMode>('feed');
const groupId = ref('all');
const kindId = ref<GalleryFilterKind>('all');
const activePostId = ref<string>('');
const feedEl = ref<HTMLElement | null>(null);

const viewOptions = [
  { id: 'feed', label: 'Feed' },
  { id: 'grid', label: 'Grid' },
];
const kindOptions = GALLERY_KIND_FILTERS;
const groupOptions = computed(() => [
  { id: 'all', label: 'All' },
  ...content.value.categories.map((category) => ({ id: category.id, label: category.label })),
]);
const visiblePosts = computed(() => filterGalleryPosts(posts.value, groupId.value, kindId.value));

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
}

.gallery-feed {
  display: grid;
  gap: 2rem;
  max-width: 32rem;
  scroll-snap-type: y proximity;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 11rem), 1fr));
  gap: 0.65rem;

  &__tile {
    display: grid;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  &__label {
    padding: 0.45rem 0.15rem 0.7rem;
    font-size: 0.85rem;
  }
}

.gallery-page__count {
  margin: 0 0 1rem;
  color: var(--text-color-secondary, inherit);
  font-size: 0.85rem;
}
</style>
