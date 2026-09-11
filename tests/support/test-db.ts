import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';
import * as schema from '@db/schema';

/**
 * In-process Postgres for tests.
 *
 * The versioned migrations under db/migrations are applied verbatim, so the
 * publish gates, triggers, views and constraints under test are the same SQL
 * that will run in production — not a re-implementation of them.
 */
export type TestDb = PgliteDatabase<typeof schema> & { $client: PGlite };

const migrationsFolder = fileURLToPath(new URL('../../db/migrations', import.meta.url));

export async function createTestDb(): Promise<TestDb> {
  const client = await PGlite.create({
    extensions: { pg_trgm, pgcrypto },
  });

  const db = drizzle(client, { schema, casing: 'snake_case' });
  await migrate(db, { migrationsFolder });
  return db;
}

/**
 * Releases the WebAssembly heap backing an instance. Each database holds a real
 * Postgres image in memory, so a suite that creates one per test exhausts the
 * worker without this.
 */
export async function closeTestDb(db: TestDb): Promise<void> {
  await db.$client.close();
}

/**
 * Empties every content table so one database can serve a whole suite.
 *
 * TRUNCATE fires statement-level triggers only, and every rule in this schema is
 * row-level, so nothing here can mask a trigger the tests are meant to exercise.
 */
export async function truncateContent(db: TestDb): Promise<void> {
  await db.$client.exec(`
    truncate table
      claim_evidence, claims,
      protocol_sources, protocols,
      peptide_routes, regulatory_statuses,
      disagreement_positions, disagreements,
      publication_claims, publication_sections, publications,
      peptide_aliases, peptides,
      source_locations, sources,
      quality_topics,
      reviews, revisions, corrections,
      verification_issues, search_documents,
      profiles
    restart identity cascade;
  `);
}

/** Runs raw SQL and returns rows. Used for schema introspection assertions. */
export async function query<T = Record<string, unknown>>(
  db: TestDb,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await db.$client.query<T>(sql, params);
  return result.rows;
}

/** Sets the acting user for triggers that attribute writes. */
export async function actAs(db: TestDb, userId: string): Promise<void> {
  await db.$client.query(`select set_config('app.current_user_id', $1, false)`, [userId]);
}

/**
 * Collects the message of a rejection, including nested `cause` messages.
 *
 * drizzle wraps a driver error in a generic "Failed query" Error and keeps the
 * database's own message on `cause`. Matching on the outer message alone would
 * make an assertion pass for the wrong reason — any failure would satisfy it.
 */
export async function rejectionMessage(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error: unknown) {
    const parts: string[] = [];
    let current: unknown = error;
    while (current instanceof Error) {
      parts.push(current.message);
      current = current.cause;
    }
    return parts.join(' | ');
  }
  throw new Error('Expected the operation to be rejected, but it succeeded.');
}

/** Normalises a drizzle `execute` result to rows across driver shapes. */
export function resultRows<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}
