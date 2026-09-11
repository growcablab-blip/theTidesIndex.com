import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getClaimDetail, getFormVocabularies, listSources } from '@/server/editorial/queries';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';
import { getClaimGateStatus } from '@/server/editorial/gate-status';
import {
  Cell,
  Empty,
  EvidenceClassBadge,
  PageHeader,
  Row,
  Section,
  StatusBadge,
  Table,
} from '@/components/admin/primitives';
import { GatePanel } from '@/components/admin/gate-panel';
import { ReviewControls } from '../../review/review-controls';
import { ClaimForm } from './claim-form';
import { AttachEvidenceForm } from './attach-evidence-form';

export const metadata: Metadata = { title: 'Claim' };

const RELATIONSHIP_LABELS: Readonly<Record<string, string>> = {
  supports: 'Supports',
  contradicts: 'Contradicts',
  contextualizes: 'Provides context',
  cites: 'Cites',
};

export default async function ClaimDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireStaff();

  const [claim, sources, vocabularies] = await Promise.all([
    getClaimDetail(session, id),
    listSources(session),
    getFormVocabularies(session),
  ]);

  if (!claim) notFound();

  const gate = await withStaffSession(getStaffDb(), session.userId, (tx) =>
    getClaimGateStatus(tx, id),
  );

  const requiredReviews =
    claim.importance === 'high' || claim.importance === 'critical'
      ? (['source_check', 'scientific', 'compliance'] as const)
      : (['source_check', 'scientific'] as const);

  return (
    <>
      <PageHeader
        title={claim.claimKey}
        description={
          claim.peptideName
            ? `Claim about ${claim.peptideName}`
            : 'Claim not attached to a compound'
        }
        actions={<StatusBadge status={claim.editorialState} />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section title="The claim">
            <ClaimForm claim={claim} />
          </Section>

          <Section
            title="Evidence"
            description="Each link ties this claim to an exact location in a named source, and states what kind of evidence that passage is. Contradicting evidence is recorded here too — a disagreement is displayed, never resolved by deletion."
          >
            {claim.evidence.length === 0 ? (
              <Empty>
                No evidence links. This claim cannot be published until at least one links it to an
                exact location in a citable source.
              </Empty>
            ) : (
              <Table head={['Source', 'Location', 'Evidence type', 'Relationship', 'Population']}>
                {claim.evidence.map((evidence) => (
                  <Row key={evidence.id}>
                    <Cell>
                      <Link
                        href={`/admin/sources/${evidence.sourceId}`}
                        className="text-deep-tide underline"
                      >
                        {evidence.sourceKey}
                      </Link>
                      <p className="max-w-xs text-xs text-slate">{evidence.sourceTitle}</p>
                      {!evidence.sourceIsCitable ? (
                        <p className="mt-1 text-xs text-red-900">
                          Not citable — cannot support publication.
                        </p>
                      ) : null}
                    </Cell>
                    <Cell>
                      {evidence.locatorText ?? (
                        <span className="text-xs text-red-900">
                          No exact location — required before publishing.
                        </span>
                      )}
                    </Cell>
                    <Cell>
                      <p className="text-sm">{evidence.evidenceTypeLabel}</p>
                      <div className="mt-1">
                        <EvidenceClassBadge evidenceClass={evidence.evidenceClass} />
                      </div>
                      {evidence.primarySourceVerified ? (
                        <p className="mt-1 text-xs text-deep-tide">Primary source checked</p>
                      ) : null}
                    </Cell>
                    <Cell>{RELATIONSHIP_LABELS[evidence.relationship] ?? evidence.relationship}</Cell>
                    <Cell className="max-w-xs">
                      {evidence.populationModel ?? <span className="text-slate">—</span>}
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}

            <div className="mt-6 max-w-2xl rounded border border-rule bg-mist p-4">
              <h3 className="mb-3 font-serif text-base text-deep-tide">Attach evidence</h3>
              <AttachEvidenceForm
                claimId={claim.id}
                sources={sources.map((source) => ({
                  value: source.id,
                  label: `${source.sourceKey} — ${source.title}${source.isCitable ? '' : ' (not citable)'}`,
                }))}
                evidenceTypes={vocabularies.evidenceTypes}
                routes={vocabularies.routes}
              />
            </div>
          </Section>

          <Section title="Review history">
            {claim.reviews.length === 0 ? (
              <Empty>No reviews recorded.</Empty>
            ) : (
              <Table head={['Review', 'Outcome', 'Version', 'Reviewer', 'Comments']}>
                {claim.reviews.map((review) => (
                  <Row key={review.id}>
                    <Cell className="whitespace-nowrap">{review.reviewType.replace(/_/g, ' ')}</Cell>
                    <Cell>{review.outcome.replace(/_/g, ' ')}</Cell>
                    <Cell>
                      v{review.entityVersion}
                      {review.entityVersion !== claim.version ? (
                        <p className="text-xs text-slate">superseded</p>
                      ) : null}
                    </Cell>
                    <Cell>{review.reviewerName ?? '—'}</Cell>
                    <Cell className="max-w-xs text-slate">{review.comments ?? '—'}</Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          {gate ? <GatePanel status={gate} requiredReviews={requiredReviews} /> : null}
          <ReviewControls
            entityType="claim"
            entityId={claim.id}
            role={session.role}
            canPublish={gate?.canPublish ?? false}
            editorialState={claim.editorialState}
          />
        </aside>
      </div>
    </>
  );
}
