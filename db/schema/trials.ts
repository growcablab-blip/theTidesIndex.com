import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { peptides } from './peptides';
import { sourceLocations, sources } from './sources';

export const trialDocumentRole = pgEnum('trial_document_role', [
  'primary_publication',
  'substudy_publication',
  'post_hoc_publication',
  'secondary_publication',
  'registry_record',
  'posted_results',
  'protocol',
  'statistical_analysis_plan',
  'supplement',
  'conference_material',
]);

export const trialLinkBasis = pgEnum('trial_link_basis', [
  'registry_and_publication',
  'stated_in_registry',
  'stated_in_publication',
  'posted_to_registry',
  'unconfirmed',
]);

export const trialDocumentDepth = pgEnum('trial_document_depth', [
  'full_text_held',
  'abstract_only',
  'structured_record_held',
  'not_held',
]);

export const trialComparisonState = pgEnum('trial_comparison_state', [
  'agree',
  'differ',
  'only_one_reports',
  'not_comparable',
]);

/**
 * One registered trial, however many documents describe it.
 *
 * A liver-fat paper and an obesity paper that share participants are two
 * sources and one trial. Counting them as two would inflate every replication
 * statement on the record, so the trial is the unit and its documents hang off
 * it with the question each one answers.
 */
export const clinicalTrials = pgTable('clinical_trials', {
  id: uuid().primaryKey().defaultRandom(),
  trialKey: text().notNull().unique(),
  peptideId: uuid()
    .notNull()
    .references(() => peptides.id, { onDelete: 'restrict' }),

  registryName: text().notNull(),
  registryId: text().notNull().unique(),
  sponsorProtocolId: text(),
  acronym: text(),
  officialTitle: text().notNull(),

  phase: text().notNull(),
  design: text().notNull(),
  population: text().notNull(),
  comparator: text(),
  enrolmentText: text(),
  countries: text(),
  siteCount: integer(),
  durationText: text(),
  primaryOutcome: text(),
  secondaryOutcomes: text(),
  analysisPopulations: text(),
  statisticalPlan: text(),
  oversight: text(),
  /**
   * The arms as randomised. Study-design data for practitioner depth; the public
   * query withholds it in simple mode. Never a recommended regimen.
   */
  doseArmsText: text(),

  sponsor: text().notNull(),
  registryStatus: text().notNull(),
  startDate: date(),
  primaryCompletionDate: date(),
  completionDate: date(),
  resultsPostedDate: date(),
  registryLastUpdate: date(),
  registryCheckedAt: date().notNull(),

  notes: text(),
  sortOrder: integer().notNull().default(0),
  version: integer().notNull().default(1),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
}, (t) => [index('clinical_trials_peptide_idx').on(t.peptideId)]);

export const trialDocuments = pgTable(
  'trial_documents',
  {
    id: uuid().primaryKey().defaultRandom(),
    trialId: uuid()
      .notNull()
      .references(() => clinicalTrials.id, { onDelete: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    role: trialDocumentRole().notNull(),
    linkBasis: trialLinkBasis().notNull(),
    depth: trialDocumentDepth().notNull(),
    versionLabel: text(),
    documentDate: date(),
    /** What this document can answer that the others cannot. */
    answers: text(),
    notes: text(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('trial_documents_unique').on(t.trialId, t.sourceId, t.role),
    check(
      'trial_documents_unconfirmed_explained',
      sql`${t.linkBasis} <> 'unconfirmed' or ${t.notes} is not null`,
    ),
    index('trial_documents_trial_idx').on(t.trialId),
  ],
);

/**
 * Two documents of one trial reporting the same thing, side by side.
 *
 * Journal, registry, protocol and plan answer different questions and none
 * outranks the others. Where two differ, the difference is recorded against
 * both exact locations — never resolved by choosing one.
 */
export const trialSourceComparisons = pgTable(
  'trial_source_comparisons',
  {
    id: uuid().primaryKey().defaultRandom(),
    comparisonKey: text().notNull().unique(),
    trialId: uuid()
      .notNull()
      .references(() => clinicalTrials.id, { onDelete: 'cascade' }),
    topic: text().notNull(),

    locationAId: uuid()
      .notNull()
      .references(() => sourceLocations.id, { onDelete: 'restrict' }),
    aReports: text().notNull(),
    locationBId: uuid()
      .notNull()
      .references(() => sourceLocations.id, { onDelete: 'restrict' }),
    bReports: text().notNull(),

    state: trialComparisonState().notNull(),
    knownExplanation: text().notNull(),
    whyItMatters: text(),
    /** Carries arm amounts, so simple mode never receives it. */
    doseSpecific: boolean().notNull().default(false),
    sortOrder: integer().notNull().default(0),
    version: integer().notNull().default(1),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'trial_source_comparisons_two_places',
      sql`${t.locationAId} <> ${t.locationBId}`,
    ),
    index('trial_source_comparisons_trial_idx').on(t.trialId),
  ],
);
