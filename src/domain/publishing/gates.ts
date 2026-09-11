/**
 * Publish gates, as pure functions.
 *
 * These mirror the database triggers in db/migrations/0002. The database is the
 * enforcement point — it has to be, because it is the only layer every writer
 * passes through. This module exists so the editorial interface can tell an
 * editor *what is missing* before they attempt to publish, rather than
 * surfacing a raw constraint violation.
 *
 * The two must agree. tests/unit/publish-gates.test.ts checks these rules, and
 * tests/integration/publish-gates.test.ts checks the database enforces the same
 * ones; a divergence shows up as one suite passing while the other fails.
 */

export type ReviewType =
  | 'source_check'
  | 'primary_verification'
  | 'scientific'
  | 'clinical'
  | 'compliance';

export type ClaimImportance = 'low' | 'medium' | 'high' | 'critical';

export interface GateFailure {
  readonly code: string;
  /** Plain sentence for the editorial interface. */
  readonly message: string;
  /** The field or relation an editor needs to attend to. */
  readonly field: string;
}

export interface GateResult {
  readonly canPublish: boolean;
  readonly failures: readonly GateFailure[];
}

function result(failures: GateFailure[]): GateResult {
  return { canPublish: failures.length === 0, failures };
}

function isPresent(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/** One evidence link, reduced to what the gate cares about. */
export interface EvidenceLinkState {
  readonly hasSourceLocation: boolean;
  /** False when the source's QC status is `replace` or `exclude`. */
  readonly sourceIsCitable: boolean;
}

export interface ClaimGateInput {
  readonly importance: ClaimImportance;
  readonly isEditorialNonEvidentiary: boolean;
  readonly interpretationNotes: string | null;
  readonly uncertaintyText: string | null;
  readonly evidence: readonly EvidenceLinkState[];
  readonly approvedReviews: readonly ReviewType[];
}

export function evaluateClaimPublishGate(input: ClaimGateInput): GateResult {
  const failures: GateFailure[] = [];

  if (input.isEditorialNonEvidentiary) {
    // Editorial copy carries no evidentiary weight, so it is exempt from
    // provenance — but not from review.
    if (!input.approvedReviews.includes('scientific')) {
      failures.push({
        code: 'editorial_requires_scientific_review',
        field: 'reviews',
        message: 'Editorial copy still needs an approved scientific review before publication.',
      });
    }
    return result(failures);
  }

  const usableEvidence = input.evidence.filter((e) => e.hasSourceLocation && e.sourceIsCitable);

  if (usableEvidence.length === 0) {
    const hasUncitedSource = input.evidence.some((e) => !e.sourceIsCitable);
    const hasLocatorlessEvidence = input.evidence.some((e) => !e.hasSourceLocation);

    failures.push({
      code: 'missing_provenance',
      field: 'evidence',
      message:
        input.evidence.length === 0
          ? 'This claim has no evidence link. Attach at least one source with an exact location.'
          : hasLocatorlessEvidence && !hasUncitedSource
            ? 'Every evidence link needs an exact source location — a page, chapter, section, figure, table or timestamp.'
            : 'The attached sources are not citable. A source marked for replacement or exclusion cannot support a published claim.',
    });
  }

  if (!isPresent(input.interpretationNotes)) {
    failures.push({
      code: 'missing_interpretation',
      field: 'interpretationNotes',
      message: 'Record how the evidence was read before publishing.',
    });
  }

  if (!input.approvedReviews.includes('source_check')) {
    failures.push({
      code: 'missing_source_check',
      field: 'reviews',
      message: 'An approved source check is required.',
    });
  }

  if (!input.approvedReviews.includes('scientific')) {
    failures.push({
      code: 'missing_scientific_review',
      field: 'reviews',
      message: 'An approved scientific review is required.',
    });
  }

  if (input.importance === 'high' || input.importance === 'critical') {
    if (!isPresent(input.uncertaintyText)) {
      failures.push({
        code: 'missing_uncertainty',
        field: 'uncertaintyText',
        message:
          'A high-impact claim must state what remains uncertain. "Not established" is an acceptable answer; silence is not.',
      });
    }

    if (!input.approvedReviews.includes('compliance')) {
      failures.push({
        code: 'missing_compliance_review',
        field: 'reviews',
        message: 'A high-impact claim requires an approved compliance review.',
      });
    }
  }

  return result(failures);
}

export interface ProtocolGateInput {
  readonly populationModel: string | null;
  readonly routeKey: string | null;
  readonly regulatoryContext: string | null;
  readonly sources: readonly EvidenceLinkState[];
  readonly approvedReviews: readonly ReviewType[];
}

export function evaluateProtocolPublishGate(input: ProtocolGateInput): GateResult {
  const failures: GateFailure[] = [];

  const usableSources = input.sources.filter((s) => s.hasSourceLocation && s.sourceIsCitable);
  if (usableSources.length === 0) {
    failures.push({
      code: 'missing_provenance',
      field: 'sources',
      message:
        'A protocol needs a citable source and an exact location within it. A regimen without provenance is not publishable at any status.',
    });
  }

  if (!isPresent(input.populationModel)) {
    failures.push({
      code: 'missing_population',
      field: 'populationModel',
      message:
        'State the population or model. Without it a preclinical regimen can read as a human instruction.',
    });
  }

  if (!isPresent(input.routeKey)) {
    failures.push({
      code: 'missing_route',
      field: 'routeKey',
      message: 'An administration route is required.',
    });
  }

  if (!isPresent(input.regulatoryContext)) {
    failures.push({
      code: 'missing_regulatory_context',
      field: 'regulatoryContext',
      message:
        'State whether this is approved labelling, a study regimen, or practitioner practice. These must never look equivalent.',
    });
  }

  const required: ReviewType[] = ['source_check', 'scientific', 'clinical', 'compliance'];
  for (const reviewType of required) {
    if (!input.approvedReviews.includes(reviewType)) {
      failures.push({
        code: `missing_${reviewType}_review`,
        field: 'reviews',
        message: `An approved ${reviewType.replace('_', ' ')} review is required before a protocol is published.`,
      });
    }
  }

  return result(failures);
}

export interface PeptideGateInput {
  readonly simpleSummary: string | null;
  readonly unknownsSummary: string | null;
  readonly approvedReviews: readonly ReviewType[];
}

export function evaluatePeptidePublishGate(input: PeptideGateInput): GateResult {
  const failures: GateFailure[] = [];

  if (!isPresent(input.simpleSummary)) {
    failures.push({
      code: 'missing_simple_summary',
      field: 'simpleSummary',
      message: 'A plain-language summary is required.',
    });
  }

  if (!isPresent(input.unknownsSummary)) {
    failures.push({
      code: 'missing_unknowns',
      field: 'unknownsSummary',
      message:
        'State what is not established for this compound. A page that cannot say what is unknown is not ready to be read.',
    });
  }

  for (const reviewType of ['scientific', 'compliance'] as const) {
    if (!input.approvedReviews.includes(reviewType)) {
      failures.push({
        code: `missing_${reviewType}_review`,
        field: 'reviews',
        message: `An approved ${reviewType} review is required.`,
      });
    }
  }

  return result(failures);
}

export interface QualityTopicGateInput {
  readonly whatItProves: string | null;
  readonly whatItDoesNotProve: string | null;
  readonly approvedReviews: readonly ReviewType[];
}

export function evaluateQualityTopicPublishGate(input: QualityTopicGateInput): GateResult {
  const failures: GateFailure[] = [];

  if (!isPresent(input.whatItProves)) {
    failures.push({
      code: 'missing_what_it_proves',
      field: 'whatItProves',
      message: 'State what a result of this kind can establish.',
    });
  }

  if (!isPresent(input.whatItDoesNotProve)) {
    failures.push({
      code: 'missing_what_it_does_not_prove',
      field: 'whatItDoesNotProve',
      message:
        'State what it cannot establish. This half is the point of the quality section — a purity result is not an identity, content, sterility or endotoxin result.',
    });
  }

  if (!input.approvedReviews.includes('scientific')) {
    failures.push({
      code: 'missing_scientific_review',
      field: 'reviews',
      message: 'An approved scientific review is required.',
    });
  }

  return result(failures);
}
