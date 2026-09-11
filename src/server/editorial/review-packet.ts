import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';

/**
 * Everything a scientific reviewer needs in front of them at once.
 *
 * A record sitting at `ready_for_scientific_review` is a promise that the packet
 * is complete enough to be judged. Keeping that promise means the reviewer can
 * see, without leaving the page: each claim, the platform's reading of it, what
 * it admits is uncertain, every passage it rests on with a locator they can
 * reopen — and the statements the extraction could not support, so that a gap
 * is something they are asked to confirm rather than something they have to
 * notice is missing.
 */
export interface ReviewPacketEvidence {
  readonly sourceKey: string;
  readonly sourceTitle: string;
  readonly qcStatus: string;
  readonly locatorText: string | null;
  /** Printed page, and where in the held file to find it. */
  readonly pageStart: number | null;
  readonly filePage: number | null;
  readonly evidenceTypeKey: string;
  readonly relationship: string;
  readonly interpretation: string | null;
}

export interface ReviewPacketClaim {
  readonly id: string;
  readonly claimKey: string;
  readonly claimText: string;
  readonly plainLanguageText: string | null;
  readonly importance: string;
  readonly editorialState: string;
  readonly interpretationNotes: string | null;
  readonly uncertaintyText: string | null;
  readonly evidence: readonly ReviewPacketEvidence[];
}

export interface ReviewPacketGap {
  readonly statement: string;
  readonly whyNotSupported: string;
  readonly whatWouldResolveIt: string | null;
  readonly verificationIssueKey: string | null;
}

/**
 * An edge out of this topic, with its basis attached.
 *
 * A reviewer judging "purity says nothing about sterility" needs to see which
 * record the map is leaning on, because the map is not allowed to be the record.
 */
export interface ReviewPacketRelationship {
  readonly relationshipType: string;
  readonly rationale: string;
  readonly claimKey: string | null;
  readonly gapKey: string | null;
  readonly isEditorialNavigational: boolean;
  readonly toName: string;
  readonly toSlug: string;
  /** How far the target has got. An edge may point at an empty topic. */
  readonly toEditorialState: string;
}

export interface ReviewPacket {
  readonly claims: readonly ReviewPacketClaim[];
  readonly gaps: readonly ReviewPacketGap[];
  readonly relationships: readonly ReviewPacketRelationship[];
}

/**
 * Assembles the packet against a given handle.
 *
 * Kept free of `server-only`, and taking a database handle rather than reaching
 * for one, so that what a reviewer is shown can be tested against a real
 * database rather than asserted about in prose.
 */
export async function readQualityTopicReviewPacket(
  tx: Database,
  topicId: string,
): Promise<ReviewPacket> {
  const claimResult = await tx.execute(sql`
    select c.id, c.claim_key, c.claim_text, c.plain_language_text, c.importance,
           c.editorial_state, c.interpretation_notes, c.uncertainty_text
    from claims c
    where c.quality_topic_id = ${topicId}
    order by c.claim_key
  `);
  const claimRows = rows<Record<string, unknown>>(claimResult);
  if (claimRows.length === 0) {
    return {
      claims: [],
      gaps: await gapsFor(tx, topicId),
      relationships: await relationshipsFor(tx, topicId),
    };
  }

  const evidenceResult = await tx.execute(sql`
    select e.claim_id, s.source_key, s.title, s.qc_status, s.printed_page_offset,
           l.locator_text, l.page_start,
           e.evidence_type_key, e.relationship, e.interpretation
    from claim_evidence e
    join claims c on c.id = e.claim_id
    join sources s on s.id = e.source_id
    left join source_locations l on l.id = e.source_location_id
    where c.quality_topic_id = ${topicId}
    order by l.page_start nulls last, s.source_key
  `);

  const byClaim = new Map<string, ReviewPacketEvidence[]>();
  for (const r of rows<Record<string, unknown>>(evidenceResult)) {
    const pageStart = r.page_start === null ? null : Number(r.page_start);
    const offset = r.printed_page_offset === null ? null : Number(r.printed_page_offset);
    const list = byClaim.get(String(r.claim_id)) ?? [];
    list.push({
      sourceKey: String(r.source_key),
      sourceTitle: String(r.title),
      qcStatus: String(r.qc_status),
      locatorText: str(r.locator_text),
      pageStart,
      filePage: pageStart === null || offset === null ? null : pageStart + offset,
      evidenceTypeKey: String(r.evidence_type_key),
      relationship: String(r.relationship),
      interpretation: str(r.interpretation),
    });
    byClaim.set(String(r.claim_id), list);
  }

  return {
    claims: claimRows.map((r) => ({
      id: String(r.id),
      claimKey: String(r.claim_key),
      claimText: String(r.claim_text),
      plainLanguageText: str(r.plain_language_text),
      importance: String(r.importance),
      editorialState: String(r.editorial_state),
      interpretationNotes: str(r.interpretation_notes),
      uncertaintyText: str(r.uncertainty_text),
      evidence: byClaim.get(String(r.id)) ?? [],
    })),
    gaps: await gapsFor(tx, topicId),
    relationships: await relationshipsFor(tx, topicId),
  };
}

async function gapsFor(tx: Database, topicId: string): Promise<ReviewPacketGap[]> {
  const result = await tx.execute(sql`
    select statement, why_not_supported, what_would_resolve_it, verification_issue_key
    from evidence_gaps
    where quality_topic_id = ${topicId}
    order by sort_order
  `);
  return rows<Record<string, unknown>>(result).map((r) => ({
    statement: String(r.statement),
    whyNotSupported: String(r.why_not_supported),
    whatWouldResolveIt: str(r.what_would_resolve_it),
    verificationIssueKey: str(r.verification_issue_key),
  }));
}

async function relationshipsFor(
  tx: Database,
  topicId: string,
): Promise<ReviewPacketRelationship[]> {
  const result = await tx.execute(sql`
    select r.relationship_type, r.rationale, r.claim_key, r.gap_key,
           r.is_editorial_navigational,
           t.name, t.slug, t.editorial_state
    from quality_relationships r
    join quality_topics t on t.id = r.to_topic_id
    where r.from_topic_id = ${topicId}
    order by r.sort_order
  `);
  return rows<Record<string, unknown>>(result).map((r) => ({
    relationshipType: String(r.relationship_type),
    rationale: String(r.rationale),
    claimKey: str(r.claim_key),
    gapKey: str(r.gap_key),
    isEditorialNavigational: Boolean(r.is_editorial_navigational),
    toName: String(r.name),
    toSlug: String(r.slug),
    toEditorialState: String(r.editorial_state),
  }));
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}
