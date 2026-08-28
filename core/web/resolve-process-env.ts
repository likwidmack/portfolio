/**
 * First non-empty process env value (trimmed). Used by nuxt.config bake-time
 * resolution so `NUXT_*` aliases win over plain names when both are set.
 */
export const firstNonEmptyEnv = (env: NodeJS.ProcessEnv, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const raw = env[key];
    if (raw == null) {
      continue;
    }
    const trimmed = raw.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};
