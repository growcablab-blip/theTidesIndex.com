import { sql } from 'drizzle-orm';
import type { SeedDb } from './index';
import { seedData, type LearningPacket } from './seed-data';

/**
 * Learning-topic packets: foundational teaching resting on located claims.
 *
 * The same discipline as a compound packet, with a different subject. A
 * chapter that explains what an agonist is still owes the page it came from,
 * and a source that is partial, translated or unverified is carried as such on
 * every claim rather than quietly treated as the English edition.
 *
 * Refuses a packet citing a source that is absent or not citable. Nothing here
 * publishes.
 */

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export interface LearningLoadResult {
  packetKey: string;
  claims: number;
  gaps: number;
}

export async function loadLearningPackets(
  db: SeedDb,
  packets: readonly LearningPacket[] = seedData.learningPackets,
): Promise<LearningLoadResult[]> {
  const results: LearningLoadResult[] = [];
  for (const packet of packets) results.push(await loadLearningPacket(db, packet));
  return results;
}

async function loadLearningPacket(db: SeedDb, packet: LearningPacket): Promise<LearningLoadResult> {
  const keys = [...new Set(packet.locations.map((l) => l.sourceKey))];
  const sources = new Map<string, string>();
  for (const key of keys) {
    const row = rowsOf<{ id: string; is_citable: boolean }>(
      await db.execute(sql`select id, is_citable from sources where source_key = ${key}`),
    )[0];
    if (row === undefined || !row.is_citable) {
      throw new Error(`${packet.packetKey}: cites ${key}, which is absent or not citable.`);
    }
    sources.set(key, row.id);
  }

  const t = packet.topic;
  const topic = rowsOf<{ id: string }>(
    await db.execute(sql`
      insert into learning_topics (topic_key, slug, title, publication_chapter, summary, notes)
      values (${t.topicKey}, ${t.slug}, ${t.title}, ${t.publicationChapter}, ${t.summary}, ${t.notes})
      on conflict (topic_key) do update set
        slug = excluded.slug,
        title = excluded.title,
        publication_chapter = excluded.publication_chapter,
        summary = excluded.summary,
        notes = excluded.notes,
        updated_at = now()
      returning id
    `),
  )[0];
  if (topic === undefined) throw new Error(`${packet.packetKey}: topic insert returned no row.`);

  const locationIds = new Map<string, string>();
  for (const l of packet.locations) {
    const sourceId = sources.get(l.sourceKey);
    if (sourceId === undefined) throw new Error(`${packet.packetKey}: ${l.key} has no source.`);
    const row = rowsOf<{ id: string }>(
      await db.execute(sql`
        insert into source_locations (
          location_key, source_id, locator_text, page_start, page_end, chapter, section,
          figure, table_number, notes
        ) values (
          ${l.key}, ${sourceId}, ${l.locatorText}, ${l.pageStart}, ${l.pageEnd}, ${l.chapter},
          ${l.section}, ${l.figure}, ${l.tableNumber}, ${l.notes}
        )
        on conflict (location_key) do update set
          source_id = excluded.source_id,
          locator_text = excluded.locator_text,
          page_start = excluded.page_start,
          page_end = excluded.page_end,
          chapter = excluded.chapter,
          section = excluded.section,
          figure = excluded.figure,
          table_number = excluded.table_number,
          notes = excluded.notes
        returning id
      `),
    )[0];
    if (row === undefined) throw new Error(`${packet.packetKey}: location ${l.key} not stored.`);
    locationIds.set(l.key, row.id);
  }

  for (const c of packet.claims) {
    const claim = rowsOf<{ id: string }>(
      await db.execute(sql`
        insert into claims (
          claim_key, learning_topic_id, claim_text, plain_language_text, claim_category,
          importance, interpretation_notes, uncertainty_text
        ) values (
          ${c.claimKey}, ${topic.id}, ${c.claimText}, ${c.plainLanguageText}, ${c.claimCategory},
          ${c.importance}::claim_importance, ${c.interpretationNotes}, ${c.uncertaintyText}
        )
        on conflict (claim_key) do update set
          learning_topic_id = excluded.learning_topic_id,
          claim_text = excluded.claim_text,
          plain_language_text = excluded.plain_language_text,
          claim_category = excluded.claim_category,
          importance = excluded.importance,
          interpretation_notes = excluded.interpretation_notes,
          uncertainty_text = excluded.uncertainty_text
        returning id
      `),
    )[0];
    if (claim === undefined) throw new Error(`${c.claimKey}: insert returned no row.`);

    for (const e of c.evidence) {
      const locationId = locationIds.get(e.locationKey);
      const location = packet.locations.find((l) => l.key === e.locationKey);
      if (locationId === undefined || location === undefined) {
        throw new Error(`${c.claimKey}: cites ${e.locationKey}, which the packet does not define.`);
      }
      await db.execute(sql`
        insert into claim_evidence (
          claim_id, source_id, source_location_id, evidence_type_key, relationship,
          population_model, interpretation, primary_trace, primary_trace_note,
          primary_source_verified
        ) values (
          ${claim.id}, ${sources.get(location.sourceKey)}, ${locationId}, ${e.evidenceTypeKey},
          ${e.relationship}::evidence_relationship, ${e.populationModel}, ${e.interpretation},
          ${e.primaryTrace}::primary_trace_state, ${e.primaryTraceNote},
          ${e.primaryTrace.startsWith('full_text_')}
        )
        on conflict (claim_id, source_location_id) do update set
          evidence_type_key = excluded.evidence_type_key,
          relationship = excluded.relationship,
          population_model = excluded.population_model,
          interpretation = excluded.interpretation,
          primary_trace = excluded.primary_trace,
          primary_trace_note = excluded.primary_trace_note,
          primary_source_verified = excluded.primary_source_verified
      `);
    }
  }

  for (const [i, gap] of packet.notYetSupported.entries()) {
    await db.execute(sql`
      insert into evidence_gaps (
        gap_key, learning_topic_id, gap_type, statement, why_not_supported,
        what_would_resolve_it, verification_issue_key, sort_order,
        research_question, opportunity_type,
        resolution_state, resolution_note, resolution_checked_at
      ) values (
        ${`${packet.packetKey}-gap-${String(i + 1).padStart(2, '0')}`}, ${topic.id},
        ${gap.gapType}::evidence_gap_type, ${gap.statement}, ${gap.why},
        ${gap.whatWouldResolveIt}, ${gap.verificationIssueKey}, ${(i + 1) * 10},
        ${gap.researchQuestion}, ${gap.opportunityType},
        ${gap.resolution?.state ?? 'open'}::gap_resolution_state,
        ${gap.resolution?.note ?? null}, ${gap.resolution?.checkedAt ?? null}
      )
      on conflict (gap_key) do update set
        gap_type = excluded.gap_type,
        statement = excluded.statement,
        why_not_supported = excluded.why_not_supported,
        what_would_resolve_it = excluded.what_would_resolve_it,
        resolution_state = excluded.resolution_state,
        resolution_note = excluded.resolution_note,
        resolution_checked_at = excluded.resolution_checked_at
    `);
  }

  return { packetKey: packet.packetKey, claims: packet.claims.length, gaps: packet.notYetSupported.length };
}
