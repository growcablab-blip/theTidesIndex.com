import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { claimImportance, evidenceRelationship, workflowStatus } from './enums';
import { peptides } from './peptides';
import { qualityTopics } from './quality';
import { sourceLocations, sources } from './sources';
import { evidenceTypes, routes } from './taxonomy';

/**
 * A discrete factual proposition.
 *
 * A claim is not evidence. It becomes publishable only when at least one
 * `claim_evidence` row ties it to an exact location in a citable source —
 * unless it is explicitly marked editorial, non-evidentiary copy
 * (ACCEPTANCE_TESTS.md A.1).
 */
export const claims = pgTable(
  'claims',
  {
    id: uuid().primaryKey().defaultRandom(),
    claimKey: text().notNull().unique(),

    /** Subject. A claim addresses a compound, a quality topic, or both. */
    peptideId: uuid().references(() => peptides.id, { onDelete: 'restrict' }),
    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'restrict' }),

    /** The proposition as the platform states it. */
    claimText: text().notNull(),
    /** The same proposition in patient-facing plain language. */
    plainLanguageText: text(),

    claimCategory: text(),
    importance: claimImportance().notNull().default('medium'),

    /** How the platform reads the evidence, distinct from what sources say. */
    interpretationNotes: text(),
    /**
     * What remains uncertain. Required for high and critical claims before
     * publication (MASTER_BUILD_SPEC.md §12).
     */
    uncertaintyText: text(),

    /**
     * Escape hatch for site copy that is not an evidentiary assertion — a
     * methodology explanation, a navigational sentence. Exempt from the
     * provenance gate and never presented as a finding.
     */
    isEditorialNonEvidentiary: boolean().notNull().default(false),

    workflowStatus: workflowStatus().notNull().default('unreviewed'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'claims_subject_present',
      sql`${t.peptideId} is not null or ${t.qualityTopicId} is not null or ${t.isEditorialNonEvidentiary}`,
    ),
    index('claims_peptide_idx').on(t.peptideId),
    index('claims_quality_topic_idx').on(t.qualityTopicId),
    index('claims_workflow_status_idx').on(t.workflowStatus),
    index('claims_importance_idx').on(t.importance),
  ],
);

/**
 * The provenance link: claim -> source location -> source, carrying the
 * evidence type and the platform's reading of what the source actually says.
 *
 * One claim may have many evidence rows, including rows with
 * relationship='contradicts'. Contradicting evidence is retained and displayed;
 * it is never resolved by deletion.
 */
export const claimEvidence = pgTable(
  'claim_evidence',
  {
    id: uuid().primaryKey().defaultRandom(),
    claimId: uuid()
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    /**
     * Exact position in the source. Nullable at capture time; required before
     * the parent claim may be published.
     */
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),
    relationship: evidenceRelationship().notNull().default('supports'),

    /** Species, model, or human population studied. "Rat" is not "patient". */
    populationModel: text(),
    routeKey: text().references(() => routes.key, { onUpdate: 'cascade' }),
    formulation: text(),

    /**
     * Verbatim extract from a copyrighted source, retained only to let a
     * reviewer confirm the reading. PRIVATE: never selected by any public view
     * or public query path.
     */
    extractedTextPrivate: text(),

    /** How the platform reads this specific passage. */
    interpretation: text(),
    /**
     * Set when a reviewer has opened the primary study a secondary source
     * cites, rather than trusting the secondary source's characterisation.
     */
    primarySourceVerified: boolean().notNull().default(false),
    /** Where the secondary source's reading overstates the primary source. */
    interpretationConcerns: text(),

    reviewerNotes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('claim_evidence_claim_idx').on(t.claimId),
    index('claim_evidence_source_idx').on(t.sourceId),
    index('claim_evidence_evidence_type_idx').on(t.evidenceTypeKey),
    index('claim_evidence_relationship_idx').on(t.relationship),
  ],
);
