import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { reviewTypesForRole, ROLE_LABELS } from '@/server/auth/roles';
import { getReviewQueue } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, StatusBadge, Table } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Review queue' };

const ENTITY_PATHS: Readonly<Record<string, string>> = {
  claim: '/admin/claims',
  peptide: '/admin/peptides',
  protocol: '/admin/protocols',
  quality_topic: '/admin/quality-topics',
};

const ENTITY_LABELS: Readonly<Record<string, string>> = {
  claim: 'Claim',
  peptide: 'Compound',
  protocol: 'Protocol',
  quality_topic: 'Quality topic',
};

export default async function ReviewQueuePage() {
  const session = await requireStaff();
  const queue = await getReviewQueue(session);

  const myReviewTypes = reviewTypesForRole(session.role);
  const awaitingMe = queue.filter((item) =>
    myReviewTypes.some((reviewType) => !item.approvedReviews.includes(reviewType)),
  );

  return (
    <>
      <PageHeader
        title="Review queue"
        description={`Everything not currently published. As ${ROLE_LABELS[session.role]} you record: ${myReviewTypes.map((type) => type.replace(/_/g, ' ')).join(', ')}.`}
      />

      <p className="mb-6 max-w-2xl text-sm text-slate">
        {awaitingMe.length} of {queue.length} records have not yet received a review of a kind you
        can give. Records shown as <strong>needs update</strong> were withdrawn from the public site
        automatically — usually because a source they rest on stopped being citable, or because their
        evidence changed underneath them.
      </p>

      {queue.length === 0 ? (
        <Empty>Nothing awaiting review.</Empty>
      ) : (
        <Table head={['Type', 'Record', 'Status', 'Version', 'Approvals at this version']}>
          {queue.map((item) => (
            <Row key={`${item.entityType}-${item.entityId}`}>
              <Cell className="whitespace-nowrap">{ENTITY_LABELS[item.entityType]}</Cell>
              <Cell className="max-w-lg">
                <Link
                  href={`${ENTITY_PATHS[item.entityType] ?? '/admin'}/${item.entityId}`}
                  className="text-deep-tide underline"
                >
                  {item.label}
                </Link>
                {item.detail ? <p className="text-xs text-slate">{item.detail}</p> : null}
              </Cell>
              <Cell>
                <StatusBadge status={item.editorialState} />
              </Cell>
              <Cell>v{item.version}</Cell>
              <Cell className="text-sm">
                {item.approvedReviews.length === 0 ? (
                  <span className="text-slate">None</span>
                ) : (
                  item.approvedReviews.map((type) => type.replace(/_/g, ' ')).join(', ')
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
