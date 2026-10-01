# Icons

Site and admin icons are [Lucide](https://lucide.dev/icons) through [`@nuxt/icon`](https://github.com/nuxt/icon), rendered as **inline SVG**. They replaced the PrimeIcons icon font (package and CSS removed).

## Why SVG, not an icon font

| Concern    | Inline SVG (Lucide)                                                                                                  | Icon font (PrimeIcons, removed)             |
| ---------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Responsive | Crisp at any size; sized in `em`, follows text                                                                       | Font hinting blurs at odd sizes             |
| Accessible | `currentColor`, works in forced-colors / high-contrast mode; unaffected by user font overrides (e.g. dyslexia fonts) | Glyphs break or vanish under font overrides |
| Touch      | Icon sits inside a 44px control; never the target on its own                                                         | Same                                        |
| Weight     | Only the icons used are bundled                                                                                      | Whole font downloaded for ~14 icons         |
| Coverage   | ~1,500 icons incl. 3D, audio, video, documents (admin media)                                                         | ~300                                        |

## Using icons

```pug
//- Decorative (default): aria-hidden, the control carries the name
UiButton(label="Copy", icon="copy")
UiIcon(name="download")

//- Icon-only control: name the control, not the icon
UiButton(icon="x", aria-label="Close details")

//- Standalone meaningful icon (rare): label → role="img"
UiIcon(name="triangle-alert", label="Warning")
```

- `UiIcon` (`core/web/app/components/ui/UiIcon.vue`) takes a Lucide name (`lucide:` prefix optional).
- `UiButton` / `UiChip` take the same name through `icon`. `UiButton` is at least 44px tall.
- Admin (`core/admin`, `packages/web-layer-admin`) resolves `UiIcon` from the web `ui` folder.

## Social links

`AppSocialLinks` (`core/web/app/components/AppSocialLinks.vue`) renders `contact.social` from `content/profile.json` plus the contact email — see [footer-and-social-links.md](./footer-and-social-links.md). Each link's `icon` is a Lucide name and must be in `clientBundle.icons`.

## Configuration

`core/web/nuxt.config.ts` and `core/admin/nuxt.config.ts`:

- `mode: 'svg'` — inline SVG (not CSS masks, which disappear in forced-colors mode).
- `provider: 'server'`, `fallbackToApi: false`, `serverBundle.collections: ['lucide']` — icons come from the app's own server bundle, never the public Iconify API.
- `clientBundle.icons` — **every icon name we use.** `UiIcon` names are dynamic, so the build scanner can't find them. When you use a new icon, add `'lucide:<name>'` to the list in both configs. `core/web/tests/icons.spec.ts` fails if a static `icon="…"` / `UiIcon(name="…")` isn't listed.
