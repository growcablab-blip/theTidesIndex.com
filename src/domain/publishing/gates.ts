/**
 * Publish gates, as pure functions.
 *
 * These mirror the database triggers in db/migrations/0002, as amended by 0029.
 * The database is the enforcement point — it has to be, because it is the only
 * layer every writer passes through. This module exists so the editorial
 * interface can tell an editor *what is missing* before they attempt to
 * publish, rather than surfacing a raw constraint violation.
 *
 * The two must agree. tests/unit/publish-gates.test.ts checks these rules, and
 * tests/integration/publish-gates.test.ts checks the database enforces the same
 * ones; a divergence shows up as one suite passing while the other fails.
 *
 * Since the owner decision of 24 September 2026, human review is not one of
 * these rules. Publication asks whether a record is honestly sourced and
 * complete; review asks how far a person has checked it. They are two separate
 * questions, and a record may legitimately be public and not yet reviewed —
 * provided the page says so, which is what `review_state` on the public views
 * is for.
 *
 * Review has not gone away; it has moved. `outstandingReviews` below reports
 * which approvals a record still lacks, so the review queue can go on showing
 * reviewers exactly what it showed them before. The difference is that the
 * answer no longer decides whether the public can read the page.
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
  /**
   * Whether a reviewer's most recent decision at this version asks for changes.
   *
   * Not a review requirement: a record nobody has looked at still publishes.
   * This is the other case — somebody looked and said it is wrong, and the
   * objection has not been answered. Mirrors tides_has_open_change_request.
   */
  readonly hasOpenChangeRequest: boolean;
}


/** The refusal a live change request produces, shared by every gate. */
function changeRequestFailure(): GateFailure {
  return {
    code: 'open_change_request',
    field: 'reviews',
    message:
      'A reviewer has asked for changes and the request has not been resolved. Answer it, or record a new decision, before publishing.',
  };
}

export function evaluateClaimPublishGate(input: ClaimGateInput): GateResult {
  const failures: GateFailure[] = [];

  if (input.isEditorialNonEvidentiary) {
    // Editorial copy carries no evidentiary weight, so it is exempt from
    // provenance. It was previously held back for a scientific review it could
    // not meaningfully receive; under the 2026-09-24 policy it publishes and
    // states its review state like everything else. A live objection still
    // stops it, because that is a person's judgement rather than a missing
    // approval.
    if (input.hasOpenChangeRequest) failures.push(changeRequestFailure());
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

  if (input.importance === 'high' || input.importance === 'critical') {
    if (!isPresent(input.uncertaintyText)) {
      failures.push({
        code: 'missing_uncertainty',
        field: 'uncertaintyText',
        message:
          'A high-impact claim must state what remains uncertain. "Not established" is an acceptable answer; silence is not.',
      });
    }
  }

  // Last, so an editor hears about a fixable content gap before a reviewer's
  // objection — which may well have been about exactly that gap.
  if (failures.length === 0 && input.hasOpenChangeRequest) {
    failures.push(changeRequestFailure());
  }

  return result(failures);
}

export interface ProtocolGateInput {
  readonly populationModel: string | null;
  readonly routeKey: string | null;
  readonly regulatoryContext: string | null;
  readonly sources: readonly EvidenceLinkState[];
  readonly approvedReviews: readonly ReviewType[];
  /**
   * Whether a reviewer's most recent decision at this version asks for changes.
   *
   * Not a review requirement: a record nobody has looked at still publishes.
   * This is the other case — somebody looked and said it is wrong, and the
   * objection has not been answered. Mirrors tides_has_open_change_request.
   */
  readonly hasOpenChangeRequest: boolean;
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

  // Last, so an editor hears about a fixable content gap before a reviewer's
  // objection — which may well have been about exactly that gap.
  if (failures.length === 0 && input.hasOpenChangeRequest) {
    failures.push(changeRequestFailure());
  }

  return result(failures);
}

export interface PeptideGateInput {
  readonly simpleSummary: string | null;
  readonly unknownsSummary: string | null;
  readonly approvedReviews: readonly ReviewType[];
  /**
   * Whether a reviewer's most recent decision at this version asks for changes.
   *
   * Not a review requirement: a record nobody has looked at still publishes.
   * This is the other case — somebody looked and said it is wrong, and the
   * objection has not been answered. Mirrors tides_has_open_change_request.
   */
  readonly hasOpenChangeRequest: boolean;
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

  // Last, so an editor hears about a fixable content gap before a reviewer's
  // objection — which may well have been about exactly that gap.
  if (failures.length === 0 && input.hasOpenChangeRequest) {
    failures.push(changeRequestFailure());
  }

  return result(failures);
}

export interface QualityTopicGateInput {
  readonly whatItProves: string | null;
  readonly whatItDoesNotProve: string | null;
  readonly approvedReviews: readonly ReviewType[];
  /**
   * Whether a reviewer's most recent decision at this version asks for changes.
   *
   * Not a review requirement: a record nobody has looked at still publishes.
   * This is the other case — somebody looked and said it is wrong, and the
   * objection has not been answered. Mirrors tides_has_open_change_request.
   */
  readonly hasOpenChangeRequest: boolean;
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

  // Last, so an editor hears about a fixable content gap before a reviewer's
  // objection — which may well have been about exactly that gap.
  if (failures.length === 0 && input.hasOpenChangeRequest) {
    failures.push(changeRequestFailure());
  }

  return result(failures);
}

/**
 * Which approved human reviews a record still lacks.
 *
 * This is the other half of the 2026-09-24 separation. These are exactly the
 * approvals that used to block publication; they now describe how far a record
 * has been checked, which is what the review queue and the record's own review
 * state are built from. Nothing here gates visibility.
 *
 * High and critical claims still carry compliance, because importance is what
 * made that review worth asking for in the first place — the answer simply
 * changes the assurance a reader is shown rather than whether they see the page.
 */
export type ReviewableEntity = 'claim' | 'protocol' | 'peptide' | 'quality_topic';

export function outstandingReviews(
  entity: ReviewableEntity,
  approvedReviews: readonly ReviewType[],
  importance: ClaimImportance = 'low',
): readonly ReviewType[] {
  const required: readonly ReviewType[] =
    entity === 'protocol'
      ? ['source_check', 'scientific', 'clinical', 'compliance']
      : entity === 'peptide'
        ? ['scientific', 'compliance']
        : entity === 'quality_topic'
          ? ['scientific']
          : importance === 'high' || importance === 'critical'
            ? ['source_check', 'scientific', 'compliance']
            : ['source_check', 'scientific'];

  return required.filter((reviewType) => !approvedReviews.includes(reviewType));
}
