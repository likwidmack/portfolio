# Archived 2026-10-14: Foundation normalize with the file-upload fix

`normalize.scss` is the vendored `theme/foundation/scss/vendor/normalize.scss`, copied unchanged before the vendored Foundation copy was removed (PR 1, unlink the vendored themes). It is never imported: nothing compiles or ships files under `_archive/`.

## What changed

| Before                                                                                                        | After                                                                                       |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `layers/contents/_normalize.scss` imported the vendored file (`@tgmc/theme-foundation/scss/vendor/normalize`) | It imports upstream `pkg:foundation-sites/scss/vendor/normalize` (`foundation-sites` 6.9.0) |
| The file-upload rule was qualified: `input[type='file']::-webkit-file-upload-button`                          | Upstream's bare `::-webkit-file-upload-button`                                              |
| Full mode (`foundation-everything`) used the vendored framework, with the same fix                            | It uses the framework's own upstream `foundation-normalize`                                 |

## Why archived

The fix (commit `def69357e`) kept lightningcss from rejecting the bare pseudo-element when the rule was bundled with Foundation's button mixins before class selectors such as `.is-disabled`. It had no effect here: `$theme-enable-normalize` is `false` and both apps load Foundation in `layout` mode, so neither the normalize layer nor `foundation-everything` reaches a build. The owner chose upstream normalize over keeping a patched copy.

## How to restore

Restore it if an app turns on `$theme-enable-normalize` or `$theme-foundation-mode: 'full'` and the build rejects `::-webkit-file-upload-button`.

1. Copy `normalize.scss` to `theme/core/scss/layers/contents/_foundation-normalize.scss`, with a first-line comment naming the `foundation-sites` version it patches.
2. In `layers/contents/_normalize.scss`, replace `@import 'pkg:foundation-sites/scss/vendor/normalize';` with `@import 'foundation-normalize';`.
3. In `layers/contents/_foundation-full.scss`, add `@import 'foundation-normalize';` after `@import 'pkg:foundation-sites/scss/foundation';` so `foundation-everything` uses the patched mixin.
4. Re-diff the copy against `node_modules/foundation-sites/scss/vendor/normalize.scss`, then update `theme/core/tests/foundation-css-equivalence.spec.ts` and its normalize snapshot: only the upload-button selector may change.
