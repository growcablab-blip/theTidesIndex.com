import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import {
  certificateType,
  claimImportance,
  evidenceRelationship,
  publicationState,
  reviewState,
} from './enums';
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

    /**
     * The kind of document a certificate-content requirement applies to.
     *
     * ICH Q7 §11.4 states what a certificate of analysis should contain, and its
     * scope is the manufacture of active pharmaceutical ingredients and
     * intermediates. It says nothing about finished drug products, about a
     * third-party laboratory's report on a posted sample, or about research-use
     * material. "Q7 says a certificate should show X" becoming "every
     * certificate must show X" is a single careless sentence away, and it would
     * give this index's authority to a requirement that does not exist.
     *
     * So a claim in the `certificate-content` family must name the document type
     * it governs, and the constraint below refuses it otherwise. Null for every
     * claim that is not about certificate content.
     */
    certificateTypeScope: certificateType(),

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

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * A requirement about what a certificate should contain is meaningless
     * without the kind of certificate it applies to. Enforced here rather than
     * in editorial habit, because the failure is silent and the sentence that
     * causes it reads perfectly well.
     */
    check(
      'claims_certificate_scope_declared',
      sql`${t.claimCategory} is null
          or ${t.claimCategory} not like 'certificate-content%'
          or ${t.certificateTypeScope} is not null`,
    ),
    check(
      'claims_subject_present',
      sql`${t.peptideId} is not null or ${t.qualityTopicId} is not null or ${t.isEditorialNonEvidentiary}`,
    ),
    index('claims_peptide_idx').on(t.peptideId),
    index('claims_quality_topic_idx').on(t.qualityTopicId),
    index('claims_review_state_idx').on(t.reviewState),
    index('claims_publication_state_idx').on(t.publicationState),
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
    // One claim cites one location once. Re-running an extraction packet updates
    // the reading of a passage rather than accumulating duplicate citations of
    // it. A passage that supports two different propositions belongs to two
    // claims, not to two evidence rows on one.
    uniqueIndex('claim_evidence_claim_location_uniq').on(t.claimId, t.sourceLocationId),
    index('claim_evidence_claim_idx').on(t.claimId),
    index('claim_evidence_source_idx').on(t.sourceId),
    index('claim_evidence_evidence_type_idx').on(t.evidenceTypeKey),
    index('claim_evidence_relationship_idx').on(t.relationship),
  ],
);
