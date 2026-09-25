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
 * **Development contains demonstration records on purpose, and this check is not
 * softened to accommodate that.** It is a release gate, not a linter: a
 * development database is expected to fail it, and a database that passes is one
 * that may be served.
 *
 * The judging is pure so that it is testable; the facts are gathered separately.
 */

/**
 * Key fragments that mark a record as a test fixture rather than content.
 *
 * A convention rather than a column, because the records this catches are ones
 * nobody intended to create in a real database — a fixture written by a test
 * against a shared instance, a row pasted from a spec. A flag would only be set
 * by someone who had already thought about it.
 *
 * Deliberately narrow. `SAMPLE` and `EXAMPLE` are not here: a certificate
 * specimen and an example calculation are legitimate content, and a check that
 * cried wolf on those would be switched off within a month.
 */
export const FIXTURE_KEY_FRAGMENTS = ['TEST', 'FIXTURE'] as const;

/** Columns that describe this index's private copy of a source. */
export const PRIVATE_SOURCE_COLUMNS = [
  'local_private_filename',
  'local_file_sha256',
  'local_file_bytes',
  'canonical_filename',
] as const;

export interface ProductionFacts {
  /** `tides_demonstration_record_count()`. */
  readonly demonstrationRecords: number;
  /**
   * Records that display a review date without a standing human approval.
   *
   * Since publication stopped implying review (migration 0029), a published
   * record with no approval is the ordinary case and not a fault. What must
   * never happen is the other thing: a page showing "last reviewed" on a
   * version no person approved. That is the index claiming a check it did not
   * receive, which is the one failure the whole separation exists to prevent.
   */
  readonly reviewDateWithoutApproval: number;
  /** Approvals recorded against a reviewer profile marked as a demonstration. */
  readonly approvalsByDemonstrationReviewers: number;
  /** Records whose key names them as a test fixture. */
  readonly fixtureRecords: number;
  /**
   * Public view columns exposing a private source field, as `view.column`.
   *
   * A list rather than a count, because the fix is per column and an operator
   * reading this needs to know which view leaked.
   */
  readonly privateColumnsExposed: readonly string[];
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

  if (facts.fixtureRecords > 0) {
    blockers.push({
      key: 'fixture_records',
      summary: `${String(facts.fixtureRecords)} record(s) whose key names them as a test fixture.`,
      consequence:
        'Fixture rows are unreviewed content that nobody intended to write down. They are ' +
        'unpublished, and they should not be in a database that serves the public at all.',
    });
  }

  if (facts.privateColumnsExposed.length > 0) {
    blockers.push({
      key: 'private_source_exposure',
      summary: `A public view exposes a private source field: ${facts.privateColumnsExposed.join(', ')}.`,
      consequence:
        'The filename and checksum of a held third-party copy would be readable by anyone. ' +
        'They are of no use to a reader and are an invitation to ask for the file.',
    });
  }

  if (facts.reviewDateWithoutApproval > 0) {
    blockers.push({
      key: 'review_date_without_approval',
      summary: `${String(facts.reviewDateWithoutApproval)} record(s) carry a review date no approval supports.`,
      consequence:
        'The page would tell a reader that a person checked this version when none did. ' +
        'Only an approved human review at the current version may write last_reviewed_at.',
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

/** True when a record key names it as a test fixture. Case-insensitive. */
export function isFixtureKey(key: string): boolean {
  const upper = key.toUpperCase();
  return FIXTURE_KEY_FRAGMENTS.some(
    (fragment) =>
      upper === fragment ||
      upper.startsWith(`${fragment}-`) ||
      upper.endsWith(`-${fragment}`) ||
      upper.includes(`-${fragment}-`),
  );
}
