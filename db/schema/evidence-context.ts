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
import {
  disagreementExplanation,
  publicationState,
  regulatoryStatusValue,
  reviewState,
} from './enums';
import { peptides } from './peptides';
import { qualityTopics } from './quality';
import { sourceLocations, sources } from './sources';
import { evidenceTypes, routes } from './taxonomy';

/**
 * Compound-specific route evidence.
 *
 * Exists so the platform can never say "peptides can be taken orally".
 * A route claim is always about one molecule, in one formulation, in one
 * population, from one source (MASTER_BUILD_SPEC.md §9, verification issue V-005).
 */
export const peptideRoutes = pgTable(
  'peptide_routes',
  {
    id: uuid().primaryKey().defaultRandom(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),
    routeKey: text()
      .notNull()
      .references(() => routes.key, { onUpdate: 'cascade' }),

    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    populationModel: text(),
    formulation: text(),
    pkNotes: text(),
    bioavailabilityNotes: text(),
    limitationsNotes: text(),

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
    index('peptide_routes_peptide_idx').on(t.peptideId),
    index('peptide_routes_route_idx').on(t.routeKey),
    index('peptide_routes_evidence_type_idx').on(t.evidenceTypeKey),
  ],
);

/**
 * Regulatory / development status.
 *
 * Always jurisdiction-scoped and always date-stamped. A status with no
 * `checkedAt` is not a status (EDITORIAL_POLICY.md). Statuses are never derived
 * from brand familiarity.
 */
export const regulatoryStatuses = pgTable(
  'regulatory_statuses',
  {
    id: uuid().primaryKey().defaultRandom(),
    peptideId: uuid()
      .notNull()
      .references(() => peptides.id, { onDelete: 'cascade' }),

    jurisdiction: text().notNull(),
    /** Indication or context the status applies to; a drug may hold several. */
    indicationContext: text(),
    status: regulatoryStatusValue().notNull(),
    authority: text(),

    sourceId: uuid().references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),

    /** When a human last confirmed this against the authority. Required. */
    checkedAt: date().notNull(),
    /** When it should be re-checked; regulatory clocks are the shortest. */
    recheckDueAt: date(),
    notes: text(),

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
    index('regulatory_statuses_peptide_idx').on(t.peptideId),
    index('regulatory_statuses_jurisdiction_idx').on(t.jurisdiction),
    index('regulatory_statuses_checked_idx').on(t.checkedAt),
  ],
);

/**
 * A recorded disagreement between sources, or an open unknown.
 *
 * EDITORIAL_POLICY.md forbids resolving disagreement by averaging. This table
 * is where the disagreement lives as a displayable record: what is contested,
 * who says what, and which of the usual explanations might account for it.
 */
export const disagreements = pgTable(
  'disagreements',
  {
    id: uuid().primaryKey().defaultRandom(),
    disagreementKey: text().notNull().unique(),

    peptideId: uuid().references(() => peptides.id, { onDelete: 'cascade' }),
    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'cascade' }),

    /** The contested question, stated neutrally. */
    topic: text().notNull(),
    /** Plain-language framing for patient mode. */
    plainLanguageText: text(),
    /** Candidate explanation, or 'unresolved' when none has been established. */
    candidateExplanation: disagreementExplanation().notNull().default('unresolved'),
    explanationNotes: text(),
    /** What would settle it. Drives the verification queue. */
    resolutionRequirement: text(),

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
    index('disagreements_peptide_idx').on(t.peptideId),
    index('disagreements_quality_topic_idx').on(t.qualityTopicId),
  ],
);

/** One side of a recorded disagreement, attributed to a specific source. */
export const disagreementPositions = pgTable(
  'disagreement_positions',
  {
    id: uuid().primaryKey().defaultRandom(),
    disagreementId: uuid()
      .notNull()
      .references(() => disagreements.id, { onDelete: 'cascade' }),
    sourceId: uuid()
      .notNull()
      .references(() => sources.id, { onDelete: 'restrict' }),
    sourceLocationId: uuid().references(() => sourceLocations.id, { onDelete: 'restrict' }),
    evidenceTypeKey: text()
      .notNull()
      .references(() => evidenceTypes.key, { onUpdate: 'cascade' }),
    /** What this source says, attributed: "LaValle describes…". */
    positionText: text().notNull(),
    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('disagreement_positions_unique').on(t.disagreementId, t.sourceId, t.positionText),
    index('disagreement_positions_disagreement_idx').on(t.disagreementId),
  ],
);
