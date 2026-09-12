import { boolean, date, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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

  // --- Reviewer standing -------------------------------------------------
  // A scientific review means more when the platform can say who performed it
  // and on what basis. Deliberately minimal: enough for a reader to judge the
  // review, and not a credential-marketing exercise. Every field is optional
  // except the disclosure decision, which is the one that changes what an
  // approval is worth.
  /** e.g. "Analytical chemist", "Pharmacist". Not a job title to advertise. */
  professionalRole: text(),
  /** The domain their review carries weight in. */
  reviewDomain: text(),
  organisation: text(),
  /** One or two lines. Not a CV. */
  credentialSummary: text(),

  /**
   * Whether a relevant conflict of interest has been disclosed.
   *
   * Three states on purpose. `null` means nobody has asked, which is different
   * from a reviewer stating they have none — and an approval by someone who was
   * never asked should not read like one by someone who answered.
   */
  conflictsDisclosed: boolean(),
  disclosureNotes: text(),
  disclosedAt: date(),
  /**
   * Marks a record created by the local demonstration fixture.
   *
   * Demonstration data is barred from production by an opt-in and a
   * localhost-only check at the point of loading, but a restored dump could
   * still carry it. This flag makes that detectable after the fact:
   * `npm run db:verify-production` refuses a database containing any.
   */
  isDemonstration: boolean().notNull().default(false),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
