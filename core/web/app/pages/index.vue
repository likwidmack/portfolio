<template lang="pug">
.page-content.portfolio-page.home-spatial(data-fit="screen")
  .depth-field-viewport(aria-hidden="true")
    .depth-field-stage(ref="fieldStage")
      .haze-plane(
        v-for="(plane, i) in planes",
        :key="'plane-' + i",
        :style="{ left: plane.x + '%', top: plane.y + '%', width: plane.w + 'px', height: plane.h + 'px', marginLeft: -plane.w / 2 + 'px', marginTop: -plane.h / 2 + 'px', background: `radial-gradient(closest-side, ${plane.c} 0%, ${hazeFade} 72%)`, filter: `blur(${plane.blur}px)`, opacity: plane.o, transform: `translateZ(${plane.z}px)`, animation: `hazePulse ${13 + i * 4}s ease-in-out ${i * -3}s infinite` }"
      )
      .particle-node(v-for="(p, i) in particles", :key="'p-' + i", :style="{ left: p.x, top: p.y }")
        span.particle-dot(
          :style="{ width: p.size + 'px', height: p.size + 'px', background: p.color, boxShadow: p.shadow, filter: p.blur, animation: `${particleKeyframe} ${p.dur} linear ${p.delay} infinite` }"
        )
  .depth-field-vignette(aria-hidden="true")

  header.hero-section
    .hero-content
      p.hero-eyebrow {{ content.hero.eyebrow }}
      p.hero-signature {{ content.hero.brand }}
      h1.hero-title
        span.title-line {{ content.hero.title }}
        span.title-line.title-accent {{ content.hero.titleAccent }}
      p.hero-tagline {{ content.hero.lede }}
      .hero-actions
        NuxtLink.btn-primary(to="/work") {{ content.hero.primaryActionLabel }}
        a.btn-outline(:href="content.hero.secondaryActionHref", download) {{ content.hero.secondaryActionLabel }}
      ul.hero-disciplines
        li(v-for="d in content.hero.disciplines", :key="d") {{ d }}

    .hero-stage-column
      .stage-host(ref="stageHost")
        .stage-ring(ref="stageRing")
          NuxtLink.orbit-card(
            v-for="(cs, i) in orbitCards",
            :key="cs.study.slug",
            :to="`/work/${cs.study.slug}`",
            :data-panel-angle="cs.angle",
            :style="{ transform: `rotateY(${cs.angle}deg) translateZ(268px)` }",
            @click="trackWorkView(cs.study.slug)"
          )
            img.card-img(v-if="cs.media", :src="cs.media.src", :alt="cs.media.alt")
            .card-visual(v-else, :style="placeholderStyle(i)")
              span.visual-label PLACEHOLDER
            .card-meta
              p.meta-category {{ cs.study.category }}
              p.meta-title {{ cs.study.title }}
      p.stage-caption Drag to orbit · {{ orbitCards.length }} proof-led stories

  .status-banner
    span.status-pulse
    p.status-text
      strong.status-label {{ content.hero.currentlyLabel }}
      | {{ content.hero.availability }}

  section#proof.proof-section
    .proof-header
      .header-info
        p.section-eyebrow {{ content.featuredWork.eyebrow }}
        h2.section-title {{ content.featuredWork.heading }}
        p.section-summary {{ content.featuredWork.lede }}
      NuxtLink.view-all-link(to="/work") View all ({{ featuredStudies.length }}) →

    .proof-grid
      article.proof-card(v-for="(cs, i) in orbitCards", :key="'proof-' + cs.study.slug")
        img.card-preview-img(v-if="cs.proofMedia", :src="cs.proofMedia.src", :alt="cs.proofMedia.alt")
        .card-preview(v-else, :style="placeholderStyle(i)")
          span.preview-text PLACEHOLDER
        .card-body
          p.card-domain {{ cs.study.category }}
          h3.card-heading
            NuxtLink(:to="`/work/${cs.study.slug}`", @click="trackWorkView(cs.study.slug)") {{ cs.study.title }}
          p.card-abstract {{ cs.study.summary }}
          p.card-spec
            span.spec-label Role
            | {{ cs.study.role }}
          p.card-spec
            span.spec-label Evidence
            | {{ cs.study.evidence[0]?.value }}
          .card-tags
            span.tag(v-for="t in cs.study.technologies.slice(0, 4)", :key="t") {{ t }}
          NuxtLink.story-link(:to="`/work/${cs.study.slug}`", @click="trackWorkView(cs.study.slug)") Read the story ↗

  section.principles-section
    p.section-eyebrow {{ content.principles.eyebrow }}
    h2.principles-title {{ content.principles.heading }}
    p.principles-summary {{ content.principles.lede }}
    .principles-grid
      article.principle-card(
        v-for="(p, i) in content.principles.items",
        :key="p.title",
        :style="{ transform: `rotateX(2.5deg) translateZ(${i % 2 === 1 ? 30 : 14}px)` }"
      )
        span.principle-num {{ String(i + 1).padStart(2, '0') }}
        h3.principle-heading {{ p.title }}
        p.principle-body {{ p.body }}

  section.cta-section
    p.section-eyebrow {{ content.cta.eyebrow }}
    h2.cta-title {{ content.cta.heading }}
    p.cta-summary {{ content.cta.lede }}
    .cta-actions
      a.btn-primary.large(:href="content.cta.primaryHref", @click="trackContact") {{ content.cta.primaryLabel }}
      NuxtLink.btn-outline.large(:to="content.cta.secondaryHref") {{ content.cta.secondaryLabel }}
</template>

<script setup lang="ts">
import type { CaseStudy } from '#shared/portfolio-types';
import { getCaseStudyCardMedia, sortCaseStudies } from '#shared/portfolio-types';
import type { Collections } from '@nuxt/content';
import type { ThemeResolvedMode } from '@tgmc/theme/tokens';

type HomeContent = Collections['home'];
definePageMeta({ breadcrumb: 'Home' });
useSpatialPageChrome('home');

const { data: homeContent } = await useContentAsyncData('home-content', () =>
  fetchContentCollection<HomeContent>('home', { mode: 'first' })
);
const { data: caseStudyData } = await useContentAsyncData('home-case-studies', () =>
  fetchContentCollection<CaseStudy[]>('caseStudies', { mode: 'all' })
);

if (!homeContent.value) {
  throw createError({ statusCode: 500, statusMessage: 'Home content not found' });
}

const content = computed(() => homeContent.value as HomeContent);
const featuredStudies = computed(() => {
  const requested = new Set(content.value.featuredWork.slugs);
  return sortCaseStudies(((caseStudyData.value ?? []) as CaseStudy[]).filter((study) => requested.has(study.slug)));
});

const { track } = usePortfolioAnalytics();
const trackContact = () => track('contact_click', { placement: 'home' });
const trackWorkView = (slug: string) => track('work_view', { slug, placement: 'home_orbit' });

/* ------------------------------------------------------------------ *
 * Orbit ring content — one source (real case-study data) drives both the
 * orbit and the Selected Proof grid below it, so the two stay in sync.
 * ------------------------------------------------------------------ */
const ORBIT_GRADIENTS = [
  'linear-gradient(158deg,#33161C 0%,#1D0E12 100%)',
  'linear-gradient(158deg,#2C1519 0%,#1D0E12 100%)',
  'linear-gradient(158deg,#2A1620 0%,#1D0E12 100%)',
  'linear-gradient(158deg,#2A1620 0%,#1D0E12 100%)',
  'linear-gradient(158deg,#2A1620 0%,#1D0E12 100%)',
  'linear-gradient(158deg,#301A1C 0%,#1D0E12 100%)',
];
const LIGHT_PLACEHOLDER = 'linear-gradient(158deg,#F1E4E0 0%,#E8DAD6 100%)';

const placeholderStyle = (i: number) => ({
  background: resolvedTheme.value === 'light' ? LIGHT_PLACEHOLDER : ORBIT_GRADIENTS[i % ORBIT_GRADIENTS.length],
});

const orbitCards = computed(() => {
  const studies = featuredStudies.value;
  const step = studies.length ? 360 / studies.length : 0;
  return studies.map((study, i) => {
    const media = getCaseStudyCardMedia(study);
    const secondary = study.media.find((item) => item.type === 'image' && item.src !== media?.src);
    return {
      study,
      angle: Math.round(i * step),
      media,
      proofMedia: secondary ? { src: secondary.src, alt: secondary.alt } : media,
    };
  });
});

/* ------------------------------------------------------------------ *
 * Theme — the orbit's focus glow, particle palette, and depth-field
 * colors invert for light paper vs. the dark ground (site-wide toggle).
 * ------------------------------------------------------------------ */
const resolvedTheme = ref<ThemeResolvedMode>('dark');
let unsubscribeTheme: (() => void) | undefined;

const hazeFade = computed(() => (resolvedTheme.value === 'light' ? 'rgba(247,243,241,0)' : 'rgba(20,9,12,0)'));
const particleKeyframe = computed(() => (resolvedTheme.value === 'light' ? 'zApproachLight' : 'zApproach'));

const ORBIT_THEME = {
  dark: {
    minOpacity: 0.14,
    opacityBase: 0.7,
    brightness: (t: number) => 0.6 + (1 - t) * 0.4,
    shadow: '0 40px 90px -30px rgba(0,0,0,.85), 0 0 46px -6px rgba(232,105,124,.45)',
  },
  light: {
    minOpacity: 0.2,
    opacityBase: 0.78,
    brightness: (t: number) => 1 + t * 0.06,
    shadow: '0 40px 90px -34px rgba(74,50,54,.4), 0 0 44px -8px rgba(168,27,50,.3)',
  },
} as const;

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

const DARK_PLANES: Plane[] = [
  { z: -1650, w: 2600, h: 1700, x: 62, y: 4, c: '#63202F', blur: 130, o: 0.8 },
  { z: -1050, w: 1700, h: 1250, x: 6, y: 34, c: '#3A1220', blur: 100, o: 0.72 },
  { z: -520, w: 1200, h: 900, x: 78, y: 58, c: '#2B0E17', blur: 76, o: 0.6 },
  { z: -170, w: 900, h: 700, x: 24, y: 86, c: '#220B12', blur: 60, o: 0.5 },
];
const LIGHT_PLANES: Plane[] = [
  { z: -1650, w: 2600, h: 1700, x: 62, y: 4, c: '#DCBDBC', blur: 130, o: 0.62 },
  { z: -1050, w: 1700, h: 1250, x: 6, y: 34, c: '#E3C8C5', blur: 100, o: 0.56 },
  { z: -520, w: 1200, h: 900, x: 78, y: 58, c: '#E8D2CE', blur: 76, o: 0.5 },
  { z: -170, w: 900, h: 700, x: 24, y: 86, c: '#EEDDD9', blur: 60, o: 0.44 },
];
const planes = computed<Plane[]>(() => (resolvedTheme.value === 'light' ? LIGHT_PLANES : DARK_PLANES));

const generateParticles = (theme: ThemeResolvedMode, count = 120, initialSeed = 7): Particle[] => {
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
    const color =
      theme === 'light'
        ? near > 0.78
          ? '#A81B32'
          : near > 0.4
            ? '#8E6A6C'
            : '#CBB4B1'
        : near > 0.78
          ? '#F0879A'
          : near > 0.4
            ? '#E8697C'
            : '#F3E7E4';
    items.push({
      x: (rand() * 100).toFixed(2) + '%',
      y: (rand() * 100).toFixed(2) + '%',
      size,
      dur: `${dur}s`,
      delay: `${(-rand() * parseFloat(dur)).toFixed(1)}s`,
      color,
      shadow: theme === 'dark' && near > 0.78 ? '0 0 10px rgba(232,105,124,.7)' : 'none',
      blur: near < 0.3 ? 'blur(1.4px)' : 'none',
    });
  }
  return items;
};
const darkParticles = generateParticles('dark', 120, 7);
const lightParticles = generateParticles('light', 120, 7);
const particles = computed<Particle[]>(() => (resolvedTheme.value === 'light' ? lightParticles : darkParticles));

/* ------------------------------------------------------------------ *
 * Orbit ring — cover-flow depth arrangement (ported from the Claude
 * Design handoff). Frontmost card focuses and reveals its caption; the
 * rest recede in scale/blur/opacity around the shared ring.
 * ------------------------------------------------------------------ */
const stageHost = ref<HTMLElement | null>(null);
const stageRing = ref<HTMLElement | null>(null);
const fieldStage = ref<HTMLElement | null>(null);

const rotY = ref(0);
const rotX = ref(-11);

interface DragState {
  x: number;
  y: number;
  ry: number;
  rx: number;
}
let dragState: DragState | null = null;
let rafId: number | null = null;
let reducedMotion = false;

const arrangeOrbit = (ring: HTMLElement) => {
  const cfg = ORBIT_THEME[resolvedTheme.value];
  const panels = Array.from(ring.querySelectorAll<HTMLElement>('[data-panel-angle]'));
  const data = panels.map((panel) => {
    const angle = parseFloat(panel.getAttribute('data-panel-angle') || '0');
    let facing = (((angle + rotY.value) % 360) + 360) % 360;
    if (facing > 180) facing = 360 - facing;
    return { panel, angle, facing, t: facing / 180, cos: Math.cos((facing * Math.PI) / 180) };
  });
  [...data]
    .sort((a, b) => a.cos - b.cos)
    .forEach((d, i) => {
      d.panel.style.zIndex = String(i);
    });

  for (const d of data) {
    const focused = d.facing < 24;
    const hidden = d.facing > 150;
    const opacity = hidden ? 0 : focused ? 1 : Math.max(cfg.minOpacity, cfg.opacityBase - d.t * 0.66);
    const blur = focused ? 0 : Math.min(5, d.t * 7);
    const scale = focused ? 1.08 : 1 - d.t * 0.24;
    const radius = 268 + (focused ? 40 : 0);
    const p = d.panel;
    p.style.transform = `rotateY(${d.angle}deg) translateZ(${radius}px) scale(${scale.toFixed(3)})`;
    p.style.opacity = opacity.toFixed(3);
    p.style.filter = blur ? `blur(${blur.toFixed(1)}px) brightness(${cfg.brightness(d.t).toFixed(2)})` : 'none';
    p.style.transition = 'opacity .35s ease, filter .35s ease';
    p.style.pointerEvents = focused ? 'auto' : 'none';
    p.style.boxShadow = focused ? cfg.shadow : 'none';
    const caption = p.children[1] as HTMLElement | undefined;
    if (caption) {
      caption.style.transition = 'opacity .3s ease';
      caption.style.opacity = focused ? '1' : '0';
    }
  }
};

const applyRotation = () => {
  const ring = stageRing.value;
  if (!ring) return;
  ring.style.transform = `translate(-50%, -50%) rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`;
  arrangeOrbit(ring);
};

const tick = () => {
  if (!dragState && !reducedMotion) {
    rotY.value += 0.055;
    applyRotation();
  }
  rafId = requestAnimationFrame(tick);
};

const onDown = (e: PointerEvent) => {
  dragState = { x: e.clientX, y: e.clientY, ry: rotY.value, rx: rotX.value };
  if (stageHost.value) stageHost.value.style.cursor = 'grabbing';
};
const onMove = (e: PointerEvent) => {
  if (!dragState) return;
  rotY.value = dragState.ry + (e.clientX - dragState.x) * 0.32;
  rotX.value = Math.max(-34, Math.min(16, dragState.rx - (e.clientY - dragState.y) * 0.16));
  applyRotation();
};
const onUp = () => {
  if (!dragState) return;
  dragState = null;
  if (stageHost.value) stageHost.value.style.cursor = 'grab';
};
const onFieldMove = (e: PointerEvent) => {
  const stage = fieldStage.value;
  if (!stage) return;
  const dx = e.clientX / window.innerWidth - 0.5;
  const dy = e.clientY / window.innerHeight - 0.5;
  stage.style.transform =
    `translate3d(${(-dx * 46).toFixed(1)}px, ${(-dy * 32).toFixed(1)}px, 0) ` +
    `rotateY(${(-dx * 3.2).toFixed(2)}deg) rotateX(${(dy * 2.4).toFixed(2)}deg)`;
};

watch(resolvedTheme, () => applyRotation());

onMounted(() => {
  if (!import.meta.client) return;
  reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  const themeApi = useThemeTokens();
  resolvedTheme.value = themeApi.getResolvedThemeMode();
  unsubscribeTheme = themeApi.subscribeThemeMode(({ resolved }) => {
    resolvedTheme.value = resolved;
  });

  applyRotation();
  stageHost.value?.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  if (!reducedMotion) {
    tick();
    window.addEventListener('pointermove', onFieldMove);
  }
});
onBeforeUnmount(() => {
  stageHost.value?.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('pointermove', onFieldMove);
  if (rafId) cancelAnimationFrame(rafId);
  unsubscribeTheme?.();
});

usePortfolioSeo({
  title: content.value.seo.title,
  description: content.value.seo.description,
  path: '/',
});
</script>

<style lang="scss" scoped>
@use '../../assets/css/spatial-tokens' as t;
@use '../../assets/css/spatial-shared' as s;

.home-spatial[data-fit='screen'] {
  max-width: none;
  padding-inline: 0;
}
.home-spatial {
  @include s.root-surface;
}

@include s.depth-field;

.hero-section {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: minmax(0, 780px) 1fr;
  gap: 56px;
  align-items: center;
  padding: t.$hero-pad-top t.$pad-x 0;
}
.hero-content {
  grid-column: 1 / -1;
  perspective: t.$perspective-hero;
  max-width: 780px;

  .hero-eyebrow {
    margin: 0 0 34px;
    font-family: t.$mono;
    font-size: t.$fs-label;
    line-height: t.$lh-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$rose;
    max-width: 430px;
  }
  .hero-signature {
    margin: 0 0 18px;
    font-family: t.$mono;
    font-size: 13px;
    letter-spacing: t.$track-signature;
    text-transform: uppercase;
    color: t.$ink-subtle;
  }
  .hero-title {
    margin: 0;
    font-family: t.$mono;
    font-weight: 600;
    font-size: t.$fs-h1;
    line-height: t.$lh-display;
    letter-spacing: t.$track-tight;
    transform-origin: 0% 50%;
    transform: rotateY(-7deg) translateZ(40px);
    text-shadow: t.$shadow-text;
    .title-line {
      display: block;
      color: t.$ink-strong;
    }
    .title-accent {
      color: t.$rose;
      text-shadow: t.$shadow-text-accent;
    }
  }
  .hero-tagline {
    margin: 38px 0 0;
    max-width: 460px;
    font-size: t.$fs-tagline;
    line-height: 1.55;
    color: t.$ink-muted;
    text-wrap: pretty;
  }
  .hero-actions {
    display: flex;
    gap: t.$gap-action;
    margin-top: 40px;
  }
  .hero-disciplines {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 26px;
    margin: 52px 0 0;
    padding: 0;
    list-style: none;
    font-family: t.$mono;
    font-size: t.$fs-eyebrow;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: t.$ink-dim;
  }
}
.hero-stage-column {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 26px;

  .stage-host {
    position: relative;
    width: 100%;
    height: 500px;
    perspective: t.$perspective-stage;
    perspective-origin: 50% 46%;
    cursor: grab;
    touch-action: none;
  }
  .stage-ring {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    transform-style: preserve-3d;
    will-change: transform;
  }
  .orbit-card {
    position: absolute;
    left: -120px;
    top: -168px;
    width: t.$orbit-card-w;
    height: t.$orbit-card-h;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
    display: block;

    .card-visual {
      width: 100%;
      height: 240px;
      border: 1px solid t.$border-card;
      border-bottom: none;
      display: flex;
      align-items: flex-end;
      padding: 14px;
      .visual-label {
        font-family: t.$mono;
        font-size: t.$fs-micro;
        letter-spacing: 0.18em;
        color: t.$ink-subtle;
      }
    }
    .card-img {
      display: block;
      width: 100%;
      height: 240px;
      object-fit: cover;
      border: 1px solid t.$border-card;
      border-bottom: none;
    }
    .card-meta {
      background: t.$card-surface;
      border: 1px solid t.$border-card;
      border-top: none;
      padding: 14px;
      .meta-category {
        margin: 0 0 7px;
        font-family: t.$mono;
        font-size: t.$fs-micro;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: t.$rose;
      }
      .meta-title {
        margin: 0;
        font-family: t.$mono;
        font-size: 17px;
        letter-spacing: -0.03em;
        color: t.$ink-strong;
      }
    }
  }
  .stage-caption {
    margin: 0;
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: 0.26em;
    text-transform: uppercase;
    color: t.$ink-subtle;
    white-space: nowrap;
  }
}

@include s.buttons;

.status-banner {
  position: relative;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 18px;
  max-width: 620px;
  margin: 88px 0 0;
  padding: 0 t.$pad-x;
  .status-pulse {
    flex: none;
    margin-top: 6px;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: t.$crimson;
    box-shadow: t.$glow-pulse;
  }
  .status-text {
    margin: 0;
    font-size: t.$fs-body-s;
    line-height: 1.6;
    color: t.$ink-dim;
    text-wrap: pretty;
  }
  .status-label {
    font-family: t.$mono;
    font-size: t.$fs-eyebrow;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$ink;
    display: block;
    margin-bottom: 8px;
  }
}

@include s.section-type;

.proof-section {
  position: relative;
  z-index: 10;
  padding: t.$section-pad t.$pad-x 0;
  .proof-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 48px;
    margin-bottom: 64px;
    .header-info {
      max-width: 760px;
    }
    .view-all-link {
      flex: none;
      font-family: t.$mono;
      font-size: t.$fs-meta;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(232, 105, 124, 0.4);
    }
  }
  .proof-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: t.$gap-grid;
    perspective: t.$perspective-grid;
  }
}
.proof-card {
  display: grid;
  grid-template-columns: 214px 1fr;
  background: t.$card-gradient;
  border: 1px solid t.$border;
  border-radius: t.$radius-card;
  overflow: hidden;
  box-shadow: t.$shadow-card;
  transform: translateZ(24px);
  transition:
    border-color 0.25s ease,
    transform 0.25s ease;
  &:hover {
    border-color: t.$border-accent-hover;
    transform: translateZ(52px);
  }
  .card-preview {
    border-right: 1px solid t.$border-soft;
    display: flex;
    align-items: flex-end;
    padding: 14px;
    .preview-text {
      font-family: t.$mono;
      font-size: t.$fs-micro;
      line-height: 1.6;
      letter-spacing: 0.16em;
      color: t.$ink-subtle;
    }
  }
  .card-preview-img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: t.$panel-deep;
    border-right: 1px solid t.$border-soft;
  }
  .card-body {
    padding: 30px 32px 28px;
  }
  .card-domain {
    margin: 0 0 14px;
    font-family: t.$mono;
    font-size: t.$fs-label;
    letter-spacing: t.$track-eyebrow;
    text-transform: uppercase;
    color: t.$rose;
  }
  .card-heading {
    margin: 0 0 16px;
    font-family: t.$mono;
    font-weight: 500;
    font-size: t.$fs-h2-card;
    letter-spacing: t.$track-heading;
    a {
      color: t.$ink-strong;
    }
  }
  .card-abstract {
    margin: 0 0 22px;
    font-size: t.$fs-body;
    line-height: t.$lh-prose;
    color: t.$ink-lead;
    text-wrap: pretty;
  }
  .card-spec {
    margin: 0 0 16px;
    font-size: t.$fs-caption;
    line-height: 1.6;
    color: t.$ink-dim;
    &:nth-of-type(2) {
      margin-bottom: 22px;
    }
    .spec-label {
      font-family: t.$mono;
      font-size: t.$fs-label;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: t.$ink-subtle;
      display: block;
      margin-bottom: 6px;
    }
  }
  .card-tags {
    display: flex;
    flex-wrap: wrap;
    gap: t.$gap-tag;
    margin-bottom: 24px;
  }
  .tag {
    @include s.tag-face;
    color: t.$ink-dim;
    border-color: t.$border-input;
    padding: 5px 10px;
  }
  .story-link {
    @include s.story-link-face;
  }
}

.principles-section {
  position: relative;
  z-index: 10;
  padding: t.$section-pad-tight t.$pad-x 0;
  .principles-title {
    margin: 0;
    max-width: 1000px;
    font-family: t.$mono;
    font-weight: 500;
    font-size: t.$fs-h2;
    line-height: t.$lh-title;
    letter-spacing: t.$track-title;
    color: t.$ink-strong;
    text-wrap: pretty;
  }
  .principles-summary {
    margin: 24px 0 64px;
    max-width: 620px;
    font-size: t.$fs-lede;
    line-height: t.$lh-body;
    color: t.$ink-dim;
    text-wrap: pretty;
  }
  .principles-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: t.$gap-card;
    perspective: t.$perspective-principles;
  }
  .principle-card {
    background: t.$card-gradient;
    border: 1px solid t.$border;
    border-radius: t.$radius-card;
    padding: 34px 32px 40px;
    box-shadow: t.$shadow-card-soft;
  }
  .principle-num {
    font-family: t.$mono;
    font-size: t.$fs-meta;
    letter-spacing: 0.2em;
    color: t.$rose;
  }
  .principle-heading {
    margin: 22px 0 14px;
    font-family: t.$mono;
    font-weight: 500;
    font-size: t.$fs-h3;
    line-height: t.$lh-heading;
    letter-spacing: -0.03em;
    color: t.$ink-strong;
    text-wrap: pretty;
  }
  .principle-body {
    margin: 0;
    font-size: t.$fs-body;
    line-height: t.$lh-prose;
    color: t.$ink-dim;
    text-wrap: pretty;
  }
}

.cta-section {
  position: relative;
  z-index: 10;
  margin: t.$section-pad t.$pad-x 0;
  padding: 80px 72px 88px;
  background:
    radial-gradient(900px 400px at 20% 0%, rgba(220, 66, 86, 0.12) 0%, rgba(20, 9, 12, 0) 70%),
    t.$card-gradient-solid;
  border: 1px solid t.$border-accent;
  border-radius: t.$radius-card;
  box-shadow: t.$shadow-panel;
  .cta-title {
    margin: 0;
    max-width: 1080px;
    font-family: t.$mono;
    font-weight: 500;
    font-size: t.$fs-h1-cta;
    line-height: t.$lh-title;
    letter-spacing: t.$track-tight;
    color: t.$ink-strong;
    text-wrap: pretty;
  }
  .cta-summary {
    margin: 26px 0 40px;
    max-width: 640px;
    font-size: t.$fs-lede;
    line-height: t.$lh-body;
    color: t.$ink-lead;
    text-wrap: pretty;
  }
  .cta-actions {
    display: flex;
    gap: t.$gap-action;
  }
}

// ─── Light theme overrides ─────────────────────────────────────────────────
// Home is the only spatial screen that follows the site-wide light/dark
// toggle (Work and Gallery only ship the dark spatial design), so its ink,
// accent, card, and shadow values swap here instead of via a `$theme` mixin
// arg, keeping the one template reactive to `useThemeTokens()` at runtime.
html[data-theme='light'] .home-spatial {
  @include s.root-surface(light);

  .hero-content .hero-eyebrow,
  .hero-content .hero-signature,
  .hero-content .hero-tagline,
  .hero-content .hero-disciplines,
  .hero-stage-column .stage-caption,
  .status-banner .status-text,
  .status-banner .status-label,
  .proof-section .section-summary,
  .principles-section .principles-summary,
  .principle-body,
  .card-abstract,
  .card-spec,
  .tag {
    color: t.$light-ink-muted;
  }
  .hero-content .hero-title {
    text-shadow: none;
  }
  .hero-content .hero-title .title-line {
    color: t.$light-ink-strong;
  }
  .hero-content .hero-eyebrow,
  .hero-content .hero-title .title-accent,
  .section-eyebrow,
  .card-domain,
  .principle-num {
    color: t.$light-crimson;
  }
  .hero-content .hero-title .title-accent {
    text-shadow: 0 18px 44px rgba(168, 27, 50, 0.16);
  }
  .status-pulse {
    background: t.$light-crimson;
    box-shadow: none;
  }
  .section-title,
  .card-heading a,
  .principles-title,
  .principle-heading,
  .cta-title {
    color: t.$light-ink-strong;
  }
  .orbit-card {
    .card-visual {
      border-color: t.$light-border-input;
    }
    .card-img {
      border-color: t.$light-border-input;
      background: t.$light-placeholder-top;
    }
    .card-meta {
      background: rgba(255, 255, 255, 0.92);
      border-color: t.$light-border-input;

      .meta-category {
        color: t.$light-crimson;
      }
      .meta-title {
        color: t.$light-ink-strong;
      }
    }
  }
  .proof-card,
  .principle-card {
    background: linear-gradient(150deg, t.$light-card-top 0%, t.$light-card-bot 100%);
    border-color: t.$light-border;
    box-shadow: 0 40px 80px -28px rgba(74, 50, 54, 0.13);
    &:hover {
      border-color: rgba(168, 27, 50, 0.42);
    }
  }
  .card-preview {
    background: linear-gradient(160deg, t.$light-placeholder-top 0%, t.$light-placeholder-bot 100%);
    border-color: t.$light-border-soft;
  }
  .card-preview-img {
    background: t.$light-placeholder-top;
    border-color: t.$light-border-soft;
  }
  .tag {
    border-color: t.$light-border-input;
  }
  .view-all-link {
    border-bottom-color: rgba(168, 27, 50, 0.35);
  }
  .cta-section {
    background:
      radial-gradient(900px 400px at 20% 0%, rgba(168, 27, 50, 0.1) 0%, rgba(247, 243, 241, 0) 70%),
      linear-gradient(150deg, t.$light-card-top 0%, t.$light-card-bot 100%);
    border-color: rgba(168, 27, 50, 0.24);
    box-shadow: 0 60px 120px -40px rgba(74, 50, 54, 0.16);
  }
  @include s.buttons(light);
}

@media (max-width: t.$bp-lg) {
  .principles-section .principles-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .proof-section .proof-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: t.$bp-md) {
  .hero-stage-column .stage-host {
    height: 400px;
  }
}
@media (max-width: t.$bp-sm) {
  .proof-section .proof-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
}
@media (max-width: t.$bp-xs) {
  .principles-section .principles-grid {
    grid-template-columns: 1fr;
  }
  .hero-stage-column .stage-host {
    height: 320px;
  }
  .proof-card {
    grid-template-columns: 1fr;
  }
  .proof-card > :first-child {
    min-height: 160px;
    border-right: none;
    border-bottom: 1px solid t.$border-soft;
  }
}

@include s.depth-keyframes;
</style>
