# Contact messages API

`POST /api/messages` creates a contact message in the env-selected MessageStore (SQLite / Postgres / DynamoDB).

List and delete messages are available only on the Docker-only admin service (`GET|DELETE /api/admin/messages` on `@tgmc/admin`). See [admin.md](./admin.md).

Public create validation:

- Non-empty `name`, `email`, and `body`
- Email shape check; max lengths name 100 / email 254 / body 5000
- Best-effort in-memory rate limit (5 creates per client IP per hour), in addition to API Gateway throttling

The public About contact CTA remains `mailto:` — this API is optional infrastructure, not the primary contact path.
