import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { claims } from './claims';
import { publicationState, synthesisInterpretationKind } from './enums';
import { learningTopics } from './learning';
import { peptides } from './peptides';
import { qualityTopics } from './quality';

/**
 * A Tides synthesis: a transparent conclusion drawn from several sourced claims.
 *
 * The middle of three editorial states. A SOURCE FACT is a claim resting on a
 * located passage; SOURCE NEEDED is an evidence gap; a synthesis explains how
 * sourced facts fit together and names every claim it rests on. It never adds a
 * number, mechanism, effect, safety conclusion or protocol — the numeral check
 * and the publish gate (migration 0027) hold what the database can, and tests
 * and review hold the rest.
 *
 * A synthesis about a compound, or one whose `interpretationKind` is not
 * `general`, is published only on an approved human scientific review at its
 * current version (migration 0028). The review is a row in `reviews` with
 * entity type `editorial_synthesis`.
 */
export const editorialSyntheses = pgTable(
  'editorial_syntheses',
  {
    id: uuid().primaryKey().defaultRandom(),
    synthesisKey: text().notNull().unique(),
    peptideId: uuid().references(() => peptides.id, { onDelete: 'restrict' }),
    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'restrict' }),
    learningTopicId: uuid().references(() => learningTopics.id, { onDelete: 'restrict' }),
    statement: text().notNull(),
    plainLanguageText: text().notNull(),
    reasoning: text().notNull(),
    doesNotConclude: text().notNull(),
    interpretationKind: synthesisInterpretationKind().notNull().default('general'),
    publicationState: publicationState().notNull().default('unpublished'),
    sortOrder: integer().notNull().default(0),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'editorial_syntheses_one_subject',
      sql`num_nonnulls(${t.peptideId}, ${t.qualityTopicId}, ${t.learningTopicId}) = 1`,
    ),
    check(
      'editorial_syntheses_no_numerals',
      sql`${t.statement} !~ '[0-9]' AND ${t.plainLanguageText} !~ '[0-9]'`,
    ),
    check(
      'editorial_syntheses_limits_stated',
      sql`length(btrim(${t.reasoning})) > 0 AND length(btrim(${t.doesNotConclude})) > 0`,
    ),
    index('editorial_syntheses_learning_topic_idx').on(t.learningTopicId),
    index('editorial_syntheses_peptide_idx').on(t.peptideId),
    index('editorial_syntheses_quality_topic_idx').on(t.qualityTopicId),
  ],
);

export const editorialSynthesisClaims = pgTable(
  'editorial_synthesis_claims',
  {
    synthesisId: uuid()
      .notNull()
      .references(() => editorialSyntheses.id, { onDelete: 'cascade' }),
    claimId: uuid()
      .notNull()
      .references(() => claims.id, { onDelete: 'restrict' }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.synthesisId, t.claimId] }),
    index('editorial_synthesis_claims_claim_idx').on(t.claimId),
  ],
);
