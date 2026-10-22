import { ref } from 'vue';

const message = ref('');
const politeness = ref<'polite' | 'assertive'>('polite');

/**
 * Composable to trigger accessible live-region announcements for screen readers.
 */
export function useA11yAnnouncer() {
  const announce = (msg: string, mode: 'polite' | 'assertive' = 'polite') => {
    politeness.value = mode;
    // Clear first to ensure re-announcement of identical messages
    message.value = '';
    setTimeout(() => {
      message.value = msg;
    }, 50);
  };

  return {
    message,
    politeness,
    announce,
  };
}

export default useA11yAnnouncer;
