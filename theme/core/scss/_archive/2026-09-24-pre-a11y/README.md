# Archived styling: 2026-09-24 (pre responsive, accessible, touch pass)

Old styling is kept here for reference instead of being deleted outright (repo rule). **Nothing here is compiled or shipped**: no `@use`/`@forward` points into `_archive/`, and the theme package only builds what its entry files import.

Source revision: `origin/development` before this branch. `.vue` entries hold only the component's old `<style>` block.

## What changed

- Phone type: `--font-size-default` no longer drops to x0.75 (12px) below 768px; body stays 16px and `--type-min` (12px) floors small text.
- Touch: `--touch-target` (44px) floors buttons, form controls, tabs, page-nav links, back links and checkbox/radio labels; `touch-target` / `font-size-floor` mixins live in `globals/_mixins.scss`.
- Header: blur only (was an 88% tint plus a glow band). Footer slimmed, with `AppSocialLinks`.
- Icons: PrimeIcons font CSS removed in favour of Lucide SVG (`@nuxt/icon`).
- Page-nav links: focus ring restored (was `outline: none` on `:focus-visible`).

## Files

| Live file                                                    | Archived copy                                                |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| `core/web/app/components/AppDepthField/AppDepthField.scss`   | `core/web/app/components/AppDepthField/AppDepthField.scss`   |
| `core/web/app/components/AppOrbitStage/AppOrbitStage.scss`   | `core/web/app/components/AppOrbitStage/AppOrbitStage.scss`   |
| `core/web/app/components/AppPrimaryNav/AppPrimaryNav.scss`   | `core/web/app/components/AppPrimaryNav/AppPrimaryNav.scss`   |
| `core/web/app/components/AppStoryPager.vue`                  | `core/web/app/components/AppStoryPager.vue.style.scss`       |
| `core/web/app/components/AppStyleStudio/AppStyleStudio.scss` | `core/web/app/components/AppStyleStudio/AppStyleStudio.scss` |
| `core/web/app/components/AppWorkCard/AppWorkCard.scss`       | `core/web/app/components/AppWorkCard/AppWorkCard.scss`       |
| `core/web/app/layouts/site.scss`                             | `core/web/app/layouts/site.scss`                             |
| `core/web/app/pages/about.vue`                               | `core/web/app/pages/about.vue.style.scss`                    |
| `core/web/app/pages/blog/index.vue`                          | `core/web/app/pages/blog/index.vue.style.scss`               |
| `core/web/app/pages/code/index.vue`                          | `core/web/app/pages/code/index.vue.style.scss`               |
| `core/web/app/pages/gallery/index.scss`                      | `core/web/app/pages/gallery/index.scss`                      |
| `core/web/app/pages/work/styles/case-study.scss`             | `core/web/app/pages/work/styles/case-study.scss`             |
| `core/web/app/pages/work/styles/index.scss`                  | `core/web/app/pages/work/styles/index.scss`                  |
| `core/web/assets/css/_mixins.scss`                           | `core/web/assets/css/_mixins.scss`                           |
| `theme/core/scss/globals/_button.scss`                       | `theme/core/scss/globals/_button.scss`                       |
| `theme/core/scss/globals/_class-selectors.scss`              | `theme/core/scss/globals/_class-selectors.scss`              |
| `theme/core/scss/globals/_docs.scss`                         | `theme/core/scss/globals/_docs.scss`                         |
| `theme/core/scss/globals/_form.scss`                         | `theme/core/scss/globals/_form.scss`                         |
| `theme/core/scss/globals/_mixins.scss`                       | `theme/core/scss/globals/_mixins.scss`                       |
| `theme/core/scss/globals/_primevue-union.scss`               | `theme/core/scss/globals/_primevue-union.scss`               |
| `theme/core/scss/globals/_root.scss`                         | `theme/core/scss/globals/_root.scss`                         |
| `theme/core/scss/globals/_syntax.scss`                       | `theme/core/scss/globals/_syntax.scss`                       |
| `theme/core/scss/tokens/_button-mixins.scss`                 | `theme/core/scss/tokens/_button-mixins.scss`                 |
| `core/web/app/components/AppPersonalize/AppPersonalize.scss` | `core/web/app/components/AppPersonalize/AppPersonalize.scss` |
| `core/web/app/pages/index.scss`                              | `core/web/app/pages/index.scss`                              |
| `theme/core/scss/_layout.scss`                               | `theme/core/scss/_layout.scss`                               |

## Before PR #169 (`dd3f55376`)

Header tint + glow, PrimeIcons-era buttons/chips, the scrolling browse toolbar and the old /code page styles.

| Live file                                                  | Archived copy                                                      |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `core/web/app/components/AppPrimaryNav/AppPrimaryNav.scss` | `pre-169/core/web/app/components/AppPrimaryNav/AppPrimaryNav.scss` |
| `core/web/app/layouts/site.scss`                           | `pre-169/core/web/app/layouts/site.scss`                           |
| `core/web/app/components/AppBrowseToolbar.vue`             | `pre-169/core/web/app/components/AppBrowseToolbar.vue.style.scss`  |
| `core/web/app/components/ui/UiButton.vue`                  | `pre-169/core/web/app/components/ui/UiButton.vue.style.scss`       |
| `core/web/app/components/ui/UiChip.vue`                    | `pre-169/core/web/app/components/ui/UiChip.vue.style.scss`         |
| `core/web/app/pages/code/index.vue`                        | `pre-169/core/web/app/pages/code/index.vue.style.scss`             |
