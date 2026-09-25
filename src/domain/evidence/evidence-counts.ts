/**
 * The unit a reader sees when this index counts a compound's evidence.
 *
 * Pure domain logic: no database, no React. Web and print both count through
 * this module, so a number on the site and the same number in a printed
 * monograph are the same count of the same thing.
 *
 * ## The unit: an evidence record
 *
 * A reader thinks in studies, papers and sources — not in the internal
 * statements (claims) this index extracts from them. One trial can support
 * eight statements; counting statements made a well-mined handbook look like
 * eight trials. So the visible unit is the **source**, counted once:
 *
 * - **Human evidence records** — distinct sources cited on the record with an
 *   evidence type that is human evidence (a trial report, an observational
 *   study, a case report, approved product labelling, a registry posting the
 *   record classifies as human evidence).
 * - **Preclinical evidence records** — distinct sources cited with a
 *   preclinical evidence type (animal, cell, tissue, computational or
 *   analytical work).
 * - **Reference and practice sources** — distinct sources cited with any
 *   other evidence type: academic and regulatory references, practitioner and
 *   expert material, anecdote.
 *
 * ## How a source is placed in a lane
 *
 * By the evidence type recorded on each citation, using the same rule as the
 * statement lanes (`laneOfClaim`): human if the citation is human evidence,
 * else preclinical if its class is preclinical, else reference. It is applied
 * to the citation, not to the statement it supports, so a review cited beside
 * a trial under a human-evidence statement counts as a reference source, not as
 * a human evidence record. Nothing is inferred from the kind of publication:
 * a registry entry is human evidence only if the record cites it as such.
 *
 * ## A source in more than one lane
 *
 * A source cited as human evidence for one statement and as a reference for
 * another is counted in both lanes. The lanes therefore need not add up to the
 * number of distinct sources, and the definition printed beside every count
 * says so.
 *
 * ## Statements
 *
 * Statement counts remain available (`statements`) for the deeper evidence
 * sections, where they are labelled "statements" and never stand in for the
 * evidence count.
 */
import type { EvidenceClass } from './evidence-types';

export type EvidenceLane = 'human' | 'preclinical' | 'reference';

export const EVIDENCE_LANES: readonly EvidenceLane[] = ['human', 'preclinical', 'reference'];

/** The least a citation must carry to be counted. */
export interface CountableEvidence {
  readonly isHumanEvidence: boolean;
  readonly evidenceClass: EvidenceClass;
  readonly citation: { readonly sourceKey: string };
}

export interface CountableClaim {
  readonly evidence: readonly CountableEvidence[];
}

/** The lane of a single citation. */
export function laneOfEvidence(evidence: Pick<CountableEvidence, 'isHumanEvidence' | 'evidenceClass'>): EvidenceLane {
  if (evidence.isHumanEvidence) return 'human';
  if (evidence.evidenceClass === 'preclinical') return 'preclinical';
  return 'reference';
}

/**
 * The lane a statement is filed under: the strongest kind of evidence behind
 * it. Null for a statement with no citation.
 */
export function laneOfClaim(claim: { readonly evidence: readonly Pick<CountableEvidence, 'isHumanEvidence' | 'evidenceClass'>[] }): EvidenceLane | null {
  if (claim.evidence.some((e) => e.isHumanEvidence)) return 'human';
  if (claim.evidence.some((e) => e.evidenceClass === 'preclinical')) return 'preclinical';
  if (claim.evidence.length > 0) return 'reference';
  return null;
}

export type LaneCounts = Readonly<Record<EvidenceLane, number>>;

export interface EvidenceRecordCounts extends LaneCounts {
  /** Distinct sources cited as evidence at all. Not the sum of the lanes. */
  readonly distinctSources: number;
  /** Source keys per lane, sorted, for anyone who needs to show which. */
  readonly sourceKeys: Readonly<Record<EvidenceLane, readonly string[]>>;
  /** Statements per lane, by `laneOfClaim`. For the deeper sections only. */
  readonly statements: LaneCounts;
}

export function countEvidenceRecords(claims: readonly CountableClaim[]): EvidenceRecordCounts {
  const byLane: Record<EvidenceLane, Set<string>> = {
    human: new Set(),
    preclinical: new Set(),
    reference: new Set(),
  };
  const all = new Set<string>();
  const statements = { human: 0, preclinical: 0, reference: 0 };

  for (const claim of claims) {
    const lane = laneOfClaim(claim);
    if (lane !== null) statements[lane] += 1;
    for (const evidence of claim.evidence) {
      byLane[laneOfEvidence(evidence)].add(evidence.citation.sourceKey);
      all.add(evidence.citation.sourceKey);
    }
  }

  const sorted = (set: Set<string>) => [...set].sort((a, b) => a.localeCompare(b));
  return {
    human: byLane.human.size,
    preclinical: byLane.preclinical.size,
    reference: byLane.reference.size,
    distinctSources: all.size,
    sourceKeys: {
      human: sorted(byLane.human),
      preclinical: sorted(byLane.preclinical),
      reference: sorted(byLane.reference),
    },
    statements,
  };
}

/** The visible nouns. Identical on the site and in print, in both reading depths. */
export const EVIDENCE_RECORD_NOUN: Readonly<Record<EvidenceLane, { one: string; many: string; heading: string }>> = {
  human: {
    one: 'human evidence record',
    many: 'human evidence records',
    heading: 'Human evidence records',
  },
  preclinical: {
    one: 'preclinical evidence record',
    many: 'preclinical evidence records',
    heading: 'Preclinical evidence records',
  },
  reference: {
    one: 'reference or practice source',
    many: 'reference and practice sources',
    heading: 'Reference and practice sources',
  },
};

export function evidenceRecordNoun(lane: EvidenceLane, n: number): string {
  return n === 1 ? EVIDENCE_RECORD_NOUN[lane].one : EVIDENCE_RECORD_NOUN[lane].many;
}

/** "3 human evidence records". */
export function formatEvidenceRecordCount(lane: EvidenceLane, n: number): string {
  return `${String(n)} ${evidenceRecordNoun(lane, n)}`;
}

/** "12 statements" — the only way a statement count is printed. */
export function formatStatementCount(n: number): string {
  return `${String(n)} ${n === 1 ? 'statement' : 'statements'}`;
}

/**
 * What the counts mean, in one line and in full, at both reading depths. The
 * simple wording is plainer and says the same thing.
 */
export const EVIDENCE_RECORD_DEFINITION = {
  short:
    'Counts are of sources, not statements: each distinct source cited is counted once in every kind of evidence it supplies here. A record is a source, not a study.',
  full:
    'Human evidence records, preclinical evidence records, and reference and practice sources are counts of distinct sources cited on this record — a trial report, a paper, a product label, a registry entry, a textbook, a practitioner reference. Each source is placed by the evidence type recorded for its citation, not by the kind of publication, and is counted once in each kind of evidence it supplies; a source cited both as human evidence and as a reference appears in both counts, so they need not add up. A record is a source, not a study: one trial reported in two papers is two records. Statements — the individual findings extracted from those sources — are counted separately, in the evidence section.',
  simpleShort:
    'These numbers count separate sources — a study, a label, a textbook — not sentences. One source can be counted under more than one heading.',
  simpleFull:
    'Each number counts separate sources: a study report, a medicine label, a textbook, a practitioner’s handbook. A source is counted once under each kind of evidence it gives, so one source can appear under two headings. A study written up in two papers counts as two. The sentences below — what the sources say — are not what is counted.',
} as const;
