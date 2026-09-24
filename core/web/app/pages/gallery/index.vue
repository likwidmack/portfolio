<template lang="pug">
.page-content.portfolio-page.gallery-page(data-fit="screen")
  AppDepthField(:seed="31", :particle-count="110")
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
    .gallery-feed__topbar
      span.gallery-feed__status Feed · {{ activePostIndex }} of {{ visiblePosts.length }}
      button.gallery-feed__back(type="button", @click="viewMode = 'grid'") Back to grid
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
      :id="tile.post.id",
      :key="tile.post.id",
      type="button",
      :class="{ 'gallery-grid__tile--on-view': specimenId === tile.post.id }",
      :tabindex="specimenId === tile.post.id ? 0 : undefined",
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
        span.gallery-grid__badge {{ tile.post.kind }}
        span.gallery-grid__platform {{ tile.platformLabel }}
      .gallery-grid__meta
        span.gallery-grid__label {{ tile.post.title }}
        span.gallery-grid__category {{ tile.post.categoryLabel }}
        span.gallery-grid__stats(v-if="tile.engagement") {{ tile.engagement }}

  p(v-if="!visiblePosts.length") No posts match this filter.

  section#gallery-cta(aria-labelledby="gallery-cta-heading")
    p.eyebrow-container keep going
    h2#gallery-cta-heading {{ content.cta.heading }}
    p.lead {{ content.cta.lede }}
    .button-row
      UiButton(as="a", :href="contactMailto", icon="pi pi-send", :label="content.cta.primaryLabel")
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
import { mailtoHref } from '#shared/site-person';

definePageMeta({ breadcrumb: 'Gallery' });

const { profile } = useSiteProfile();
const contactMailto = computed(() => mailtoHref(profile.value.contact.email));

const { data: galleryContent } = await useContentAsyncData('gallery-content', () =>
  fetchContentCollection<GalleryContent>('gallery', { mode: 'first' })
);

if (!galleryContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Gallery content not found' });
}

const content = computed(() => galleryContent.value as GalleryContent);
const posts = computed(() => flattenGalleryPosts(content.value));
const route = useRoute();
const reducedMotion = usePrefersReducedMotion();
const scrollBehavior = computed(() => (reducedMotion.value ? 'auto' : 'smooth'));
const viewMode = ref<GalleryViewMode>('grid');
const groupId = ref('all');
const kindId = ref<GalleryFilterKind>('all');
const activePostId = ref<string>('');
const feedEl = ref<HTMLElement | null>(null);
const specimenId = computed(() => {
  const raw = route.query.specimen;
  const id = Array.isArray(raw) ? raw[0] : raw;
  if (!id) return '';
  return posts.value.some((post) => post.id === id) ? id : '';
});

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
const activePostIndex = computed(() => {
  if (!visiblePosts.value.length) return 0;
  const index = visiblePosts.value.findIndex((post) => post.id === activePostId.value);
  return index === -1 ? 1 : index + 1;
});

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
    document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: scrollBehavior.value, block: 'start' });
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
    { root, threshold: [0.45, 0.7] }
  );
  for (const card of cards) {
    feedObserver.observe(card);
  }
}

onMounted(observeFeed);
watch(
  specimenId,
  (id) => {
    if (!import.meta.client || !id) return;
    viewMode.value = 'grid';
    nextTick(() => {
      const tile = document.getElementById(id);
      tile?.focus();
      tile?.scrollIntoView({ behavior: scrollBehavior.value, block: 'center' });
    });
  },
  { immediate: true }
);
watch([viewMode, visiblePosts], () => {
  if (import.meta.client) {
    nextTick(observeFeed);
  }
});

// Feed is a full-screen takeover (like the grid tiles' "open in feed" affordance) —
// lock body scroll behind it so the page doesn't scroll along with the overlay.
let bodyOverflowBeforeFeed: string | null = null;
watch(
  viewMode,
  (next, prev) => {
    if (!import.meta.client) return;

    if (next === 'feed') {
      if (bodyOverflowBeforeFeed === null) bodyOverflowBeforeFeed = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return;
    }

    if (prev === 'feed' && bodyOverflowBeforeFeed !== null) {
      document.body.style.overflow = bodyOverflowBeforeFeed;
      bodyOverflowBeforeFeed = null;
    }
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  feedObserver?.disconnect();
  feedObserver = null;
  if (import.meta.client && bodyOverflowBeforeFeed !== null) {
    document.body.style.overflow = bodyOverflowBeforeFeed;
    bodyOverflowBeforeFeed = null;
  }
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
