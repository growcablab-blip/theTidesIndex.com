import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { staffRole } from './enums';

/**
 * Internal editorial staff.
 *
 * `userId` mirrors `auth.users.id` from Supabase Auth. The foreign key is added
 * in hand-written SQL rather than here, because drizzle-kit would otherwise try
 * to create the `auth` schema that Supabase already owns; the constraint is
 * applied conditionally so the schema also loads on a bare Postgres used for
 * tests.
 *
 * The public requires no account (docs/LOCKED_DECISIONS.md #17). Every row in
 * this table is staff.
 */
export const profiles = pgTable('profiles', {
  userId: uuid().primaryKey(),
  displayName: text().notNull(),
  email: text(),
  role: staffRole().notNull(),
  /** Deactivation preserves audit history; staff rows are never deleted. */
  isActive: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
