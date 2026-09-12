/**
 * What must be true of a database before it is allowed to serve the public.
 *
 * `tides_demonstration_record_count()` has existed since migration 0009 with the
 * comment "must be zero in production", and nothing checked it. A rule that is
 * written down and never evaluated is a comment.
 *
 * The one this exists for: the demonstration dataset seeds a profile called
 * "Demo Scientific Reviewer", and `tides_has_approved_review` counts any human
 * approval with a reviewer attached. In a development database that is the
 * point — the demonstration content flows through the real gates. In a
 * production database it is a fabricated scientific approval on real medical
 * content, which is the single worst failure this platform can have.
 *
 * Rather than weaken the gate so that it can tell a real reviewer from a
 * demonstration one, the demonstration records are kept out of production
 * altogether. The gate stays simple and the guard is at the door.
 *
 * The judging is pure so that it is testable; the facts are gathered separately.
 */

export interface ProductionFacts {
  /** `tides_demonstration_record_count()`. */
  readonly demonstrationRecords: number;
  /** Published records with no standing human approval at their current version. */
  readonly publishedWithoutStandingApproval: number;
  /** Approvals recorded against a reviewer profile marked as a demonstration. */
  readonly approvalsByDemonstrationReviewers: number;
  /** Whether unpublished-content preview is switched on. */
  readonly previewEnabled: boolean;
  /** `process.env.NODE_ENV`. */
  readonly nodeEnv: string;
}

export interface Blocker {
  readonly key: string;
  /** What is wrong, in one line. */
  readonly summary: string;
  /** What it would mean if this were served. */
  readonly consequence: string;
}

/**
 * Returns the reasons this database must not serve the public, in the order
 * they should be fixed. An empty list is the only passing result.
 */
export function productionBlockers(facts: ProductionFacts): Blocker[] {
  const blockers: Blocker[] = [];

  if (facts.demonstrationRecords > 0) {
    blockers.push({
      key: 'demonstration_records',
      summary: `${String(facts.demonstrationRecords)} demonstration record(s) present.`,
      consequence:
        'The demonstration dataset includes a reviewer profile whose approvals satisfy the ' +
        'publish gates. In production that is a manufactured scientific review.',
    });
  }

  if (facts.approvalsByDemonstrationReviewers > 0) {
    blockers.push({
      key: 'demonstration_approvals',
      summary: `${String(facts.approvalsByDemonstrationReviewers)} review(s) recorded by a demonstration reviewer.`,
      consequence:
        'A record may be published on an approval no person made. Remove the reviews, not ' +
        'just the profile.',
    });
  }

  if (facts.publishedWithoutStandingApproval > 0) {
    blockers.push({
      key: 'published_without_approval',
      summary: `${String(facts.publishedWithoutStandingApproval)} published record(s) have no standing human approval.`,
      consequence:
        'The publish gates are triggers and should make this impossible. A non-zero count ' +
        'means a gate is missing, disabled, or was bypassed.',
    });
  }

  if (facts.previewEnabled && facts.nodeEnv === 'production') {
    blockers.push({
      key: 'preview_enabled',
      summary: 'Unpublished-content preview is enabled in a production build.',
      consequence: 'Unreviewed medical content would be readable by anyone holding a URL.',
    });
  }

  return blockers;
}

export function readyForProduction(facts: ProductionFacts): boolean {
  return productionBlockers(facts).length === 0;
}
