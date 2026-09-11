import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getQualityTopicDetail, getQualityTopicReviewPacket } from '@/server/editorial/queries';
import { getStaffDb } from '@/server/db/client';
import { withStaffSession } from '@/server/db/session';
import { getQualityTopicGateStatus } from '@/server/editorial/gate-status';
import { PageHeader, Section, StatusBadge } from '@/components/admin/primitives';
import { GatePanel } from '@/components/admin/gate-panel';
import { ReviewPacketPanel } from '@/components/admin/review-packet';
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
  const packet = await getQualityTopicReviewPacket(session, id);

  return (
    <>
      <PageHeader
        title={topic.name}
        description={topic.qualityKey}
        actions={<StatusBadge status={topic.editorialState} />}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div>
          <Section title="Explainer">
            <QualityTopicForm topic={topic} />
          </Section>

          <Section
            title="Review packet"
            description="Every claim on this topic, the reading behind it, what it admits is uncertain, and the passage it rests on. A reviewer should not have to leave this page to disagree with any of it."
          >
            <ReviewPacketPanel packet={packet} />
          </Section>
        </div>

        <aside className="space-y-6">
          {gate ? <GatePanel status={gate} requiredReviews={['scientific']} /> : null}
          <ReviewControls
            entityType="quality_topic"
            entityId={topic.id}
            role={session.role}
            canPublish={gate?.canPublish ?? false}
            editorialState={topic.editorialState}
          />
        </aside>
      </div>
    </>
  );
}
