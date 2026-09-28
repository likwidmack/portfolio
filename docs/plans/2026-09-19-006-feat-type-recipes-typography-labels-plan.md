---
title: Type Recipes Typography Labels - Plan
type: feat
date: 2026-09-19
topic: type-recipes-typography-labels
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Type Recipes Typography Labels - Plan

## Goal Capsule

**Objective:** Unify headings and chrome labels across all `core/web` CSS onto shared type recipes so primary headers use display/title font roles and mono chrome splits into eyebrow/kicker vs meta/label tiers.

**Product authority:** This plan owns typography + labels only. Layout/boxing and collapsible sidebars/sub-navs are ordered follow-ups, not active scope. Product Contract from `ce-brainstorm` — **Product Contract unchanged**.

**Open blockers:** None.

**Stop:** Do not redesign body copy stacks, add webfonts, restyle `theme/primevue`, or start layout/boxing or collapsible-nav work in this pass.

## Product Contract

### Summary

Introduce type recipes that compose existing theme font-family and size tokens. Shared globals apply them to primary headers and two mono chrome tiers. Style Studio, playground, and other `core/web` surfaces must follow the same recipes. Contract tests pin the recipes; inline comments document the ladder.

### Problem Frame

Theme already exposes `--font-family-header|title|display` and a fluid size scale, but portfolio pages largely hard-code mono on headings. Labels and small spans diverge by sheet. Visitors and hiring managers see uneven type; contributors keep inventing one-offs.

### Key Decisions

- **Hybrid title voice** — major titles use display/title; eyebrows, nav, tags, and small labels stay mono. `(session-settled: user-directed — chosen over all-mono or full role ladder: activate unused display/title without abandoning editorial mono chrome.)` Governs R1, R2.
- **Two chrome tiers** — eyebrow/kicker vs meta/label, both mono, used deliberately. `(session-settled: user-directed — chosen over one chrome recipe or leave-as-is variety.)` Governs R3, R4.
- **Surfaces** — every sheet that ships CSS under `core/web`, including Style Studio and demos. `(session-settled: user-directed — chosen over public-only or public+studio-only.)` Governs R5.
- **MVP emphasis** — primary headers + font-family recipes are the first visible win; chrome tiers still ship in the same pass. `(session-settled: user-directed — smallest shippable value named as primary headers.)` Governs R1, R6.
- **Approach B** — recipe tokens consumed by globals (and mixins), not globals-only inheritance or per-template theme class hunting. `(session-settled: user-directed — chosen over A or C.)` Governs R1–R5, R7.

### How This Work Fits Together

<!-- ce-section: work-relationships -->

This plan owns **typography + labels** only. Broader UI polish from the parent request is ordered context, not a committed roadmap:

- Type recipes (this plan)
  - **Enables:** clearer visual hierarchy for later layout/boxing review
- Layout & boxing review
  - **Depends on:** type recipes so boxing review does not re-litigate heading/label fonts
  - **Can proceed independently of:** collapsible chrome once type is stable
- Collapsible sidebars / sub-navs (responsive)
  - **Depends on:** stable page-nav / label chrome tokens from this plan where those surfaces share recipes
  - **Still to decide:** collapse interaction shape (details/summary, disclosure button, drawer) — deferred to that plan’s brainstorm

### Requirements

**Titles**

- R1. Primary page headers (`h1` and major title treatments on portfolio pages) use display/title type recipes backed by `--font-family-display` / `--font-family-title` (not mono).
- R2. Secondary section headings that are not chrome use the title recipe or the next documented step on the same ladder; they must not invent a third family.

**Chrome tiers**

- R3. Eyebrow/kicker surfaces (existing eyebrow containers and equivalent kickers) share one mono recipe (family, size, weight, tracking, case).
- R4. Meta/label surfaces (tags, jump labels, small UI spans used as labels) share a second mono recipe distinct from the eyebrow tier.

**Coverage & ownership**

- R5. Any `core/web` stylesheet or Vue style block that sets heading or chrome label typography must consume the recipes (or documented aliases), including Style Studio, playground, and snippet layouts when they diverge.
- R6. Shipping order within the pass prioritizes primary headers, then maps chrome tiers; both are required for acceptance.
- R7. Recipes compose theme CSS variables already on `:root`; they do not introduce a second hex or font-file SoT.

**Verification & docs**

- R8. Contract tests assert recipe presence and that primary portfolio headings bind to display/title recipes (not only that selectors exist).
- R9. Inline comments at recipe definition and globals consumers document the ladder (display/title vs eyebrow vs meta) for future contributors.

### Visualizations

Type ladder (conceptual):

```text
Body            → --font-family (+ size scale)
Primary header  → display recipe  (--font-family-display + size/weight)
Section title   → title recipe    (--font-family-title + size/weight)
Eyebrow/kicker  → chrome eyebrow  (--font-family-mono + kicker metrics)
Meta/label/tag  → chrome meta     (--font-family-mono + meta metrics)
```

### Acceptance Examples

- AE1. Covers R1, R6. **Given** splash / work / about primary headers, **when** styles resolve, **then** computed font-family matches the display or title recipe, not mono.
- AE2. Covers R3, R4. **Given** an eyebrow and a tag on the same page, **when** styles resolve, **then** both are mono but differ on the documented kicker vs meta metrics (size and/or tracking/case as defined by the recipes).
- AE3. Covers R5. **Given** Style Studio or a playground/demo sheet that previously hard-coded heading fonts, **when** the pass ships, **then** those surfaces use the same recipes as public pages.
- AE4. Covers R8. **Given** CI unit tests for app SCSS contracts, **when** someone reverts portfolio `h1` to mono, **then** a contract test fails.

### Success Criteria

- A cold reader on splash and a work/about title sees display/title headers and consistent eyebrow vs meta chrome.
- Contributors can pick a recipe from comments/docs without inventing a one-off `font-family`.
- `app-scss-sot` (or a sibling contract) pins heading recipe binding, closing the current gap where only selector presence is tested.

### Scope Boundaries

**In scope**

- Type recipes, globals/mixin consumers, migration of divergent `core/web` heading/label typography, tests, inline comments, brief living-doc updates.

**Deferred for later**

- Layout & boxing review (next ordered polish).
- Collapsible sidebars / sub-navs (after boxing).
- Body copy typeface changes beyond existing `--font-family`.
- New webfont files or replacing IBM Plex stacks.

**Outside this product's identity**

- Restyling PrimeVue vendor theme SCSS under `theme/primevue` as a general typography redesign.

### Dependencies / Assumptions

- Theme `--font-family-display|title|header` and fluid `--font-size-*` remain SoT on `:root` (confirmed in theme `_root.scss`).
- Launch-emit ownership of shared selectors (`_globals.scss` via portfolio-launch) stays in force per App SCSS hybrid split.
- Display and title may currently resolve to the same underlying header family token; visual change is still required where mono is replaced by that role.

### Outstanding Questions

**Resolve Before Planning:** none.

**Deferred to Planning:** answered in Planning Contract KTDs below (recipe names, class→tier map, `--font-family-header` alias).

### Sources / Research

- Grounding dossier (session): typography/labels extraction from theme `_root.scss`, app `_globals.scss` / `_mixins.scss`, spatial-restyle and app-scss docs.
- Claim check: theme font roles and fluid sizes confirmed; `.portfolio-page h1/h2` use mono today; `app-scss-sot` does not yet assert heading `font-family` (nuance for R8).
- Living docs: `docs/web/features/app-scss.md`, `docs/packages/theme.md`, `CONCEPTS.md` (App SCSS hybrid split / Type recipe).
- Planning research: theme `$header-font-family` / `$display-font-family` default to empty; app `_variables.scss` only sets `--font-family` and `--font-family-mono` today — display/title roles must be bound to a real stack before recipes are usable.

## Planning Contract

### Key Technical Decisions

- KTD1. **Bind empty theme header roles in app `:root`.** Set `--font-family-display`, `--font-family-title`, and `--font-family-header` to the same IBM Plex Sans stack as `--font-family` (app override). Theme Sass `$header-font-family` staying empty is fine; CSS consumers must not see an empty family. Governs R1, R7.
- KTD2. **Recipe token names (app-owned, `--type-*`).** Emit composed recipes on `:root` via `_variables.scss`:
  - `--type-display` — `font-family: var(--font-family-display)` (+ keep existing h1 size/weight/tracking on the selector, not necessarily in the custom property if multi-value `font` shorthand is awkward)
  - Prefer **property-group recipes** as documented custom properties for family plus optional companion vars `--type-eyebrow-size`, `--type-eyebrow-tracking`, etc., OR mixin-applied recipes that read those vars.
  - Chosen shape: **CSS vars for family + metrics**, mixins apply the group (`portfolio-type-display`, `portfolio-type-title`, `portfolio-type-eyebrow`, `portfolio-type-meta`). Governs R3, R4, R7.
- KTD3. **Eyebrow vs meta metrics (freeze from current globals).** Eyebrow = today’s `portfolio-eyebrow` (0.7rem, 700, 0.24em, uppercase, primary color). Meta = today’s `.tag` type (mono, 0.7rem, 0.04em tracking, secondary text color; border/padding stay on `.tag` selectors, not the type recipe). Nav link chrome and footer mono map to **meta** (or `@include portfolio-type-meta`) unless already eyebrow-classed. Governs R3, R4.
- KTD4. **`--font-family-header` is an alias of title** in app `:root` (`var(--font-family-title)`), not a third heading voice. Governs R2.
- KTD5. **Migration rule.** Replace `font-family: var(--font-family-mono)` on portfolio `h1`/`h2` with display/title recipes. Leave mono on buttons, code, and intentional meta chrome. Page-local size clamps on titles may remain; family must come from recipes. Governs R5, R6.

### Assumptions

- IBM Plex Sans for display/title is the intended hybrid look (not a new display face).
- `cdn-test.vue` system-mono stack can move to `var(--font-family-mono)` / meta recipe without product change.
- NxWelcome / unused demos still count under R5 if they ship under `core/web` and set heading fonts.

### Technical Design

1. `_variables.scss` — bind display/title/header families; declare `--type-*-*` metric vars; comment the ladder (R9).
2. `_mixins.scss` — `portfolio-type-display|title|eyebrow|meta` (eyebrow refactor of `portfolio-eyebrow` to compose vars; keep `portfolio-eyebrow` as alias include for back-compat).
3. `_globals.scss` — `.portfolio-page h1` → display; `h2` → title; tags → meta mixin; eyebrow selectors keep eyebrow mixin.
4. Sweep high-traffic sheets (splash `index.scss`, about, gallery, work styles, AppPrimaryNav, AppWorkCard, AppPageNav, site footer, Style Studio) to drop redundant family declarations or include recipes.
5. Extend `app-scss-sot.spec.ts` (and optionally a slim `type-recipes.spec.ts`) per R8 / AE4.

### Sequencing

U1 → U2 → U3 → U4 (tests can start after U2; U3 migration before declaring done).

## Implementation Units

### U1. Bind font roles and emit type recipe tokens

- **Goal:** Make display/title/header families real and publish `--type-*` metrics + mixins.
- **Files:** `core/web/assets/css/_variables.scss`, `core/web/assets/css/_mixins.scss`
- **Patterns:** Existing portfolio `:root` emit; `portfolio-eyebrow` as template for meta.
- **Requirements:** R3, R4, R7, R9
- **Test scenarios:**
  - File contract: `_variables.scss` contains `--font-family-display`, `--font-family-title`, `--type-eyebrow`, and comments naming the ladder.
  - File contract: `_mixins.scss` exposes `portfolio-type-display`, `portfolio-type-title`, `portfolio-type-eyebrow`, `portfolio-type-meta` (and `portfolio-eyebrow` still works as alias).
- **Verify:** `npx vitest run tests/app-scss-sot.spec.ts` (updated assertions)

### U2. Wire globals heading + chrome consumers

- **Goal:** Portfolio primary headers leave mono; shared chrome classes use eyebrow vs meta recipes.
- **Files:** `core/web/assets/css/_globals.scss`
- **Patterns:** Launch-emit once; do not `@use` globals from pages.
- **Requirements:** R1, R2, R3, R4, R6, R8
- **Test scenarios:**
  - AE1/AE4: `_globals.scss` `.portfolio-page h1` uses display recipe / `--font-family-display`, not `--font-family-mono`.
  - `.portfolio-page h2` uses title recipe / `--font-family-title`.
  - `.tag` / eyebrow selectors include meta/eyebrow mixins (or equivalent var applications).
- **Verify:** vitest app-scss-sot / type-recipes contracts

### U3. Migrate divergent `core/web` sheets

- **Goal:** Remove or rebind one-off heading/label `font-family` declarations so public + studio + demos share recipes.
- **Files (expected touch list — trim if already inheriting):**
  - `core/web/app/pages/index.scss` (splash door index — keep mono via meta if label, not as title)
  - `core/web/app/pages/about.vue` (uppercase label spans → meta/eyebrow)
  - `core/web/app/pages/gallery/index.scss`
  - `core/web/app/pages/work/styles/index.scss`
  - `core/web/app/components/AppPrimaryNav/AppPrimaryNav.scss`
  - `core/web/app/components/AppWorkCard/AppWorkCard.scss`
  - `core/web/app/components/AppPageNav/AppPageNav.scss` (if present)
  - `core/web/app/layouts/site.scss` (footer)
  - `core/web/app/components/AppStyleStudio/**` and playground/snippet layouts as needed
  - `core/web/app/pages/cdn-test.vue` (replace raw ui-monospace stack)
- **Patterns:** Prefer deleting redundant `font-family` when globals/mixin already apply; otherwise `@include portfolio-type-*`.
- **Requirements:** R5, R6
- **Test scenarios:**
  - Grep/contract: no `.portfolio-page h1|h2 { font-family: var(--font-family-mono) }` outside allowed exceptions (none expected).
  - AE3: Style Studio / demo heading rules reference recipes or inherit globals.
- **Verify:** vitest contracts + spot-check splash/about in browser if available

### U4. Docs + CONCEPTS alignment

- **Goal:** Living docs describe the type ladder; CONCEPTS already has Type recipe / Chrome type tier — refresh app-scss + theme docs pointers.
- **Files:** `docs/web/features/app-scss.md`, `docs/packages/theme.md` (brief), `CONCEPTS.md` (only if wording drift)
- **Requirements:** R9
- **Test scenarios:** doc mentions `--type-*` / display vs eyebrow vs meta; no claim that app owns document shell `_layout.scss` if already moved to theme.
- **Verify:** doc skim / optional link from app-scss-sot comments

## Verification Contract

- **Unit / contract:** `cd core/web && npx vitest run tests/app-scss-sot.spec.ts` (and new `tests/type-recipes.spec.ts` if split out)
- **Optional:** `tests/home-page.spec.ts` if splash styles assert mono on titles today — update expectations
- **Quality gates:** pre-commit lint-staged; do not require full `npm test` unless touching shared theme build
- **Manual:** splash + about + `/styles` — headers sans; eyebrows vs tags visibly different tracking

## Definition of Done

- [ ] R1–R9 satisfied; AE1–AE4 covered by contracts or manual checklist noted in PR
- [ ] U1–U4 complete; no unresolved Resolve Before Planning items
- [ ] Living docs + CONCEPTS consistent with shipped recipes
- [ ] Commit on feature branch; PR to `development` when ready (no direct push to development/main)
