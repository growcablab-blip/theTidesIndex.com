import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getQualityTopicDetail } from '@/server/editorial/queries';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';
import { getQualityTopicGateStatus } from '@/server/editorial/gate-status';
import { PageHeader, Section, StatusBadge } from '@/components/admin/primitives';
import { GatePanel } from '@/components/admin/gate-panel';
import { ReviewControls } from '../../review/review-controls';
import { QualityTopicForm } from './quality-topic-form';

export const metadata: Metadata = { title: 'Quality topic' };

export default async function QualityTopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff();

  const topic = await getQualityTopicDetail(session, id);
  if (!topic) notFound();

  const gate = await withStaffSession(getStaffDb(), session.userId, (tx) =>
    getQualityTopicGateStatus(tx, id),
  );

  return (
    <>
      <PageHeader
        title={topic.name}
        description={topic.qualityKey}
        actions={<StatusBadge status={topic.workflowStatus} />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section title="Explainer">
            <QualityTopicForm topic={topic} />
          </Section>
        </div>

        <aside className="space-y-6">
          {gate ? <GatePanel status={gate} requiredReviews={['scientific']} /> : null}
          <ReviewControls
            entityType="quality_topic"
            entityId={topic.id}
            role={session.role}
            canPublish={gate?.canPublish ?? false}
            workflowStatus={topic.workflowStatus}
          />
        </aside>
      </div>
    </>
  );
}
