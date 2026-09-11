import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { listSources } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, Table } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Sources' };

const QC_NOTES: Readonly<Record<string, string>> = {
  usable: 'Complete copy held.',
  incomplete: 'Partial copy — do not cite sections that are absent.',
  replace: 'Not authoritative. Cannot support published content.',
  pending: 'Identity or completeness unresolved.',
  exclude: 'Excluded from the archive.',
};

export default async function SourcesPage() {
  const session = await requireStaff();
  const sources = await listSources(session);

  return (
    <>
      <PageHeader
        title="Sources"
        description="Bibliographic metadata for every registered source. The files themselves are private research inputs and are not served from this application."
        actions={
          <Link
            href="/admin/sources/new"
            className="rounded bg-deep-tide px-3 py-2 text-sm text-warm-white"
          >
            Register a source
          </Link>
        }
      />

      {sources.length === 0 ? (
        <Empty>No sources registered yet.</Empty>
      ) : (
        <Table head={['Key', 'Title', 'Type', 'Year', 'QC status', 'Locations']}>
          {sources.map((source) => (
            <Row key={source.id}>
              <Cell className="font-mono text-xs whitespace-nowrap">{source.sourceKey}</Cell>
              <Cell>
                <Link href={`/admin/sources/${source.id}`} className="text-deep-tide underline">
                  {source.title}
                </Link>
                {source.authors.length > 0 ? (
                  <p className="text-xs text-slate">{source.authors.join('; ')}</p>
                ) : null}
              </Cell>
              <Cell className="whitespace-nowrap">{source.sourceTypeLabel}</Cell>
              <Cell>{source.year ?? '—'}</Cell>
              <Cell>
                <span
                  className={
                    source.isCitable
                      ? 'rounded border border-rule bg-mist px-2 py-0.5 text-xs text-deep-tide'
                      : 'rounded border border-red-700 bg-red-50 px-2 py-0.5 text-xs text-red-900'
                  }
                >
                  {source.qcStatus}
                </span>
                <p className="mt-1 max-w-xs text-xs text-slate">{QC_NOTES[source.qcStatus]}</p>
              </Cell>
              <Cell>{source.locationCount}</Cell>
            </Row>
          ))}
        </Table>
      )}

      <p className="mt-6 max-w-2xl text-sm text-slate">
        A source marked <strong>replace</strong> or <strong>exclude</strong> cannot be provenance for
        anything published. If the status of a source that already supports published content is
        downgraded, every record resting on it is withdrawn from the public site automatically.
      </p>
    </>
  );
}
