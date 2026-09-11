import { eq, inArray, sql } from 'drizzle-orm';
import * as schema from '../schema';
import type { SeedDb } from './index';
import { seedData, type EvidencePacket } from './seed-data';

/**
 * Loading an extraction packet.
 *
 * The packet is the shape editorial work actually takes: someone opens one
 * source, reads a bounded part of it, and comes back with a set of discrete
 * propositions, each tied to a page they can be sent back to. This function is
 * the only thing that turns that into records, and it is deliberately strict —
 * a packet either loads completely or not at all.
 *
 * Two refusals matter more than the rest.
 *
 * A packet resting on a source the audit marked for replacement is refused
 * outright rather than loaded and quietly blocked at the gate later. The gates
 * would catch it, but by then the claims exist, and a claim that exists tends to
 * get read.
 *
 * And nothing here publishes. The load ends at `ready_for_scientific_review`,
 * which is as far as work that no person has reviewed can honestly go.
 */

export interface PacketLoadResult {
  packetKey: string;
  locations: number;
  claims: number;
  evidence: number;
  gaps: number;
}

export async function loadEvidencePackets(db: SeedDb): Promise<PacketLoadResult[]> {
  const results: PacketLoadResult[] = [];
  for (const packet of seedData.evidencePackets) {
    results.push(await loadEvidencePacket(db, packet));
  }
  return results;
}

export async function loadEvidencePacket(
  db: SeedDb,
  packet: EvidencePacket,
): Promise<PacketLoadResult> {
  const topic = await requireQualityTopic(db, packet.qualityKey);
  const sourceIds = await requireCitableSources(db, packet);

  // --- The topic's own explanation --------------------------------------
  // `what_it_proves` and `what_it_does_not_prove` are the two fields the whole
  // quality section exists for, and the publish gate refuses a topic missing
  // either. Writing them from the packet keeps them downstream of a source
  // rather than downstream of whoever last edited the page.
  await db
    .update(schema.qualityTopics)
    .set({
      shortDescription: packet.topic.shortDescription,
      simpleSummary: packet.topic.simpleSummary,
      practitionerSummary: packet.topic.practitionerSummary,
      whatItProves: packet.topic.whatItProves,
      whatItDoesNotProve: packet.topic.whatItDoesNotProve,
      commonMisinterpretations: packet.topic.commonMisinterpretations,
    })
    .where(eq(schema.qualityTopics.id, topic.id));

  // --- Locations --------------------------------------------------------
  const locationRows = packet.locations.map((location) => ({
    locationKey: location.key,
    sourceId: requireSourceId(sourceIds, location.sourceKey, location.key),
    locatorText: location.locatorText,
    pageStart: location.pageStart,
    pageEnd: location.pageEnd,
    chapter: location.chapter,
    section: location.section,
    figure: location.figure,
    tableNumber: location.tableNumber,
    notes: location.notes,
  }));

  const locations = await db
    .insert(schema.sourceLocations)
    .values(locationRows)
    .onConflictDoUpdate({
      target: schema.sourceLocations.locationKey,
      set: {
        locatorText: sql`excluded.locator_text`,
        pageStart: sql`excluded.page_start`,
        pageEnd: sql`excluded.page_end`,
        chapter: sql`excluded.chapter`,
        section: sql`excluded.section`,
        figure: sql`excluded.figure`,
        tableNumber: sql`excluded.table_number`,
        notes: sql`excluded.notes`,
      },
    })
    .returning({
      id: schema.sourceLocations.id,
      locationKey: schema.sourceLocations.locationKey,
    });

  const locationIds = new Map(
    locations.flatMap((row) => (row.locationKey === null ? [] : [[row.locationKey, row.id]])),
  );

  // --- Claims -----------------------------------------------------------
  const claimRows = packet.claims.map((claim) => ({
    claimKey: claim.claimKey,
    qualityTopicId: topic.id,
    claimText: claim.claimText,
    plainLanguageText: claim.plainLanguageText,
    claimCategory: claim.claimCategory,
    importance: claim.importance,
    interpretationNotes: claim.interpretationNotes,
    uncertaintyText: claim.uncertaintyText,
  }));

  const claims = await db
    .insert(schema.claims)
    .values(claimRows)
    .onConflictDoUpdate({
      target: schema.claims.claimKey,
      set: {
        qualityTopicId: sql`excluded.quality_topic_id`,
        claimText: sql`excluded.claim_text`,
        plainLanguageText: sql`excluded.plain_language_text`,
        claimCategory: sql`excluded.claim_category`,
        importance: sql`excluded.importance`,
        interpretationNotes: sql`excluded.interpretation_notes`,
        uncertaintyText: sql`excluded.uncertainty_text`,
      },
    })
    .returning({ id: schema.claims.id, claimKey: schema.claims.claimKey });

  const claimIds = new Map(claims.map((row) => [row.claimKey, row.id]));

  // --- Evidence ---------------------------------------------------------
  const evidenceRows = packet.claims.flatMap((claim) => {
    const claimId = claimIds.get(claim.claimKey);
    if (claimId === undefined) return [];
    return claim.evidence.map((evidence) => {
      const location = packet.locations.find((l) => l.key === evidence.locationKey);
      if (location === undefined) {
        throw new Error(
          `${packet.packetKey}: claim ${claim.claimKey} cites location ` +
            `${evidence.locationKey}, which the packet does not define.`,
        );
      }
      const locationId = locationIds.get(evidence.locationKey);
      if (locationId === undefined) {
        throw new Error(`${packet.packetKey}: location ${evidence.locationKey} was not stored.`);
      }
      return {
        claimId,
        sourceId: requireSourceId(sourceIds, location.sourceKey, location.key),
        sourceLocationId: locationId,
        evidenceTypeKey: evidence.evidenceTypeKey,
        relationship: evidence.relationship,
        populationModel: evidence.populationModel,
        interpretation: evidence.interpretation,
      };
    });
  });

  await db
    .insert(schema.claimEvidence)
    .values(evidenceRows)
    .onConflictDoUpdate({
      target: [schema.claimEvidence.claimId, schema.claimEvidence.sourceLocationId],
      set: {
        evidenceTypeKey: sql`excluded.evidence_type_key`,
        relationship: sql`excluded.relationship`,
        populationModel: sql`excluded.population_model`,
        interpretation: sql`excluded.interpretation`,
      },
    });

  // --- What the packet could not support --------------------------------
  const gapRows = packet.notYetSupported.map((gap, i) => ({
    gapKey: `${packet.packetKey}-gap-${String(i + 1).padStart(2, '0')}`,
    qualityTopicId: topic.id,
    statement: gap.statement,
    whyNotSupported: gap.why,
    whatWouldResolveIt: gap.whatWouldResolveIt,
    verificationIssueKey: gap.verificationIssueKey,
    sortOrder: (i + 1) * 10,
  }));

  if (gapRows.length > 0) {
    await db
      .insert(schema.evidenceGaps)
      .values(gapRows)
      .onConflictDoUpdate({
        target: schema.evidenceGaps.gapKey,
        set: {
          statement: sql`excluded.statement`,
          whyNotSupported: sql`excluded.why_not_supported`,
          whatWouldResolveIt: sql`excluded.what_would_resolve_it`,
          verificationIssueKey: sql`excluded.verification_issue_key`,
          sortOrder: sql`excluded.sort_order`,
        },
      });
  }

  return {
    packetKey: packet.packetKey,
    locations: locationRows.length,
    claims: claimRows.length,
    evidence: evidenceRows.length,
    gaps: gapRows.length,
  };
}

/**
 * Records the automated source check and hands the packet to a human reviewer.
 *
 * The check is real work and is recorded as such: every locator in the packet
 * was resolved against the file the registry holds, by a named tool, and the
 * database will not let that be written down as anything but automated. What it
 * buys is the `ready_for_scientific_review` rung — the packet is complete enough
 * to be read by a person, and no further.
 *
 * The transition is not a column write. `tides_mark_ready_for_scientific_review`
 * re-derives the preconditions itself, so a packet that lost its provenance
 * between loading and handover does not advance because this function asked it
 * to.
 */
export async function submitEvidencePacketForReview(
  db: SeedDb,
  packet: EvidencePacket,
  tool: string,
): Promise<{ advanced: string[]; refused: { key: string; reason: string }[] }> {
  const topic = await requireQualityTopic(db, packet.qualityKey);
  const advanced: string[] = [];
  const refused: { key: string; reason: string }[] = [];

  const claims = await db
    .select({ id: schema.claims.id, claimKey: schema.claims.claimKey })
    .from(schema.claims)
    .where(
      inArray(
        schema.claims.claimKey,
        packet.claims.map((c) => c.claimKey),
      ),
    );

  const targets: { key: string; entityType: 'claim' | 'quality_topic'; id: string }[] = [
    ...claims.map((c) => ({ key: c.claimKey, entityType: 'claim' as const, id: c.id })),
    { key: packet.qualityKey, entityType: 'quality_topic' as const, id: topic.id },
  ];

  for (const target of targets) {
    const checked = await db.execute(sql`
      select tides_record_automated_check(
        ${target.entityType}::reviewable_entity_type,
        ${target.id}::uuid,
        'source_check'::review_type,
        ${tool},
        ${'Every locator in this packet was resolved against the registered file.'}
      ) as problem
    `);
    const checkProblem = firstRow<ProblemRow>(checked)?.problem ?? null;
    if (checkProblem !== null) {
      refused.push({ key: target.key, reason: checkProblem });
      continue;
    }

    const marked = await db.execute(sql`
      select tides_mark_ready_for_scientific_review(
        ${target.entityType}::reviewable_entity_type,
        ${target.id}::uuid
      ) as problem
    `);
    const markProblem = firstRow<ProblemRow>(marked)?.problem ?? null;
    if (markProblem !== null) {
      refused.push({ key: target.key, reason: markProblem });
      continue;
    }

    advanced.push(target.key);
  }

  return { advanced, refused };
}

/** Both gate helpers answer the same way: null on success, a sentence on refusal. */
interface ProblemRow {
  problem: string | null;
}

function firstRow<T>(result: unknown): T | undefined {
  if (Array.isArray(result)) return result[0] as T | undefined;
  const rows = (result as { rows?: unknown[] }).rows;
  return rows?.[0] as T | undefined;
}

async function requireQualityTopic(db: SeedDb, qualityKey: string): Promise<{ id: string }> {
  const [topic] = await db
    .select({ id: schema.qualityTopics.id })
    .from(schema.qualityTopics)
    .where(eq(schema.qualityTopics.qualityKey, qualityKey));

  if (topic === undefined) {
    throw new Error(`No quality topic '${qualityKey}'. Seed the vocabularies first.`);
  }
  return topic;
}

/**
 * Refuses a packet whose sources the audit disqualified.
 *
 * V-014 found five registered files that are not the works they claim to be.
 * The publish gates already read `sources.is_citable`, so nothing resting on one
 * could ever go live — but a claim that exists is a claim that gets quoted in a
 * review packet, so the refusal belongs at the point of extraction too.
 */
async function requireCitableSources(
  db: SeedDb,
  packet: EvidencePacket,
): Promise<Map<string, string>> {
  const keys = [...new Set(packet.locations.map((l) => l.sourceKey))];
  const rows = await db
    .select({
      id: schema.sources.id,
      sourceKey: schema.sources.sourceKey,
      isCitable: schema.sources.isCitable,
      qcStatus: schema.sources.qcStatus,
    })
    .from(schema.sources)
    .where(inArray(schema.sources.sourceKey, keys));

  const found = new Map(rows.map((r) => [r.sourceKey, r]));
  for (const key of keys) {
    const row = found.get(key);
    if (row === undefined) {
      throw new Error(`${packet.packetKey}: source ${key} is not in the registry.`);
    }
    if (!row.isCitable) {
      throw new Error(
        `${packet.packetKey}: source ${key} has QC status '${row.qcStatus}' and cannot be ` +
          `extracted from. Replace the file and re-run the source audit first.`,
      );
    }
  }

  return new Map(rows.map((r) => [r.sourceKey, r.id]));
}

function requireSourceId(
  sourceIds: Map<string, string>,
  sourceKey: string,
  locationKey: string,
): string {
  const id = sourceIds.get(sourceKey);
  if (id === undefined) {
    throw new Error(`Location ${locationKey} names source ${sourceKey}, which was not resolved.`);
  }
  return id;
}
