/**
 * useAsyncData for portfolio / content / notes pages.
 *
 * 1. Hydration-only payload reuse — refetch on later client navigations.
 * 2. Global query lock — serializes concurrent handlers (defensive; prefer
 *    `fetchContentCollection` / `$fetch` over client `queryCollection` WASM).
 * 3. Pair with `pageTransition: false` (see `config-properties/app-prop.ts`).
 */
let contentQueryLock: Promise<unknown> = Promise.resolve();

const withContentQueryLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = contentQueryLock.then(fn, fn);
  contentQueryLock = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};

export function useContentAsyncData<DataT>(
  key: string | (() => string),
  handler: () => Promise<DataT>,
  options: Parameters<typeof useAsyncData<DataT>>[2] = {}
) {
  const { getCachedData, ...rest } = options ?? {};
  return useAsyncData(key, () => withContentQueryLock(handler), {
    ...rest,
    getCachedData(dataKey, nuxtApp, ctx) {
      if (getCachedData) {
        return getCachedData(dataKey, nuxtApp, ctx);
      }
      if (nuxtApp.isHydrating) {
        return nuxtApp.payload.data[dataKey] as DataT | undefined;
      }
      return undefined;
    },
  });
}
