<template lang="pug">
.page-content.portfolio-page.work-spatial(data-fit="screen")
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

  header.work-hero
    p.hero-eyebrow Selected work
    h1.hero-title Proof-led stories
    p.hero-tagline Shipped media engineering, spatial prototypes, data visualization, experience systems, and human-controlled AI — each connected to inspectable artifacts.
    button.btn-outline(
      type="button",
      aria-label="Browse code, data, and styles evidence examples",
      @click="evidenceOpen = true"
    ) Browse evidence examples

  nav.jump-bar(aria-label="Jump to a case study")
    span.jump-label Jump to
    a.jump-link(v-for="study in studies", :key="study.slug", :href="`#study-${study.slug}`") {{ study.title }}

  section.work-list(aria-label="Case studies")
    article.work-card(v-for="(study, i) in workCards", :key="study.study.slug", :id="`study-${study.study.slug}`")
      img.card-media(v-if="study.media", :src="study.media.src", :alt="study.media.alt")
      .card-media.card-media--placeholder(v-else, :style="{ background: gradient(i) }")
        span.media-label PLACEHOLDER
      .card-body
        .card-topline
          p.card-category {{ study.study.category }}
          span.card-index {{ study.index }}
        h2.card-title
          NuxtLink(:to="`/work/${study.study.slug}`", @click="trackWorkView(study.study.slug)") {{ study.study.title }}
        p.card-abstract {{ study.study.summary }}
        .card-meta
          p.meta-block
            span.meta-label Role
            | {{ study.study.role }}
          p.meta-block
            span.meta-label Evidence
            | {{ study.study.evidence[0]?.value }}
        .card-footer
          span.tag(v-for="t in study.study.technologies.slice(0, 4)", :key="t") {{ t }}
          NuxtLink.story-link(:to="`/work/${study.study.slug}`", @click="trackWorkView(study.study.slug)") Read the story ↗

  .page-with-nav.work-related
    AppWorkSubNav

  AppEvidenceExamplesDialog(v-model:visible="evidenceOpen")
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';
import { getCaseStudyCardMedia, sortCaseStudies } from '#shared/portfolio-types';

definePageMeta({ breadcrumb: 'Work' });
useSpatialPageChrome('work', { forceDark: true });

const evidenceOpen = ref(false);
const { data } = await useContentAsyncData('case-studies', () =>
  fetchContentCollection<CaseStudy[]>('caseStudies', { mode: 'all' })
);
const studies = computed(() => sortCaseStudies((data.value ?? []) as CaseStudy[]));

const { track } = usePortfolioAnalytics();
const trackWorkView = (slug: string) => track('work_view', { slug, placement: 'work_index' });

const workCards = computed(() =>
  studies.value.map((study, i) => ({
    study,
    index: `${String(i + 1).padStart(2, '0')} / ${String(studies.value.length).padStart(2, '0')}`,
    media: getCaseStudyCardMedia(study),
  }))
);

const GRADIENTS = [
  'linear-gradient(160deg,#33161C 0%,#170B0E 100%)',
  'linear-gradient(160deg,#2C1519 0%,#170B0E 100%)',
  'linear-gradient(160deg,#2A1620 0%,#170B0E 100%)',
  'linear-gradient(160deg,#2A1620 0%,#170B0E 100%)',
  'linear-gradient(160deg,#2A1620 0%,#170B0E 100%)',
  'linear-gradient(160deg,#301A1C 0%,#170B0E 100%)',
];
const gradient = (i: number) => GRADIENTS[i % GRADIENTS.length];

/* ------------------------------------------------------------------ *
 * Parallax depth field (dark-only spatial design — see the Claude
 * Design handoff; Work does not ship a light variant).
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

const generateParticles = (count = 110, initialSeed = 19): Particle[] => {
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
const particles = generateParticles(110, 19);

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

usePortfolioSeo({
  title: 'Work — Tamara Mack, Creative Technologist',
  description:
    'Proof-led case studies across media systems, spatial experiences, data visualization, experience systems, and human-controlled AI.',
  path: '/work',
});
</script>

<style lang="scss" scoped>
@use '../../../assets/css/spatial-tokens' as t;
@use '../../../assets/css/spatial-shared' as s;

.work-spatial[data-fit='screen'] {
  max-width: none;
  padding-inline: 0;
}
.work-spatial {
  @include s.root-surface;
}

@include s.depth-field;

.work-hero {
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
    font-family: t.$mono;
    font-weight: 600;
    font-size: 76px;
    line-height: 1;
    letter-spacing: -0.05em;
    color: t.$ink-strong;
    text-shadow: t.$shadow-text;
  }
  .hero-tagline {
    margin: 34px 0 0;
    max-width: 720px;
    font-size: 17.5px;
    line-height: 1.6;
    color: t.$ink-muted;
    text-wrap: pretty;
  }
  .btn-outline {
    display: inline-flex;
    align-items: center;
    margin-top: 34px;
    padding: 15px 26px;
    border: 1px solid t.$border-hover;
    color: t.$ink;
    font: inherit;
    font-family: t.$mono;
    font-size: t.$fs-button;
    font-weight: 500;
    letter-spacing: t.$track-button;
    text-transform: uppercase;
    border-radius: t.$radius;
    background: none;
    cursor: pointer;
    transition: all t.$dur-fast t.$ease;
    &:hover {
      border-color: t.$border-hover;
      color: t.$ink-strong;
    }
  }
}

.jump-bar {
  position: relative;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin: 72px t.$pad-x 0;
  padding: 14px 18px;
  background: rgba(30, 16, 19, 0.72);
  border: 1px solid t.$border-card;
  border-radius: t.$radius-card;
  backdrop-filter: blur(16px);
  box-shadow: 0 26px 60px -30px rgba(0, 0, 0, 0.9);
  .jump-label {
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$ink-subtle;
    padding-right: 8px;
  }
  .jump-link {
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.1em;
    padding: 9px 14px;
    border-radius: t.$radius;
    border: 1px solid t.$border-input;
    color: t.$ink-muted;
    transition: all t.$dur-fast t.$ease;
    &:hover {
      border-color: t.$border-hover;
      color: t.$ink-strong;
    }
  }
}

.work-list {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding: 56px t.$pad-x 0;
  perspective: 2600px;
}

.work-card {
  scroll-margin-top: 7rem;
  display: grid;
  grid-template-columns: minmax(0, 400px) 1fr;
  background: linear-gradient(140deg, rgba(48, 25, 31, 0.74) 0%, rgba(25, 13, 17, 0.74) 100%);
  border: 1px solid t.$border;
  border-radius: t.$radius-card;
  overflow: hidden;
  box-shadow: 0 44px 90px -32px rgba(0, 0, 0, 0.9);
  transition:
    border-color 0.25s ease,
    transform 0.25s ease;
  &:hover {
    border-color: t.$border-accent-hover;
    transform: translateZ(36px);
  }

  .card-media {
    display: block;
    width: 100%;
    height: 100%;
    min-height: 340px;
    object-fit: cover;
    background: t.$panel-deep;
    border-right: 1px solid t.$border-soft;
  }
  .card-media--placeholder {
    display: flex;
    align-items: flex-end;
    padding: 18px;
    .media-label {
      font-family: t.$mono;
      font-size: 9px;
      line-height: 1.7;
      letter-spacing: 0.18em;
      color: t.$ink-subtle;
    }
  }

  .card-body {
    padding: 40px 44px 42px;
  }
  .card-topline {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 16px;
  }
  .card-category {
    margin: 0;
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$rose;
  }
  .card-index {
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.2em;
    color: t.$ink-subtle;
  }
  .card-title {
    margin: 0 0 18px;
    font-family: t.$mono;
    font-weight: 500;
    font-size: 36px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    a {
      color: t.$ink-strong;
    }
  }
  .card-abstract {
    margin: 0 0 26px;
    max-width: 640px;
    font-size: 15.5px;
    line-height: t.$lh-prose;
    color: t.$ink-lead;
    text-wrap: pretty;
  }
  .card-meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 26px;
    margin-bottom: 28px;
  }
  .meta-block {
    margin: 0;
    font-size: 13.5px;
    line-height: 1.6;
    color: t.$ink-dim;
    .meta-label {
      font-family: t.$mono;
      font-size: t.$fs-label;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: t.$ink-subtle;
      display: block;
      margin-bottom: 7px;
    }
  }
  .card-footer {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }
  .tag {
    @include s.tag-face;
    color: t.$ink-dim;
    border-color: t.$border-input;
    padding: 6px 11px;
  }
  .story-link {
    @include s.story-link-face;
    margin-left: auto;
  }
}

.work-related {
  position: relative;
  z-index: 10;
  grid-template-columns: 1fr !important;
  margin: 60px t.$pad-x 0;

  :deep(.page-nav) {
    position: static;
    max-width: none;
    background: rgba(30, 16, 19, 0.72);
    border: 1px solid t.$border-card;
    border-radius: t.$radius-card;
    padding: 18px 22px;
    backdrop-filter: blur(16px);

    p[data-label] {
      font-family: t.$mono;
      font-size: t.$fs-label;
      letter-spacing: t.$track-eyebrow;
      text-transform: uppercase;
      color: t.$ink-subtle;
    }

    nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    a {
      font-family: t.$mono;
      font-size: t.$fs-meta;
      color: t.$ink-muted;
      border: 1px solid t.$border-input;
      border-radius: t.$radius;
      padding: 0.4rem 0.75rem;

      &[data-state='active'] {
        border-color: t.$border-accent-hover;
        color: t.$rose-bright;
      }
    }
  }
}

@media (max-width: 768px) {
  .jump-bar {
    overflow-x: auto;
    flex-wrap: nowrap;
    -webkit-overflow-scrolling: touch;
    > * {
      flex: none;
    }
  }
  .work-card {
    grid-template-columns: 1fr;
    > :first-child {
      min-height: 220px;
      border-right: none;
      border-bottom: 1px solid t.$border-soft;
    }
  }
}
@media (max-width: 520px) {
  .work-card .card-meta {
    grid-template-columns: 1fr;
    gap: 20px;
  }
}

@include s.depth-keyframes;
</style>
