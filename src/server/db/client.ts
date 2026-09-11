import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@db/schema';
import type { Database } from './types';

/**
 * Runtime database connection.
 *
 * `server-only` makes importing this from a client component a build error.
 *
 * Two connections exist by design:
 *
 *   - `getPublicDb()` connects as a restricted role that holds privileges only
 *     on the `public_v_*` views. Public pages cannot read a draft record or a
 *     private column even if a query asks for one.
 *   - `getStaffDb()` connects with full privileges and is used only by the
 *     editorial surfaces, where row-level security and role policies apply.
 *
 * Until the restricted role is provisioned, both fall back to DATABASE_URL;
 * the split is expressed here so the public path never acquires write
 * privileges by accident later.
 */

/**
 * Connections are cached on globalThis in development.
 *
 * Hot module replacement re-evaluates this module on every edit. A
 * module-scoped variable would therefore open a fresh pool each time and leak
 * the old one, which exhausts a local Postgres within a few minutes of editing.
 */
interface ConnectionCache {
  publicClient?: postgres.Sql;
  staffClient?: postgres.Sql;
}

const cache: ConnectionCache =
  process.env.NODE_ENV === 'production'
    ? {}
    : ((globalThis as { __tidesDb?: ConnectionCache }).__tidesDb ??= {});

/**
 * Connection pool size.
 *
 * Configurable because the local development database (`npm run db:dev`) is a
 * single-process Postgres that serves one connection at a time. Set
 * DATABASE_POOL_MAX=1 alongside it; leave it unset against a real server.
 */
function poolSize(): number {
  const configured = Number(process.env.DATABASE_POOL_MAX);
  return Number.isInteger(configured) && configured > 0 ? configured : 5;
}

function connectionString(name: 'DATABASE_URL' | 'DATABASE_URL_PUBLIC'): string {
  const value = process.env[name] ?? process.env.DATABASE_URL;
  if (!value) {
    throw new Error(
      `${name} is not set. Copy .env.example to .env.local and provide a Postgres connection string.`,
    );
  }
  return value;
}

export function getPublicDb(): Database {
  cache.publicClient ??= postgres(connectionString('DATABASE_URL_PUBLIC'), {
    max: poolSize(),
    prepare: false,
  });
  return drizzle(cache.publicClient, { schema, casing: 'snake_case' });
}

export function getStaffDb(): Database {
  cache.staffClient ??= postgres(connectionString('DATABASE_URL'), {
    max: poolSize(),
    prepare: false,
  });
  return drizzle(cache.staffClient, { schema, casing: 'snake_case' });
}
