import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSource } from '@/server/public/queries';
import { formatAuthors } from '@/components/public/citation';
import {
  Callout,
  Container,
  DefinitionRow,
  NotRecorded,
  Section,
} from '@/components/public/primitives';

/**
 * A source record.
 *
 * What this work is, what it can legitimately support, what it cannot, and the
 * state of the copy held. The last two are the unusual ones and the reason the
 * page exists: a reader weighing a statement needs to know that the reference
 * behind it is a practitioner handbook rather than a trial report, and that the
 * copy of it held here is complete.
 */

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const source = await getSource(key);
  if (!source) return { title: 'Source not found' };
  return { title: source.title, description: source.primaryRole ?? undefined };
}

export default async function SourcePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const source = await getSource(key);

  if (!source) notFound();

  return (
    <Container width="page" className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-slate">
        <Link href="/sources" className="hover:text-deep-tide">
          Source register
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{source.sourceKey}</span>
      </nav>

      <header className="max-w-[62ch]">
        <p className="meta-label">{source.sourceTypeLabel}</p>
        <h1 className="mt-1.5 font-serif text-3xl text-ink">{source.title}</h1>
        <p className="mt-2 text-lg text-ink-soft">
          {formatAuthors(source.authors)}
          {source.year ? ` (${String(source.year)})` : ''}
        </p>
      </header>

      {!source.isCitable ? (
        <div className="mt-6 max-w-[62ch]">
          <Callout tone="caution" title="This source cannot currently support published statements">
            <p>
              {source.limitationsNotes ??
                'The copy held is corrupted, partial, or its identity is unconfirmed.'}
            </p>
            <p className="mt-2">
              The publishing rules enforce this rather than relying on editorial memory: any
              statement resting on this source would be refused at publication, and if this source
              were downgraded after something had been published on it, that content would be
              withdrawn automatically.
            </p>
          </Callout>
        </div>
      ) : null}

      <Section id="about" title="About this source">
        <dl className="max-w-[68ch] border-t border-rule">
          <DefinitionRow term="Kind of source">{source.sourceTypeLabel}</DefinitionRow>
          <DefinitionRow term="Authors or editors">
            {source.authors.length > 0 ? source.authors.join('; ') : <NotRecorded />}
          </DefinitionRow>
          <DefinitionRow term="Published">
            {[source.publicationName, source.publisher, source.year ? String(source.year) : null]
              .filter(Boolean)
              .join(' · ') || <NotRecorded />}
          </DefinitionRow>
          {source.doi ? (
            <DefinitionRow term="DOI">
              <a
                href={`https://doi.org/${source.doi}`}
                rel="noreferrer noopener"
                className="print-url underline decoration-rule underline-offset-2"
                data-print-url={`https://doi.org/${source.doi}`}
              >
                {source.doi}
              </a>
            </DefinitionRow>
          ) : null}
          {source.canonicalUrl ? (
            <DefinitionRow term="Publisher record">
              <a
                href={source.canonicalUrl}
                rel="noreferrer noopener"
                className="print-url break-all underline decoration-rule underline-offset-2"
                data-print-url={source.canonicalUrl}
              >
                {source.canonicalUrl}
              </a>
            </DefinitionRow>
          ) : null}
          <DefinitionRow term="Statements resting on it">{source.citedByCount}</DefinitionRow>
        </dl>
      </Section>

      <Section
        id="scope"
        title="What it can and cannot support"
        lede="The kind of source a work is determines what it is an authority on. A practitioner handbook describing a regimen is evidence that the author describes that regimen — not that the regimen has been studied."
      >
        <div className="grid max-w-[68ch] gap-4 sm:grid-cols-2">
          <div className="rounded-md border border-rule bg-warm-white px-5 py-4">
            <p className="meta-label">Legitimately supports</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {source.primaryRole ?? <NotRecorded what="not yet assessed" />}
            </p>
          </div>
          <div className="rounded-md border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-5 py-4">
            <p className="meta-label text-[var(--color-caution)]">Limitations</p>
            <p className="mt-1.5 text-sm text-ink-soft">
              {source.limitationsNotes ?? <NotRecorded what="not yet assessed" />}
            </p>
          </div>
        </div>

        {source.authorityNotes ? (
          <div className="mt-4 max-w-[68ch] rounded-md border border-rule bg-mist px-5 py-4">
            <p className="meta-label">Notes on this copy</p>
            <p className="mt-1.5 text-sm text-ink-soft">{source.authorityNotes}</p>
          </div>
        ) : null}
      </Section>

      <Section id="access" title="Getting hold of it">
        <p className="max-w-[62ch] text-ink-soft">
          The Tides Index does not redistribute source materials. Where a work has a DOI or a
          publisher record, that is the route to it; books should be obtained from the publisher or a
          library.
        </p>
      </Section>
    </Container>
  );
}
