/**
 * Splash door scope lines ("6 case studies") are content with tokens, so counts stay true as the
 * collections change. `{caseStudies}` → "N case studies" / "1 case study".
 */
export type SplashScopeCounts = { caseStudies: number };

export function resolveDoorScope(scope: string | undefined, counts: SplashScopeCounts): string | undefined {
  if (!scope) return scope;
  return scope.replaceAll('{caseStudies}', () => {
    const n = counts.caseStudies;
    return `${n} case ${n === 1 ? 'study' : 'studies'}`;
  });
}
