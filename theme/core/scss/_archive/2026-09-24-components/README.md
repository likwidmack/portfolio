# Archive: 2026-09-24 — component SCSS (plan Task 6)

Not imported. Component sheets / style blocks before the component layer was scoped
(docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md, Task 6).

| Folder               | Components                                                                                                      | Notes                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `nav-chrome/`        | AppPrimaryNav, AppPageNav (+ AppWorkSubNav), AppPersonalize, AppStoryPager, AppBackgroundPicker                 | scoped; floors; bp mixins; story pager container query                                |
| `cards-browse/`      | AppWorkCard, UiImage, AppBrowseToolbar, GalleryFeedCard, AppEvidenceExamplesDialog                              | card stops reaching into UiImage (`--ui-image-zoom`); dialog = one named global block |
| `studio-atmosphere/` | AppStyleStudio, AppStylesParity, AppDepthField, AppOrbitStage, AnalogClock, AppArchitectureDiagram, UiCodeBlock | scoped; `/* units: scene */` for the 3D scenes; UiCodeBlock owns its code layout      |
| `ui/`                | UiTabs, UiButton, NxWelcome                                                                                     | UiTabs scoped (was global `.p-tabs`); NxWelcome (unused Nx scaffold) removed          |

`.vue` files here are copies for reference only (nothing builds or routes them).
