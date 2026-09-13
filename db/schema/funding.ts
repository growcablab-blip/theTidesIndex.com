import { sql } from 'drizzle-orm';
import { boolean, check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { fundingKind } from './enums';
import { sources, sourceLocations } from './sources';

/**
 * Who funded a study, and whether anyone with something to sell was involved.
 *
 * This is context, not a verdict. A reader deciding what to make of a result
 * is entitled to know that the manufacturer ran the trial, and equally
 * entitled to know that nobody reported the funding at all — but neither fact
 * makes a finding true or false, and nothing in this platform scores a study
 * by its sponsor. The one derived value anywhere near this table is a count of
 * how much funding context exists, which is a statement about coverage.
 *
 * Funding attaches to the source rather than to a claim: it is a property of
 * the study, and the same study may support several claims.
 */
export const studyFunding = pgTable(
  'study_funding',
  {
    id: uuid().primaryKey().defaultRandom(),
    fundingKey: text().notNull().unique(),

    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'cascade' }),
    /** Where it was read. Null only where nobody has checked. */
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'set null' }),

    funderKind: fundingKind().notNull(),
    /**
     * The sponsor as the source names it. Never inferred from an author's
     * affiliation, which is a different fact and a weaker one.
     */
    sponsorName: text(),
    /**
     * Whether a company that makes or sells the compound ran, funded or
     * supplied the study. The question a reader actually has, kept separate
     * from the funder category so it survives a mixed-funding study.
     */
    manufacturerInvolved: boolean(),
    institution: text(),
    grantReference: text(),
    /** The disclosure in the source's own words. */
    disclosureText: text(),
    notes: text(),

    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'study_funding_sponsor_consistent',
      sql`${t.sponsorName} is null or ${t.funderKind} not in ('none_declared', 'not_reported_in_source', 'not_checked')`,
    ),
    check(
      'study_funding_located',
      sql`${t.funderKind} in ('not_checked') or ${t.sourceLocationId} is not null`,
    ),
    index('study_funding_source_idx').on(t.sourceId),
  ],
);
