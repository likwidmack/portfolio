# Site person identity

Canonical personal and contact fields for the portfolio site owner live in **`core/web/content/profile.json`** (Nuxt Content `profile` collection). Runtime code reads the same file through `core/web/shared/site-profile.ts` and the `useSiteProfile()` composable.

## Profile content doc

Edit `profile.json` to change names, email, GitHub, portrait paths, download PDFs, copyright year, and app title suffix. Zod validation is in `content.config.ts` (`profileContentSchema`).

| Section     | Fields                                                                                   | Typical use                                             |
| ----------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `names`     | `formal`, `casual`, `short`, `signature`                                                 | Copyright, SEO titles, nav, hero brand                  |
| `contact`   | `email`, `github.handle`, `github.url`                                                   | Mailto links, About sidebar, JSON-LD `email` / `sameAs` |
| `role`      | `title`, `organization`, `footerCredential`, `creativeTechnologist`, `jsonLdDescription` | Footer line, schema.org `Person`                        |
| `portrait`  | `src`, `width`, `height`                                                                 | About page portrait                                     |
| `downloads` | `portfolioDeck`, `generalResume`                                                         | PDF download buttons                                    |
| `copyright` | `startYear`, `displayYear`                                                               | Footer year                                             |
| `app`       | `titleSuffix`, `siteDescription`                                                         | `APP_TITLE` default, Nuxt site description              |

Private contact data (email, GitHub) is **not** duplicated in `home.json`, `gallery.json`, or `resume.json` — pages bind mailto links from the profile.

## Code imports

```typescript
import { DEFAULT_APP_TITLE, mailtoHref, SITE_PERSON } from '#shared/site-person';
// or full profile:
import { SITE_PROFILE } from '#shared/site-profile';
const { profile } = useSiteProfile();
```

`usePortfolioSeo` titles can use `SITE_PERSON.formal` or `profile.names.formal`.

## Related

- Theme/accent personalization (unrelated to names): `core/web/shared/personalization.ts`
- August launch positioning: portfolio-august-launch.md
