import Link from 'next/link';
import { requireStaff } from '@/server/auth/session';
import { getDashboardCounts, listVerificationIssues } from '@/server/editorial/queries';
import { Empty, PageHeader, Section, Table, Row, Cell } from '@/components/admin/primitives';

export default async function AdminOverviewPage() {
  const session = await requireStaff();
  const [counts, issues] = await Promise.all([
    getDashboardCounts(session),
    listVerificationIssues(session),
  ]);

  const stats = [
    { label: 'Sources registered', value: counts.sources, note: `${counts.citableSources} citable` },
    {
      label: 'Compounds',
      value: counts.peptides,
      note: `${counts.publishedPeptides} published`,
    },
    { label: 'Claims', value: counts.claims, note: `${counts.publishedClaims} published` },
    {
      label: 'Protocols',
      value: counts.protocols,
      note: `${counts.publishedProtocols} published`,
    },
    {
      label: 'Quality topics',
      value: counts.qualityTopics,
      note: `${counts.publishedQualityTopics} published`,
    },
    {
      label: 'Withdrawn for update',
      value: counts.needsUpdate,
      note: 'records that left the public site',
    },
  ];

  return (
    <>
      <PageHeader
        title="Editorial overview"
        description="Coverage is deliberately sparse until extraction and review are done. An empty count is an accurate statement about the work, not a gap to fill with placeholder text."
      />

      <Section title="Coverage">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded border border-rule bg-mist px-4 py-3">
              <dt className="text-sm text-slate">{stat.label}</dt>
              <dd className="mt-1 font-serif text-2xl text-ink">{stat.value}</dd>
              <p className="text-xs text-slate">{stat.note}</p>
            </div>
          ))}
        </dl>
      </Section>

      <Section
        title="Open verification questions"
        description="What has not yet been checked is part of the evidence record. These are the places where a naive reading of the sources would produce something wrong."
        actions={
          <Link href="/admin/review" className="text-sm text-deep-tide underline">
            Review queue
          </Link>
        }
      >
        {issues.length === 0 ? (
          <Empty>No open verification questions.</Empty>
        ) : (
          <Table head={['Issue', 'Topic', 'Priority', 'Why it matters']}>
            {issues.map((issue) => (
              <Row key={issue.issueKey}>
                <Cell className="font-mono text-xs whitespace-nowrap">{issue.issueKey}</Cell>
                <Cell className="font-medium">{issue.topic}</Cell>
                <Cell>
                  <span
                    className={
                      issue.priority === 'critical'
                        ? 'rounded border border-red-700 bg-red-50 px-2 py-0.5 text-xs text-red-900'
                        : 'rounded border border-rule bg-mist px-2 py-0.5 text-xs text-slate'
                    }
                  >
                    {issue.priority}
                  </span>
                </Cell>
                <Cell className="max-w-md text-slate">{issue.whyItMatters}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Section>
    </>
  );
}
