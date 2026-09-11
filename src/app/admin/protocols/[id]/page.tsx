import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import {
  getFormVocabularies,
  getProtocolDetail,
  listSources,
} from '@/server/editorial/queries';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';
import { getProtocolGateStatus } from '@/server/editorial/gate-status';
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
import { ReviewControls } from '../../review/review-controls';
import { ProtocolForm } from '../protocol-form';
import { AttachProtocolSourceForm } from './attach-source-form';

export const metadata: Metadata = { title: 'Protocol' };

const SOURCE_ROLE_NOTES: Readonly<Record<string, string>> = {
  original: 'This source originated the regimen.',
  secondary_reference: 'This source repeats a regimen from elsewhere.',
  commentary: 'This source comments on the regimen without reporting it as practice.',
};

export default async function ProtocolDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff();

  const [protocol, sources, vocabularies] = await Promise.all([
    getProtocolDetail(session, id),
    listSources(session),
    getFormVocabularies(session),
  ]);

  if (!protocol) notFound();

  const gate = await withStaffSession(getStaffDb(), session.userId, (tx) =>
    getProtocolGateStatus(tx, id),
  );

  return (
    <>
      <PageHeader
        title={protocol.protocolKey}
        description={
          protocol.peptideName
            ? `Source-reported regimen for ${protocol.peptideName}`
            : (protocol.combinationName ?? 'Source-reported regimen')
        }
        actions={<StatusBadge status={protocol.workflowStatus} />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section
            title="Provenance"
            description="A regimen without a citable source and an exact location within it cannot be published at any status."
          >
            {protocol.sources.length === 0 ? (
              <Empty>No source attached. This protocol cannot be published.</Empty>
            ) : (
              <Table head={['Source', 'Location', 'Role']}>
                {protocol.sources.map((source) => (
                  <Row key={source.id}>
                    <Cell>
                      <Link
                        href={`/admin/sources/${source.sourceId}`}
                        className="text-deep-tide underline"
                      >
                        {source.sourceKey}
                      </Link>
                      <p className="max-w-xs text-xs text-slate">{source.sourceTitle}</p>
                      {!source.sourceIsCitable ? (
                        <p className="mt-1 text-xs text-red-900">
                          Not citable — cannot support publication.
                        </p>
                      ) : null}
                    </Cell>
                    <Cell>
                      {source.locatorText ?? (
                        <span className="text-xs text-red-900">No exact location.</span>
                      )}
                    </Cell>
                    <Cell>
                      <span className="rounded border border-rule bg-mist px-2 py-0.5 text-xs whitespace-nowrap">
                        {source.sourceRole.replace(/_/g, ' ')}
                      </span>
                      <p className="mt-1 max-w-xs text-xs text-slate">
                        {SOURCE_ROLE_NOTES[source.sourceRole]}
                      </p>
                    </Cell>
                  </Row>
                ))}
              </Table>
            )}

            <div className="mt-6 max-w-xl rounded border border-rule bg-mist p-4">
              <h3 className="mb-3 font-serif text-base text-deep-tide">Attach a source</h3>
              <AttachProtocolSourceForm
                protocolId={protocol.id}
                sources={sources.map((source) => ({
                  value: source.id,
                  label: `${source.sourceKey} — ${source.title}${source.isCitable ? '' : ' (not citable)'}`,
                }))}
              />
            </div>
          </Section>

          {protocol.siblings.length > 0 ? (
            <Section
              title="Other regimens for this compound"
              description="These sit alongside this one. They are not reconciled into a single schedule, and a reader sees each attributed to its own source."
            >
              <Table head={['Key', 'Context', 'Sources']}>
                {protocol.siblings.map((sibling) => (
                  <Row key={sibling.id}>
                    <Cell className="font-mono text-xs whitespace-nowrap">
                      <Link
                        href={`/admin/protocols/${sibling.id}`}
                        className="text-deep-tide underline"
                      >
                        {sibling.protocolKey}
                      </Link>
                    </Cell>
                    <Cell className="max-w-md">{sibling.objectiveContext}</Cell>
                    <Cell className="text-xs">{sibling.sourceKeys.join(', ') || '—'}</Cell>
                  </Row>
                ))}
              </Table>
            </Section>
          ) : null}

          <Section title="The regimen as reported">
            <ProtocolForm
              mode="edit"
              protocol={protocol}
              evidenceTypes={vocabularies.evidenceTypes}
              routes={vocabularies.routes}
            />
          </Section>
        </div>

        <aside className="space-y-6">
          {gate ? (
            <GatePanel
              status={gate}
              requiredReviews={['source_check', 'scientific', 'clinical', 'compliance']}
            />
          ) : null}
          <ReviewControls
            entityType="protocol"
            entityId={protocol.id}
            role={session.role}
            canPublish={gate?.canPublish ?? false}
            workflowStatus={protocol.workflowStatus}
          />
        </aside>
      </div>
    </>
  );
}
