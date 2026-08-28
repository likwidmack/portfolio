/**
 * Resolve whether the primary-nav env chip should render and what it should say.
 * Visibility follows Nuxt build-mode `showEnvIndicator`; label follows `SYS_ENV` (`sysEnv`).
 */
export type EnvIndicatorInput = {
  showEnvIndicator?: boolean;
  sysEnv?: string;
};

export type EnvIndicator = {
  show: boolean;
  label: string;
  ariaLabel: string;
};

export function resolveEnvIndicator({ showEnvIndicator = false, sysEnv = '' }: EnvIndicatorInput = {}): EnvIndicator {
  const label = sysEnv.trim() || 'local';
  return {
    show: showEnvIndicator,
    label,
    ariaLabel: `Environment: ${label}`,
  };
}
