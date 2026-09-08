<template lang="pug">
.page-content.portfolio-page.gallery-spatial(data-fit="screen")
  .depth-field-viewport(aria-hidden="true")
    .depth-field-stage(ref="fieldStage")
      .haze-plane(
        v-for="(plane, i) in planes",
        :key="'plane-' + i",
        :style="{ left: plane.x + '%', top: plane.y + '%', width: plane.w + 'px', height: plane.h + 'px', marginLeft: -plane.w / 2 + 'px', marginTop: -plane.h / 2 + 'px', background: `radial-gradient(closest-side, ${plane.c} 0%, rgba(20,9,12,0) 72%)`, filter: `blur(${plane.blur}px)`, opacity: plane.o, transform: `translateZ(${plane.z}px)`, animation: `hazePulse ${13 + i * 4}s ease-in-out ${i * -3}s infinite` }"
      )
      .particle-node(v-for="(p, i) in particles", :key="'p-' + i", :style="{ left: p.x, top: p.y }")
        span.particle-dot(
          :style="{ width: p.size + 'px', height: p.size + 'px', background: p.color, boxShadow: p.shadow, filter: p.blur, animation: `zApproach ${p.dur} linear ${p.delay} infinite` }"
        )
  .depth-field-vignette(aria-hidden="true")

  header.gallery-hero
    p.hero-eyebrow {{ content.hero.eyebrow }}
    h1.hero-title {{ content.hero.title }}
    p.hero-tagline {{ content.hero.lede }}

  .filter-bar
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
    .filter-bar__mobile
      label.mobile-select
        span Group
        select(v-model="groupId", aria-label="Filter by group")
          option(v-for="g in groupOptions", :key="g.id", :value="g.id") {{ g.label }}
      label.mobile-select
        span Filter
        select(v-model="kindId", aria-label="Filter by medium")
          option(v-for="k in kindOptions", :key="k.id", :value="k.id") {{ k.label }}
    span.count {{ visiblePosts.length }} {{ visiblePosts.length === 1 ? 'exhibit' : 'exhibits' }}

  section.grid-view(v-if="viewMode === 'grid'", aria-label="Social feed grid")
    .tile-grid
      button.tile(
        v-for="tile in gridTiles",
        :key="tile.post.id",
        type="button",
        :class="`tile--${tile.aspect}`",
        :aria-label="`Open ${tile.post.title} in feed`",
        @click="openInFeed(tile.post.id)"
      )
        GalleryExhibit.tile-media(
          :title="tile.post.title",
          :exhibit="tile.post.exhibit",
          :image="tile.post.image",
          :image-alt="tile.post.imageAlt"
        )
        span.tile-badge {{ tile.post.kind }}
        span.tile-platform {{ tile.platformLabel }}
        .tile-scrim
          p.tile-title {{ tile.post.title }}
          p.tile-meta(:class="{ 'tile-meta--stat': tile.engagement }") {{ tile.engagement || tile.post.categoryLabel }}

  section.feed-view(v-else, ref="feedEl", aria-label="Gallery feed", tabindex="0")
    .feed-topbar
      span.feed-status Feed · {{ visiblePosts.length }} {{ visiblePosts.length === 1 ? 'post' : 'posts' }}
      button.feed-back(type="button", @click="viewMode = 'grid'") Back to grid
    GalleryFeedCard.feed-post(
      v-for="(post, index) in visiblePosts",
      :key="post.id",
      :post="post",
      :autoplay="activePostId === post.id",
      :eager="index < 2"
    )

  p.empty-note(v-if="!visiblePosts.length") No posts match this filter.

  section.gallery-cta(aria-labelledby="gallery-cta-heading")
    p.section-eyebrow keep going
    h2#gallery-cta-heading.section-title {{ content.cta.heading }}
    p.section-summary {{ content.cta.lede }}
    a.btn-primary(:href="content.cta.primaryHref") {{ content.cta.primaryLabel }}
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
useSpatialPageChrome('gallery', { forceDark: true });

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

/* ------------------------------------------------------------------ *
 * Parallax depth field (dark-only spatial design — see the Claude
 * Design handoff; Gallery does not ship a light variant).
 * ------------------------------------------------------------------ */
const fieldStage = ref<HTMLElement | null>(null);

interface Plane {
  z: number;
  w: number;
  h: number;
  x: number;
  y: number;
  c: string;
  blur: number;
  o: number;
}
interface Particle {
  x: string;
  y: string;
  size: number;
  dur: string;
  delay: string;
  color: string;
  shadow: string;
  blur: string;
}

const planes: Plane[] = [
  { z: -1650, w: 2600, h: 1700, x: 62, y: 4, c: '#63202F', blur: 130, o: 0.8 },
  { z: -1050, w: 1700, h: 1250, x: 6, y: 34, c: '#3A1220', blur: 100, o: 0.72 },
  { z: -520, w: 1200, h: 900, x: 78, y: 58, c: '#2B0E17', blur: 76, o: 0.6 },
  { z: -170, w: 900, h: 700, x: 24, y: 86, c: '#220B12', blur: 60, o: 0.5 },
];

const generateParticles = (count = 110, initialSeed = 31): Particle[] => {
  let seed = initialSeed;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const items: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const near = rand();
    const size = 1.6 + near * 3.4;
    const dur = (26 - near * 13).toFixed(1);
    items.push({
      x: (rand() * 100).toFixed(2) + '%',
      y: (rand() * 100).toFixed(2) + '%',
      size,
      dur: `${dur}s`,
      delay: `${(-rand() * parseFloat(dur)).toFixed(1)}s`,
      color: near > 0.78 ? '#F0879A' : near > 0.4 ? '#E8697C' : '#F3E7E4',
      shadow: near > 0.78 ? '0 0 10px rgba(232,105,124,.7)' : 'none',
      blur: near < 0.3 ? 'blur(1.4px)' : 'none',
    });
  }
  return items;
};
const particles = generateParticles(110, 31);

const onFieldMove = (e: PointerEvent) => {
  const stage = fieldStage.value;
  if (!stage) return;
  const dx = e.clientX / window.innerWidth - 0.5;
  const dy = e.clientY / window.innerHeight - 0.5;
  stage.style.transform =
    `translate3d(${(-dx * 46).toFixed(1)}px, ${(-dy * 32).toFixed(1)}px, 0) ` +
    `rotateY(${(-dx * 3.2).toFixed(2)}deg) rotateX(${(dy * 2.4).toFixed(2)}deg)`;
};

onMounted(() => {
  if (!import.meta.client) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (!reduced) window.addEventListener('pointermove', onFieldMove);
});
onBeforeUnmount(() => {
  if (import.meta.client) window.removeEventListener('pointermove', onFieldMove);
});
</script>

<style lang="scss" scoped>
@use '../../../assets/css/spatial-tokens' as t;
@use '../../../assets/css/spatial-shared' as s;

.gallery-spatial[data-fit='screen'] {
  max-width: none;
  padding-inline: 0;
}
.gallery-spatial {
  @include s.root-surface;
}

@include s.depth-field;
@include s.section-type;
@include s.buttons;

.gallery-hero {
  position: relative;
  z-index: 10;
  padding: 172px t.$pad-x 0;
  .hero-eyebrow {
    margin: 0 0 22px;
    font-family: t.$mono;
    font-size: t.$fs-eyebrow;
    letter-spacing: t.$track-section;
    text-transform: uppercase;
    color: t.$rose;
  }
  .hero-title {
    margin: 0;
    max-width: 1180px;
    font-family: t.$mono;
    font-weight: 600;
    font-size: 60px;
    line-height: 1.06;
    letter-spacing: -0.05em;
    color: t.$ink-strong;
    text-shadow: t.$shadow-text;
    text-wrap: pretty;
  }
  .hero-tagline {
    margin: 32px 0 0;
    max-width: 740px;
    font-size: 17px;
    line-height: 1.6;
    color: t.$ink-muted;
    text-wrap: pretty;
  }
}

.filter-bar {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
  margin: 60px t.$pad-x 0;
  padding: 14px 18px;
  background: rgba(30, 16, 19, 0.72);
  border: 1px solid t.$border-card;
  border-radius: t.$radius-card;
  backdrop-filter: blur(16px);
  box-shadow: 0 26px 60px -30px rgba(0, 0, 0, 0.9);

  :deep(.browse-toolbar) {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin: 0;
  }

  :deep(.browse-toolbar__views) {
    padding: 4px;
    background: rgba(20, 9, 12, 0.7);
    border: 1px solid t.$border;
    border-radius: t.$radius;
  }

  :deep(.browse-toolbar__views button) {
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 9px 18px;
    border-radius: t.$radius;
    border: 1px solid transparent;
    background: none;
    color: t.$ink-subtle;

    &[data-state='active'] {
      border-color: rgba(220, 66, 86, 0.5);
      background: t.$crimson;
      color: t.$bg;
    }
  }

  :deep(.browse-toolbar__groups),
  :deep(.browse-toolbar__kinds) {
    gap: 8px;
  }

  :deep(.browse-toolbar__groups button),
  :deep(.browse-toolbar__kinds button) {
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.1em;
    padding: 9px 14px;
    border-radius: t.$radius;
    border: 1px solid t.$border-input;
    background: none;
    color: t.$ink-muted;

    &:hover {
      border-color: t.$border-hover;
      color: t.$ink-strong;
    }

    &[data-state='active'] {
      background: rgba(220, 66, 86, 0.16);
      border-color: t.$border-accent-hover;
      color: t.$rose-bright;
    }
  }

  &__mobile {
    display: none;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .mobile-select {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    font-family: t.$mono;
    font-size: t.$fs-eyebrow;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: t.$ink-subtle;

    select {
      flex: 1;
      min-width: 0;
      font-family: t.$mono;
      font-size: 12px;
      letter-spacing: 0.06em;
      padding: 10px 12px;
      border-radius: t.$radius;
      background: rgba(20, 9, 12, 0.7);
      border: 1px solid t.$border-input;
      color: t.$ink;
    }
  }

  .count {
    margin-left: auto;
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$ink-subtle;
  }
}

.grid-view {
  position: relative;
  z-index: 10;
  padding: 44px 0 0;
}
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 20px;
  padding: 0 t.$pad-x;
}

.tile {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  background: t.$panel;
  border: 1px solid t.$border;
  border-radius: t.$radius-card;
  overflow: hidden;
  box-shadow: 0 30px 70px -34px rgba(0, 0, 0, 0.9);
  transition: border-color 0.2s ease;
  cursor: pointer;
  text-align: left;
  color: inherit;
  font: inherit;

  &:hover,
  &:focus-visible {
    border-color: t.$border-accent-hover;
  }
  &:focus-visible {
    outline: 2px solid t.$rose;
    outline-offset: 2px;
  }

  &--tall {
    aspect-ratio: 9 / 16;
    grid-row: span 2;
  }
  &--square {
    aspect-ratio: 1 / 1;
  }
  &--wide {
    aspect-ratio: 16 / 9;
    grid-column: span 2;
  }

  .tile-media {
    position: absolute;
    inset: 0;
    min-height: 0;
  }
  :deep(.tile-media img),
  :deep(.tile-media video),
  :deep(.tile-media .gallery-exhibit) {
    width: 100%;
    height: 100%;
    min-height: 0;
    object-fit: cover;
    opacity: 0.86;
  }
  // Beat the child component's own `min-height: 16rem` (meant for a standalone
  // exhibit, not a small aspect-ratio-locked tile) with a same-file, higher-specificity rule.
  :deep(.gallery-exhibit__image),
  :deep(.gallery-exhibit__video),
  :deep(.gallery-exhibit) {
    min-height: 0;
  }

  .tile-badge {
    position: absolute;
    z-index: 1;
    top: 14px;
    left: 14px;
    font-family: t.$mono;
    font-size: 9px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: t.$bg;
    background: t.$crimson;
    padding: 5px 9px;
    border-radius: t.$radius;
  }
  .tile-platform {
    position: absolute;
    z-index: 1;
    left: 14px;
    bottom: 14px;
    display: inline-flex;
    padding: 0.2rem 0.5rem;
    border: 1px solid t.$border-input;
    border-radius: 999px;
    background: rgba(20, 9, 12, 0.7);
    font-family: t.$mono;
    font-size: 9px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: t.$ink;
  }
  .tile-scrim {
    position: absolute;
    z-index: 1;
    inset: auto 0 0 0;
    padding: 20px 16px 16px;
    background: linear-gradient(180deg, rgba(20, 9, 12, 0) 0%, rgba(20, 9, 12, 0.94) 60%);
  }
  &--wide .tile-scrim {
    padding: 26px 20px 18px;
  }
  .tile-title {
    margin: 0 0 8px;
    font-family: t.$mono;
    font-size: 15px;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: t.$ink-strong;
    text-wrap: pretty;
  }
  &--wide .tile-title {
    font-size: 19px;
    line-height: 1.2;
    letter-spacing: -0.025em;
  }
  .tile-meta {
    margin: 0;
    font-family: t.$mono;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: t.$ink-subtle;
    &--stat {
      color: var(--portfolio-teal);
    }
  }
}

.feed-view {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  background: t.$bg;
  padding: 0;

  .feed-topbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 70;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 18px 32px;
    background: rgba(20, 9, 12, 0.86);
    border-bottom: 1px solid t.$border-card;
    backdrop-filter: blur(18px);
  }
  .feed-status {
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$ink-subtle;
  }
  .feed-back {
    margin-left: auto;
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    padding: 10px 18px;
    border-radius: t.$radius;
    border: 1px solid t.$border-hover;
    background: t.$wash-ink;
    color: t.$ink;
    cursor: pointer;
  }

  :deep(.feed-post) {
    scroll-margin-top: 0;
    padding: 100px 32px 36px;
    min-height: 100vh;
    background: t.$panel-dark;
  }
  :deep(.gallery-feed-card__platform) {
    border-color: t.$border-input;
  }
  :deep(.gallery-feed-card__title) {
    font-family: t.$mono;
    font-weight: 500;
    color: t.$ink-strong;
  }
  :deep(.gallery-feed-card__body p) {
    color: t.$ink-lead;
  }
  :deep(.tag-list li) {
    @include s.tag-face;
    color: t.$ink-dim;
    border-color: t.$border-input;
  }
  :deep(.gallery-feed-card__link) {
    @include s.story-link-face;
  }
}

.empty-note {
  position: relative;
  z-index: 10;
  padding: 40px t.$pad-x 0;
  color: t.$ink-dim;
}

.gallery-cta {
  position: relative;
  z-index: 10;
  margin: t.$section-pad-tight t.$pad-x t.$section-pad;
  padding: 64px t.$pad-x;
  background: t.$card-gradient-solid;
  border: 1px solid t.$border-accent;
  border-radius: t.$radius-card;
  box-shadow: t.$shadow-panel;

  .section-summary {
    margin-bottom: 32px;
  }
}

@media (max-width: 900px) {
  .feed-view :deep(.feed-post) {
    padding-top: 90px;
  }
}
@media (max-width: 768px) {
  .filter-bar {
    :deep(.browse-toolbar__groups),
    :deep(.browse-toolbar__kinds) {
      display: none;
    }
    &__mobile {
      display: flex;
    }
    .count {
      margin-left: 0;
      width: 100%;
      order: 3;
    }
  }
  .tile-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .tile-grid {
    grid-template-columns: 1fr;
  }
  .tile--tall,
  .tile--wide {
    grid-row: auto;
    grid-column: auto;
    aspect-ratio: 4 / 5;
  }
}

@include s.depth-keyframes;
</style>
