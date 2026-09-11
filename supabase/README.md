# Supabase

Supabase provides Postgres, Auth (internal editorial users) and Storage
(permitted assets only) for The Tides Index.

**Migrations do not live here.** They are generated into `db/migrations/` and
applied with `npm run db:migrate`, which runs against any Postgres connection
string — Supabase, a local instance, or the in-process Postgres used by tests.
Keeping one runner avoids a second, divergent migration history.

The original handoff's starter SQL is preserved in
`docs/reference/starter-schema/`.
