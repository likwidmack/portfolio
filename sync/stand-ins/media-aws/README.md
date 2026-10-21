# `@tgmc/media-aws` (public stand-in)

The AWS media adapters are not published in this mirror. This stand-in keeps the exports that
`@tgmc/media-nuxt` imports, so the site builds and runs on its local backends (SQLite and the
filesystem). Every AWS entry point throws `MediaAwsUnavailableError`.

`sync/sync.sh` swaps the source package for this one on every sync, and stops if anything else
ends up in `packages/media-aws`.
