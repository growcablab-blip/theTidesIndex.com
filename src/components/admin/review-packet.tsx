import type {
  ReviewPacket,
  ReviewPacketClaim,
  ReviewPacketRelationship,
} from '@/server/editorial/queries';
import { Empty, NotRecorded, StatusBadge } from './primitives';

/**
 * The review packet, as a reviewer reads it.
 *
 * Deliberately not a summary. A reviewer's job is to disagree with a specific
 * reading of a specific passage, which they can only do if the claim, the
 * platform's reading, the stated uncertainty and the locator are all visible
 * together. Collapsing any of those into a heading would make the page tidier
 * and the review worse.
 *
 * The gaps are shown last and are not decoration: they are the statements the
 * extraction could not support, put in front of the reviewer to be confirmed as
 * absences rather than discovered as omissions.
 */
/**
 * How each edge of the map reads to a person. The label states the
 * relationship; the rationale underneath says why; the basis says which record
 * it rests on. A reviewer should be able to disagree with any of the three.
 */
const RELATIONSHIP_LABELS: Readonly<Record<string, string>> = {
  complementary: 'Read alongside this',
  commonly_conflated: 'Routinely confused with this — and a different question',
  not_addressed_by: 'This test says nothing about',
  same_process: 'Part of the same process',
  other_attribute: 'A separate attribute of the same material',
  scoped_by: 'What this result is a statement about',
};

export function ReviewPacketPanel({ packet }: { packet: ReviewPacket }) {
  if (
    packet.claims.length === 0 &&
    packet.gaps.length === 0 &&
    packet.relationships.length === 0
  ) {
    return <Empty>No claims have been extracted for this topic yet.</Empty>;
  }

  return (
    <div className="space-y-10">
      {packet.claims.length === 0 ? (
        <Empty>No claims have been extracted for this topic yet.</Empty>
      ) : (
        <ol className="space-y-8">
          {packet.claims.map((claim) => (
            <li key={claim.id}>
              <ClaimCard claim={claim} />
            </li>
          ))}
        </ol>
      )}

      {packet.gaps.length > 0 ? (
        <section>
          <h3 className="font-serif text-lg text-deep-tide">
            Not supported by the current register
          </h3>
          <p className="mt-1 text-sm text-slate">
            Statements this topic does not make, and why. Each is a deliberate absence.
          </p>
          <ul className="mt-4 space-y-4">
            {packet.gaps.map((gap) => (
              <li key={gap.statement} className="border-l-2 border-rule pl-4">
                <p className="text-sm font-medium text-ink">{gap.statement}</p>
                <p className="mt-1 text-sm text-slate">{gap.whyNotSupported}</p>
                {gap.whatWouldResolveIt ? (
                  <p className="mt-1 text-sm text-slate">
                    <span className="font-medium">Would be resolved by:</span>{' '}
                    {gap.whatWouldResolveIt}
                  </p>
                ) : null}
                {gap.verificationIssueKey ? (
                  <p className="mt-1 text-xs tracking-wide text-slate uppercase">
                    {gap.verificationIssueKey}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {packet.relationships.length > 0 ? (
        <section>
          <h3 className="font-serif text-lg text-deep-tide">Related quality topics</h3>
          <p className="mt-1 text-sm text-slate">
            What else this result relates to, and what it does not answer. An edge that says
            what a test does not establish must point at the claim or the recorded gap
            behind it — the map is a way into the evidence, never a second place it is
            stated.
          </p>
          <div className="mt-4 space-y-6">
            {groupByRelationship(packet.relationships).map(([type, group]) => (
              <div key={type}>
                {/* Grouped, because the relationship is the point and repeating it
                    above every row buries it. */}
                <h4 className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
                  {RELATIONSHIP_LABELS[type] ?? type}
                </h4>
                <ul className="mt-2 space-y-3">
                  {group.map((relationship) => (
                    <li key={relationship.toSlug}>
                      <RelationshipRow relationship={relationship} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Preserves the map's own ordering, both within a group and across groups. */
function groupByRelationship(
  relationships: readonly ReviewPacketRelationship[],
): [string, ReviewPacketRelationship[]][] {
  const groups = new Map<string, ReviewPacketRelationship[]>();
  for (const relationship of relationships) {
    const group = groups.get(relationship.relationshipType) ?? [];
    group.push(relationship);
    groups.set(relationship.relationshipType, group);
  }
  return [...groups];
}

function RelationshipRow({ relationship }: { relationship: ReviewPacketRelationship }) {
  const basis =
    relationship.claimKey ??
    relationship.gapKey ??
    (relationship.isEditorialNavigational ? null : 'no basis recorded');

  return (
    <div className="border-l-2 border-rule pl-4">
      <p className="text-sm font-medium text-ink">
        {relationship.toName}
        {relationship.toEditorialState !== 'published' ? (
          // An edge may point at a topic with nothing written yet. Saying so is
          // more useful to a reader than hiding the relationship.
          <span className="ml-2 text-xs tracking-wide text-slate uppercase">
            {relationship.toEditorialState.replaceAll('_', ' ')}
          </span>
        ) : null}
      </p>
      <p className="mt-1 text-sm text-slate">{relationship.rationale}</p>
      <p className="mt-1 text-xs text-slate">
        {basis === null ? (
          'Structural link — asserts nothing about what either test establishes.'
        ) : (
          <>
            Rests on <span className="font-mono">{basis}</span>
          </>
        )}
      </p>
    </div>
  );
}

function ClaimCard({ claim }: { claim: ReviewPacketClaim }) {
  return (
    <article className="rounded border border-rule p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-mono text-xs tracking-wide text-slate">
          {claim.claimKey} · v{claim.version}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-xs tracking-wide text-slate uppercase">{claim.importance}</span>
          <StatusBadge status={claim.editorialState} />
        </span>
      </header>

      {claim.certificateTypeScope ? (
        // The scope a requirement governs, beside the requirement. A reviewer
        // approving "a certificate should state X" needs to see which kind of
        // certificate before they can agree with it.
        <p className="mt-2 inline-block rounded-sm border border-rule bg-mist px-2 py-0.5 text-xs text-deep-tide">
          Applies to: {claim.certificateTypeScope.replaceAll('_', ' ')}
        </p>
      ) : null}

      <p className="mt-3 text-base text-ink">{claim.claimText}</p>

      {claim.plainLanguageText ? (
        <p className="mt-2 text-sm text-slate">
          <span className="font-medium">In plain language:</span> {claim.plainLanguageText}
        </p>
      ) : null}

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="font-medium text-ink">How this is read</dt>
          <dd className="mt-1 text-slate">
            {claim.interpretationNotes ?? <NotRecorded what="interpretation" />}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-ink">What remains uncertain</dt>
          <dd className="mt-1 text-slate">
            {claim.uncertaintyText ?? <NotRecorded what="uncertainty" />}
          </dd>
        </div>
      </dl>

      {claim.history.length > 0 ? (
        <div className="mt-4 border-t border-rule pt-3">
          <h4 className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
            Decisions already recorded
          </h4>
          <ul className="mt-2 space-y-1.5">
            {claim.history.map((entry) => (
              <li
                key={`${entry.reviewType}-${entry.reviewedAt}`}
                className="text-xs text-slate"
              >
                <span className="text-ink">{entry.reviewType.replaceAll('_', ' ')}</span>
                {' — '}
                {entry.outcome.replaceAll('_', ' ')} at v{entry.entityVersion} by{' '}
                {entry.performedBy === 'automated'
                  ? (entry.automatedTool ?? 'an automated tool')
                  : (entry.reviewerName ?? 'an unnamed reviewer')}
                {entry.appliesToCurrentVersion ? null : (
                  // The whole reason version-bound approvals need showing: an
                  // approval against an earlier version is history, not standing.
                  <span className="ml-2 text-[var(--color-caution)]">
                    superseded — the record has changed since
                  </span>
                )}
                {entry.comments ? (
                  <span className="mt-0.5 block text-slate">{entry.comments}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 border-t border-rule pt-4">
        <h4 className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
          Rests on {claim.evidence.length === 1 ? 'one passage' : `${claim.evidence.length} passages`}
        </h4>
        <ul className="mt-3 space-y-3">
          {claim.evidence.map((evidence) => (
            <li key={`${evidence.sourceKey}-${evidence.locatorText ?? ''}`} className="text-sm">
              <p className="text-ink">
                <span className="font-mono text-xs">{evidence.sourceKey}</span>{' '}
                {evidence.locatorText ?? <NotRecorded what="locator" />}
                {evidence.filePage !== null ? (
                  // The reviewer opens the held file, not an abstraction of it.
                  <span className="text-slate"> · file page {evidence.filePage}</span>
                ) : null}
                {evidence.qcStatus !== 'usable' ? (
                  <span className="ml-2 text-xs font-semibold tracking-wide text-caution uppercase">
                    source {evidence.qcStatus}
                  </span>
                ) : null}
              </p>
              <p className="mt-0.5 text-xs text-slate">
                {evidence.sourceTitle} · {evidence.sourceTypeLabel} · {evidence.evidenceTypeKey} ·{' '}
                {evidence.relationship}
              </p>
              <p className="mt-0.5 text-xs">
                {evidence.primarySourceVerified ? (
                  <span className="text-deep-tide">Primary source traced and read</span>
                ) : (
                  // A source cited is not a source read, and a reviewer is
                  // entitled to the difference before approving a reading of it.
                  <span className="text-slate">
                    Primary source not traced — this rests on the cited source as read
                  </span>
                )}
              </p>
              {evidence.interpretation ? (
                <p className="mt-1 text-slate">{evidence.interpretation}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
