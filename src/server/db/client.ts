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

let publicClient: postgres.Sql | undefined;
let staffClient: postgres.Sql | undefined;

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
  publicClient ??= postgres(connectionString('DATABASE_URL_PUBLIC'), {
    max: 5,
    prepare: false,
  });
  return drizzle(publicClient, { schema, casing: 'snake_case' });
}

export function getStaffDb(): Database {
  staffClient ??= postgres(connectionString('DATABASE_URL'), {
    max: 5,
    prepare: false,
  });
  return drizzle(staffClient, { schema, casing: 'snake_case' });
}
