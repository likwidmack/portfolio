# Interaction redesign (Likwidmack, September 2026)

A focused pass on how visitors and the site owner **use** the portfolio: readable contrast in both themes, no lost work, navigation that is always visible, no dead ends, simpler browsing and a safer Style Studio. The visual identity (warm near-black grounds, deep red, ember, clay, condensed display type) is unchanged.

- Design spec: superpowers/specs/2026-09-23-likwidmack-redesign-design.md
- Implementation plan: superpowers/plans/2026-09-23-likwidmack-redesign.md

## Why

| Problem (before)                                                                                               | Who it hurt                                         | Fix                                                                                         |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Focus outline was the brand red (2.7:1 on the dark page) and personalization re-applied it at runtime          | Keyboard users                                      | AA focus colour from the theme; personalization no longer overrides it                      |
| Form borders were an 8 % hairline                                                                              | Everyone filling a field (especially in light mode) | `--border-strong` (≥3:1)                                                                    |
| Every destination was hidden behind **Menu** at all widths                                                     | First-time visitors, recruiters                     | Inline primary nav from 768 px with the current page marked; visible **Get in touch**       |
| Work cards had three links to the same story                                                                   | Keyboard and screen-reader users                    | One link per card                                                                           |
| Case studies ended without a next step                                                                         | Visitors walking the work                           | Previous / next story + **Get in touch** at the end                                         |
| Splash hid “Continue from…” under numbered doors                                                               | Returning visitors                                  | **Resume** first; doors unnumbered with a scope line                                        |
| Browse filters had two controls per facet and no result count                                                  | Gallery and Docs visitors                           | One control per facet, counts, “Showing N of M”, Clear filters, filters in the URL          |
| Style Studio discarded unapplied edits on leave, deleted setups with one click, and allowed unreadable colours | Anyone personalizing the site                       | Draft kept until Apply/Discard, Undo for deletes, live contrast checks with one-click fixes |
| Camera background asked for the webcam without explanation                                                     | Privacy-conscious visitors                          | Explains first; switches only after “Turn on camera”                                        |
| Admin media page was an id table with raw JSON recipes                                                         | Site owner                                          | Drop zone, thumbnail grid, detail drawer, named variant presets                             |

## What changed, by page

| Surface                           | Change                                                                                                                                                                                   | Code                                                                                                                                          |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| All pages                         | Contrast roles `--focus-ring`, `--link-color`, `--border-strong`, `--primary-fill`/`--on-primary`, `--success-ink`/`--danger-ink`                                                        | `theme/core` — [packages/theme.md](../../packages/theme.md#contrast-roles)                                                                    |
| Header                            | Inline rail Work · About · Gallery · Writing · Code (≥768 px), `aria-current`, **Get in touch**, Personalize icon button                                                                 | `AppPrimaryNav`, `shared/primary-nav.ts`                                                                                                      |
| Splash `/`, `/splash`             | Resume bar first; unnumbered doors with scope; “Go straight to where I left off next time”                                                                                               | `AppSplash`, `content/home.json`                                                                                                              |
| Work `/work`                      | Whole card is one link; “Read the story →”                                                                                                                                               | `AppWorkCard`                                                                                                                                 |
| Case study `/work/:slug`          | Previous / next story + Get in touch                                                                                                                                                     | `AppStoryPager`, `adjacentStudies()`                                                                                                          |
| Code `/code`                      | Fluid reader: package filter (shared toolbar), accessible snippet tabs (arrows, Home/End), one panel with code + facts, Copy, View source ↗; package cards; `?group=…&item=…` deep links | `pages/code/index.vue`, `shared/code-types.ts`, `shared/public-repo.ts`                                                                       |
| Gallery, Docs                     | Browse toolbar with counts, live status, Clear filters, URL state                                                                                                                        | `AppBrowseToolbar`, `useBrowseQuery`, `shared/browse-query.ts` — [gallery-and-docs.md](./gallery-and-docs.md#browse-toolbar-appbrowsetoolbar) |
| Style Studio `/styles`            | Role-first editing, contrast guard, sticky draft bar, setup Undo, pack tiles                                                                                                             | `AppStyleStudio`, `shared/contrast-guard.ts` — [personalization.md](./personalization.md)                                                     |
| Component parity `/styles/parity` | Kitchen sink moved off Style Studio (`/styles/kitchen-sink` redirects)                                                                                                                   | `pages/styles/parity.vue`, `AppStylesParity`                                                                                                  |
| Personalize dialog, Studio        | Shared background picker with camera consent                                                                                                                                             | `AppBackgroundPicker`                                                                                                                         |
| Admin `/admin/media`              | Drop zone, Kind counts, grid, drawer, presets, confirm + Undo                                                                                                                            | `core/admin`, `app/utils/media-presets.ts` — [admin.md](./admin.md#local-media-library-dam)                                                   |

## Rules that keep it this way

1. Text and controls use the contrast roles; brand colours are for fills. Tests fail if a role drops below its minimum (`theme/core/tests/contrast-roles.spec.ts`).
2. One primary action per view; one link or button per object (card, door, asset).
3. Every story or result list offers a next step (pager, Clear filters, Retry).
4. Changes that can be lost are kept until the person applies or discards them; destructive actions confirm in place and offer Undo.
5. Status is always a word (and often a glyph), never colour alone.

## TODO

### Admin media library: all media types

The DAM is meant to hold **audio, video, images, SVG (vector), 3D / XR objects and text documents**. `MediaKind` is `image | svg | audio | video | model | document` (`packages/media/src/kinds.ts`, `@tgmc/media-client`). Editorial facets use **`meta.tags`** (and optional facet keys like `animated` / `panorama`) — not extra kinds or multicategory.

- [x] Add `model` (3D / XR: `.glb`, `.gltf`, `.usdz`), `document` (`.md`, `.txt`, `.pdf`), and `svg` (parallel to raster image) kinds to `@tgmc/media` types, recipe parsing (`parseRecipe`), stub transformers, and `@tgmc/media-client`.
- [x] Admin page: widen the drop-zone `accept`, `guessKind()` (by MIME and extension — `.glb` often has no MIME), the **Kind** filter options and `countByKind()`.
- [x] Tags / meta: `meta.tags` helpers, list `?tag=`, PATCH meta, admin drawer add/remove + tag filter (no subcategory / multicategory kinds).
- [ ] Kind-appropriate tiles and drawer previews (3D: `<model-viewer>`-style poster or placeholder; documents: first-page / text excerpt; audio: waveform; video: poster frame; SVG: inline/object preview).
- [ ] Kind-appropriate variant presets (e.g. 3D poster render / LOD, document thumbnail / text extract, SVG optimize/rasterize, audio preview clip, video poster) — `MEDIA_RECIPE_PRESETS` is image-only.
- [ ] A read-only blob or thumbnail endpoint for admin so tiles show real previews for previously uploaded assets (today only this session's uploads have previews).
- [ ] Pagination / "Load more" past the 100-asset API page (counts are currently "of the latest 100").

### Public repo links (likwidmack/portfolio)

All code / doc links now point to `likwidmack/portfolio` on `main` (repo rule — see `docs/agents/README.md`). The public repo does not yet contain every linked path, so these 404 until the mirror syncs them:

- [ ] `docker/`, `infra/sam/`, `scripts/`, `archive/v3/`, `AGENTS.md`, `.env*.example`, `docs/superpowers/`
- [ ] `packages/image`, `packages/media`, `packages/media-aws`, `packages/media-client`, `packages/media-nuxt` (package `homepage` fields)

### Other follow-ups

- [ ] The default **Crimson** brand pack primary (`#dc4256`) is 4.24:1 with white text. Style Studio flags it; changing the pack's value is a brand decision.
- [ ] Behavioural tests: Cypress smoke for Docs search typing (focus kept), Gallery tile → feed at the tapped post, entry via the Exhibition door; component tests for the Style Studio save / replace / undo flow and the admin upload error path.
- [ ] `useBrowseQuery`: react to external `route.query` changes (e.g. a link to `/gallery?group=x` from the gallery), ignore unknown `group` / `kind` values, debounce `q` writes.
- [ ] Style Studio: a second setup delete within 8 s replaces the first Undo; case-insensitive name matching; re-read the page background on OS scheme changes; group swatches (Brand / Families) as the spec describes.
- [ ] Admin media drawer: focus management and `Esc` to close; guard `selectAsset` against rapid-click races; queue drops made during an upload instead of discarding them; show Undo even when an error message is visible.
- [ ] `@tgmc/theme` `paletteToTokens` / `definitionToTokens` (`theme/core/src/theme.ts`) still set `--focus-ring` to the primary; align them with the contrast role.
- [ ] Derive the splash “6 case studies” scope from the collection count instead of content copy.
- [ ] Owner info: fill the `null` entries you want public in `core/web/content/profile.json` (`contact.phone` / `website` / `location` / `booking`, and `href` for LinkedIn, X, Bluesky, …). Empty entries stay hidden from UI and SEO.
- [x] Automate the 375 / 768 / 1280 responsive · a11y · touch audit — `core/web-e2e/src/e2e/ui-audit.cy.ts` (+ 320px reflow).
- [x] Phone `.page-nav` (`AppPageNav` / `AppWorkSubNav`): below 48em a labelled disclosure ("On this page · <current>", 44px, `aria-expanded`) opens a vertical 44px list; `Esc` / a link tap closes it (`usePageNavDisclosure`). Was a swipe-only row.
- [x] Five-input colour model (primary, secondary, accent, paper, ink → derived grayscale + status tones): plan Task 2b.
- [x] Style Studio: **paper** (background) and **ink** (text) per mode, "other mode uses the inverse" link, live contrast readout, swap / reset, persisted (`tgmc-paper-ink`, FOUC) and in setups. See [personalization.md](./personalization.md#pen--paper).
- [ ] `AnalogClock.vue` is unreferenced (dead since the Sept-4 restyle); archive + remove it like `NxWelcome`.
- [ ] Personalize (quick panel): optional paper / ink presets (e.g. warm, cool, high contrast) reusing `withPaperInk`.
- [x] SCSS hierarchy + units: Tasks 1–7 done (strict units check, page / component contract tests) — docs/superpowers/plans/2026-09-24-scss-hierarchy-and-units.md.
