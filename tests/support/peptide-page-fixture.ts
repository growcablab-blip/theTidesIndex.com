import type { EvidenceClass } from '@/domain/evidence/evidence-types';
import type { PeptidePage } from '@/server/public/queries';
import type { EvidenceRecord, PublicClaim } from '@/server/public/shapes';

/**
 * An in-memory compound record for rendering tests. Every value is a
 * placeholder; nothing here is a medical claim.
 */

const TYPES: Readonly<Record<string, { label: string; evidenceClass: EvidenceClass; human: boolean; interpretive: boolean }>> = {
  human_rct: { label: 'Randomised human trial', evidenceClass: 'human', human: true, interpretive: false },
  human_case_report: { label: 'Human case report', evidenceClass: 'human', human: true, interpretive: false },
  animal_in_vivo: { label: 'Animal study', evidenceClass: 'preclinical', human: false, interpretive: false },
  analytical_characterisation: { label: 'Analytical characterisation', evidenceClass: 'preclinical', human: false, interpretive: false },
  academic_reference: { label: 'Academic reference', evidenceClass: 'reference_opinion', human: false, interpretive: false },
  practitioner_reference: { label: 'Practitioner reference', evidenceClass: 'reference_opinion', human: false, interpretive: true },
  expert_commentary: { label: 'Expert commentary', evidenceClass: 'reference_opinion', human: false, interpretive: true },
};

let seq = 0;

export function evidence(sourceKey: string, typeKey: keyof typeof TYPES): EvidenceRecord {
  const t = TYPES[typeKey]!;
  seq += 1;
  return {
    id: `ev-${String(seq)}`,
    evidenceTypeKey: typeKey,
    evidenceTypeLabel: t.label,
    evidenceClass: t.evidenceClass,
    isHumanEvidence: t.human,
    isInterpretive: t.interpretive,
    relationship: 'supports',
    populationModel: null,
    routeKey: null,
    routeName: null,
    formulation: null,
    interpretation: null,
    primarySourceVerified: false,
    primaryTrace: 'not_attempted',
    citation: {
      sourceId: `id-${sourceKey}`,
      sourceKey,
      sourceTitle: `Placeholder title for ${sourceKey}`,
      sourceTypeLabel: 'Placeholder',
      authors: [],
      year: null,
      locatorText: null,
      printedPage: null,
      filePage: null,
      doi: null,
      canonicalUrl: null,
      isCitable: true,
    },
  };
}

export function claim(key: string, evidenceRecords: readonly EvidenceRecord[], category: string | null = null): PublicClaim {
  return {
    id: `claim-${key}`,
    claimKey: key,
    claimText: `Placeholder statement ${key}.`,
    plainLanguageText: null,
    claimCategory: category,
    importance: 'medium',
    certificateTypeScope: null,
    interpretationNotes: null,
    uncertaintyText: null,
    isEditorialNonEvidentiary: false,
    needsUpdate: false,
    lastReviewedAt: null,
    evidence: evidenceRecords,
  };
}

/**
 * Four statements over five sources:
 *
 *   SRC-1  trial, cited by two human statements          → human
 *   SRC-5  case report for A, expert commentary for D    → human and reference
 *   SRC-9  review, beside a trial and beside an animal study → reference only
 *   SRC-2  animal study                                  → preclinical
 *   SRC-3  practitioner handbook                         → reference
 *
 * Human 2, preclinical 1, reference 3, distinct 5; statements 2 / 1 / 1.
 */
export function mixedClaims(): PublicClaim[] {
  return [
    claim('A', [evidence('SRC-1', 'human_rct'), evidence('SRC-9', 'academic_reference')]),
    claim('B', [evidence('SRC-1', 'human_rct'), evidence('SRC-5', 'human_case_report')]),
    claim('C', [evidence('SRC-2', 'animal_in_vivo'), evidence('SRC-9', 'academic_reference')]),
    claim('D', [evidence('SRC-3', 'practitioner_reference'), evidence('SRC-5', 'expert_commentary')]),
  ];
}

export function peptidePage(overrides: Partial<PeptidePage> = {}): PeptidePage {
  return {
    id: 'pep-1',
    slug: 'placeholder',
    peptideKey: 'PLACEHOLDER',
    canonicalName: 'Placeholder compound',
    shortDescription: null,
    simpleSummary: 'A plain summary.',
    practitionerSummary: 'A practitioner summary. Second sentence.',
    unknownsSummary: null,
    sequence: null,
    molecularDescription: null,
    naturalOrSynthetic: null,
    compoundTypeLabel: null,
    isPeptide: true,
    categoryLabel: null,
    version: 1,
    publishedAt: null,
    lastReviewedAt: null,
    evidenceCutoffAt: null,
    needsUpdate: false,
    // The default a real record now carries: publicly readable, and not yet read
    // by a person. Tests that care about review state override it.
    reviewState: 'unreviewed',
    publicationState: 'published',
    isPreview: false,
    aliases: [],
    claims: mixedClaims(),
    routes: [],
    regulatoryStatuses: [],
    disagreements: [],
    products: [],
    forms: [],
    pharmacokinetics: [],
    literatureScreens: [],
    identities: [],
    replication: [],
    gaps: [],
    protocols: [],
    protocolCountAll: 0,
    trials: [],
    ...overrides,
  };
}
