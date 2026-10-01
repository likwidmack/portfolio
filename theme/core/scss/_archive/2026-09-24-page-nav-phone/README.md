# Archive: 2026-09-24 — phone page-nav swipe row

Not imported. `AppPageNav.scss` before the phone on-page nav became a disclosure. Below the tablet
breakpoint it rendered the links as one sideways-scrolling row (`overflow-x: auto`,
`width: max-content`) — swipe-only, against the UI rule (responsive · accessible · touch). It is now
a labelled toggle button (`aria-expanded` / `aria-controls`, 44px) that opens a vertical list of
44px links; `Esc` or a tap on a link closes it (`usePageNavDisclosure`).
