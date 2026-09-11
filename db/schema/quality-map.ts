import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { qualityRelationship } from './enums';
import { qualityTopics } from './quality';
import { claims } from './claims';
import { evidenceGaps } from './evidence-gaps';

/**
 * How quality topics relate to one another.
 *
 * A certificate of analysis is a list of separate answers that readers routinely
 * collapse into one verdict. The map exists to hold them apart: it says what
 * else a result relates to, and — more usefully — what it does not answer.
 *
 * The design problem is that "a purity figure says nothing about sterility" is a
 * statement about evidence, and if the map could simply assert it, the map would
 * become a second place where medical content is written, outside the provenance
 * chain. So the two relationship types that make such a statement must cite
 * their basis: the claim that establishes it, or the recorded gap that explains
 * why the register cannot. That is enforced by `quality_relationships_basis`,
 * not by editorial habit.
 *
 * The remaining types are structural — these are both attributes of the same
 * material, these are two stages of one process — and may be navigational, but
 * they must not smuggle an assertion in as a rationale.
 */
export const qualityRelationships = pgTable(
  'quality_relationships',
  {
    id: uuid().primaryKey().defaultRandom(),

    fromTopicId: uuid()
      .notNull()
      .references(() => qualityTopics.id, { onDelete: 'cascade' }),
    toTopicId: uuid()
      .notNull()
      .references(() => qualityTopics.id, { onDelete: 'cascade' }),

    relationshipType: qualityRelationship().notNull(),

    /** Why these relate, in one sentence, for a reader who is not a chemist. */
    rationale: text().notNull(),

    /** The claim that establishes this relationship, where one does. */
    claimKey: text().references(() => claims.claimKey, {
      onUpdate: 'cascade',
      onDelete: 'restrict',
    }),
    /**
     * The recorded gap that establishes it, where the basis is an absence.
     * "Chromatography says nothing about sterility" is supported by the fact
     * that nothing in the register addresses sterility — which is a gap, not a
     * claim, and pointing at it keeps the two from being confused.
     */
    gapKey: text().references(() => evidenceGaps.gapKey, {
      onUpdate: 'cascade',
      onDelete: 'restrict',
    }),

    /**
     * Marks a purely structural link — a way of navigating between attributes of
     * the same material. Never available to a relationship type that asserts
     * what a test does or does not establish.
     */
    isEditorialNavigational: boolean().notNull().default(false),

    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // A topic does not relate to itself, and one pair relates in one way per
    // kind of relationship.
    check('quality_relationships_distinct', sql`${t.fromTopicId} <> ${t.toTopicId}`),
    /**
     * The rule the map exists under. A relationship that tells a reader what a
     * test does not establish is an evidentiary statement and must resolve to
     * the claim or the gap behind it. Everything else must at least declare
     * itself structural rather than arriving with no basis at all.
     */
    check(
      'quality_relationships_basis',
      sql`case
        when relationship_type in ('commonly_conflated', 'not_addressed_by')
          then claim_key is not null or gap_key is not null
        else is_editorial_navigational or claim_key is not null or gap_key is not null
      end`,
    ),
    uniqueIndex('quality_relationships_edge_uniq').on(t.fromTopicId, t.toTopicId, t.relationshipType),
    index('quality_relationships_from_idx').on(t.fromTopicId),
    index('quality_relationships_to_idx').on(t.toTopicId),
  ],
);
