<template lang="pug">
.portfolio-depth-field
  video.portfolio-depth-field__camera(
    v-show="background === 'camera'",
    ref="camEl",
    autoplay,
    muted,
    playsinline,
    aria-hidden="true"
  )
  p.portfolio-depth-field__camera-note(v-if="cameraBlocked") Camera blocked — allow access for the camera background
  .portfolio-depth-field__stage(ref="stageEl", aria-hidden="true")
    template(v-if="background === 'grid'")
      .portfolio-depth-field__grid-glow
      .portfolio-depth-field__grid-plane.portfolio-depth-field__grid-floor
      .portfolio-depth-field__grid-plane.portfolio-depth-field__grid-ceil
    template(v-else)
      .portfolio-depth-field__plane(
        v-for="(plane, i) in planes",
        :key="'plane-' + i",
        :style="{ left: plane.x + '%', top: plane.y + '%', width: plane.w + 'px', height: plane.h + 'px', marginLeft: -plane.w / 2 + 'px', marginTop: -plane.h / 2 + 'px', background: `radial-gradient(closest-side, var(--portfolio-haze-${i + 1}) 0%, transparent 72%)`, filter: `blur(${plane.blur}px)`, opacity: plane.o, transform: `translateZ(${plane.z}px)`, animationDelay: `${i * -3}s` }"
      )
      .portfolio-depth-field__particle(v-for="(p, i) in particles", :key="'p-' + i", :style="{ left: p.x, top: p.y }")
        span(
          :style="{ width: p.size + 'px', height: p.size + 'px', background: p.color, boxShadow: p.shadow, filter: p.blur, animationDuration: p.dur, animationDelay: p.delay }"
        )
  .portfolio-depth-field__vignette(aria-hidden="true")
</template>

<script setup lang="ts">
interface Props {
  seed?: number;
  particleCount?: number;
}
const props = withDefaults(defineProps<Props>(), {
  seed: 7,
  particleCount: 90,
});

interface Plane {
  z: number;
  w: number;
  h: number;
  x: number;
  y: number;
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

const basePlanes: Plane[] = [
  { z: -1650, w: 2600, h: 1700, x: 62, y: 4, blur: 130, o: 0.8 },
  { z: -1050, w: 1700, h: 1250, x: 6, y: 34, blur: 100, o: 0.72 },
  { z: -520, w: 1200, h: 900, x: 78, y: 58, blur: 76, o: 0.6 },
  { z: -170, w: 900, h: 700, x: 24, y: 86, blur: 60, o: 0.5 },
];

function generateParticles(count: number, seed: number): Particle[] {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
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
      color:
        near > 0.78
          ? 'var(--portfolio-particle-strong)'
          : near > 0.4
            ? 'var(--portfolio-particle-mid)'
            : 'var(--portfolio-particle-soft)',
      shadow: near > 0.78 ? 'var(--portfolio-particle-shadow-strong, none)' : 'none',
      blur: near < 0.3 ? 'blur(1.4px)' : 'none',
    });
  }
  return items;
}

const allParticles = generateParticles(props.particleCount, props.seed);

const { background } = usePersonalization();
const planes = computed(() => (background.value === 'camera' ? [] : basePlanes));
const particles = computed(() =>
  background.value === 'camera' ? allParticles.slice(0, Math.min(40, allParticles.length)) : allParticles
);

const stageEl = ref<HTMLElement | null>(null);
const camEl = ref<HTMLVideoElement | null>(null);
const cameraBlocked = ref(false);
const reducedMotion = usePrefersReducedMotion();

let stream: MediaStream | null = null;
let cameraRequestId = 0;

function stopCameraStream(): void {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
    stream = null;
  }
}

function syncCamera(): void {
  const video = camEl.value;
  if (!video) return;
  if (background.value !== 'camera') {
    cameraRequestId++;
    cameraBlocked.value = false;
    stopCameraStream();
    video.srcObject = null;
    return;
  }
  if (stream || !navigator.mediaDevices?.getUserMedia) return;
  const thisRequest = ++cameraRequestId;
  navigator.mediaDevices
    .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .then((nextStream) => {
      if (thisRequest !== cameraRequestId || background.value !== 'camera') {
        nextStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = nextStream;
      video.srcObject = nextStream;
      cameraBlocked.value = false;
      void video.play?.().catch(() => {});
    })
    .catch(() => {
      if (thisRequest === cameraRequestId) cameraBlocked.value = true;
    });
}

function onPointerMove(e: PointerEvent) {
  const stage = stageEl.value;
  if (!stage) return;
  const dx = e.clientX / window.innerWidth - 0.5;
  const dy = e.clientY / window.innerHeight - 0.5;
  stage.style.transform =
    `translate3d(${(-dx * 46).toFixed(1)}px, ${(-dy * 32).toFixed(1)}px, 0) ` +
    `rotateY(${(-dx * 3.2).toFixed(2)}deg) rotateX(${(dy * 2.4).toFixed(2)}deg)`;
}

onMounted(() => {
  if (!reducedMotion.value) {
    window.addEventListener('pointermove', onPointerMove);
  }
  syncCamera();
});
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove);
  cameraRequestId++;
  stopCameraStream();
});
watch(reducedMotion, (isReduced) => {
  if (isReduced) {
    window.removeEventListener('pointermove', onPointerMove);
    stageEl.value?.style.removeProperty('transform');
  } else {
    window.addEventListener('pointermove', onPointerMove);
  }
});
watch(background, syncCamera);
</script>

<style lang="scss" src="./AppDepthField.scss"></style>
