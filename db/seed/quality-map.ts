import { eq, sql } from 'drizzle-orm';
import * as schema from '../schema';
import type { SeedDb } from './index';
import { seedData, type QualityEdge } from './seed-data';

/**
 * Loads the quality map.
 *
 * The map is the layer that keeps a certificate of analysis from reading as a
 * single verdict: it records what else a result relates to, and what it does not
 * answer. That second half is the valuable one and the dangerous one, because
 * "purity says nothing about sterility" is a statement about evidence. The
 * database refuses such an edge unless it cites the claim or the recorded gap
 * behind it; this loader refuses earlier and more legibly, naming the edge.
 *
 * Runs after the packets, because the claims and gaps it cites are theirs.
 */
export async function loadQualityMap(
  db: SeedDb,
  edges: readonly QualityEdge[] = seedData.qualityMap.edges,
): Promise<number> {

  const topics = await db
    .select({ id: schema.qualityTopics.id, qualityKey: schema.qualityTopics.qualityKey })
    .from(schema.qualityTopics);
  const topicIds = new Map(topics.map((t) => [t.qualityKey, t.id]));

  const claimKeys = new Set(
    (await db.select({ claimKey: schema.claims.claimKey }).from(schema.claims)).map(
      (c) => c.claimKey,
    ),
  );
  const gapKeys = new Set(
    (await db.select({ gapKey: schema.evidenceGaps.gapKey }).from(schema.evidenceGaps)).map(
      (g) => g.gapKey,
    ),
  );

  const rows = edges.map((edge) => {
    const label = `${edge.from} -> ${edge.to} (${edge.relationshipType})`;

    const fromTopicId = topicIds.get(edge.from);
    const toTopicId = topicIds.get(edge.to);
    if (fromTopicId === undefined) throw new Error(`${label}: no quality topic '${edge.from}'.`);
    if (toTopicId === undefined) throw new Error(`${label}: no quality topic '${edge.to}'.`);

    // Cited basis must exist. A dangling key would otherwise surface as a
    // foreign-key violation with no indication of which edge caused it.
    if (edge.claimKey !== null && !claimKeys.has(edge.claimKey)) {
      throw new Error(`${label}: cites claim ${edge.claimKey}, which does not exist.`);
    }
    if (edge.gapKey !== null && !gapKeys.has(edge.gapKey)) {
      throw new Error(`${label}: cites gap ${edge.gapKey}, which does not exist.`);
    }

    // The same rule the check constraint enforces, stated where it can name the
    // edge that broke it.
    const assertsEvidence =
      edge.relationshipType === 'commonly_conflated' ||
      edge.relationshipType === 'not_addressed_by';
    if (assertsEvidence && edge.claimKey === null && edge.gapKey === null) {
      throw new Error(
        `${label}: a '${edge.relationshipType}' edge says what a test does or does not ` +
          `establish, so it must cite the claim or the recorded gap behind it.`,
      );
    }
    if (assertsEvidence && edge.isEditorialNavigational) {
      throw new Error(`${label}: a '${edge.relationshipType}' edge is never mere navigation.`);
    }

    return {
      fromTopicId,
      toTopicId,
      relationshipType: edge.relationshipType,
      rationale: edge.rationale,
      claimKey: edge.claimKey,
      gapKey: edge.gapKey,
      isEditorialNavigational: edge.isEditorialNavigational,
      sortOrder: edge.sortOrder,
    };
  });

  if (rows.length === 0) return 0;

  await db
    .insert(schema.qualityRelationships)
    .values(rows)
    .onConflictDoUpdate({
      target: [
        schema.qualityRelationships.fromTopicId,
        schema.qualityRelationships.toTopicId,
        schema.qualityRelationships.relationshipType,
      ],
      set: {
        rationale: sql`excluded.rationale`,
        claimKey: sql`excluded.claim_key`,
        gapKey: sql`excluded.gap_key`,
        isEditorialNavigational: sql`excluded.is_editorial_navigational`,
        sortOrder: sql`excluded.sort_order`,
      },
    });

  return rows.length;
}

/** The edges out of one topic, for the staff map and for tests. */
export async function qualityEdgesFrom(db: SeedDb, qualityKey: string) {
  const [topic] = await db
    .select({ id: schema.qualityTopics.id })
    .from(schema.qualityTopics)
    .where(eq(schema.qualityTopics.qualityKey, qualityKey));
  if (topic === undefined) return [];

  return db
    .select({
      relationshipType: schema.qualityRelationships.relationshipType,
      rationale: schema.qualityRelationships.rationale,
      claimKey: schema.qualityRelationships.claimKey,
      gapKey: schema.qualityRelationships.gapKey,
      isEditorialNavigational: schema.qualityRelationships.isEditorialNavigational,
    })
    .from(schema.qualityRelationships)
    .where(eq(schema.qualityRelationships.fromTopicId, topic.id))
    .orderBy(schema.qualityRelationships.sortOrder);
}
