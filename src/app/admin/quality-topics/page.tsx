import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { listQualityTopics } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, StatusBadge, Table } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Quality topics' };

export default async function QualityTopicsPage() {
  const session = await requireStaff();
  const topics = await listQualityTopics(session);

  return (
    <>
      <PageHeader
        title="Quality topics"
        description="Manufacturing, testing, handling and traceability. Every topic must state what a result of its kind can establish and what it cannot — a topic missing the second half will not publish."
      />

      {topics.length === 0 ? (
        <Empty>No quality topics seeded.</Empty>
      ) : (
        <Table head={['Topic', 'Status', 'Proves / does not prove']}>
          {topics.map((topic) => (
            <Row key={topic.id}>
              <Cell>
                <Link
                  href={`/admin/quality-topics/${topic.id}`}
                  className="text-deep-tide underline"
                >
                  {topic.name}
                </Link>
                <p className="font-mono text-xs text-slate">{topic.qualityKey}</p>
              </Cell>
              <Cell>
                <StatusBadge status={topic.workflowStatus} />
              </Cell>
              <Cell className="text-sm">
                {topic.hasBothHalves ? (
                  'Both stated'
                ) : (
                  <span className="text-slate">Incomplete</span>
                )}
              </Cell>
            </Row>
          ))}
        </Table>
      )}

      <p className="mt-6 max-w-2xl text-sm text-slate">
        The anchor message of this section is that a high chromatographic purity result does not, by
        itself, establish identity, the amount of peptide in a vial, sterility, or endotoxin status.
        That distinction only survives if every explainer is forced to say what its test cannot show.
      </p>
    </>
  );
}
