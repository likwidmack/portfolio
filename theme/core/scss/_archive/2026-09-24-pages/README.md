# Archive: 2026-09-24 — page SCSS (plan Task 5)

Not imported. Page sheets / style blocks (and the components that took over page restyling)
before the page layer was scoped and cleaned up
(docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md, Task 5).

| Folder                         | Pages                                                                                         | Notes                                                                                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work/`                        | `/work`, `/work/[slug]`, `AppWorkCard.scss`                                                   | `pages/work/styles/` flattened; card row layout → `AppWorkCard layout="row"` (container query); case-study sections full width, intrinsic artifact grid |
| `gallery-docs-code/`           | `/gallery`, `/docs`, `/docs/[...slug]`, `/code`, `AppBrowseToolbar.vue`, `GalleryExhibit.vue` | toolbar one-row look → `AppBrowseToolbar inline`; exhibit media fill → `GalleryExhibit`; code reader picker ↔ side list by container query              |
| `about-process-ailab-blog/`    | `/about`, `/process`, `/ai-lab`, `/blog`, `/blog/[slug]`, `AppPageNav.scss`, `UiTimeline.vue` | embedded nav → `AppPageNav embedded`; phone timeline → `UiTimeline` (alternate, container query); blog feature split by container query                 |
| `splash-styles-product-media/` | home splash (`pages/index.scss`), `/product`                                                  | scoped; UiPanel roots via scope                                                                                                                         |

`.vue` files here are copies for reference only (nothing builds or routes them).
