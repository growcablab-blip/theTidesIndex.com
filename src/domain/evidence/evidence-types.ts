/**
 * Evidence semantics.
 *
 * Pure domain logic: no database, no React, no network. The controlled
 * vocabulary itself lives in the `evidence_types` table so it can be extended
 * without a deployment; what lives here are the rules that operate on it, which
 * must not be extendable by adding a row.
 *
 * Source: EVIDENCE_MODEL.md.
 */

export type EvidenceClass = 'human' | 'preclinical' | 'reference_opinion';

export interface EvidenceTypeDescriptor {
  readonly key: string;
  readonly publicLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly isHumanEvidence: boolean;
  readonly isInterpretive: boolean;
}

/**
 * Human evidence means evidence generated in humans. It is never inferred from
 * an animal or in-vitro result, however suggestive, and it is never inferred
 * from a practitioner's confidence.
 */
export function isHumanEvidence(descriptor: EvidenceTypeDescriptor): boolean {
  return descriptor.evidenceClass === 'human' && descriptor.isHumanEvidence;
}

export function isPreclinical(descriptor: EvidenceTypeDescriptor): boolean {
  return descriptor.evidenceClass === 'preclinical';
}

/**
 * True where the record is a person's reading or practice rather than a study
 * result. Drives attributed phrasing — "LaValle describes…" rather than
 * "research shows…".
 */
export function isInterpretive(descriptor: EvidenceTypeDescriptor): boolean {
  return descriptor.isInterpretive;
}

/**
 * A descriptor is internally consistent only if its class and its human flag
 * agree. Guards against a vocabulary row that would let animal evidence be
 * counted as human.
 */
export function isConsistent(descriptor: EvidenceTypeDescriptor): boolean {
  if (descriptor.evidenceClass === 'human') return descriptor.isHumanEvidence;
  return !descriptor.isHumanEvidence;
}

export interface EvidenceSnapshot {
  readonly humanCount: number;
  readonly preclinicalCount: number;
  readonly interpretiveCount: number;
  readonly hasHumanEvidence: boolean;
  readonly hasAnyEvidence: boolean;
  /**
   * A controlled descriptive phrase. Deliberately not a score: collapsing a
   * body of evidence into a number creates false precision
   * (EVIDENCE_MODEL.md §7).
   */
  readonly statement: EvidenceStatement;
}

export type EvidenceStatement =
  | 'no_evidence_recorded'
  | 'practitioner_and_reference_only'
  | 'preclinical_only'
  | 'preclinical_with_reference'
  | 'limited_human_evidence'
  | 'human_evidence_present';

/**
 * Summarises a body of evidence without ranking or scoring it.
 *
 * The thresholds here are presentational, not clinical: they decide which
 * sentence the page shows, not how good the evidence is. The underlying records
 * remain visible and are always the authority.
 */
export function summariseEvidence(descriptors: readonly EvidenceTypeDescriptor[]): EvidenceSnapshot {
  const humanCount = descriptors.filter(isHumanEvidence).length;
  const preclinicalCount = descriptors.filter(isPreclinical).length;
  const interpretiveCount = descriptors.filter(isInterpretive).length;
  const hasAnyEvidence = descriptors.length > 0;

  let statement: EvidenceStatement;
  if (!hasAnyEvidence) {
    statement = 'no_evidence_recorded';
  } else if (humanCount === 0 && preclinicalCount === 0) {
    statement = 'practitioner_and_reference_only';
  } else if (humanCount === 0) {
    statement = interpretiveCount > 0 ? 'preclinical_with_reference' : 'preclinical_only';
  } else if (humanCount === 1) {
    statement = 'limited_human_evidence';
  } else {
    statement = 'human_evidence_present';
  }

  return {
    humanCount,
    preclinicalCount,
    interpretiveCount,
    hasHumanEvidence: humanCount > 0,
    hasAnyEvidence,
    statement,
  };
}

/** Reader-facing wording for each statement. Never promotional, never a verdict. */
export const EVIDENCE_STATEMENT_TEXT: Readonly<Record<EvidenceStatement, string>> = {
  no_evidence_recorded:
    'No evidence records have been captured for this topic yet. Absence here means the work has not been done, not that evidence does not exist.',
  practitioner_and_reference_only:
    'What is recorded here comes from practitioner references and academic commentary rather than from studies. These describe practice and interpretation, not measured outcomes.',
  preclinical_only:
    'The recorded evidence is preclinical — animal or laboratory work. Preclinical results do not establish what happens in people.',
  preclinical_with_reference:
    'The recorded evidence is preclinical — animal or laboratory work — together with reference and practitioner commentary. Preclinical results do not establish what happens in people.',
  limited_human_evidence:
    'A single human study is recorded. One study, whatever it found, is a starting point rather than an established finding.',
  human_evidence_present:
    'Human studies are recorded. Read the individual records: design, population, route and endpoints determine what each one can support.',
};

/**
 * Guards the most consequential inference error in the product. Given the
 * evidence attached to a claim, reports whether a human-facing statement would
 * be unsupported.
 */
export function wouldOverstateAsHuman(
  descriptors: readonly EvidenceTypeDescriptor[],
): boolean {
  return descriptors.length > 0 && !descriptors.some(isHumanEvidence);
}
