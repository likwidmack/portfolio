# Archive: 2026-09-24 — Studio paper & ink (pen & paper per mode)

Not imported. Kept per the archive rule (replaced styling is archived, not deleted).

## What changed

- **Pen & paper per mode.** `--paper` is always the background and `--ink` always the foreground.
  Each mode has its own pair (`$light-paper` / `$light-ink`, `$dark-paper` / `$dark-ink`); dark mode's
  default pair is light mode's, inverted. Before, `--paper` / `--ink` were absolute light / dark
  neutrals and dark mode read the scale backwards (background = `--neutral-1000`).
- **Role steps are now mode-relative** (colours unchanged): dark background `1000 → 0`, secondary /
  surface `950 → 50`, variant `925 → 75`, text `25 → 975`, secondary text `300 → 700`, border-strong
  `550 → 450`. Dark legacy `--gray-*` remapped the same way (`s → 1000 − s`).
- **Alpha variants:** `--paper-a<N>` / `--ink-a<N>` (N = 4, 8, 12, 16, 24, 32, 48, 64, 80, 90);
  `--border-color` is `var(--ink-a8)` in both modes.
- **Static Sass neutrals → runtime roles.** These `light-dark()` washes were compiled from build-time
  hexes, so they ignored paper / ink (and could resolve to the dark value in light mode):

| Where                              | Before                                                                                                                 | After                                                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `globals/_class-selectors.scss:59` | `color: light-dark(rgba($css-surface-light, 0.45), rgba($css-surface-dark, 0.4));`                                     | `color: color-mix(in srgb, var(--surface-color) 42%, transparent);`                                    |
| `globals/_class-selectors.scss:92` | `background-color: light-dark(rgba($css-surface-light, 0.66), rgba($css-surface-dark, 0.4));`                          | `background-color: color-mix(in srgb, var(--surface-color) 55%, transparent);`                         |
| `globals/_container.scss:8`        | `background-color: light-dark(rgba($css-surface-variant-light, 0.08), rgba($css-surface-variant-dark, 0.08));`         | `background-color: color-mix(in srgb, var(--surface-variant) 8%, transparent);`                        |
| `globals/_container.scss:111`      | `color: light-dark(rgba($css-surface-light, 0.35), rgba($css-surface-dark, 0.22));`                                    | `color: color-mix(in srgb, var(--surface-color) 30%, transparent);`                                    |
| `globals/_container.scss:145`      | `background-color: light-dark(rgba($css-surface-light, 0.5), rgba($css-surface-dark, 0.5));`                           | `background-color: color-mix(in srgb, var(--surface-color) 50%, transparent);`                         |
| `globals/_container.scss:146`      | `box-shadow: inset 0 0 8px light-dark(rgba($css-surface-variant-light, 0.24), rgba($css-surface-variant-dark, 0.24));` | `box-shadow: inset 0 0 8px color-mix(in srgb, var(--surface-variant) 24%, transparent);`               |
| `globals/_texts.scss:174`          | `text-decoration: underline dotted light-dark(rgba($text-color-light, 0.65), rgba($text-color-dark, 0.5)) !important;` | `text-decoration: underline dotted color-mix(in srgb, var(--text-color) 60%, transparent) !important;` |
