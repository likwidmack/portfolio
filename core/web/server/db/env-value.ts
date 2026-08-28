/**
 * Treat blank / whitespace-only strings as unset.
 *
 * Nuxt bakes empty defaults into runtimeConfig (`DATABASE_URL = ''`, etc.).
 * Those empty strings must not block `??` / env fallbacks to process.env
 * (Docker sets DATABASE_URL at runtime; Lambda sets AWS_REGION).
 */
export const nonEmpty = (value: string | undefined | null): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};
