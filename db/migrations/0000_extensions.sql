-- The Tides Index — required Postgres extensions.
--
-- pg_trgm backs fuzzy alias matching, which is what lets a practitioner find
-- "BPC157" or a misremembered spelling and still land on the canonical record
-- (ACCEPTANCE_TESTS.md C). Full-text search uses built-in tsvector.
--
-- gen_random_uuid() is built in from Postgres 13 onward; pgcrypto is created
-- anyway because Supabase projects expect it and other tooling assumes it.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pgcrypto;
