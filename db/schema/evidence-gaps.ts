import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { evidenceGapType } from './enums';
import { peptides } from './peptides';
import { qualityTopics } from './quality';
import { verificationIssues } from './governance';

/**
 * A statement the platform would make if it held a source for it, and does not.
 *
 * This is deliberately not a claim and deliberately not a verification issue.
 *
 *   - A claim asserts something and must resolve to an exact location in a
 *     citable source. A gap asserts nothing, so it has no provenance to give.
 *   - A verification issue is the work queue: what has not yet been checked.
 *     A gap is the reader-facing consequence: what this page will not tell you,
 *     and why.
 *
 * Recording gaps is what stops a well-known statement from arriving as received
 * wisdom. "Purity says nothing about sterility" is true and is not supported by
 * anything in this register, so it is held here as an absence rather than
 * printed as a claim (MASTER_BUILD_SPEC.md §12; verification issue V-015).
 *
 * Gaps carry no publication state. They are attributes of their subject and
 * become visible exactly when it does, which means a topic cannot be published
 * with its stated limits quietly stripped out.
 */
export const evidenceGaps = pgTable(
  'evidence_gaps',
  {
    id: uuid().primaryKey().defaultRandom(),
    gapKey: text().notNull().unique(),

    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'cascade' }),
    peptideId: uuid().references(() => peptides.id, { onDelete: 'cascade' }),

    /**
     * What kind of gap this is, so gaps can be worked rather than only read.
     * "Blocked on a source we cannot obtain" and "nobody has looked yet" need
     * different work from different people.
     */
    gapType: evidenceGapType().notNull().default('no_current_reviewed_evidence'),

    /** The statement that is not being made. Phrased as the claim it would be. */
    statement: text().notNull(),
    /** Why the register does not support it. Names the absence, not a hedge. */
    whyNotSupported: text().notNull(),
    /** What would close it: a kind of source, not a wish. */
    whatWouldResolveIt: text(),

    /** The open verification issue tracking the acquisition, where one exists. */
    verificationIssueKey: text().references(() => verificationIssues.issueKey, {
      onUpdate: 'cascade',
      onDelete: 'set null',
    }),

    sortOrder: integer().notNull().default(0),

    /**
     * What it would be useful for somebody to study, derived from this absence.
     *
     * Carried on the gap rather than in a table of its own, so a research
     * question cannot exist without the recorded absence that motivates it —
     * which is the difference between a research platform and a wish list.
     *
     * The distinction the wording must hold: "what would be useful to study" is
     * this platform's purpose; "what someone should personally try" is not.
     */
    researchQuestion: text(),
    opportunityType: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'evidence_gaps_opportunity_type_known',
      sql`${t.opportunityType} is null or ${t.opportunityType} in (
        'identity_clarification', 'human_evidence', 'human_safety',
        'human_pharmacokinetics', 'route_comparison', 'formulation_comparison',
        'dose_response', 'independent_replication', 'long_term_outcomes',
        'mechanism_confirmation', 'protocol_validation',
        'product_characterisation', 'regulatory_position')`,
    ),
    // Half a record is worse than none: a question with no type cannot be
    // grouped, and a type with no question says nothing.
    check(
      'evidence_gaps_question_and_type_together',
      sql`(${t.researchQuestion} is null) = (${t.opportunityType} is null)`,
    ),
    check(
      'evidence_gaps_subject_present',
      sql`${t.qualityTopicId} is not null or ${t.peptideId} is not null`,
    ),
    index('evidence_gaps_quality_topic_idx').on(t.qualityTopicId),
    index('evidence_gaps_peptide_idx').on(t.peptideId),
  ],
);
