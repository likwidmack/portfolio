# Archive: 2026-09-25 — colour system, pages and components (Task 5)

Not imported. These are snapshots of the `core/web/app` sheets at `9a4db0133`, taken before their colour literals and component colour variables were replaced (spec rule 5). The `.vue` snapshot keeps only its `<style>` block.

Pure renames are not archived. Those are `var(--old)` → `var(--new)`, done by `scripts/rename-color-vars.mjs`, where every old name aliases its new one.

Not archived either, because they are one-line edits that git history shows in full:

- The `var(--on-primary, #fff)` fallback drops in `AppPrimaryNav.scss`, `AppStoryPager.vue` and `pages/index.scss`. The name is always declared, so the value is unchanged.
- The undeclared `--text-color-secondary` references in `AppPrimaryNav/index.vue`, `GalleryFeedCard.vue` and `pages/blog/index.scss`. Each became the value it already resolved to (`inherit`, or the text colour).
- The `/styles/parity` "Accent wash" specimen (`AppStylesParity/index.vue`). This one is script data, not a sheet. It read an undeclared `--primary-color-default` and painted nothing; it now paints the accent at 16% (background) and 35% (border).

| File                                            | What changed                                                                                                                                                         |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/AppDepthField/AppDepthField.scss`   | The grid floor / ceiling masks move from `#000` to `var(--theme-paper-dark-color)`. A mask only reads alpha, so the paint is identical.                              |
| `components/AppPersonalize/AppPersonalize.scss` | The unused `&__swatches` / `&__swatch` rules are removed. No element has these classes, and they read an undeclared `--swatch`.                                      |
| `components/AppStyleStudio/AppStyleStudio.scss` | `background: var(--swatch) !important` is removed. The palette swatch is now set inline as `background: <hex> !important`, so no colour custom property is declared. |
| `components/AppWorkCard/AppWorkCard.scss`       | The diagram ground was surface 82% mixed with `#000`. It is now mixed with `var(--theme-paper-dark-color)` (ΔE 0.8).                                                 |
| `components/ui/UiImage.scss`                    | `--ui-image-bg` / `--ui-image-ink` are removed. The sheet paints the theme surface and text colours, and the component sets a dominant colour and its ink inline.    |
| `pages/code/index.scss`                         | The traffic-light dots move to the palette `--red-color` / `--amber-color` / `--green-color` (owner decision). Their ring, black at 20%, becomes dark paper at 20%.  |
| `pages/media-player.vue`                        | The video letterbox moves from `#000` to `var(--theme-paper-dark-color)` (`#0f0908`).                                                                                |
