# Site media manifest and import

The site's own images, videos and PDFs (today under `core/web/public/{i,v,d}`) move into the media catalog (SQLite + filesystem locally, DynamoDB + S3 in production). `core/web/content/media.json` is the reviewed source of truth for them: one entry per file, with a fixed asset id, a human name and the owner's title and alt text.

This page covers part 1 (PR 5): the metadata policy, the sanitizer, the manifest and the import CLI. Part 2 renders site media from the catalog (`useSiteMedia`), points content at manifest ids, adds 301 redirects from each `legacyPath`, and lets admin edit titles and alt text. Until then the site still serves `core/web/public`.

## Intentional case-study paths (do not flag)

The tesseract images in two case studies use `/i/portfolio/tesseract/…` paths on purpose (owner decision, #279), although the files live at `core/web/public/i/tesseract/`:

- `core/web/content/case-studies/spatial-experiences.json`: `blue-8-cell-simple.png` and `schlegel-wireframe-8-cell.png`
- `core/web/content/case-studies/innovation-prototyping.json`: the video poster `blue-8-cell-simple.png`

The owner confirmed these paths on 2026-10-14 without a visual check. The Docker test stack (`http://localhost:4300`) serves no static files at all (`/_nuxt/*`, `/i/*` and `/_ipx/*` return 404 or 502; tracked in Phase 9b of `docs/superpowers/plans/2026-10-01-prod-readiness-docker-media.md`), and the deployed test environment predated #279 at the time.

Other content still points at `/i/tesseract/…` (for example the `spatial-experiences.json` video poster, `gallery.json`, `content/media.json` `legacyPath` and `shared/tesseract.ts`). That mix is intentional as well. Don't "align" the two prefixes in either direction.

Do not move the files, rewrite the paths, restore the file-exists checks that #279 removed from `core/web/tests/portfolio-content.spec.ts` and `core/web/tests/work-card-media.spec.ts`, or report the paths (or the mixed prefixes) as broken or inconsistent. `core/web/tests/tesseract-media-paths.spec.ts` keeps the paths and this note in place.

## Manifest

```json
{
  "version": 1,
  "entries": [
    {
      "id": "…uuid…",
      "tenant": "portfolio",
      "kind": "image",
      "name": "profile-pic-1",
      "ext": "jpg",
      "path": "m/pf/i/profile-pic-1.jpg",
      "title": "Tamara Mack portrait",
      "alt": "Portrait of Tamara Mack smiling, …",
      "description": null,
      "credit": "Tamara Mack",
      "sha256": "…of the sanitized bytes…",
      "width": 1024,
      "height": 1024,
      "durationSec": null,
      "lqip": "data:image/webp;base64,…",
      "dominantColor": "#cece9f",
      "variants": [],
      "legacyPath": "/i/profile_pic_1.jpg",
      "reviewNotes": ["check: …"]
    }
  ]
}
```

| Field                                      | Rule                                                                                                                                                                  |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                       | UUIDv5 of `legacyPath` (`siteMediaId`). Stable across reruns and identical in every backend. Never edit it once imported.                                             |
| `name`, `ext`, `path`                      | `normalizeMediaFilename` of the original filename (generator and camera prefixes dropped), `-2`, `-3` on collisions; `path` is `m/pf/{kind code}/{name}.{ext}`.       |
| `title`, `alt`, `description`, `credit`    | Owner-reviewed text, checked by `validateMediaMeta` (title 3–80 characters, alt ≤150 and required for images and SVGs, description ≤300, no filenames or vendor ids). |
| `sha256`, `width`, `height`, `durationSec` | Computed from the **sanitized** bytes. Don't edit by hand.                                                                                                            |
| `lqip`, `dominantColor`                    | Computed for images and SVGs (`ingestImage`). `null` for video and documents.                                                                                         |
| `variants`                                 | Ready catalog variants (`t`, `640`, `1280`, `1920`) for `srcset`. Empty until they are materialized; `--from` exports fill it.                                        |
| `legacyPath`                               | The old public URL, kept for part 2's redirects. Must start with `/`; `.` / `..` segments and backslashes are rejected (the import reads `<source><legacyPath>`).     |
| `reviewNotes`                              | Draft checklist. The import refuses entries that still have notes; notes are never imported.                                                                          |

Types and the validator live in `@tgmc/media` (`SiteMediaEntry`, `validateSiteManifest`, `serializeSiteManifest`). The validator is strict: unknown keys, a `path` that does not match `kind` / `name` / `ext`, an `ext` whose type does not belong to `kind` (`image` + `.pdf`), duplicate ids, names or legacy paths are structural errors; metadata policy issues are reported separately so a draft can still be written.

## Review workflow

```bash
npm run build:libs
npm run media:site-manifest -- --draft --review-out tmp/site-media-review.md
```

`--draft` reads every file under the source (`--source <dir>`, default `data/media-source/` when it exists, else `core/web/public`; folders starting with `.` or `_` are skipped, non-media files such as the HTML labs are listed under `skipped`, and files the overrides exclude under `excluded`). For each file it:

1. Detects the real format from the bytes (a `.png` that is really an animated GIF becomes `.gif`).
2. Pre-fills the title (gallery item title, then the SVG `<title>`, then the filename), alt (the longest content alt that fits) and description (the longest caption that fits, else the SVG `<desc>`), from every content JSON file under `core/web/content/` (except `media.json` itself, and `--out`) and quoted paths in `core/web/{app,shared,server}`.
3. Sanitizes the bytes ([sanitizer](../../packages/image.md#sanitize-media-before-it-is-stored)), then records the sha256, dimensions, duration and LQIP.
4. Adds notes: `check:` (an owner decision: generated title, several content alts, a borrowed gallery title, a changed extension, a renamed collision, a generated-media credit), `unused:` (nothing references the file), `duplicate:` (same sanitized bytes as another file) and `invalid:` (fails the metadata policy).

`--review-out` writes a Markdown table with each entry's legacy and new path, title, alt, description, credit and review notes, so every field the owner signs off on is visible in one place.

The owner edits `media.json` directly: fix titles, alt text, descriptions and credits, delete each note once resolved, then rerun `--draft`. A rerun keeps each existing entry's id, name, editorial fields, variants and the owner's remaining `check:` notes, and recomputes the bytes, dimensions, LQIP and the automatic `unused:` / `duplicate:` / `invalid:` notes. `kind` and `ext` always follow the sniffed bytes: when a source changes format (say the animated GIF named `.png` is replaced by a real PNG), the entry moves to the new extension (and kind code), its `variants` are reset, a name already taken in the new kind gets `-2`, and a `check: format changed: …` note asks for review. Its summary lists `changed` (sha256 differs from the committed manifest) and `dropped` (no longer in the source).

PDFs embed the title, credit (Author) and description (Subject) in the sanitized file, so **editing a PDF's title changes its sha256**: rerun `--draft` before importing.

### Overrides

Decisions a rerun must not undo live in `core/web/site-media.overrides.json` (committed; outside `content/` so it is never scanned as content; `--overrides <file>` points elsewhere):

```json
{
  "exclude": { "/i/portfolio/social-card.png": "why it is not imported" },
  "entries": {
    "/d/Resume2026.pdf": { "name": "tamara-mack-resume-2026" },
    "/v/portfolio/generated/vimg-tesseract-framework.mp4": { "credit": "Tamara Mack (AI-assisted)" }
  }
}
```

- `exclude` — legacyPath → reason. The file stays on disk but gets no entry (summary `excluded`, not `dropped`), and stops causing `duplicate:` notes.
- `entries.<legacyPath>.name` — wins over the drafted and the previous name; the id stays the UUIDv5 of the legacyPath. Lowercase words joined by `-`; a name another file already uses is an error.
- `entries.<legacyPath>.credit` — replaces the credit and clears the `check: generated media; confirm the credit` note. For PDFs it is also written as the Author.

Unknown keys are errors; overrides for paths that are not in the source are listed under `staleOverrides`. Titles, alt text and descriptions are edited in `media.json` itself (a rerun keeps them).

`npm run media:site-manifest -- --from <endpoint>` exports the manifest back from a catalog (assets tagged `site`), including ready variants. Endpoints are the same as `media:transfer`: `sqlite:<dir>` or `aws:<table>@<bucket>` with `--region`, `--dynamodb-endpoint`, `--s3-endpoint`, `--path-style`.

## Import

```bash
# rehearsal against a scratch catalog (imports entries that still have notes)
npm run media:site-import -- --to sqlite:./data/site-media-rehearsal --allow-unreviewed
# production, after the review
npm run media:site-import -- --to aws:<table>@<bucket> --dry-run
npm run media:site-import -- --to aws:<table>@<bucket>
```

For each entry the import checks that `<source><legacyPath>` exists and is media, then (`importSiteMedia` in `@tgmc/media`):

- **Refuses** entries with `reviewNotes` (unless `--allow-unreviewed`) or metadata policy failures (`refused` in the report).
- **Skips** entries the target already has with the same id, path and manifest `sha256` (and its object), before the file is sanitized, so a rerun after a sharp / svgo / ffmpeg upgrade stays idempotent and needs no ffmpeg when every video is already imported.
- Sanitizes the rest exactly as the draft did (a sanitizer error, such as no ffmpeg for an MP4, fails that entry only).
- **Fails** entries whose sanitized bytes do not hash to the manifest `sha256` (the manifest is stale, or the tool versions changed: rerun `--draft` and review the diff).
- Copies the rest through `transferMedia`, so it inherits the transfer's safety: the name is held on the target, objects are written create-only and re-hashed there, an existing asset with the same id, sha256 and path is **skipped** (reruns are safe), and anything else at that id, name or key is a **conflict**, never overwritten. Rows keep the manifest id, name and path; `meta` carries `tags: ['site']`, `filename`, the editorial fields, dimensions, LQIP and `legacyPath`. Each written asset gets an `asset.site_imported` audit event.

It prints a JSON report (`copied`, `skipped`, `conflicts`, `conflictReasons`, `failed`, `refused`) and exits 1 when anything was refused, conflicted or failed, 2 on bad arguments. A dry run opens a `sqlite:` target read-only and writes nothing.

**The import is create-only, not a sync.** Once an entry is imported, editing its title, alt text, description or credit in `media.json` and re-importing does **not** update the catalog: the entry is skipped (same id, path and sha256), or for a PDF, whose sanitized bytes embed the title and credit, reported as a conflict. Editorial changes after the import go through admin (PR 5 part 2: title / alt editing and rename); `--from` exports the catalog back into `media.json` to keep the two in step.

### Production import runbook

1. Run it on the machine and OS that produced the committed draft (Windows today), with the same ffmpeg (`ffmpeg -version`, or pin `FFMPEG_PATH`) and the same `node_modules` — sanitized bytes, and so every sha256, depend on them.
2. `npm run build:libs`, then `npm run media:site-import -- --to aws:<table>@<bucket> --dry-run`. Expect `failed: []`, `conflicts: []` and `refused: []` (any `refused` entry still has review notes).
3. Only then run the same command without `--dry-run`, and keep the JSON report.

## Tooling notes

- **ffmpeg.** MP4 remuxing runs ffmpeg as a separate process, resolved by `resolveFfmpegPath` (`@tgmc/image/sanitize`): `FFMPEG_PATH`, then `ffmpeg` on `PATH`, then the optional `ffmpeg-static` package (root `optionalDependencies`; `allowScripts` lets its install script download the binary; its own `FFMPEG_BIN` variable overrides the binary it reports). With none of them, sanitizing an MP4 fails with a message saying so; other formats don't need ffmpeg. Licence: the ffmpeg-static binary is GPL-3.0-or-later; it is only executed by local scripts, never linked, bundled into `core/web` / Nitro / Lambda, or redistributed.
- **Determinism.** The sanitized sha256 depends on the sharp / svgo / pdf-lib / ffmpeg versions (and can depend on the platform): for example `vimg-tesseract-framework.mp4` remuxes to different bytes under ffmpeg 6.1 (ffmpeg-static) and 8.1. After upgrading any of them, rerun `--draft`; the import fails loudly rather than storing bytes that differ from the manifest (entries already imported are skipped first).
- **Code.** `scripts/site-media-{cli,draft,content,review}.js` have no workspace imports and are tested under `node --test` in CI (`scripts/site-media-*.test.js`); `scripts/site-media-{manifest,import,io}.js` wire in `@tgmc/media` and `@tgmc/image` and need `npm run build:libs`.

Related: [`@tgmc/media`](../../packages/media.md#site-media-manifest-and-import), [`@tgmc/image` sanitizer](../../packages/image.md#sanitize-media-before-it-is-stored), promote media to production.
