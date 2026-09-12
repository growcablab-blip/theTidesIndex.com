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
  readonly pageEnd: number | null;
  readonly filePage: number | null;
  /*
   * The structural locators, carried separately from `locatorText`.
   *
   * A reviewer opening a book navigates by chapter and table before they
   * navigate by page, and a page number alone is the locator most likely to be
   * wrong — editions repaginate, scans shift. Keeping the structure means a
   * locator can still be followed when the page is off by one.
   */
  readonly chapter: string | null;
  readonly section: string | null;
  readonly tableNumber: string | null;
  readonly figure: string | null;
  readonly evidenceTypeKey: string;
  readonly relationship: string;
  readonly interpretation: string | null;
  /**
   * Whether anyone has opened the primary study a secondary source cites. False
   * throughout; shown because a reviewer is entitled to know the difference
   * between a source read and a source cited.
   */
  readonly primarySourceVerified: boolean;
  readonly sourceTypeLabel: string;
}

/** Who reviewed, on what standing, and whether they were ever asked. */
export interface ReviewerStanding {
  readonly userId: string;
  readonly displayName: string;
  readonly role: string;
  readonly professionalRole: string | null;
  readonly reviewDomain: string | null;
  readonly organisation: string | null;
  readonly credentialSummary: string | null;
  /** Null means nobody asked — different from a reviewer stating they have none. */
  readonly conflictsDisclosed: boolean | null;
  readonly disclosureNotes: string | null;
  readonly disclosedAt: string | null;
}

/** A decision already recorded against this record, and at which version. */
export interface ReviewHistoryEntry {
  readonly reviewType: string;
  readonly outcome: string;
  readonly entityVersion: number;
  readonly reviewedAt: string;
  readonly performedBy: string;
  readonly automatedTool: string | null;
  readonly reviewerName: string | null;
  readonly comments: string | null;
  /** False once the record has moved on from the version reviewed. */
  readonly appliesToCurrentVersion: boolean;
}

export interface ReviewPacketClaim {
  readonly id: string;
  readonly claimKey: string;
  readonly version: number;
  /** The document family a certificate-content requirement governs. */
  readonly certificateTypeScope: string | null;
  readonly claimText: string;
  readonly plainLanguageText: string | null;
  readonly importance: string;
  /** The claim family, e.g. `certificate-content`. Null where none is set. */
  readonly claimCategory: string | null;
  /** Site copy rather than an evidentiary assertion; exempt from the gate. */
  readonly isEditorialNonEvidentiary: boolean;
  readonly reviewState: string;
  readonly editorialState: string;
  readonly interpretationNotes: string | null;
  readonly uncertaintyText: string | null;
  readonly evidence: readonly ReviewPacketEvidence[];
  /** Decisions already recorded, so a reviewer sees what they are joining. */
  readonly history: readonly ReviewHistoryEntry[];
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
           c.editorial_state, c.review_state, c.interpretation_notes,
           c.uncertainty_text, c.version, c.certificate_type_scope,
           c.claim_category, c.is_editorial_non_evidentiary
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
           l.locator_text, l.page_start, l.page_end, l.chapter, l.section,
           l.table_number, l.figure,
           e.evidence_type_key, e.relationship, e.interpretation,
           e.primary_source_verified, st.public_label as source_type_label
    from claim_evidence e
    join claims c on c.id = e.claim_id
    join sources s on s.id = e.source_id
    join source_types st on st.key = s.source_type_key
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
      pageEnd: r.page_end === null ? null : Number(r.page_end),
      chapter: str(r.chapter),
      section: str(r.section),
      tableNumber: str(r.table_number),
      figure: str(r.figure),
      filePage: pageStart === null || offset === null ? null : pageStart + offset,
      evidenceTypeKey: String(r.evidence_type_key),
      relationship: String(r.relationship),
      interpretation: str(r.interpretation),
      primarySourceVerified: Boolean(r.primary_source_verified),
      sourceTypeLabel: String(r.source_type_label),
    });
    byClaim.set(String(r.claim_id), list);
  }

  const history = await historyFor(
    tx,
    claimRows.map((r) => String(r.id)),
  );

  return {
    claims: claimRows.map((r) => ({
      id: String(r.id),
      claimKey: String(r.claim_key),
      version: Number(r.version),
      certificateTypeScope: str(r.certificate_type_scope),
      history: history.get(String(r.id)) ?? [],
      claimText: String(r.claim_text),
      plainLanguageText: str(r.plain_language_text),
      importance: String(r.importance),
      claimCategory: str(r.claim_category),
      isEditorialNonEvidentiary: Boolean(r.is_editorial_non_evidentiary),
      reviewState: String(r.review_state),
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

/**
 * Decisions already recorded against these claims.
 *
 * `appliesToCurrentVersion` is the field that matters: an approval against
 * version 2 of a record now at version 3 is history, not standing, and a
 * reviewer arriving at a packet should see which is which without doing the
 * arithmetic.
 */
async function historyFor(
  tx: Database,
  claimIds: readonly string[],
): Promise<Map<string, ReviewHistoryEntry[]>> {
  const byClaim = new Map<string, ReviewHistoryEntry[]>();
  if (claimIds.length === 0) return byClaim;

  const result = await tx.execute(sql`
    select r.entity_id, r.review_type, r.outcome, r.entity_version,
           r.reviewed_at::text as reviewed_at, r.performed_by, r.automated_tool,
           r.comments, p.display_name,
           (r.entity_version = c.version) as applies_now
    from reviews r
    join claims c on c.id = r.entity_id
    left join profiles p on p.user_id = r.reviewer_user_id
    where r.entity_type = 'claim'
      and r.entity_id in ${claimIds}
    order by r.reviewed_at desc
  `);

  for (const row of rows<Record<string, unknown>>(result)) {
    const id = String(row.entity_id);
    const list = byClaim.get(id) ?? [];
    list.push({
      reviewType: String(row.review_type),
      outcome: String(row.outcome),
      entityVersion: Number(row.entity_version),
      reviewedAt: String(row.reviewed_at),
      performedBy: String(row.performed_by),
      automatedTool: str(row.automated_tool),
      reviewerName: str(row.display_name),
      comments: str(row.comments),
      appliesToCurrentVersion: Boolean(row.applies_now),
    });
    byClaim.set(id, list);
  }
  return byClaim;
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
