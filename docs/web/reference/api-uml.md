# API and store UML

HTTP surface and durable-store component model for `@tgmc/web`.

## Endpoint inventory

| Method | Path                       | Auth                 | Purpose                                                                                                                                    |
| ------ | -------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| GET    | `/api/greet`               | none                 | Demo `{ message }`                                                                                                                         |
| GET    | `/api/content/:collection` | none                 | Content collections (`home`, `resume`, `product`, `gallery`, `code`, `writing`, `docs`, `caseStudies`, `decisionCards`); `mode=first\|all` |
| POST   | `/api/messages`            | none + IP rate limit | Create contact message                                                                                                                     |
| GET    | `/api/messages`            | Admin Bearer         | List messages                                                                                                                              |
| GET    | `/api/posts`               | none                 | List published posts                                                                                                                       |
| GET    | `/api/posts/:slug`         | none                 | Published post + rendered HTML                                                                                                             |
| POST   | `/api/ai-lab/plan`         | anonymous quota      | Idea → plan (live or replay)                                                                                                               |
| POST   | `/api/ai-lab/complete`     | continuation token   | Approved plan → brief                                                                                                                      |
| GET    | `/api/admin/posts`         | Admin Bearer         | List all posts                                                                                                                             |
| POST   | `/api/admin/posts`         | Admin Bearer         | Create post                                                                                                                                |
| GET    | `/api/admin/posts/:id`     | Admin Bearer         | Get by id                                                                                                                                  |
| PUT    | `/api/admin/posts/:id`     | Admin Bearer         | Update                                                                                                                                     |
| DELETE | `/api/admin/posts/:id`     | Admin Bearer         | Delete                                                                                                                                     |
| GET    | `/sitemap.xml`             | none                 | Sitemap                                                                                                                                    |
| GET    | `/robots.txt`              | none                 | Robots                                                                                                                                     |

Handlers live under `core/web/server/api/**` except admin posts (`packages/web-layer-admin`). Auth: `Authorization: Bearer <ADMIN_TOKEN>` via timing-safe compare; fail-closed if token empty. There are no end-user sessions or OAuth.

## Content API component view

```mermaid
flowchart LR
  Page[Portfolio page] --> FCC[fetchContentCollection]
  FCC --> API["GET /api/content/:collection"]
  API --> QC[queryCollection]
  QC --> Dump[(Content SQLite dump)]
  Repo["docs/** + content/*"] -.-> Dump
```

Pages must not call client `queryCollection()` for portfolio data — see [page data loading](../features/page-data-loading.md).

## MessageStore / BlogPostStore UML

```mermaid
classDiagram
  class MessageStore {
    <<interface>>
    +list() ContactMessage[]
    +create(input) ContactMessage
  }
  class BlogPostStore {
    <<interface>>
    +listPublished()
    +listAll()
    +getBySlug(slug)
    +getById(id)
    +create(input)
    +update(id, input)
    +delete(id)
  }
  class SqliteMessageStore
  class PostgresMessageStore
  class DynamoMessageStore
  class SqliteBlogPostStore
  class PostgresBlogPostStore
  class DynamoBlogPostStore
  class Factory {
    +createMessageStore(env)
    +getMessageStore()
    +createBlogPostStore(env)
    +getBlogPostStore()
  }

  MessageStore <|.. SqliteMessageStore
  MessageStore <|.. PostgresMessageStore
  MessageStore <|.. DynamoMessageStore
  BlogPostStore <|.. SqliteBlogPostStore
  BlogPostStore <|.. PostgresBlogPostStore
  BlogPostStore <|.. DynamoBlogPostStore
  Factory --> MessageStore
  Factory --> BlogPostStore
```

### Adapter selection

| `SYS_ENV` / store env | MessageStore               | BlogPostStore    |
| --------------------- | -------------------------- | ---------------- |
| `local`               | SQLite `data/local.sqlite` | SQLite           |
| `development`         | Postgres                   | Postgres         |
| `test` / `production` | DynamoDB `Messages`        | DynamoDB `Posts` |

`E2E_STORE_SYS_ENV` can override store selection (e.g. CI keeps public `SYS_ENV=test` while stores use SQLite). Factories: `core/web/server/db/index.ts`, `blog-store.ts`. Migrations: `server/db/migrations/001_messages.sql`, `002_posts.sql` via `npm run db:migrate:local`.

## API package diagram

```mermaid
flowchart TB
  subgraph Public
    greet["/api/greet"]
    content["/api/content/:collection"]
    postsGet["/api/posts"]
    postsSlug["/api/posts/:slug"]
    msgPost["POST /api/messages"]
    aiPlan["POST /api/ai-lab/plan"]
    aiComplete["POST /api/ai-lab/complete"]
  end
  subgraph Admin
    msgGet["GET /api/messages"]
    adminPosts["/api/admin/posts*"]
  end
  subgraph CrossCutting
    RL[message rate-limit]
    Auth[requireAdminToken]
    Quota[AI Lab quota + HMAC]
    CDN[CDN middleware 302]
  end

  msgPost --> RL
  msgGet --> Auth
  adminPosts --> Auth
  aiPlan --> Quota
  aiComplete --> Quota
```

## Related

- [Messages API](../features/messages-api.md)
- [Data stores](../data-stores.md)
- [Process sequences](./process-sequences.md)
- [Architecture hub](./architecture.md)
