import Link from 'next/link';
import type { Metadata } from 'next';
import { getReadingMode } from '@/server/public/reading-mode';
import { getProtocolLibrary } from '@/server/public/queries';
import { previewProtocolLibrary } from '@/server/public/preview';
import type { LibraryProtocol, ProtocolLibraryFilters } from '@/server/public/protocol-library';
import { Callout, Container, EmptyState, Section } from '@/components/public/primitives';
import { ModeSwitch } from '@/components/public/mode-switch';
import { Disclosure } from '@/components/public/disclosure';
import { ProtocolComparison, evidenceContextLabel } from '@/components/public/protocol-comparison';
import { PractitionerProtocolCard } from '@/components/public/protocols';
import { ProtocolProvenanceFigure } from '@/components/public/protocol-figures';
import {
  CompoundChooser,
  EvidenceContextKey,
  LibraryFilters,
  LibraryMethod,
  SimpleCompoundIndex,
} from '@/components/public/protocol-library';

/**
 * Rendered on demand: the content changes when an editor publishes, not when
 * the application is deployed.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Source-reported protocols',
  description:
    'What named sources have actually reported for each compound — attributed, with the kind of evidence each regimen rests on, and never merged into a recommendation.',
};

/**
 * The protocol library.
 *
 * A clinic's question is rarely "what is the dose". It is "what has been
 * reported, by whom, on what basis, and how do the reports differ" — and the
 * honest answer to that is a comparison of attributed records, not a number.
 *
 * Three editions of one page:
 *
 *   - **Practitioner, no compound chosen** — a chooser. Per compound: how many
 *     records, from how many sources, by which routes, on what evidence, and
 *     which key fields are worded differently. The path in is the comparison.
 *   - **Practitioner, one compound** — the comparison matrix is the page, with
 *     the provenance figure before it and each full record behind disclosure.
 *   - **Simple** — the library receives no regimen at all. It explains what the
 *     library is and why nothing is merged, and lists which compounds have
 *     records, from how many sources, on what kind of evidence.
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === '' || v === 'all' ? undefined : v;
}

/**
 * The questions a clinician arrives with, and where each is answered. Each
 * points at something the page does — none of them is "what should I give",
 * which this index does not answer.
 */
const ANSWERS: readonly (readonly [string, string])[] = [
  ['What do different sources report?', 'Choose a compound: every record is a column, in its source’s words.'],
  ['Where do they agree, and where not?', 'Each row is marked as worded the same, differing, or stated by only some.'],
  ['What is trial-derived?', 'The evidence label heads every column. Filter by evidence context to see only one kind.'],
  ['What is practitioner-derived?', 'Practitioner handbooks are labelled as such, and most of this register is here.'],
  ['What is preclinical?', 'Animal schedules are labelled, and never shown as human regimens.'],
  ['What does no source support?', 'Unanswered questions are kept on the research agenda.'],
];

export default async function ProtocolsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const filters: ProtocolLibraryFilters = {
    peptide: one(params.peptide),
    source: one(params.source),
    route: one(params.route),
    evidence: one(params.evidence),
  };
  const mode = await getReadingMode();
  const simple = mode === 'simple';

  const publicLibrary = await getProtocolLibrary(mode, filters);
  const library =
    publicLibrary.totalCount > 0
      ? publicLibrary
      : ((await previewProtocolLibrary(mode, filters)) ?? publicLibrary);

  const sourceCount = library.facets.sources.length;
  const stats = (
    <p className="text-sm text-slate">
      <span className="font-serif text-lg text-ink">{library.totalCount}</span> records ·{' '}
      <span className="font-serif text-lg text-ink">{library.compounds.length}</span> compounds ·{' '}
      <span className="font-serif text-lg text-ink">{sourceCount}</span> sources
    </p>
  );

  if (simple) {
    const compounds = library.compounds.filter(
      (c) => filters.peptide === undefined || c.slug === filters.peptide,
    );
    return (
      <Container className="py-10 sm:py-14">
        <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="max-w-[60ch]">
            <p className="meta-label">Protocol library</p>
            <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
              Which sources have described regimens, and on what evidence
            </h1>
            <p className="depth-body mt-3 text-lg text-ink-soft">
              Books, studies and product labels sometimes describe how a compound was given. This
              library keeps a record of each one, attributed to the source that published it. In
              this reading mode it shows who reported what kind of regimen, and how strong the
              evidence behind it is — without amounts or schedules.
            </p>
            <div className="mt-4">{stats}</div>
          </div>
          <ModeSwitch mode={mode} path="/protocols" />
        </header>

        <div className="mt-8 max-w-[70ch]">
          <Callout title="Why there are no doses on this page">
            <p>
              Amounts, frequency and duration are kept for the practitioner view, which is written
              for clinicians. A regimen a source reported is not advice for any one person, and The
              Tides Index never turns what sources report into a dose of its own. If a compound here
              matters to you, the useful next step is a conversation with a clinician who knows
              your history.
            </p>
          </Callout>
        </div>

        <section aria-labelledby="how-built" className="editorial-break mt-12">
          <h2 id="how-built" className="font-serif text-2xl text-ink">
            What this library is
          </h2>
          <p className="depth-body mt-2 max-w-[60ch] text-ink-soft">
            Different sources often describe the same compound in different ways. Rather than
            blending them into one answer, the library keeps each one separate, so the differences
            stay visible.
          </p>
          <div className="mt-6">
            <LibraryMethod />
          </div>
        </section>

        <section aria-labelledby="by-compound" className="editorial-break mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="by-compound" className="font-serif text-2xl text-ink">
              Compounds with regimens on record
            </h2>
            {filters.peptide !== undefined ? (
              <Link href="/protocols" className="text-sm underline decoration-rule underline-offset-2">
                Show every compound
              </Link>
            ) : null}
          </div>
          <p className="depth-body mt-2 mb-6 max-w-[60ch] text-ink-soft">
            Each card says how many sources have described a regimen for the compound, how it was
            given, and what kind of source each is.
          </p>
          {compounds.length === 0 ? (
            <EmptyState
              headline="No regimen is recorded for that compound."
              detail="An empty result means nothing is recorded here — not that nothing has ever been reported anywhere."
            />
          ) : (
            <SimpleCompoundIndex compounds={compounds} />
          )}
        </section>

        <section aria-labelledby="labels" className="editorial-break mt-6">
          <h2 id="labels" className="font-serif text-2xl text-ink">
            What the labels mean
          </h2>
          <p className="depth-body mt-2 mb-6 max-w-[60ch] text-ink-soft">
            The label says where a regimen came from. A study in people and a handbook author&rsquo;s
            own practice are very different kinds of evidence.
          </p>
          <EvidenceContextKey />
        </section>
      </Container>
    );
  }

  /* --- Practitioner ------------------------------------------------------ */

  const selected =
    filters.peptide === undefined
      ? undefined
      : library.facets.peptides.find((p) => p.value === filters.peptide);
  const narrowed =
    filters.source !== undefined || filters.route !== undefined || filters.evidence !== undefined;

  if (filters.peptide !== undefined) {
    const protocols = library.protocols;
    const name = selected?.label ?? protocols[0]?.peptideName ?? filters.peptide;
    return (
      <Container className="py-10 sm:py-14">
        <nav aria-label="Protocol library" className="no-print text-sm">
          <Link href="/protocols" className="text-deep-tide underline decoration-rule underline-offset-2">
            <span aria-hidden="true">← </span>All compounds in the protocol library
          </Link>
        </nav>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="max-w-[62ch]">
            <p className="meta-label">Protocol library · {name}</p>
            <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
              {name}: what each source reports
            </h1>
            <p className="mt-3 text-lg text-ink-soft">
              Every recorded regimen as one column, attributed to its source and labelled with the
              evidence it rests on. Read across a row to see where the sources differ.
            </p>
          </div>
          <ModeSwitch mode={mode} path="/protocols" />
        </header>

        <p className="mt-6 max-w-[72ch] border-l-2 border-[var(--color-caution-rule)] pl-4 text-sm text-ink-soft">
          <span className="font-medium text-ink">The Tides Index issues no dose.</span> A record
          says that a source reported a regimen, and where. It does not say the regimen works, is
          safe, or suits anyone. Nothing below is combined, averaged or ranked.
        </p>

        {protocols.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              headline="No recorded regimen matches."
              detail="An empty result means nothing is recorded for that combination — not that nothing has ever been reported anywhere."
            />
          </div>
        ) : (
          <>
            <Section id="provenance" title="Where these regimens come from">
              <ProtocolProvenanceFigure protocols={protocols} compoundName={name} />
            </Section>

            <div className="editorial-break">
              <Section id="comparison" title="Side by side">
                {protocols.length > 1 ? (
                  <ProtocolComparison protocols={protocols} compoundName={name} />
                ) : (
                  <EmptyState
                    headline="One record, so nothing to compare it with."
                    detail="A single source reports a regimen for this selection. It is shown in full below; no second source is held to set beside it."
                  />
                )}
              </Section>
            </div>

            <div className="editorial-break">
              <Section id="records" title="Each record in full">
                <p className="mb-5 max-w-[62ch] text-slate">
                  Everything the record holds, including safety notes and outcomes that do not fit a
                  comparison row.
                </p>
                <RecordList protocols={protocols} openAll={protocols.length === 1} />
              </Section>
            </div>
          </>
        )}

        <div className="editorial-break">
          <Section id="refine" title="Refine or switch compound">
            <LibraryFilters
              filters={filters}
              facets={library.facets}
              filteredCount={library.filteredCount}
              totalCount={library.totalCount}
            />
            <p className="mt-4 text-sm text-ink-soft">
              The compound&rsquo;s full evidence is on its{' '}
              <Link
                href={`/peptides/${filters.peptide}`}
                className="text-deep-tide underline underline-offset-2"
              >
                reference page
              </Link>
              . What no source supports is on the{' '}
              <Link
                href="/research?type=protocol_validation"
                className="text-deep-tide underline underline-offset-2"
              >
                research agenda
              </Link>
              .
            </p>
            <div className="mt-6">
              <Disclosure
                summary="How this comparison is built"
                detail="Recorded as published, kept with its source, never merged."
              >
                <LibraryMethod />
              </Disclosure>
            </div>
          </Section>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-[62ch]">
          <p className="meta-label">Protocol library</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
            What named sources have actually reported
          </h1>
          <p className="mt-3 text-lg text-ink-soft">
            Every regimen recorded in the index, exactly as one named source published it, with the
            kind of evidence it rests on stated first. Choose a compound to compare its records side
            by side; nothing is combined, averaged or recommended.
          </p>
          <div className="mt-4">{stats}</div>
        </div>
        <ModeSwitch mode={mode} path="/protocols" />
      </header>

      <div className="mt-8 max-w-[72ch]">
        <Callout tone="caution" title="The Tides Index issues no dose">
          <p>
            A record here says that a source reported a regimen, and where. It does not say the
            regimen works, is safe, or suits anyone. For most compounds in the register every
            recorded regimen comes from a practitioner handbook that cites no study for its amounts —
            and the label on each record says so.
          </p>
          {/* Publication and review are separate facts (migration 0029). This
              library is the highest-consequence surface on the site, so it says
              which of the two it has rather than leaving it to be inferred. The
              figure is counted from the records, never asserted. */}
          <p>
            These records are public because each one is linked to a named source at an exact
            location.{' '}
            {library.reviewedCount === 0 ? (
              <>
                <strong>None of them has been reviewed by a clinician.</strong>
              </>
            ) : (
              <>
                <strong>
                  {library.reviewedCount} of {library.totalCount}
                </strong>{' '}
                have been reviewed by a named reviewer.
              </>
            )}{' '}
            Each record states its own review status.
          </p>
        </Callout>
      </div>

      <Section id="compounds" title={narrowed ? 'Compounds matching these filters' : 'Choose a compound to compare'}>
        <p className="mb-5 max-w-[66ch] text-slate">
          For each compound: how many records, from how many sources, by which routes and on what
          evidence — and whether the sources word the key fields differently.
        </p>
        <div className="mb-8">
          <LibraryFilters
            filters={filters}
            facets={library.facets}
            filteredCount={library.filteredCount}
            totalCount={library.totalCount}
          />
        </div>
        {library.protocols.length === 0 ? (
          <EmptyState
            headline="No recorded regimen matches."
            detail="An empty result means nothing is recorded for that combination — not that nothing has ever been reported anywhere."
          />
        ) : (
          <CompoundChooser protocols={library.protocols} filters={filters} />
        )}
      </Section>

      {narrowed && library.protocols.length > 0 ? (
        <div className="editorial-break">
          <Section id="records" title="Matching records">
            <p className="mb-5 max-w-[62ch] text-slate">
              Grouped by compound. Open a group to read each record in full.
            </p>
            <div className="space-y-3">
              {groupBySlug(library.protocols).map(([slug, protocols]) => (
                <Disclosure
                  key={slug}
                  summary={protocols[0]!.peptideName}
                  detail={protocols
                    .map((p) => evidenceContextLabel(p.evidenceTypeLabel, p.evidenceTypeKey))
                    .filter((label, i, all) => all.indexOf(label) === i)
                    .join(' · ')}
                  count={protocols.length}
                >
                  <RecordList protocols={protocols} openAll />
                </Disclosure>
              ))}
            </div>
          </Section>
        </div>
      ) : null}

      <div className="editorial-break">
        <Section id="method" title="How this library is built">
          <LibraryMethod />
        </Section>
      </div>

      <section aria-labelledby="answers" className="mt-4">
        <h2 id="answers" className="font-serif text-2xl text-ink">
          What this library can tell you
        </h2>
        <p className="mt-2 max-w-[66ch] text-ink-soft">
          It cannot tell you what anyone should take. It can tell you what the sources say, and where
          they part.
        </p>
        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          {ANSWERS.map(([question, where]) => (
            <div key={question} className="border-t border-rule pt-3">
              <dt className="font-serif text-base text-ink">{question}</dt>
              <dd className="mt-1 text-sm text-ink-soft">{where}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-soft">
          What no source supports is on the{' '}
          <Link href="/research?type=protocol_validation" className="text-deep-tide underline underline-offset-2">
            research agenda
          </Link>
          .
        </p>
      </section>

      <div className="editorial-break mt-10">
        <Section id="evidence-context" title="Reading the evidence label on a regimen">
          <EvidenceContextKey />
        </Section>
      </div>
    </Container>
  );
}

function groupBySlug(protocols: readonly LibraryProtocol[]): [string, LibraryProtocol[]][] {
  const grouped = new Map<string, LibraryProtocol[]>();
  for (const protocol of protocols) {
    const list = grouped.get(protocol.peptideSlug) ?? [];
    list.push(protocol);
    grouped.set(protocol.peptideSlug, list);
  }
  return [...grouped.entries()];
}

/**
 * Full records. Each behind its own disclosure where there are several, so the
 * comparison stays the centre of the page; printing opens every one.
 */
function RecordList({
  protocols,
  openAll,
}: {
  protocols: readonly LibraryProtocol[];
  openAll: boolean;
}) {
  if (openAll) {
    return (
      <ul className="space-y-5">
        {protocols.map((protocol) => (
          <PractitionerProtocolCard key={protocol.id} protocol={protocol} />
        ))}
      </ul>
    );
  }
  return (
    <ol className="space-y-3">
      {protocols.map((protocol, index) => {
        const source = protocol.sources[0];
        const author = source?.authors[0] ?? 'Author not recorded';
        return (
          <li key={protocol.id}>
            <Disclosure
              summary={`Column ${String(index + 1)} · ${author}${source?.year ? ` (${String(source.year)})` : ''}`}
              detail={[
                evidenceContextLabel(protocol.evidenceTypeLabel, protocol.evidenceTypeKey),
                protocol.routeName ?? 'Route not stated',
                source?.sourceTitle,
              ]
                .filter((part): part is string => part !== undefined)
                .join(' · ')}
            >
              <ul>
                <PractitionerProtocolCard protocol={protocol} />
              </ul>
            </Disclosure>
          </li>
        );
      })}
    </ol>
  );
}
