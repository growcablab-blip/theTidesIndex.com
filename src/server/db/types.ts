import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import type * as schema from '@db/schema';

/**
 * The database handle services accept.
 *
 * Typed against drizzle's driver-agnostic base class so every service can be
 * exercised against the in-process Postgres used by tests as well as the
 * Supabase connection used at runtime. No service reaches for a connection of
 * its own: the handle is always passed in, which keeps the data layer testable
 * and makes the transaction boundary explicit.
 */
export type Database = PgDatabase<PgQueryResultHKT, typeof schema>;
