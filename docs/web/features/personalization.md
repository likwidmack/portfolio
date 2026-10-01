# Personalization & Style Studio

Runtime preferences for color mode, **brand roles** (primary / secondary / accent), **paper & ink** (per mode), motion, and background live in `core/web/shared/personalization.ts`.

| Surface                                                    | Role                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personalize** (`AppPersonalize`)                         | Color mode, depth-field background via shared `AppBackgroundPicker` (camera consent, custom hex), named setups, theme studio presets (palette collections and light/dark colors), reset, **Open studio** → `/styles`. **Done** defers dialog close one tick so the closing click cannot fall through onto the phone Menu trigger. |
| **Style Studio** (`/styles`, `AppStyleStudio`)             | Role-first editor (Primary · Secondary · Accent) with live WCAG readout and one-click fixes, paper & ink for the current mode, motion, background, sticky draft bar (Discard changes · Save as setup · Apply), setups with Undo                                                                                                   |
| **Component parity** (`/styles/parity`, `AppStylesParity`) | Native / Foundation / PrimeVue kitchen sink for engineers (was the lower half of `/styles`; `/styles/kitchen-sink` redirects here)                                                                                                                                                                                                |

## Brand roles

| Role      | Default relation to primary                                                                                                                                                              | Override                                      |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Primary   | Source color: a single hue’s light or dark hex, or a palette’s lightest / darkest swatch                                                                                                 | —                                             |
| Secondary | Analogous step (`Color.resolveBrandRoles`). The larger of black or white, when it beats colorfulness, sets the hue sign: negative and lighter near black, positive and darker near white | Editable; locks until primary changes / reset |
| Accent    | Complementary (`Color.resolveBrandRoles` / `Color.brandAccent`)                                                                                                                          | Editable; locks until primary changes / reset |

Picked hexes apply **as-is** to CSS `--primary-color`, `--secondary-color`, `--accent-color` (and `--button-fg`). `--focus-ring` is **not** overwritten — it stays on the theme's AA role so a low-contrast brand pick never hides keyboard focus.

**Derive from primary** (Studio switch on Secondary / Accent) maps to `secondaryLocked` / `accentLocked` via `withDerivedRole()`: on = unlocked and re-derived from primary; off = keep the current hex.

Studio presets (`Theme.presets()`, `theme/core/src/theme-presets.json`) use one derivation for single colors, packs, and palettes. The source is the light/dark hue pair, or the palette’s lightest and darkest swatches. Missing secondary and accent are filled from that source. A background triad uses extra swatches when the palette has them, and otherwise the same three roles. `buildPresetBackgroundTokens` then shifts **only the color’s lightness**: the brand triad until it is ≥ 3:1 against that mode’s paper, and the background triad (and each background-image stop) until it is ≥ 4.5:1 against that mode’s ink. Ink and paper are not changed. Light and dark values are written as `--portfolio-*-light` / `--portfolio-*-dark`; the unsuffixed variables follow the active theme.

Style Studio lists **Packs** and **Colors**. A row shows only the current theme: a gradient from that mode’s primary to its secondary. Label text is `var(--text-color)` or `var(--text-secondary-color)`, whichever contrasts better with those fills. A pack with no background selects Particles; a pack with a background selects Custom and fills those options.

Primary-source inventory of Theme colour inputs (a snapshot; the catalog above is current): [theme-studio-preset-research.md](./theme-studio-preset-research.md).

### Contrast guard

`core/web/shared/contrast-guard.ts` checks the role being edited against the live `--main-background`:

| Check                          | Minimum | Fix button                                                                       |
| ------------------------------ | ------- | -------------------------------------------------------------------------------- |
| White text on the role fill    | 4.5:1   | “Darken until it passes” (`nearestPassingShade(hex, '#ffffff', 4.5, '#000000')`) |
| Any role as a mark on the page | 3:1     | “Use nearest passing shade” (toward white on dark pages, black on light)         |

Text links never use the brand primary — they use the theme's `--link-color` — so no role is checked at 4.5:1 on the page. (On the near-black ground, “white text on it ≥ 4.5:1” and “on the page ≥ 4.5:1” cannot both hold for any colour; the 3:1 mark rule always leaves a passing range, pinned by `tests/contrast-guard.spec.ts`.)

Paper ivory/ink constants resolve through `shared/portfolio-chrome.ts` (theme `themeColors`). Atmosphere `--portfolio-*` chrome stays on CSS vars in the UI; JS recipe mirrors for agents/tests are documented in [app-scss.md](./app-scss.md#atmosphere-recipe-table-sass--js).

## Pen & paper

Paper is the **background** and ink the **foreground (text)** in every mode; the theme derives every surface, grey, border and status tone between them (see [theme five-input model](../../packages/theme.md#five-input-colour-model)). Each mode has its own pair.

| Piece                                                               | Where                                                                                                                |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| State `{ light: {paper, ink}, dark: {paper, ink}, linked }`         | `PaperInkState`, `defaultPaperInk()` (`shared/personalization.ts`)                                                   |
| Edit one mode (linked → the other mode is the same colours swapped) | `withPaperInk(state, mode, pair)`; `withPaperInkLinked(state, linked, from)`                                         |
| Tokens written                                                      | `--paper` / `--ink` for the **resolved** mode (`buildPaperInkTokens`), re-applied on every mode change               |
| Storage                                                             | `tgmc-paper-ink` (JSON; removed when it equals the defaults); FOUC script sets the resolved mode's pair before paint |
| Setups                                                              | `StyleSetup.paperInk`; setups saved earlier apply the defaults                                                       |

**Style Studio → Paper & ink · <mode> mode:** colour picker + hex for Paper (background) and Ink (text), a strip previewing page → surface → variant → border → secondary → text plus ink alpha washes (8 / 24 / 48 %), the checkbox **"<other> mode uses the inverse"** (on by default), a live readout from `checkPaperInk()` (text and secondary text ≥ 4.5:1, control borders ≥ 3:1), **Swap paper and ink** and **Reset paper and ink**. All controls are labelled, ≥ 44 px, and wrap at phone width. Like every Studio edit it previews site-wide and commits on **Apply**.

**Colour mode in the draft.** Picking a mode in Studio previews it; **Apply** now commits it (`commitLive` → `setThemeMode(mode, { persist: true })`) and **Discard changes** restores the committed mode.

## Draft vs committed

Style Studio edits preview through `$themeTokens.updateTokens` **without** writing `localStorage` until **Apply** or **Save as setup**. The draft **survives in-app navigation** (state lives in `useState`) and keeps previewing site-wide until **Apply** or **Discard changes**; a full reload restores the committed prefs, so the app-level `plugins/style-draft-guard.client.ts` (via `useUnsavedDraftGuard`) asks before reload/close while the draft is dirty — on any page, not just `/styles`. Personalize quick-apply always commits.

Saving under an existing name asks inline “Replace ‘NAME’?” (Replace / Save as new); an empty name shows “Name this setup”. Deleting a setup shows “Deleted ‘NAME’ · Undo” for 8 s; Undo calls `restoreSetup()` (`restoreStyleSetup()` keeps the original position and active state).

## Named setups

App-owned snapshots (not `Theme.create` packs):

```ts
type StyleSetup = {
  id: string;
  name: string;
  brandRoles: BrandRolesState;
  motion: MotionPreference;
  background: BackgroundMode;
  backgroundCustom?: string;
  mode?: 'system' | 'light' | 'dark';
};
```

## Storage

| Key                       | Value                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| `tgmc-brand-roles`        | JSON `{ primary, secondary, accent, secondaryLocked?, accentLocked? }` (committed live)                |
| `tgmc-accent`             | Palette id or `color*` id from theme JSON. Legacy `ember` / `crimson` values are ignored               |
| `tgmc-motion`             | `system` / `playful` / `reduced`                                                                       |
| `tgmc-background`         | `particles` / `grid` / `camera` / `custom`                                                             |
| `tgmc-background-custom`  | Solid hex when mode is `custom` (default = theme dark `themeColors.dark.background` / `PORTFOLIO_INK`) |
| `tgmc-style-setups`       | JSON array of `StyleSetup`                                                                             |
| `tgmc-style-setup-active` | Active setup id after Apply / quick-apply                                                              |

FOUC head script (`buildPersonalizationFoucScript`) applies **committed** primary + secondary + accent + `--focus-ring` + `--button-fg` before paint. It does not parse the setups array. Hexes and on-fill ink constants are **embedded at script generation time** from theme `Color` / contrast helpers — the IIFE does not import `@tgmc/theme` at runtime in `<head>`.

Paper constants `PORTFOLIO_IVORY` / `PORTFOLIO_INK` read `themeColors.light.background` / `themeColors.dark.background` (Color-normalized). Brand pack primaries that match theme roles also come from `themeColors`; pack-only vivid darks still pass through `Color.toHex`.

## Background · Camera and Custom

Both surfaces use `AppBackgroundPicker`. Choosing **Camera** first shows “Uses your camera locally — nothing is recorded or sent.” with **Turn on camera** / **Cancel**; the mode (and the browser permission prompt) only switches after Turn on camera.

Choosing **Custom** in Personalize or Style Studio enables a color picker + hex field. The field is auto-filled with `DEFAULT_BACKGROUND_CUSTOM` (theme dark background) until the user picks another color. `AppDepthField` then shows a solid `--portfolio-depth-custom` fill instead of particles / grid / camera.

`AppDepthField` mounts once from the site layout (`layouts/site.vue`) so every portfolio page shares the same backdrop. The Docker-only `@tgmc/admin` app does not use that layout and has no depth field.

## UI stack

Studio and Personalize use portfolio `Ui*` wrappers:

- **PrimeVue stack:** `UiColorPicker`, `UiSelect`, `UiInputText`, `UiRadio`, `UiButton`, `UiTag`, `UiDialog`
- **Foundation / native:** same wrappers fall back to native controls; layout uses Foundation XY Grid classes (`grid-x` / `cell`)

Swatch chips come from `Color.brandSwatchCatalog()` (theme roles, semantics, named palettes in `@tgmc/theme`). Helpers: `Color.resolveBrandRoles`, `Color.brandAccent`, `Color.brandSecondaryCandidates`.

## Related

- Theme Color API + Sass `theme-*`: [packages/theme.md](../../packages/theme.md)
- App SCSS / `--portfolio-coral` → `--accent-color`: [app-scss.md](./app-scss.md)
- Brand role harmony / override: `CONCEPTS.md`
- Agent map: docs/agents/map.md (`core/web/shared/personalization.ts`)
- Plan: [plans/2026-09-19-003-feat-style-studio-experience-plan.md](../../plans/2026-09-19-003-feat-style-studio-experience-plan.md)
