import { defineConfig } from 'drizzle-kit';

/**
 * Migrations are generated as plain, reviewable SQL under db/migrations and are
 * the versioned source of record for the database. Hand-written SQL (row-level
 * security policies, public views, publish-gate triggers) is appended to the
 * generated files and must be preserved when regenerating.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './db/schema/index.ts',
  out: './db/migrations',
  casing: 'snake_case',
  strict: true,
  verbose: true,
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://localhost:5432/tidesindex',
  },
});
