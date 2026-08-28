# `@tgmc/theme` SCSS layout & tokens

## Layers

| File                            | Role                                                                          |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `tokens/_variables.scss`        | Sass SoT for space, radius, blur, transition, shadow, card mins               |
| `globals/_root.scss`            | CSS custom properties only (colors + bridges from Sass tokens)                |
| `globals/_layout.scss`          | Document shell structure (`html`/`body`/`#site_page`)                         |
| `globals/_layouts.scss`         | CUBE composition algorithms (rail / split / auto / stack / cluster)           |
| `globals/_class-selectors.scss` | Stylized formats + utilities (wallpaper, chrome, rules, nav pills)            |
| `globals/_mixins.scss`          | Shared recipes (`theme-wallpaper`, `site-chrome`, `backdrop-blur`, `sr-only`) |

## `:root` hygiene

- Keep **variables** on `:root` — not font-smoothing, vendor text-shadow prefixes, or decorative shadows.
- Font smoothing lives on `html`; default text shadow uses `--text-shadow-root` on `body`.
- Space / radius / blur / transition / shadow CSS vars mirror Sass tokens (`--space-*`, `--border-radius-*`, `--blur-*`, etc.).

## Opt-in surface classes

| Class              | Use                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `.theme-wallpaper` | Conic brand tile background (also default on `body`)                                      |
| `.theme-motion`    | Soft color/shadow transitions (also default on `body`; respects `prefers-reduced-motion`) |
| `.site-chrome`     | Glass bar finish for sticky header/footer (`site.vue` applies this)                       |
| `.theme-rule`      | Soft section divider (`hr` uses the same recipe)                                          |
| `.nav-pills`       | Pill-cluster nav links                                                                    |

## CUBE track mins

`--card-min`, `--card-min-md`, `--card-min-compact`, `--stack-min` drive auto/stack/split grids in `_layouts.scss`.
