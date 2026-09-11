import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { workflowStatus } from './enums';

/**
 * Manufacturing, testing, handling and traceability topics (MASTER_BUILD_SPEC.md §11).
 *
 * `whatItProves` / `whatItDoesNotProve` are the two fields the whole quality
 * section exists for. The anchor message — a high HPLC purity result does not
 * by itself establish identity, vial content, sterility or endotoxin status —
 * is only representable if every test explainer carries both halves.
 */
export const qualityTopics = pgTable(
  'quality_topics',
  {
    id: uuid().primaryKey().defaultRandom(),
    qualityKey: text().notNull().unique(),
    name: text().notNull(),
    slug: text().notNull().unique(),

    shortDescription: text(),
    simpleSummary: text(),
    practitionerSummary: text(),

    /** What a result of this kind can legitimately establish. */
    whatItProves: text(),
    /** What it cannot establish. Required before publication. */
    whatItDoesNotProve: text(),
    /** Misreadings seen in practice, stated plainly. */
    commonMisinterpretations: text(),

    workflowStatus: workflowStatus().notNull().default('unreviewed'),
    version: integer().notNull().default(1),
    publishedAt: timestamp({ withTimezone: true }),
    lastReviewedAt: timestamp({ withTimezone: true }),

    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('quality_topics_workflow_status_idx').on(t.workflowStatus)],
);
