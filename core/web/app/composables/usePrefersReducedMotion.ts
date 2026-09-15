import type { MotionPreference } from '#shared/personalization';

export function usePrefersReducedMotion() {
  const motionPreference = useState<MotionPreference>('portfolio-motion', () => 'system');
  const osReduced = ref(false);

  if (import.meta.client) {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    osReduced.value = media.matches;
    const onChange = () => {
      osReduced.value = media.matches;
    };
    onMounted(() => media.addEventListener('change', onChange));
    onBeforeUnmount(() => media.removeEventListener('change', onChange));
  }

  return computed(() => {
    if (motionPreference.value === 'reduced') return true;
    if (motionPreference.value === 'playful') return false;
    return osReduced.value;
  });
}
