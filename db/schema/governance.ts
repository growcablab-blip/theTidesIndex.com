import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  correctionSeverity,
  reviewClockClass,
  reviewOutcome,
  reviewType,
  reviewableEntityType,
  workflowStatus,
} from './enums';
import { profiles } from './identity';

/**
 * A recorded review action.
 *
 * Reviews are append-only evidence that a gate was passed. The publish-gate
 * triggers read this table: a protocol cannot reach `published` unless approved
 * scientific, clinical and compliance reviews exist for its current version.
 */
export const reviews = pgTable(
  'reviews',
  {
    id: uuid().primaryKey().defaultRandom(),
    entityType: reviewableEntityType().notNull(),
    entityId: uuid().notNull(),
    /**
     * Version of the entity that was reviewed. An edit bumps the version, which
     * invalidates prior approvals — review does not survive rewriting.
     */
    entityVersion: integer().notNull().default(1),

    reviewType: reviewType().notNull(),
    reviewerUserId: uuid().references(() => profiles.userId, { onDelete: 'set null' }),
    outcome: reviewOutcome().notNull(),
    comments: text(),
    reviewedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('reviews_entity_idx').on(t.entityType, t.entityId),
    index('reviews_entity_version_idx').on(t.entityType, t.entityId, t.entityVersion),
    index('reviews_reviewer_idx').on(t.reviewerUserId),
  ],
);

/**
 * Immutable change history. Written by trigger on every material update so the
 * audit trail cannot be skipped by writing straight to a table.
 */
export const revisions = pgTable(
  'revisions',
  {
    id: uuid().primaryKey().defaultRandom(),
    entityType: reviewableEntityType().notNull(),
    entityId: uuid().notNull(),
    version: integer().notNull(),
    diffSummary: text(),
    /** Full prior row, so any published state can be reconstructed. */
    snapshot: jsonb(),
    previousWorkflowStatus: workflowStatus(),
    newWorkflowStatus: workflowStatus(),
    changedBy: uuid().references(() => profiles.userId, { onDelete: 'set null' }),
    changedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('revisions_entity_idx').on(t.entityType, t.entityId),
    index('revisions_entity_version_idx').on(t.entityType, t.entityId, t.version),
    index('revisions_changed_at_idx').on(t.changedAt),
  ],
);

/**
 * Public corrections log (MASTER_BUILD_SPEC.md §19).
 *
 * Material errors are corrected in public, with what changed stated plainly.
 */
export const corrections = pgTable(
  'corrections',
  {
    id: uuid().primaryKey().defaultRandom(),
    correctionKey: text().notNull().unique(),
    entityType: reviewableEntityType().notNull(),
    entityId: uuid().notNull(),

    severity: correctionSeverity().notNull(),
    /** What was previously stated. */
    whatChanged: text().notNull(),
    /** Why it was wrong and how it was found. */
    reason: text().notNull(),
    /** Whether the correction itself is shown on the public corrections page. */
    isPublic: boolean().notNull().default(true),

    reportedBy: text(),
    correctedByUserId: uuid().references(() => profiles.userId, { onDelete: 'set null' }),
    identifiedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    correctedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('corrections_entity_idx').on(t.entityType, t.entityId),
    index('corrections_public_idx').on(t.isPublic, t.correctedAt),
  ],
);

/**
 * Staleness clocks (docs/REVIEW_WORKFLOW.md).
 *
 * These are editorial workflow defaults for when a record should be looked at
 * again. They are not claims about clinical practice and are never displayed as
 * medical guidance.
 */
export const reviewClocks = pgTable('review_clocks', {
  contentClass: reviewClockClass().primaryKey(),
  label: text().notNull(),
  minMonths: integer().notNull(),
  maxMonths: integer().notNull(),
  notes: text(),
});

/**
 * Open verification questions — the spreadsheet's Verification Queue as a
 * first-class table, because "what we have not yet checked" is part of the
 * evidence record, not project-management trivia.
 */
export const verificationIssues = pgTable(
  'verification_issues',
  {
    id: uuid().primaryKey().defaultRandom(),
    issueKey: text().notNull().unique(),
    topic: text().notNull(),
    whyItMatters: text().notNull(),
    currentSourceSignal: text(),
    neededVerification: text(),
    priority: text().notNull().default('high'),
    status: text().notNull().default('open'),
    relatedEntityType: reviewableEntityType(),
    relatedEntityId: uuid(),
    /** Free-form for now: a verification issue may span many records. */
    relatedKeys: jsonb().notNull().default(sql`'[]'::jsonb`),
    openedAt: date().notNull().defaultNow(),
    resolvedAt: date(),
    resolutionNotes: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('verification_issues_status_idx').on(t.status, t.priority)],
);
