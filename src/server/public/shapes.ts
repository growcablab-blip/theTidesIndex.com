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
  readonly doi: string | null;
  readonly canonicalUrl: string | null;
  /** False for a source whose held copy is partial or awaiting replacement. */
  readonly isCitable: boolean;
}

export const CITATION_SELECT = sql`
  s.id as source_id, s.source_key, s.title as source_title,
  st.public_label as source_type_label, s.authors, s.year, s.doi,
  s.canonical_url, s.is_citable, l.locator_text
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
  readonly citation: Citation;
}

export interface PublicClaim {
  readonly id: string;
  readonly claimKey: string;
  readonly claimText: string;
  readonly plainLanguageText: string | null;
  readonly claimCategory: string | null;
  readonly importance: string;
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
  readonly titrationText: string | null;
  readonly monitoringText: string | null;
  readonly contraindicationsText: string | null;
  readonly safetyNotes: string | null;
  readonly adverseEventsText: string | null;
  readonly outcomeContext: string | null;
}
