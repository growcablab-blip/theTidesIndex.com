import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { aliasType, publicationState, reviewState } from './enums';
import { compoundCategories, compoundTypes } from './taxonomy';

/**
 * Canonical compound record.
 *
 * The summaries here are editorial orientation text, not evidence. Anything
 * that asserts a fact about biology, efficacy, safety, route or regulation
 * belongs in `claims` with provenance attached.
 */
export const peptides = pgTable(
  'peptides',
  {
    id: uuid().primaryKey().defaultRandom(),
    peptideKey: text().notNull().unique(),
    canonicalName: text().notNull(),
    slug: text().notNull().unique(),

    compoundTypeKey: text().references(() => compoundTypes.key, { onUpdate: 'cascade' }),
    primaryCategoryKey: text().references(() => compoundCategories.key, { onUpdate: 'cascade' }),

    naturalOrSynthetic: text(),
    molecularDescription: text(),
    /** Amino-acid sequence where established. Null is an honest answer. */
    sequence: text(),

    /** One sentence of orientation. Not a claim. */
    shortDescription: text(),
    simpleSummary: text(),
    practitionerSummary: text(),
    /**
     * What is not known. Required before a peptide record may be published:
     * "unknown" and "not established" are valid outputs (CLAUDE.md).
     */
    unknownsSummary: text(),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    /** Flagged for attention. Orthogonal to visibility: a published record can
     *  be flagged and stay live, or be withdrawn and flagged. */
    needsUpdate: boolean().notNull().default(false),
    needsUpdateReason: text(),
    /**
     * Canonical editorial state, derived — never written.
     *
     * A single label for listing and sorting, without becoming a second source
     * of truth: it is computed from review state, publication state and the
     * update flag, so it cannot disagree with them.
     */
    editorialState: text().generatedAlwaysAs(
      sql`case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'ready_for_scientific_review' then 'ready_for_scientific_review'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end`,
    ),
    withdrawnAt: timestamp({ withTimezone: true }),
    supersededAt: timestamp({ withTimezone: true }),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),
    /**
     * When this record entered `ready_for_scientific_review`.
     *
     * Set and cleared by `tides_track_review_submission`, never written by the
     * application. Null means never submitted, or submitted before the column
     * existed — it does not mean no wait.
     */
    reviewSubmittedAt: timestamp({ withTimezone: true }),
    /** Date after which literature has not been surveyed. Shown publicly. */
    evidenceCutoffAt: date(),

    /** Marks a record created by the local demonstration fixture. See profiles. */
    isDemonstration: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('peptides_review_state_idx').on(t.reviewState),
    index('peptides_publication_state_idx').on(t.publicationState),
    index('peptides_category_idx').on(t.primaryCategoryKey),
    index('peptides_name_trgm_idx').using('gin', sql`${t.canonicalName} gin_trgm_ops`),
  ],
);

/**
 * Alternative names.
 *
 * `aliasType` carries the semantics. A `related_but_distinct` row records that
 * two names are discussed together in the literature *without* asserting they
 * are the same molecule — the TB-500 / Thymosin beta-4 problem (verification
 * issue V-001). Search must not resolve those as identity.
 */
export const peptideAliases = pgTable(
  'peptide_aliases',
  {
    id: uuid().primaryKey().defaultRandom(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),
    alias: text().notNull(),
    aliasType: aliasType().notNull().default('synonym'),
    notes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('peptide_aliases_peptide_alias_key').on(t.peptideId, t.alias),
    index('peptide_aliases_alias_trgm_idx').using('gin', sql`${t.alias} gin_trgm_ops`),
    index('peptide_aliases_type_idx').on(t.aliasType),
  ],
);
