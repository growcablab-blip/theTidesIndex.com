import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getSourceDetail } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, Section, Table } from '@/components/admin/primitives';
import { NewSourceLocationForm } from './new-location-form';

export const metadata: Metadata = { title: 'Source' };

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff();
  const source = await getSourceDetail(session, id);

  if (!source) notFound();

  return (
    <>
      <PageHeader
        title={source.title}
        description={`${source.sourceKey} · ${source.sourceTypeLabel}${source.year ? ` · ${String(source.year)}` : ''}`}
      />

      {!source.isCitable ? (
        <p className="mb-8 rounded border border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">
          This source is marked <strong>{source.qcStatus}</strong> and is not citable. The publish
          gates will refuse any record that depends on it.
        </p>
      ) : null}

      <Section title="Registry">
        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Authors / editors" value={source.authors.join('; ')} />
          <Detail label="DOI" value={source.doi} />
          <Detail label="QC status" value={source.qcStatus} />
          <Detail
            label="Private copy held"
            value={source.localPrivateFilename}
            note="Recorded so the registry can be reconciled against the files. The file is never served."
          />
          <Detail label="What this source can support" value={source.primaryRole} span />
          <Detail label="What it cannot support" value={source.limitationsNotes} span />
          <Detail label="Authority notes" value={source.authorityNotes} span />
        </dl>
      </Section>

      <Section
        title="Source locations"
        description="An exact position within the source. A claim cannot be published against a whole book — it needs a page, chapter, section, figure, table or timestamp a reviewer can open."
      >
        {source.locations.length === 0 ? (
          <Empty>No locations recorded yet. Add one before citing this source.</Empty>
        ) : (
          <Table head={['Locator', 'Pages', 'Chapter', 'Section', 'Cited by']}>
            {source.locations.map((location) => (
              <Row key={location.id}>
                <Cell className="font-medium">{location.locatorText ?? '—'}</Cell>
                <Cell className="whitespace-nowrap">
                  {location.pageStart
                    ? `${String(location.pageStart)}${location.pageEnd ? `–${String(location.pageEnd)}` : ''}`
                    : '—'}
                </Cell>
                <Cell>{location.chapter ?? '—'}</Cell>
                <Cell>{location.section ?? '—'}</Cell>
                <Cell>{location.usageCount}</Cell>
              </Row>
            ))}
          </Table>
        )}

        <div className="mt-6 max-w-xl rounded border border-rule bg-mist p-4">
          <h3 className="mb-3 font-serif text-base text-deep-tide">Add a location</h3>
          <NewSourceLocationForm sourceId={source.id} />
        </div>
      </Section>
    </>
  );
}

function Detail({
  label,
  value,
  note,
  span,
}: {
  label: string;
  value: string | null;
  note?: string;
  span?: boolean;
}) {
  return (
    <div className={span ? 'sm:col-span-2' : undefined}>
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">
        {value && value !== '' ? value : <span className="text-slate italic">Not recorded</span>}
      </dd>
      {note ? <p className="mt-0.5 text-xs text-slate">{note}</p> : null}
    </div>
  );
}
