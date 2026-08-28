/**
 * `@nuxtjs/i18n` options. `prefix_except_default` requires an explicit `defaultLocale`.
 */
export const i18n = () => ({
  defaultLocale: 'en',
  locales: [
    {
      code: 'en',
      language: 'en-US',
      name: 'English',
    },
  ],
  strategy: 'prefix_except_default' as const,
});

export default i18n;
