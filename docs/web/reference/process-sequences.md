# Process sequences (UML)

Sequence diagrams for non-trivial flows. Pair with [API & store UML](./api-uml.md) and [System C4](./system-c4.md).

## A. Contact message create

Primary visitor contact is mailto; this API is available with IP rate limiting (5/hour in-memory).

```mermaid
sequenceDiagram
  actor Client
  participant API as POST /api/messages
  participant RL as rate-limit
  participant Parse as parseCreateBody
  participant Store as MessageStore
  participant DB as SQLite/Postgres/DynamoDB

  Client->>API: { name, email, body }
  API->>RL: allowMessageCreate(ip)
  alt limited
    RL-->>Client: 429
  else allowed
    API->>Parse: validate lengths/email
    Parse->>Store: create(input)
    Store->>DB: insert
    DB-->>Store: row
    Store-->>Client: ContactMessage
  end
```

## B. Open an in-app docs page

```mermaid
sequenceDiagram
  actor Visitor
  participant Catalog as /docs
  participant Page as /docs/:slug
  participant API as /api/content/docs
  participant Dump as Content SQLite

  Visitor->>Catalog: open catalog
  Catalog->>API: mode=all
  API->>Dump: queryCollection
  Dump-->>Catalog: path, title, description
  Visitor->>Page: open card
  Page->>API: mode=first&path=…
  API->>Dump: queryCollection
  Dump-->>Page: body AST
  Page-->>Visitor: ContentRenderer
```

## C. AI Lab plan → complete

```mermaid
sequenceDiagram
  actor Visitor
  participant Plan as POST /api/ai-lab/plan
  participant Sec as quota + HMAC
  participant OpenAI as OpenAI optional
  participant Complete as POST /api/ai-lab/complete

  Visitor->>Plan: idea 1–240 chars
  Plan->>Sec: consume anonymous quota
  alt live disabled or missing creds
    Plan-->>Visitor: deterministic replay plan + token
  else live
    Plan->>OpenAI: generate plan
    OpenAI-->>Plan: plan
    Plan-->>Visitor: plan + continuationToken
  end
  Visitor->>Complete: approve + token
  Complete->>Sec: verify single-use token
  alt valid
    Complete-->>Visitor: brief (live or replay)
  else invalid
    Complete-->>Visitor: 4xx
  end
```

## D. SAM test deploy (high level)

```mermaid
sequenceDiagram
  participant Dev as Developer / Actions
  participant CI as ci.yml
  participant CD as cd-aws.yml
  participant Build as sam-build.mjs
  participant SAM as sam deploy
  participant AWS as Lambda + HTTP API + DynamoDB
  participant CDN as S3/CloudFront shared test

  Dev->>CI: PR checks SYS_ENV=local
  Note over CI: main also e2e SYS_ENV=test node-server
  Dev->>CD: squash merge main
  CD->>Build: stage .output/test → build-src
  Build->>SAM: package + deploy
  SAM->>AWS: NitroFunction + tables
  SAM->>CDN: sync public without --delete
  CD-->>Dev: smoke HTTP API URL
```

## E. Local DB migrate

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant Script as db-migrate-local.mjs
  participant SQL as migrations/*.sql
  participant DB as data/local.sqlite

  Dev->>Script: npm run db:migrate:local
  Script->>DB: ensure data/ + open file
  Script->>SQL: 001_messages, 002_posts
  SQL-->>DB: apply
  Script-->>Dev: ok
```

## F. CDN static asset redirect (test/prod)

```mermaid
sequenceDiagram
  actor Browser
  participant API as HTTP API / Lambda
  participant MW as cdn middleware
  participant CF as CloudFront

  Browser->>API: GET hashed static asset
  API->>MW: public.cdnUrl set?
  alt CDN configured
    MW-->>Browser: 302 Location CDN URL
    Browser->>CF: fetch asset
  else local / no CDN
    MW-->>Browser: serve from Nitro
  end
```

## Related

- [Messages API](../features/messages-api.md)
- [CI/CD](../../cicd.md)
- [Infra](../../infra.md)
- [Architecture hub](./architecture.md)
