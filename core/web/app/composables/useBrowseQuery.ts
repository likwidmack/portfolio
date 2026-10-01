import {
  BROWSE_QUERY_KEYS,
  isFiltered,
  readBrowseQuery,
  writeBrowseQuery,
  type BrowseState,
} from '#shared/browse-query';

/**
 * Two-way binds `AppBrowseToolbar` state to the route query with `router.replace`,
 * so filtered Gallery / Docs views are shareable and survive Back without adding
 * history entries. Query keys the toolbar does not own (e.g. `specimen`) are kept.
 */
export function useBrowseQuery(defaults: BrowseState) {
  const route = useRoute();
  const router = useRouter();
  const state = reactive<BrowseState>(readBrowseQuery(route.query, defaults));

  watch(
    () => ({ ...state }),
    (next) => {
      const kept = Object.fromEntries(
        Object.entries(route.query).filter(([key]) => !(BROWSE_QUERY_KEYS as readonly string[]).includes(key))
      );
      void router.replace({ query: { ...kept, ...writeBrowseQuery(next, defaults) }, hash: route.hash });
    }
  );

  // Clearing filters keeps the selected item (if any) — the page decides whether it is still visible.
  const clear = () => {
    state.group = defaults.group;
    state.kind = defaults.kind;
    state.query = defaults.query;
  };

  return {
    ...toRefs(state),
    filtered: computed(() => isFiltered(state, defaults)),
    clear,
  };
}
