# Contact messages API

`POST /api/messages` creates a contact message in the env-selected MessageStore (SQLite / Postgres / DynamoDB).

`GET /api/messages` lists stored messages and **requires** an admin Bearer token (`Authorization: Bearer <ADMIN_TOKEN>` / `NUXT_ADMIN_TOKEN`). Unauthenticated list requests return 401.

Public create validation:

- Non-empty `name`, `email`, and `body`
- Email shape check; max lengths name 100 / email 254 / body 5000
- Best-effort in-memory rate limit (5 creates per client IP per hour), in addition to API Gateway throttling

The public About contact CTA remains `mailto:` — this API is optional infrastructure, not the primary contact path.
