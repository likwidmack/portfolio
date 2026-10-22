/**
 * Standard `@nuxt/a11y` configuration for TGMC apps.
 *
 * Configures axe-core with WCAG 2.2 AA rule sets, visual highlights for violations,
 * console logging, and Markdown report output (`a11y-report.md`).
 */
export interface TgmcA11yOptions {
  defaultHighlight?: boolean;
  logIssues?: boolean;
  output?: string;
  failOnViolation?: boolean;
}

export const tgmcA11yConfig = (options: TgmcA11yOptions = {}) => ({
  defaultHighlight: options.defaultHighlight ?? true,
  logIssues: options.logIssues ?? true,
  axe: {
    options: {
      rules: [],
    },
    runOptions: {
      runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa', 'best-practice'],
    },
  },
  report: {
    enabled: true,
    output: options.output ?? 'a11y-report.md',
    failOnViolation: options.failOnViolation ?? true,
  },
});

export default tgmcA11yConfig;
