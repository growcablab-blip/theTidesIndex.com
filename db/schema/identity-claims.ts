import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { publicationState, reviewState } from './enums';
import { peptides } from './peptides';
import { sourceLocations, sources } from './sources';
import { evidenceTypes } from './taxonomy';

/** What kind of thing a name denotes. */
export const identityForm = pgEnum('identity_form', [
  'full_length',
  'fragment',
  'analogue',
  'preparation',
  'unspecified',
]);

/** How well established the source's statement about the name is. */
export const identityVerification = pgEnum('identity_verification', [
  'analytically_characterised',
  'stated_by_primary_source',
  'stated_by_secondary_source',
  'asserted_without_detail',
  'contradicted',
]);

/**
 * One source's statement about what a name refers to.
 *
 * The table verification issue V-001 needed. An alias records that two names
 * travel together; it cannot record that somebody put the substance in a mass
 * spectrometer and found a seven-residue fragment where the name promised a
 * forty-three-residue protein. Those are different kinds of statement and only
 * the second can settle an identity question.
 *
 * `nameUsed` is the name exactly as the source writes it, because the whole
 * subject of the table is that different sources use one name for different
 * things. Normalising it here would destroy the evidence.
 */
export const compoundIdentityClaims = pgTable(
  'compound_identity_claims',
  {
    id: uuid().primaryKey().defaultRandom(),
    identityKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    nameUsed: text().notNull(),
    chemicalForm: text(),
    sequence: text(),
    residueCount: integer(),
    molecularWeight: numeric({ precision: 14, scale: 4 }),
    weightBasis: text(),
    form: identityForm().notNull().default('unspecified'),
    verification: identityVerification().notNull().default('asserted_without_detail'),
    /** Where the source is using the name: a study, a product, a regimen. */
    usageContext: text().notNull(),
    notes: text(),

    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'compound_identity_weight_has_basis',
      sql`${t.molecularWeight} is null or (${t.weightBasis} is not null and btrim(${t.weightBasis}) <> '')`,
    ),
    check(
      'compound_identity_residue_count_agrees',
      sql`${t.sequence} is null or ${t.residueCount} is null or ${t.residueCount} = length(regexp_replace(${t.sequence}, '[^A-Za-z]', '', 'g'))`,
    ),
    index('compound_identity_claims_peptide_idx').on(t.peptideId),
    index('compound_identity_claims_name_idx').on(t.nameUsed),
  ],
);

/**
 * How far a finding has been repeated.
 *
 * Ordered by what each state lets a reader conclude, which is the reason the
 * field is an enum and not a count. Forty papers from one laboratory is a
 * weaker position than two from two, and a register that reports "40" has told
 * the reader the opposite of what it knows.
 */
export const replicationState = pgEnum('replication_state', [
  'single_study',
  'repeated_same_group',
  'independent_group',
  'independent_multiple_countries',
  'confirmed_in_humans',
  'conflicting_replication',
  'failed_replication',
  'not_assessed',
]);

/**
 * A replication assessment for one finding.
 *
 * `basis` is not null: a replication claim with no working shown is an opinion
 * wearing a taxonomy. A database constraint also refuses `independent_group`
 * with fewer than two groups behind it, so the strongest states cannot be
 * asserted on a single paper.
 */
export const replicationAssessments = pgTable(
  'replication_assessments',
  {
    id: uuid().primaryKey().defaultRandom(),
    assessmentKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    finding: text().notNull(),
    state: replicationState().notNull().default('not_assessed'),
    studyCount: integer(),
    groupCount: integer(),
    countryCount: integer(),
    models: text(),
    humanConfirmed: boolean().notNull().default(false),
    basis: text().notNull(),
    limitations: text(),
    supportingRecords: text(),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'replication_counts_nonnegative',
      sql`coalesce(${t.studyCount}, 0) >= 0 and coalesce(${t.groupCount}, 0) >= 0 and coalesce(${t.countryCount}, 0) >= 0`,
    ),
    check(
      'replication_independent_needs_groups',
      sql`${t.state} not in ('independent_group', 'independent_multiple_countries') or coalesce(${t.groupCount}, 0) >= 2`,
    ),
    index('replication_assessments_peptide_idx').on(t.peptideId),
  ],
);
