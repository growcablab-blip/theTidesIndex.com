import { sql } from 'drizzle-orm';
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { aliasType, workflowStatus } from './enums';
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

    workflowStatus: workflowStatus().notNull().default('unreviewed'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),
    /** Date after which literature has not been surveyed. Shown publicly. */
    evidenceCutoffAt: date(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('peptides_workflow_status_idx').on(t.workflowStatus),
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
