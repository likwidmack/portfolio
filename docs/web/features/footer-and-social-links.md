# Footer and social links

## Footer (`core/web/app/layouts/site.vue` + `site.scss`)

- **Slim:** one row on tablet+ (credit · social links), a centred two-row stack on phones. The theme page shell (`#site_page` in `theme/core/scss/_layout.scss`) no longer pads the footer; the row sets a compact rhythm around 44px links. Measured: 59px desktop, 59px tablet, 108px phone (was 100 / 168 / 150).
- **Stays at the bottom** of short pages: `#site_page` is a `min-height: 100dvh` flex column and `main` is `flex: 1 1 auto`, so the footer sits on the viewport floor when content is short and after the content when it's long.
- **Personalize is header-only** (the footer duplicate was removed; the header button opens the same dialog on every width).
- Responsive · accessible · touch: every footer control is a 44px target, text ≥ 12px, nothing overflows at 375 / 768 / 1280.

## `AppSocialLinks`

```pug
AppSocialLinks //- icon + visible label (default)
AppSocialLinks(variant="icons") //- icon-only 44px buttons, name on the link
AppSocialLinks(:include-email="false")
```

- **Data:** `content/profile.json` is the single source for owner info. `contact` holds `email`, `phone`, `website`, `location`, `booking`, `github` and `social` — every known profile (GitHub, LinkedIn, X, Bluesky, Mastodon, Threads, Instagram, Facebook, YouTube, TikTok, Twitch, Dribbble, Behance, Figma, CodePen, GitLab, Stack Overflow, npm, Hugging Face, Medium, DEV, Substack, Podcast) plus reference links (portfolio source, RSS). Each entry is `{ id, label, href, icon, kind }`, validated in `content.config.ts`.
- **`null` means off:** unused entries stay in the file with `href: null` (or `phone: null`, …). `socialLinks()` / `profileSameAs()` / `personContactJsonLd()` in `core/web/shared/social-links.ts` drop them, so they never render and never reach SEO. Fill a value and it appears in the footer and, for `kind: "profile"` (identities) and `website`, in JSON-LD `sameAs`; `phone` / `location` become `telephone` / `homeLocation`. `kind: "reference"` links (portfolio source, RSS) are UI-only.
- **Rules:** code / doc references point at the public mirror (`https://github.com/likwidmack/portfolio`, see `shared/public-repo.ts`). External links open in a new tab with `rel="noopener noreferrer"` and announce "(opens in a new tab)". No hover-only tooltips — `labels` shows text; `icons` keeps the name on the link.
- **Turning a link on:** set its `href` in `profile.json` — icons for every entry are already bundled. A brand-new entry also needs its Lucide `icon` in `icon.clientBundle.icons` in both `core/web` and `core/admin` `nuxt.config.ts`; `core/web/tests/ui-floors.spec.ts` checks both and that `null` entries stay out of UI and SEO.
