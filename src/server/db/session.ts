import { sql } from 'drizzle-orm';
import type { Database } from './types';

/**
 * Role-scoped database sessions.
 *
 * The row-level security policies in db/migrations/0003 are written against the
 * `authenticated` and `anon` roles and against the acting user's id. Those
 * policies only do anything if a query actually arrives under that role — a
 * direct Postgres connection authenticates as the connection's own role, and
 * would bypass every policy.
 *
 * So each unit of work runs inside a transaction that first drops to the right
 * role and declares who is acting:
 *
 *     set local role authenticated;
 *     set local request.jwt.claim.sub = '<user id>';
 *
 * `set local` is scoped to the transaction and unwound on commit or rollback,
 * so a pooled connection cannot leak one request's identity into the next.
 *
 * The effect is that an editor's session is constrained by the same policies
 * that would constrain them through any other client. Role checks are enforced
 * by the database, not by whichever code path happened to build the query.
 */

export class SessionRoleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionRoleError';
  }
}

/**
 * Runs `work` as the given staff user, under the `authenticated` role.
 *
 * Every editorial mutation goes through here. Nothing in the admin surface
 * should hold a handle that escapes it.
 */
export async function withStaffSession<T>(
  db: Database,
  userId: string,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  if (!isUuid(userId)) {
    throw new SessionRoleError('A staff session requires the acting user id.');
  }

  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('role', 'authenticated', true)`);
    await tx.execute(sql`select set_config('request.jwt.claim.sub', ${userId}, true)`);
    return work(tx);
  });
}

/**
 * Runs `work` as the anonymous public role.
 *
 * Public page queries use this so a mistake in a query cannot read a draft
 * record or a private column: `anon` holds privileges on the `public_v_*` views
 * and on nothing else.
 */
export async function withPublicSession<T>(
  db: Database,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('role', 'anon', true)`);
    return work(tx);
  });
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
