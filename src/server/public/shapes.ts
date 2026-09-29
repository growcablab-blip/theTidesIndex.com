/**
 * Shared shapes and row helpers for the public read surface.
 *
 * Deliberately free of `server-only` and of any connection handling, so the
 * modules that do the reading can be exercised directly in tests against the
 * in-process Postgres. The patient/practitioner split is the single most
 * consequential behaviour in the product; it needs to be testable without a
 * browser.
 */
import { sql } from 'drizzle-orm';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

export function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export interface Citation {
  readonly sourceId: string;
  readonly sourceKey: string;
  readonly sourceTitle: string;
  readonly sourceTypeLabel: string;
  readonly authors: readonly string[];
  readonly year: number | null;
  readonly locatorText: string | null;
  /**
   * The page of the work, as printed in it. What a reader with any copy can find.
   */
  readonly printedPage: number | null;
  /**
   * The same page in the copy this index holds, where the two differ. Kept
   * separate rather than folded into one number: they answer different
   * questions, and a reader who conflates them will look in the wrong place.
   */
  readonly filePage: number | null;
  readonly doi: string | null;
  readonly canonicalUrl: string | null;
  /** False for a source whose held copy is partial or awaiting replacement. */
  readonly isCitable: boolean;
}

export const CITATION_SELECT = sql`
  s.id as source_id, s.source_key, s.title as source_title,
  st.public_label as source_type_label, s.authors, s.year, s.doi,
  s.canonical_url, s.is_citable, l.locator_text, l.page_start, s.printed_page_offset
`;

export interface CitationRow {
  source_id: string;
  source_key: string;
  source_title: string;
  source_type_label: string;
  authors: unknown;
  year: number | null;
  doi: string | null;
  canonical_url: string | null;
  is_citable: boolean;
  locator_text: string | null;
  page_start: number | null;
  printed_page_offset: number | null;
}

export function toCitation(row: CitationRow): Citation {
  return {
    sourceId: row.source_id,
    sourceKey: row.source_key,
    sourceTitle: row.source_title,
    sourceTypeLabel: row.source_type_label,
    authors: Array.isArray(row.authors) ? (row.authors as string[]) : [],
    year: row.year,
    locatorText: row.locator_text,
    printedPage: row.page_start,
    filePage:
      row.page_start === null || row.printed_page_offset === null
        ? null
        : row.page_start + row.printed_page_offset,
    doi: row.doi,
    canonicalUrl: row.canonical_url,
    isCitable: row.is_citable,
  };
}

export interface EvidenceRecord {
  readonly id: string;
  readonly evidenceTypeKey: string;
  readonly evidenceTypeLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly isHumanEvidence: boolean;
  readonly isInterpretive: boolean;
  readonly relationship: string;
  readonly populationModel: string | null;
  readonly routeKey: string | null;
  readonly routeName: string | null;
  readonly formulation: string | null;
  readonly interpretation: string | null;
  readonly primarySourceVerified: boolean;
  /**
   * How far this citation has been traced back to the research itself:
   * `primary_source_is_cited`, `abstract_only`, `cited_not_obtained`,
   * `not_attempted`, or one of the four full-text verdicts.
   *
   * A string rather than a union because the vocabulary lives in the database
   * enum, and a second copy of it here would be a second thing to keep in step.
   */
  readonly primaryTrace: string;
  readonly citation: Citation;
}

export interface PublicClaim {
  readonly id: string;
  readonly claimKey: string;
  readonly claimText: string;
  readonly plainLanguageText: string | null;
  readonly claimCategory: string | null;
  readonly importance: string;
  /**
   * The document type a certificate-content requirement governs. Rendered
   * wherever the requirement is, because a requirement shown without its scope
   * is read as universal — which is exactly what Q7's is not.
   */
  readonly certificateTypeScope: string | null;
  readonly interpretationNotes: string | null;
  readonly uncertaintyText: string | null;
  readonly isEditorialNonEvidentiary: boolean;
  readonly needsUpdate: boolean;
  readonly lastReviewedAt: string | null;
  readonly evidence: readonly EvidenceRecord[];
}

/** A protocol as a patient sees it: attribution and context, never a regimen. */
export interface SimpleProtocol {
  readonly id: string;
  readonly protocolKey: string;
  readonly objectiveContext: string;
  readonly populationModel: string | null;
  readonly routeName: string | null;
  readonly regulatoryContext: string | null;
  readonly evidenceTypeLabel: string;
  /**
   * Whether the record describes people rather than a source's advice or an
   * animal model. Carried in both readings because it is a fact about the
   * kind of record, not a regimen detail — and because comparing a handbook's
   * regimen with a trial's as though they were the same kind of statement is
   * the single easiest way to mislead on this subject.
   */
  readonly isHumanEvidence: boolean;
  readonly hasMonitoringGuidance: boolean;
  readonly hasSafetyGuidance: boolean;
  readonly sources: readonly Citation[];
}

/** A protocol as the source reported it. Practitioner mode only. */
export interface PractitionerProtocol extends SimpleProtocol {
  readonly formulation: string | null;
  readonly amountReported: string | null;
  readonly amountUnit: string | null;
  readonly frequencyText: string | null;
  readonly timingText: string | null;
  readonly durationText: string | null;
  readonly cycleText: string | null;
  /** What the source reports the regimen alongside. Never an endorsement of the pairing. */
  readonly combinationsText: string | null;
  readonly titrationText: string | null;
  readonly monitoringText: string | null;
  readonly contraindicationsText: string | null;
  readonly safetyNotes: string | null;
  readonly adverseEventsText: string | null;
  readonly outcomeContext: string | null;
}

/**
 * A statement the index does not make, and why.
 *
 * Rendered as an absence. The distinction that must survive into the UI is
 * between "a reviewed source establishes that X does not bear on Y" and "the
 * evidence this index holds does not establish whether X bears on Y". The
 * second is what a gap records, and it must never be presented as the first.
 */
export interface EvidenceGap {
  readonly id: string;
  /**
   * What kind of gap this is. Carried to the reader because "no source is held"
   * and "the sources disagree" are different things to be told.
   */
  readonly gapType: string;
  readonly statement: string;
  readonly whyNotSupported: string;
  readonly whatWouldResolveIt: string | null;
  readonly verificationIssueKey: string | null;
  /**
   * What it would be useful for somebody to study, derived from this absence.
   *
   * Null unless the gap carries one. Both fields move together — a database
   * constraint refuses a question without a type or a type without a question.
   */
  readonly researchQuestion: string | null;
  readonly opportunityType: string | null;
  /**
   * What later evidence did to this absence: open, partially resolved,
   * resolved or superseded. A gap is never deleted when evidence arrives; a
   * reader who saw it is owed the record of what changed it, and when.
   */
  readonly resolutionState: string;
  readonly resolutionNote: string | null;
  readonly resolutionCheckedAt: string | null;
}

/**
 * How much evidentiary weight a related-topic link carries.
 *
 * Computed once, on the server, from the edge's own basis — so a surface cannot
 * accidentally give a structural link the styling of a sourced statement, and a
 * test can assert that a gap-backed edge never arrives as evidence-backed.
 */
export type RelationshipEvidenceStatus =
  | 'evidence_backed'
  | 'evidence_gap'
  | 'complementary'
  | 'structural';

export interface TopicRelationship {
  readonly id: string;
  readonly relationshipType: string;
  readonly rationale: string;
  readonly evidenceStatus: RelationshipEvidenceStatus;
  readonly claimKey: string | null;
  readonly gapKey: string | null;
  readonly toName: string;
  readonly toSlug: string;
  readonly toIsPublished: boolean;
}

export function relationshipEvidenceStatus(row: {
  relationship_type: unknown;
  claim_key: unknown;
  gap_key: unknown;
}): RelationshipEvidenceStatus {
  if (typeof row.gap_key === 'string') return 'evidence_gap';
  if (row.relationship_type === 'complementary') return 'complementary';
  if (typeof row.claim_key === 'string') return 'evidence_backed';
  return 'structural';
}
