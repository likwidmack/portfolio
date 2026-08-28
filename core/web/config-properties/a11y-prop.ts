/**
 * `@nuxt/a11y` defaults: axe rule sets, highlighted violations, Markdown report (`a11y-report.md`),
 * and fail CI/dev when axe reports issues (`failOnViolation`).
 *
 * Keep `enabled` unset (or false in production) so axe-core is not shipped in the client bundle.
 * The module itself defaults to `enabled: nuxt.options.dev`.
 */
export const a11y = () => ({
  // Auto-highlight all violations when detected
  defaultHighlight: true,
  // Log violations to browser console
  logIssues: true,
  // Configure axe-core
  axe: {
    // axe-core configuration options
    options: {
      rules: [],
    },
    // axe-core run options
    runOptions: {
      runOnly: ['wcag2a', 'wcag2aa', 'best-practice'],
    },
  },
  report: {
    enabled: true,
    output: 'a11y-report.md',
    failOnViolation: true,
  },
});

export default a11y;
