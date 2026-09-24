/**
 * Persist eligible interiors from `route.fullPath` after rebuilding the
 * remembered path (known slug / specimen / card hash only). Client-only.
 */
export default defineNuxtPlugin({
  name: 'remember-journey',
  setup() {
    const route = useRoute();
    const { rememberCurrentView } = useJourneyPreference();

    watch(
      () => route.fullPath,
      (fullPath) => {
        rememberCurrentView(fullPath);
      },
      { immediate: true }
    );
  },
});
