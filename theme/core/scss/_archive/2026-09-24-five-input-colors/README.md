# Archived styling: 2026-09-24 (five-input colour model, plan Task 2b)

Not compiled or shipped (no `@use` points here).

Before: surfaces, text, secondary text, strong borders and status inks were hand-picked hexes, and the grays (`--gray-*`) were fixed Sass greys with different meanings per mode. After: they derive from **paper** and **ink** (`--neutral-0…1000`, OKLab), and each status keeps its hue with an ink tone mixed toward the text colour for ≥ 4.5:1.

| Role (dark / light) | Before                | After                                         |
| ------------------- | --------------------- | --------------------------------------------- |
| Surface             | `#16100e` / `#f0e9e4` | neutral-950 `#181211` / neutral-50 `#ece8e5`  |
| Surface variant     | `#1c1412` / `#e6dcd5` | neutral-925 `#1d1715` / neutral-100 `#dfdad8` |
| Text                | `#f2ece8` / `#1c1412` | neutral-25 `#f3efec` / neutral-950 `#181211`  |
| Secondary text      | `#baa8a0` / `#5a4a42` | neutral-300 `#aba5a3` / neutral-700 `#4b4543` |
| Strong border       | `#7a675e` / `#8a7870` | neutral-550 `#6e6765` / neutral-500 `#797371` |
| Success ink         | `#3fb5ad` / `#146060` | 80 % hue `#519190` / 100 % `#146060`          |
| Danger (error) ink  | `#f26b4b` / `#b33a0f` | 80 % hue `#cf6a47` / 90 % `#a23713`           |

Files: `theme/core/scss/tokens/_colors.scss`, `theme/core/scss/globals/_root.scss` (from `origin/development`).
