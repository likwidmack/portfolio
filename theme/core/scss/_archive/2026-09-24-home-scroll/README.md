# Archive: 2026-09-24 — home page scroll

Not imported. The home splash was locked to one viewport, so the page could not scroll and content
was clipped on short or zoomed screens.

- `_site-splash-lock.scss` — the `body:has(.splash-page)` lock from `core/web/app/layouts/site.scss`.
- `core/web/app/pages/index.scss` `.page-content.splash-page` had `max-height: 100%; overflow: hidden`
  (now `min-height: 100%`), and on short viewports (`max-height: 40rem`) hid `.splash-door__lede`
  with `display: none` to fit (now shown; the page scrolls instead).

Every page now follows the one shell rule: `.app-site-layout` is a `min-height: 100dvh` flex column
with `main` taking the slack — the footer sits on the viewport floor when content is short and
after the content when it is long.
