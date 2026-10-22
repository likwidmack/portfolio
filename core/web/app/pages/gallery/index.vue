<template lang="pug">
.page-content.portfolio-page.gallery-page(data-fit="fluid")
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
    :total="posts.length",
    :matching="visiblePosts.length",
    :filtered="filtered",
    :noun="posts.length === 1 ? 'post' : 'posts'",
    view-label="View",
    group-label="Group",
    inline,
    kind-label="Filter",
    @clear="clearFilters"
  )

  //- A full-screen modal: the page behind is inert while it is open, Esc / "Back to grid" close it
  //- and focus returns to what opened it (the tile's "Open in feed" or the View control).
  section.gallery-feed(
    v-if="viewMode === 'feed'",
    ref="feedEl",
    role="dialog",
    aria-modal="true",
    aria-label="Gallery feed",
    tabindex="-1"
  )
    .gallery-feed__topbar
      //- Visible position updates on every scroll; it is announced once, on open (the sr-only region).
      span.gallery-feed__status Feed · {{ activePostIndex }} of {{ visiblePosts.length }}
      span.sr-only(aria-live="polite") {{ feedAnnouncement }}
      button.gallery-feed__back(ref="feedBack", type="button", aria-keyshortcuts="Escape", @click="closeFeed") Back to grid
    GalleryFeedCard(
      v-for="(post, index) in visiblePosts",
      :key="post.id",
      :post="post",
      :autoplay="activePostId === post.id",
      :eager="index < 2"
    )

  section.gallery-grid(v-else, aria-label="Social feed grid")
    article.gallery-grid__tile(
      v-for="tile in gridTiles",
      :key="tile.post.id",
      :class="{ 'gallery-grid__tile--on-view': specimenId === tile.post.id }",
      :data-aspect="tile.aspect"
    )
      .gallery-grid__media(:data-surface="tile.surface")
        //- Captions render in the meta below (never over the media or cropped by its box).
        //- Code is a cropped, non-focusable preview here: "Open in feed" is the tile's control.
        GalleryExhibit(
          :title="tile.post.title",
          :exhibit="tile.post.exhibit",
          :image="tile.post.image",
          :image-alt="tile.post.imageAlt",
          caption-placement="none",
          :code-focusable="false"
        )
      .gallery-grid__meta
        //- Chips sit in their own row under the media (not over it), so they never cover the
        //- exhibit caption, code or the label — loaded or not.
        .gallery-grid__chips
          span.gallery-grid__badge {{ tile.post.kind }}
          span.gallery-grid__platform {{ tile.platformLabel }}
        span.gallery-grid__label {{ tile.post.title }}
        p.gallery-grid__caption(v-if="tile.caption") {{ tile.caption }}
        span.gallery-grid__category {{ tile.post.categoryLabel }}
        span.gallery-grid__stats(v-if="tile.engagement") {{ tile.engagement }}
        button.gallery-grid__open(
          :id="tile.post.id",
          type="button",
          :tabindex="specimenId === tile.post.id ? 0 : undefined",
          :aria-label="`Open ${tile.post.title} in feed`",
          @click="openInFeed(tile.post.id)"
        ) Open in feed

  p(v-if="!visiblePosts.length") No posts match this filter.

  section#gallery-cta(aria-labelledby="gallery-cta-heading")
    p.eyebrow-container keep going
    h2#gallery-cta-heading {{ content.cta.heading }}
    p.lead {{ content.cta.lede }}
    .button-row
      UiButton(as="a", :href="contactMailto", icon="send", :label="content.cta.primaryLabel")
</template>

<script setup lang="ts">
import {
  filterGalleryPosts,
  flattenGalleryPosts,
  GALLERY_KIND_FILTERS,
  GALLERY_PLATFORM_LABEL,
  galleryEngagementLabel,
  galleryExhibitCaption,
  galleryTileSurface,
  resolveGalleryAspect,
  resolveGalleryPlatform,
  type GalleryContent,
  type GalleryFilterKind,
  type GalleryViewMode,
} from '#shared/gallery-types';
import { mailtoHref } from '#shared/site-person';

import { inertOutside } from '../../utils/inert-outside';

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
const scrollBehavior = computed(() => (reducedMotion.value ? 'instant' : 'smooth'));
const browse = useBrowseQuery({ view: 'grid', group: 'all', kind: 'all', query: '' });
const { filtered, clear: clearFilters } = browse;
const viewMode = computed<GalleryViewMode>({
  get: () => browse.view.value as GalleryViewMode,
  set: (value) => (browse.view.value = value),
});
const groupId = computed<string>({
  get: () => browse.group.value,
  set: (value) => (browse.group.value = value),
});
const kindId = computed<GalleryFilterKind>({
  get: () => browse.kind.value as GalleryFilterKind,
  set: (value) => (browse.kind.value = value),
});
const activePostId = ref<string>('');
const feedEl = ref<HTMLElement | null>(null);
const feedBack = ref<HTMLButtonElement | null>(null);
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
/** Faceted counts: each option counts posts it would show given the other facet's selection. */
const kindOptions = computed(() =>
  GALLERY_KIND_FILTERS.map((option) => ({
    ...option,
    count: filterGalleryPosts(posts.value, groupId.value, option.id as GalleryFilterKind).length,
  }))
);
const groupOptions = computed(() =>
  [
    { id: 'all', label: 'All' },
    ...content.value.categories.map((category) => ({ id: category.id, label: category.label })),
  ].map((option) => ({ ...option, count: filterGalleryPosts(posts.value, option.id, kindId.value).length }))
);
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
      caption: galleryExhibitCaption(post),
      surface: galleryTileSurface(post),
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
  feedOpener = document.getElementById(id);
  feedOpenerId = id;
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

// Feed dialog: inert background, focus in on open, Esc closes, focus back to the opener on close.
let feedOpener: HTMLElement | null = null;
// The grid is unmounted while the feed is open, so the opening tile is found again by id on close
// (not via `activePostId`, which the scroll observer moves to whichever card is most in view).
let feedOpenerId: string | null = null;
let restoreFeedInert: (() => void) | null = null;

function closeFeed(): void {
  viewMode.value = 'grid';
}

/** Set once per open (the visible status line updates on every scroll and is not live). */
const feedAnnouncement = ref('');

function onFeedKeydown(event: KeyboardEvent): void {
  // A control that used Esc itself (a video's fullscreen, an IME composition) keeps it.
  if (event.key !== 'Escape' || event.defaultPrevented || event.isComposing || viewMode.value !== 'feed') return;
  event.preventDefault();
  closeFeed();
}

function feedOpened(): void {
  const dialog = feedEl.value;
  if (!dialog || restoreFeedInert) return;
  restoreFeedInert = inertOutside(dialog);
  document.addEventListener('keydown', onFeedKeydown);
  // Keep the scroll position "Open in feed" set; the topbar button is sticky, so it is on screen.
  (feedBack.value ?? dialog).focus({ preventScroll: true });
  // After the observer has picked the post in view (polite: after the dialog name is read).
  window.setTimeout(() => {
    if (viewMode.value === 'feed') {
      feedAnnouncement.value = `Feed · post ${activePostIndex.value} of ${visiblePosts.value.length}. Escape returns to the grid.`;
    }
  }, 300);
}

function feedClosed(): void {
  restoreFeedInert?.();
  restoreFeedInert = null;
  document.removeEventListener('keydown', onFeedKeydown);
  feedAnnouncement.value = '';
  const opener = feedOpener;
  const openerId = feedOpenerId;
  feedOpener = null;
  feedOpenerId = null;
  nextTick(() => {
    // The opener (re-found by id when the grid re-rendered it), else the active post's tile
    // ("Open in feed"), else the View control.
    const target =
      (opener?.isConnected ? opener : null) ??
      (openerId ? document.getElementById(openerId) : null) ??
      (activePostId.value ? document.getElementById(activePostId.value) : null) ??
      document.querySelector<HTMLElement>(
        '.browse-toolbar__views [aria-pressed="true"], .browse-toolbar__views button'
      );
    target?.focus();
  });
}

// Pre-flush: the opener (a toolbar View button) still has focus when the view changes.
watch(viewMode, (next, prev) => {
  if (!import.meta.client || next === prev) return;
  if (next === 'feed') {
    const active = document.activeElement;
    if (!feedOpener && active instanceof HTMLElement && active !== document.body) feedOpener = active;
    nextTick(feedOpened);
  } else if (prev === 'feed') {
    feedClosed();
  }
});
// A direct visit to `?view=feed` opens the dialog on mount.
onMounted(() => {
  if (viewMode.value === 'feed') nextTick(feedOpened);
});

onBeforeUnmount(() => {
  restoreFeedInert?.();
  restoreFeedInert = null;
  if (import.meta.client) document.removeEventListener('keydown', onFeedKeydown);
  feedObserver?.disconnect();
  feedObserver = null;
  if (import.meta.client && bodyOverflowBeforeFeed !== null) {
    document.body.style.overflow = bodyOverflowBeforeFeed;
    bodyOverflowBeforeFeed = null;
  }
});
</script>

<style lang="scss" src="./index.scss" scoped></style>
