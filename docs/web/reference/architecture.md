# Application architecture

As-built architecture for `@tgmc/web` (Nuxt 4 + Nitro) in the TGMC Nx monorepo. Diagrams document **what exists today** — not a target-state redesign.

Live SVG on [`/product`](/product) (`AppArchitectureDiagram`) shares the content-API topology without a Mermaid runtime. Full Mermaid sources live in the pages below and render in-app under `/docs`.

## Diagram set

| Diagram                     | Type              | Page                                                         |
| --------------------------- | ----------------- | ------------------------------------------------------------ |
| System context & containers | C4 L1–L2          | [System C4](./system-c4.md)                                  |
| Four-environment deployment | Deployment        | [System C4 § Deployment](./system-c4.md#deployment-topology) |
| API inventory & store UML   | Component / class | [API & store UML](./api-uml.md)                              |
| Site map & page wireframes  | Wireframes        | [Site wireframes](./site-wireframes.md)                      |
| Complex process sequences   | UML sequence      | [Process sequences](./process-sequences.md)                  |

## Context (short)

Public chrome: `AppPrimaryNav` is **Work / About / Gallery / Writing / Code**. Docs, AI Lab, and Process are **Work sub-nav** (`AppWorkSubNav` on `/work` and `/work/[slug]`).

Page copy, gallery, and case studies load through Nitro (`GET /api/content/:collection`) so client WASM SQLite is not used during SPA navigations. Durable contact messages and blog posts use MessageStore / BlogPostStore adapters selected by `SYS_ENV` (SQLite → Postgres → DynamoDB). Test/prod HTML and API run on Lambda behind HTTP API; hashed assets go to S3/CloudFront.

## Related

- [Page data loading](../features/page-data-loading.md)
- [Gallery and docs hubs](../features/gallery-and-docs.md)
- [Data stores](../data-stores.md)
- [Project structure](./project-structure.md)
