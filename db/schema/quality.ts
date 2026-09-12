import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { publicationState, reviewState } from './enums';

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

    /**
     * Editorial grouping for navigation — analytical, microbiological, and so on.
     *
     * Deliberately separate from the relationship map. A map edge is a claim
     * about how two topics relate and must cite its basis; a family is a shelf
     * somebody put a topic on. Using evidence-backed edges as navigation
     * categories would make the two indistinguishable, and the weaker one would
     * end up carrying the authority of the stronger.
     */
    family: text(),

    shortDescription: text(),
    simpleSummary: text(),
    practitionerSummary: text(),

    /** What a result of this kind can legitimately establish. */
    whatItProves: text(),
    /** What it cannot establish. Required before publication. */
    whatItDoesNotProve: text(),
    /** Misreadings seen in practice, stated plainly. */
    commonMisinterpretations: text(),

    /**
     * The date up to which sources were surveyed for this topic.
     *
     * Distinct from `lastReviewedAt`, which records when a person last looked at
     * the record. A reader needs to know how current the evidence behind a topic
     * is, and that is not answered by when someone last approved the wording.
     * Null until a survey has actually been done — the page says so rather than
     * substituting a source's publication year for a cutoff it did not perform.
     */
    evidenceCutoffAt: date(),

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

    sortOrder: integer().notNull().default(0),
    /** Marks a record created by the local demonstration fixture. See profiles. */
    isDemonstration: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('quality_topics_review_state_idx').on(t.reviewState),
    index('quality_topics_publication_state_idx').on(t.publicationState),
  ],
);
