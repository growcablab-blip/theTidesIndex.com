import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getPeptideDetail } from '@/server/editorial/queries';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';
import { getPeptideGateStatus } from '@/server/editorial/gate-status';
import {
  Cell,
  Empty,
  PageHeader,
  Row,
  Section,
  StatusBadge,
  Table,
} from '@/components/admin/primitives';
import { GatePanel } from '@/components/admin/gate-panel';
import { PeptideSummariesForm } from './summaries-form';
import { ReviewControls } from '../../review/review-controls';

export const metadata: Metadata = { title: 'Compound' };

const ALIAS_TYPE_NOTES: Readonly<Record<string, string>> = {
  synonym: 'Another name for the same molecule.',
  abbreviation: 'A short form of the canonical name.',
  brand_name: 'A trade name.',
  research_code: 'A development code.',
  chemical_name: 'A chemical or systematic name.',
  common_misnomer: 'A name used in practice that is not correct.',
  related_but_distinct:
    'Discussed alongside this compound in the literature without established identity. Never presented as a synonym.',
};

export default async function PeptideDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff();

  const peptide = await getPeptideDetail(session, id);
  if (!peptide) notFound();

  const gate = await withStaffSession(getStaffDb(), session.userId, (tx) =>
    getPeptideGateStatus(tx, id),
  );

  return (
    <>
      <PageHeader
        title={peptide.canonicalName}
        description={`${peptide.peptideKey}${peptide.compoundTypeLabel ? ` · ${peptide.compoundTypeLabel}` : ''}`}
        actions={<StatusBadge status={peptide.editorialState} />}
      />

      {peptide.isPeptide === false ? (
        <p className="mb-8 rounded border border-amber-600 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          This compound is not a peptide. It appears in the same clinical conversations, but the
          published record must say so plainly rather than letting the context imply otherwise.
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section
            title="Summaries"
            description="Orientation text, not evidence. Anything asserting a fact about biology, efficacy, safety, route or regulation belongs in a claim with provenance attached."
          >
            <PeptideSummariesForm peptide={peptide} />
          </Section>

          <Section title="Names">
            {peptide.aliases.length === 0 ? (
              <Empty>No alternative names recorded.</Empty>
            ) : (
              <Table head={['Name', 'Relationship', 'Notes']}>
                {peptide.aliases.map((alias) => (
                  <Row key={alias.id}>
                    <Cell className="font-medium">{alias.alias}</Cell>
                    <Cell>
                      <span className="rounded border border-rule bg-mist px-2 py-0.5 text-xs whitespace-nowrap">
                        {alias.aliasType.replace(/_/g, ' ')}
                      </span>
                      <p className="mt-1 max-w-xs text-xs text-slate">
                        {ALIAS_TYPE_NOTES[alias.aliasType]}
                      </p>
                    </Cell>
                    <Cell className="max-w-md text-slate">{alias.notes ?? '—'}</Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Section>

          <Section
            title="Claims"
            description="Each claim carries its own provenance and its own evidence type."
            actions={
              <Link
                href={`/admin/claims/new?peptideId=${peptide.id}`}
                className="text-sm text-deep-tide underline"
              >
                New claim
              </Link>
            }
          >
            {peptide.claims.length === 0 ? (
              <Empty>No claims recorded for this compound.</Empty>
            ) : (
              <Table head={['Key', 'Claim', 'Importance', 'Evidence', 'Status']}>
                {peptide.claims.map((claim) => (
                  <Row key={claim.id}>
                    <Cell className="font-mono text-xs whitespace-nowrap">{claim.claimKey}</Cell>
                    <Cell className="max-w-md">
                      <Link
                        href={`/admin/claims/${claim.id}`}
                        className="text-deep-tide underline"
                      >
                        {claim.claimText}
                      </Link>
                    </Cell>
                    <Cell>{claim.importance}</Cell>
                    <Cell>{claim.evidenceCount}</Cell>
                    <Cell>
                      <StatusBadge status={claim.editorialState} />
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Section>

          <Section
            title="Source-reported protocols"
            description="One record per source. Regimens from different sources are never merged, averaged or reconciled into a single schedule."
            actions={
              <Link
                href={`/admin/protocols/new?peptideId=${peptide.id}`}
                className="text-sm text-deep-tide underline"
              >
                New protocol
              </Link>
            }
          >
            {peptide.protocols.length === 0 ? (
              <Empty>No protocol records for this compound.</Empty>
            ) : (
              <Table head={['Key', 'Context', 'Route', 'Sources', 'Status']}>
                {peptide.protocols.map((protocol) => (
                  <Row key={protocol.id}>
                    <Cell className="font-mono text-xs whitespace-nowrap">
                      <Link
                        href={`/admin/protocols/${protocol.id}`}
                        className="text-deep-tide underline"
                      >
                        {protocol.protocolKey}
                      </Link>
                    </Cell>
                    <Cell className="max-w-md">{protocol.objectiveContext}</Cell>
                    <Cell>{protocol.routeKey ?? '—'}</Cell>
                    <Cell>{protocol.sourceCount}</Cell>
                    <Cell>
                      <StatusBadge status={protocol.editorialState} />
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}
          </Section>
        </div>

        <aside className="space-y-6">
          {gate ? (
            <GatePanel status={gate} requiredReviews={['scientific', 'compliance']} />
          ) : null}
          <ReviewControls
            entityType="peptide"
            entityId={peptide.id}
            role={session.role}
            canPublish={gate?.canPublish ?? false}
            editorialState={peptide.editorialState}
          />
        </aside>
      </div>
    </>
  );
}
