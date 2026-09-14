import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSource, getSourceArtifacts, getSourceFunding } from '@/server/public/queries';
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

const FUNDER_LABEL: Record<string, string> = {
  industry: 'Industry',
  government: 'Government or public research funder',
  academic_institution: 'Academic institution',
  foundation_or_charity: 'Foundation or charity',
  mixed: 'Mixed — industry and public or academic',
  none_declared: 'None declared by the study',
  not_reported_in_source: 'Not reported in the source',
  not_checked: 'Not checked',
};

const ARTIFACT_KIND_LABEL: Record<string, string> = {
  publisher_version: 'Publisher’s version',
  issuer_download: 'Issued by the authority itself',
  registry_document: 'Posted to the trial registry',
  registry_snapshot: 'Registry record as retrieved',
  research_copy_unverified_distribution: 'Held research copy — distribution provenance unverified',
  owner_transcription: 'Transcription made by the owner — not the publisher’s version',
  partial_translated_copy: 'Partial copy of a translated edition',
  machine_translated_derivative: 'Machine-translated derivative — never used for wording',
  index_only: 'Contents listing only',
  advertisement: 'Advertisement — not the work',
  mislabelled_file: 'A different work under this title',
  duplicate: 'Duplicate copy',
  supplementary_material: 'Supplementary material',
};

const VERIFICATION_LABEL: Record<string, string> = {
  matched_to_issuer: 'Byte-identical to the issuing body’s own file',
  title_page_verified: 'Title page read and matched to the record',
  abstract_verified_body_unverified: 'Abstract checked; body unverified',
  transcription_unverified: 'Transcription unverified',
  not_verified: 'Not verified',
  identity_refuted: 'Identity refuted on inspection',
};

const DISPOSITION_LABEL: Record<string, string> = {
  working_copy: 'Citations resolve to this copy',
  retained_reference: 'Kept for reference; nothing cited from it',
  not_retained: 'Recorded, not retained',
  rejected: 'Rejected',
};

export default async function SourcePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const source = await getSource(key);
  const funding = await getSourceFunding(key);
  const artifacts = await getSourceArtifacts(key);

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

      {/*
        The copy held, as distinct from the work.

        A transcription is not the article it transcribes, a file named for a
        textbook can be an advertisement, and a standard obtained from a
        document-sharing site is not the same artefact as one obtained from its
        publisher. What kind of copy this index holds is part of what a reader
        needs to weigh a citation — never its filename or location.
      */}
      {artifacts.length > 0 ? (
        <Section
          id="copies"
          title="The copies this index has handled"
          lede="What each file received for this work turned out to be, and how far it was verified. Only a verified working copy can support a citation."
        >
          <ul className="max-w-[68ch] space-y-3">
            {artifacts.map((artifact) => (
              <li
                key={artifact.artifactKey}
                className="rounded-md border border-rule bg-warm-white px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-serif text-base text-ink">
                    {ARTIFACT_KIND_LABEL[artifact.artifactKind] ?? artifact.artifactKind}
                  </p>
                  <span className="rounded-sm border border-rule px-1.5 py-0.5 text-2xs tracking-wide text-ink-soft uppercase">
                    {DISPOSITION_LABEL[artifact.disposition] ?? artifact.disposition}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate">
                  {VERIFICATION_LABEL[artifact.verification] ?? artifact.verification}
                  {artifact.language ? ` · language: ${artifact.language}` : ''}
                  {artifact.pageCount ? ` · ${String(artifact.pageCount)} pages` : ''}
                </p>
                {artifact.publicNote ? (
                  <p className="mt-2 text-sm text-ink-soft">{artifact.publicNote}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/*
        Who paid for it, where the source says so.

        Context and nothing else. Industry funding does not invalidate a trial
        and public funding does not sanctify one, so there is no score here, no
        badge, and no ordering by sponsor — just the disclosure as written, and
        an explicit statement when nobody has checked.
      */}
      {funding.length > 0 ? (
        <Section
          id="funding"
          title="Funding and declared interests"
          lede="What the source discloses about who paid for the work. This is context for reading a result, not a measure of whether the result is right."
        >
          <div className="max-w-[68ch] space-y-4">
            {funding.map((record) => (
              <div key={record.fundingKey} className="rounded-md border border-rule bg-warm-white px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="font-serif text-base text-ink">
                    {FUNDER_LABEL[record.funderKind] ?? record.funderKind}
                  </p>
                  {record.manufacturerInvolved === true ? (
                    <span className="rounded-sm border border-rule px-1.5 py-0.5 text-2xs tracking-wide text-ink-soft uppercase">
                      A maker or seller of the compound was involved
                    </span>
                  ) : null}
                </div>

                {record.sponsorName ? (
                  <p className="mt-1.5 text-sm text-ink-soft">
                    <span className="text-slate">Named funder: </span>
                    {record.sponsorName}
                  </p>
                ) : null}
                {record.grantReference ? (
                  <p className="mt-1 text-sm text-ink-soft">
                    <span className="text-slate">Grants: </span>
                    {record.grantReference}
                  </p>
                ) : null}
                {record.disclosureText ? (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                    {record.disclosureText}
                  </p>
                ) : null}
                {record.notes ? <p className="mt-2 text-xs text-slate">{record.notes}</p> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

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
