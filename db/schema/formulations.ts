import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { publicationState, reviewState } from './enums';
import { peptides } from './peptides';
import { sourceLocations, sources } from './sources';
import { evidenceTypes, routes } from './taxonomy';

/**
 * The marketed product, which is not the molecule.
 *
 * Tesamorelin is one compound with three products — EGRIFTA, EGRIFTA SV and
 * EGRIFTA WR — at 1 mg, 2 mg and 11.6 mg per vial, with different doses,
 * different reconstitution, different storage and, as it turns out, different
 * pharmacokinetics. The labelling states they are not substitutable.
 *
 * Before this table existed the compound record held one set of those values and
 * could not say which product they belonged to, which is how "the label says 8
 * minutes and the handbook says 26" came to be recorded as the handbook being
 * wrong. It was describing a different product.
 */
export const compoundProducts = pgTable(
  'compound_products',
  {
    id: uuid().primaryKey().defaultRandom(),
    productKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    productName: text().notNull(),
    proprietaryName: text(),
    manufacturer: text(),

    /** Regulatory identity of the product, not of the molecule. */
    authority: text(),
    jurisdiction: text(),
    applicationNumber: text(),
    marketingStatus: text(),

    presentation: text(),
    /**
     * The four fields below reconstruct a dose, and are withheld from patient
     * mode in the query exactly as protocol dosing fields are. A vial strength
     * and a reconstitution volume are a dose written in two parts.
     */
    strengthText: text(),
    reconstitutionText: text(),
    labelledDoseText: text(),
    storageText: text(),
    excipientsText: text(),

    substitutabilityNote: text(),
    notes: text(),

    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    needsUpdate: boolean().notNull().default(false),
    needsUpdateReason: text(),
    withdrawnAt: timestamp({ withTimezone: true }),
    supersededAt: timestamp({ withTimezone: true }),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('compound_products_peptide_idx').on(t.peptideId),
    index('compound_products_source_idx').on(t.sourceId),
  ],
);

/**
 * A chemical form of the compound, with the weight that belongs to it.
 *
 * `weightBasis` is the column that matters. 5135.9 and 5195.908 look like a
 * contradiction and are not: the first is the free-base equivalent of the
 * acetate salt as the FDA labelling reports it, the second is the molecule plus
 * exactly one acetate — the difference is 60.052, which is acetic acid. A
 * molecular weight without a stated basis is three different numbers wearing the
 * same label.
 *
 * `formStatedBySource` records whether the source said which form it meant. A
 * source that gives a correct number without saying what it is the number of is
 * not wrong; it is less precise, and those are different findings.
 */
export const compoundForms = pgTable(
  'compound_forms',
  {
    id: uuid().primaryKey().defaultRandom(),
    formKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    chemicalForm: text().notNull(),
    molecularFormula: text(),
    molecularWeight: numeric({ precision: 14, scale: 4 }),
    weightBasis: text(),
    formStatedBySource: boolean().notNull().default(true),
    notes: text(),

    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'compound_forms_weight_has_basis',
      sql`${t.molecularWeight} is null or (${t.weightBasis} is not null and btrim(${t.weightBasis}) <> '')`,
    ),
    index('compound_forms_peptide_idx').on(t.peptideId),
  ],
);

/** Whether the reported result came from one administration or a course. */
export const pkAdministration = pgEnum('pk_administration', [
  'single_dose',
  'repeat_dose',
  'not_stated',
]);

/**
 * One pharmacokinetic result, under the conditions that produced it.
 *
 * There is deliberately no column for "the half-life of this compound". The
 * FDA's two current tesamorelin labels give 8 minutes and 11 minutes for the
 * same molecule in the same population, because the products differ; a
 * practitioner handbook gives 26 and 38 minutes, because the dosing duration and
 * the population differ again. All four are correct and none of them is the
 * half-life of tesamorelin.
 */
export const pkObservations = pgTable(
  'pk_observations',
  {
    id: uuid().primaryKey().defaultRandom(),
    observationKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),
    /** Null means the source named no product, which is itself informative. */
    productId: uuid().references(() => compoundProducts.id, { onDelete: 'set null' }),

    parameter: text().notNull(),
    /** Verbatim. Never recalculated, never unit-converted. */
    valueText: text().notNull(),

    /** Reconstructs a dose; treated as dosing detail throughout. */
    doseContext: text(),
    administration: pkAdministration().notNull().default('not_stated'),
    population: text().notNull(),
    routeKey: text().references(() => routes.key, { onUpdate: 'cascade' }),
    studyCondition: text(),

    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),
    notes: text(),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    needsUpdate: boolean().notNull().default(false),
    needsUpdateReason: text(),
    withdrawnAt: timestamp({ withTimezone: true }),
    supersededAt: timestamp({ withTimezone: true }),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('pk_observations_peptide_idx').on(t.peptideId),
    index('pk_observations_product_idx').on(t.productId),
    index('pk_observations_parameter_idx').on(t.parameter),
  ],
);

/**
 * A literature search, its criteria, and the ledger of what it returned.
 *
 * This exists so that "no primary human study was identified" can be a statement
 * with a query, a database, a date and a per-record ledger behind it, rather
 * than a sentence somebody wrote.
 *
 * `resultCount` is the size of the universe the query returned. It is not a
 * count of studies and not a count of evidence, and the distinction is the whole
 * reason the ledger exists: 230 records here contain three human studies.
 */
export const literatureScreens = pgTable(
  'literature_screens',
  {
    id: uuid().primaryKey().defaultRandom(),
    screenKey: text().notNull().unique(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    databaseName: text().notNull(),
    queryText: text().notNull(),
    searchDate: date().notNull(),
    resultCount: integer().notNull(),
    deduplicationNotes: text().notNull(),
    inclusionCriteria: text().notNull(),
    humanPrimaryCriteria: text().notNull(),
    notes: text(),

    reviewState: reviewState().notNull().default('unreviewed'),
    publicationState: publicationState().notNull().default('unpublished'),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('literature_screens_count_nonnegative', sql`${t.resultCount} >= 0`),
    index('literature_screens_peptide_idx').on(t.peptideId),
  ],
);

export const screenStudyType = pgEnum('screen_study_type', [
  'human_interventional',
  'human_observational',
  'case_report',
  'human_pk_safety',
  'animal_in_vivo',
  'ex_vivo',
  'in_vitro',
  'review',
  'commentary_editorial',
  'other_peripheral',
  'withdrawn',
]);

/**
 * One screened record.
 *
 * `classifiedBy` distinguishes the rows a deterministic rule decided from the
 * rows a person adjudicated, because the rules are wrong in exactly the places
 * that matter: none of the three human studies in the BPC-157 corpus carries a
 * "Clinical Trial" publication type, and one paper with the MeSH heading
 * "Humans" gave the compound only to rats.
 */
export const literatureScreenRecords = pgTable(
  'literature_screen_records',
  {
    id: uuid().primaryKey().defaultRandom(),
    screenId: uuid()
      .notNull()
      .references(() => literatureScreens.id, { onDelete: 'cascade' }),

    externalId: text().notNull(),
    externalIdType: text().notNull().default('pmid'),
    title: text().notNull(),
    publicationYear: integer(),
    journal: text(),
    publicationTypes: text(),

    studyType: screenStudyType().notNull(),
    evidenceClass: text().notNull(),
    included: boolean().notNull(),
    primaryOrSecondary: text().notNull(),
    peptideIdentityCertainty: text().notNull(),
    fullTextStatus: text().notNull().default('abstract_only'),
    classifiedBy: text().notNull(),
    reason: text().notNull(),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('literature_screen_records_unique').on(t.screenId, t.externalId),
    check(
      'literature_screen_records_class',
      sql`${t.evidenceClass} in ('human', 'preclinical', 'not_evidence')`,
    ),
    check(
      'literature_screen_records_primacy',
      sql`${t.primaryOrSecondary} in ('primary', 'secondary')`,
    ),
    check('literature_screen_records_classifier', sql`${t.classifiedBy} in ('rule', 'manual')`),
    index('literature_screen_records_screen_idx').on(t.screenId),
    index('literature_screen_records_type_idx').on(t.studyType),
  ],
);
