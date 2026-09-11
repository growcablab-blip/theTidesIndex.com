import Link from 'next/link';
import type { Metadata } from 'next';
import { listSources } from '@/server/public/queries';
import { Callout, Container, EmptyState, TableScroller } from '@/components/public/primitives';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Source register',
  description:
    'Every source The Tides Index works from, including which held copies are unusable and why.',
};

/**
 * The source register.
 *
 * Published in full, including the sources that cannot be cited. A reference
 * that shows only its good sources is telling you less than one that shows the
 * corrupted copy it is waiting to replace — the second tells you where the gaps
 * in its coverage come from.
 *
 * Bibliographic metadata only. The source materials themselves are private
 * research inputs and are not redistributed.
 */

const QC_EXPLANATION: Readonly<Record<string, string>> = {
  usable: 'Complete copy held.',
  incomplete: 'Partial copy. Sections that are absent are not cited.',
  replace: 'Copy is corrupted or partial. Cannot support published statements.',
  pending: 'Not yet obtained, or its identity is unconfirmed.',
  exclude: 'Excluded from the register.',
};

export default async function SourcesPage() {
  const sources = await listSources();
  const citable = sources.filter((s) => s.isCitable);
  const notCitable = sources.filter((s) => !s.isCitable);

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-[62ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Source register</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Every source this index works from, and the state of the copy held of each. Sources that
          cannot currently support a published statement are listed too, with the reason.
        </p>
      </header>

      <div className="mt-8 max-w-[62ch] space-y-4">
        <Callout title="What is published here, and what is not">
          <p>
            Bibliographic metadata is public so that every statement in this index can be traced to
            a specific work at a specific page. The source materials themselves are private research
            inputs and are not redistributed — where a work has a DOI or a publisher record, that is
            the route to it.
          </p>
        </Callout>

        {notCitable.length > 0 ? (
          <Callout tone="caution" title="Why some sources are listed as unusable">
            <p>
              {notCitable.length === 1
                ? 'One source in this register'
                : `${String(notCitable.length)} sources in this register`}{' '}
              cannot currently support published content — a copy is corrupted, partial, or its
              identity is unconfirmed. They remain listed because an honest account of coverage
              includes the material that is missing. The publishing rules refuse to let them back a
              statement until the copy is replaced.
            </p>
          </Callout>
        ) : null}
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-2xl text-ink">Citable sources</h2>
        <p className="mt-1 text-sm text-slate">
          {citable.length} of {sources.length} registered sources can support published statements.
        </p>
        <div className="mt-4">
          {citable.length === 0 ? (
            <EmptyState headline="No citable sources are registered yet." />
          ) : (
            <SourceTable sources={citable} />
          )}
        </div>
      </section>

      {notCitable.length > 0 ? (
        <section className="mt-12">
          <h2 className="font-serif text-2xl text-ink">Not currently citable</h2>
          <p className="mt-1 max-w-[62ch] text-sm text-slate">
            Held, registered, and deliberately not used. Each is queued for replacement.
          </p>
          <div className="mt-4">
            <SourceTable sources={notCitable} />
          </div>
        </section>
      ) : null}
    </Container>
  );
}

function SourceTable({
  sources,
}: {
  sources: Awaited<ReturnType<typeof listSources>>;
}) {
  return (
    <TableScroller>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-rule text-left">
            {['Key', 'Source', 'Kind', 'State of the copy', 'Cited by'].map((head) => (
              <th key={head} className="py-2 pr-4 font-medium text-slate">
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sources.map((source) => (
            <tr key={source.id} className="border-b border-rule-soft align-top">
              <td className="py-3 pr-4 font-mono text-xs whitespace-nowrap text-slate">
                {source.sourceKey}
              </td>
              <td className="max-w-[26rem] py-3 pr-4">
                <Link
                  href={`/sources/${source.sourceKey}`}
                  className="text-deep-tide underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
                >
                  {source.title}
                </Link>
                <p className="mt-0.5 text-xs text-slate">
                  {source.authors.join('; ')}
                  {source.year ? ` · ${String(source.year)}` : ''}
                </p>
              </td>
              <td className="py-3 pr-4 whitespace-nowrap text-ink-soft">
                {source.sourceTypeLabel}
              </td>
              <td className="max-w-[20rem] py-3 pr-4">
                <span
                  className={
                    source.isCitable
                      ? 'text-ink-soft'
                      : 'text-[var(--color-caution)]'
                  }
                >
                  {QC_EXPLANATION[source.qcStatus] ?? source.qcStatus}
                </span>
              </td>
              <td className="tabular py-3 text-ink-soft">{source.citedByCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroller>
  );
}
