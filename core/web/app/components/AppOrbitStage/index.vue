<template lang="pug">
.orbit-stage
  .orbit-stage__host(ref="hostEl")
    .orbit-stage__ring(ref="ringEl")
      NuxtLink.orbit-stage__card(
        v-for="(study, index) in studies",
        :key="study.slug",
        :to="`/work/${study.slug}`",
        :data-panel-angle="angleFor(index)",
        :style="{ transform: `rotateY(${angleFor(index)}deg) translateZ(268px)` }"
      )
        img.orbit-stage__card-img(v-if="mediaFor(study)", :src="mediaFor(study).src", :alt="study.title")
        .orbit-stage__card-placeholder(v-else)
          span {{ study.category }}
        .orbit-stage__card-meta
          p {{ study.category }}
          p {{ study.title }}
  .orbit-stage__controls(role="group", aria-label="Background mode")
    button(type="button", :aria-pressed="background === 'particles'", @click="setBackground('particles')") Particles
    button(type="button", :aria-pressed="background === 'grid'", @click="setBackground('grid')") Grid
    button(type="button", :aria-pressed="background === 'camera'", @click="setBackground('camera')") Camera
  p.orbit-stage__caption Drag to orbit · {{ studies.length }} proof-led stories
</template>

<script setup lang="ts">
import { getCaseStudyCardMedia, type CaseStudy } from '#shared/portfolio-types';

const props = defineProps<{ studies: CaseStudy[] }>();

const { background, setBackground } = usePersonalization();

function angleFor(index: number): number {
  return (index * 360) / (props.studies.length || 1);
}

function mediaFor(study: CaseStudy) {
  return getCaseStudyCardMedia(study);
}

const hostEl = ref<HTMLElement | null>(null);
const ringEl = ref<HTMLElement | null>(null);

const rotY = ref(0);
const rotX = ref(-11);
const reducedMotion = usePrefersReducedMotion();

interface DragState {
  x: number;
  y: number;
  ry: number;
  rx: number;
}
let dragState: DragState | null = null;
let rafId: number | null = null;

function arrangeOrbit(ring: HTMLElement) {
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
    const opacity = hidden ? 0 : focused ? 1 : Math.max(0.14, 0.7 - d.t * 0.66);
    const blur = focused ? 0 : Math.min(5, d.t * 7);
    const scale = focused ? 1.08 : 1 - d.t * 0.24;
    const radius = 268 + (focused ? 40 : 0);
    const p = d.panel;
    p.style.transform = `rotateY(${d.angle}deg) translateZ(${radius}px) scale(${scale.toFixed(3)})`;
    p.style.opacity = opacity.toFixed(3);
    p.style.filter = blur ? `blur(${blur.toFixed(1)}px)` : 'none';
    p.style.pointerEvents = focused ? 'auto' : 'none';
    p.tabIndex = hidden ? -1 : 0;
  }
}

function applyRotation() {
  const ring = ringEl.value;
  if (!ring) return;
  ring.style.transform = `translate(-50%, -50%) rotateX(${rotX.value}deg) rotateY(${rotY.value}deg)`;
  arrangeOrbit(ring);
}

function tick() {
  if (!dragState && !reducedMotion.value) {
    rotY.value += 0.055;
    applyRotation();
  }
  rafId = requestAnimationFrame(tick);
}

function onDown(e: PointerEvent) {
  dragState = { x: e.clientX, y: e.clientY, ry: rotY.value, rx: rotX.value };
  if (hostEl.value) hostEl.value.style.cursor = 'grabbing';
}
function onMove(e: PointerEvent) {
  if (!dragState) return;
  rotY.value = dragState.ry + (e.clientX - dragState.x) * 0.32;
  rotX.value = Math.max(-34, Math.min(16, dragState.rx - (e.clientY - dragState.y) * 0.16));
  applyRotation();
}
function onUp() {
  if (!dragState) return;
  dragState = null;
  if (hostEl.value) hostEl.value.style.cursor = 'grab';
}

onMounted(() => {
  applyRotation();
  hostEl.value?.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  if (!reducedMotion.value) tick();
});
onBeforeUnmount(() => {
  hostEl.value?.removeEventListener('pointerdown', onDown);
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  if (rafId) cancelAnimationFrame(rafId);
});
</script>

<style lang="scss" src="./AppOrbitStage.scss"></style>
