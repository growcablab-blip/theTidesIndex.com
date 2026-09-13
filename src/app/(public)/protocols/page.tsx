import Link from 'next/link';
import type { Metadata } from 'next';
import { getReadingMode } from '@/server/public/reading-mode';
import { getProtocolLibrary } from '@/server/public/queries';
import { previewProtocolLibrary } from '@/server/public/preview';
import type { LibraryProtocol, ProtocolLibraryFilters } from '@/server/public/protocol-library';
import { Callout, Container, EmptyState, Section } from '@/components/public/primitives';
import { ModeSwitch } from '@/components/public/mode-switch';
import {
  ProtocolComparison,
  ProtocolContextBadge,
  evidenceContextLabel,
} from '@/components/public/protocol-comparison';
import { CitationLine } from '@/components/public/citation';

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
 * honest answer to that is a table of attributed records, not a number. This
 * page is that table across the whole register.
 *
 * Every record carries its evidence context as the first thing on it, because
 * the single most dangerous misreading available here is taking "a practitioner
 * handbook reports this" for "a controlled human study validated this".
 */

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v === undefined || v === '' || v === 'all' ? undefined : v;
}

const CONTEXT_EXPLAINED: readonly { label: string; body: string }[] = [
  {
    label: 'Approved-label regimen',
    body: 'Specified in labelling a medicines regulator authorised, for that product and indication only.',
  },
  {
    label: 'Human trial regimen',
    body: 'The schedule used in a study in people. What the trial tested, not what it proved beyond its population.',
  },
  {
    label: 'Human observational',
    body: 'What was given to people outside a controlled study, reported afterwards.',
  },
  {
    label: 'Preclinical',
    body: 'An animal or laboratory dosing schedule. Not a human regimen, and never presented as one.',
  },
  {
    label: 'Practitioner handbook',
    body: 'What a clinician or author reports using. It carries no study behind it unless the record says so.',
  },
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

  const filtering = Object.values(filters).some((v) => v !== undefined);
  const selectedCompound = library.facets.peptides.find((p) => p.value === filters.peptide);

  // Grouped by compound for reading; the order is alphabetical and means nothing.
  const grouped = new Map<string, LibraryProtocol[]>();
  for (const protocol of library.protocols) {
    const list = grouped.get(protocol.peptideSlug) ?? [];
    list.push(protocol);
    grouped.set(protocol.peptideSlug, list);
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
            kind of evidence it rests on stated first. Compare them; nothing here is combined,
            averaged or recommended.
          </p>
        </div>
        <ModeSwitch mode={mode} path="/protocols" />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <Callout tone="caution" title="The Tides Index issues no dose">
          <p>
            A record here says that a source reported a regimen, and where. It does not say the
            regimen works, is safe, or suits anyone. For most compounds in the register every
            recorded regimen comes from a practitioner handbook that cites no study for its amounts
            — and the label on each record says so.
          </p>
        </Callout>
        <div className="rounded-md border border-rule bg-mist px-4 py-3.5 text-sm text-ink-soft">
          <p className="font-serif text-2xl text-ink">{library.totalCount}</p>
          <p>
            regimen{library.totalCount === 1 ? '' : 's'} recorded, for {library.compounds.length}{' '}
            compound{library.compounds.length === 1 ? '' : 's'}, from {library.facets.sources.length}{' '}
            source{library.facets.sources.length === 1 ? '' : 's'}.
          </p>
        </div>
      </div>

      {/* --- What the labels mean ------------------------------------------ */}
      <Section id="evidence-context" title="Reading the evidence label on a regimen">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {CONTEXT_EXPLAINED.map((entry) => (
            <div key={entry.label} className="rounded-md border border-rule-soft px-4 py-3">
              <dt className="text-xs font-medium tracking-wide text-deep-tide uppercase">
                {entry.label}
              </dt>
              <dd className="mt-1 text-sm text-ink-soft">{entry.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {/* --- Filters -------------------------------------------------------- */}
      <form method="get" action="/protocols" className="mt-10 rounded-md border border-rule px-4 py-4">
        <p className="meta-label">Browse by</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Filter name="peptide" label="Compound" value={filters.peptide} options={library.facets.peptides} />
          <Filter name="source" label="Source" value={filters.source} options={library.facets.sources} />
          <Filter name="route" label="Route" value={filters.route} options={library.facets.routes} />
          <Filter
            name="evidence"
            label="Evidence context"
            value={filters.evidence}
            // The regimen wording, not the taxonomy's: a filter offering
            // "Randomised human trial" beside cards badged "Human trial regimen"
            // is two names for one thing.
            options={library.facets.evidence.map((o) => ({
              ...o,
              label: evidenceContextLabel(o.label, o.value),
            }))}
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="submit" className="rounded-md bg-deep-tide px-5 py-2 text-sm font-medium text-warm-white">
            Show regimens
          </button>
          {filtering ? (
            <Link href="/protocols" className="text-sm underline decoration-rule underline-offset-2">
              Clear filters
            </Link>
          ) : null}
          {filtering ? (
            <span className="text-sm text-slate">
              {library.filteredCount} of {library.totalCount} match.
            </span>
          ) : null}
        </div>
      </form>

      {simple ? (
        <Section id="by-compound" title="Regimens recorded, by compound">
          <p className="max-w-[62ch] text-ink-soft">
            In this reading mode the amounts, schedules and durations are not shown — they belong
            in a conversation with a clinician who knows your history. What you can see here is which
            compounds have regimens on record, how many sources reported them, and what kind of
            evidence those sources are.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {library.compounds
              .filter((c) => filters.peptide === undefined || c.slug === filters.peptide)
              .map((compound) => (
                <li key={compound.slug} className="rounded-md border border-rule px-4 py-3.5">
                  <Link
                    href={`/peptides/${compound.slug}#protocols`}
                    className="font-serif text-lg text-deep-tide underline decoration-rule underline-offset-2"
                  >
                    {compound.name}
                  </Link>
                  <p className="mt-1 text-sm text-ink-soft">
                    {compound.protocolCount} regimen{compound.protocolCount === 1 ? '' : 's'} from{' '}
                    {compound.sourceCount} source{compound.sourceCount === 1 ? '' : 's'}
                    {compound.routes.length > 0 ? ` · ${compound.routes.join(', ')}` : ''}
                  </p>
                  <p className="mt-1 text-xs text-slate">Evidence: {compound.evidenceLabels.join(', ')}</p>
                </li>
              ))}
          </ul>
        </Section>
      ) : library.protocols.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            headline="No recorded regimen matches."
            detail="An empty result means nothing is recorded for that combination — not that nothing has ever been reported anywhere."
          />
        </div>
      ) : (
        <>
          {selectedCompound !== undefined && library.protocols.length > 1 ? (
            <Section
              id="comparison"
              title={`${selectedCompound.label}: side by side`}
              lede="Every recorded regimen for this compound in one table. The rows that differ are named; missing fields say so."
            >
              <ProtocolComparison protocols={library.protocols} compoundName={selectedCompound.label} />
            </Section>
          ) : null}

          <Section id="records" title={filtering ? 'Matching regimens' : 'All recorded regimens'}>
            <div className="space-y-10">
              {[...grouped.entries()].map(([slug, protocols]) => (
                <div key={slug}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-2">
                    <h2 className="font-serif text-2xl text-ink">
                      <Link href={`/peptides/${slug}`} className="hover:text-deep-tide">
                        {protocols[0]!.peptideName}
                      </Link>
                    </h2>
                    {protocols.length > 1 && filters.peptide === undefined ? (
                      <Link
                        href={`/protocols?peptide=${slug}`}
                        className="text-sm underline decoration-rule underline-offset-2"
                      >
                        Compare these {protocols.length} side by side
                      </Link>
                    ) : null}
                  </div>
                  <ul className="mt-4 grid gap-4 lg:grid-cols-2">
                    {protocols.map((protocol) => (
                      <ProtocolRecord key={protocol.id} protocol={protocol} />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>
        </>
      )}
    </Container>
  );
}

function Filter({
  name,
  label,
  value,
  options,
}: {
  name: string;
  label: string;
  value: string | undefined;
  options: readonly { value: string; label: string; count: number }[];
}) {
  return (
    <label className="block text-sm">
      <span className="text-xs tracking-wide text-slate uppercase">{label}</span>
      <select
        name={name}
        defaultValue={value ?? 'all'}
        className="mt-1 w-full rounded-md border border-rule bg-warm-white px-2.5 py-2 text-ink"
      >
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}

/** Fields shown on a record card, in reading order. Missing is printed as missing. */
const FIELDS: readonly { label: string; get: (p: LibraryProtocol) => string | null; always?: boolean }[] = [
  { label: 'Population or model', get: (p) => p.populationModel },
  { label: 'Route', get: (p) => p.routeName, always: true },
  { label: 'Formulation', get: (p) => p.formulation },
  {
    label: 'Amount as reported',
    get: (p) => (p.amountReported === null ? null : `${p.amountReported}`),
    always: true,
  },
  { label: 'Frequency', get: (p) => p.frequencyText, always: true },
  { label: 'Timing', get: (p) => p.timingText },
  { label: 'Duration', get: (p) => p.durationText, always: true },
  { label: 'Cycle / off period', get: (p) => p.cycleText },
  { label: 'Titration', get: (p) => p.titrationText },
  { label: 'Combinations', get: (p) => p.combinationsText },
  { label: 'Monitoring', get: (p) => p.monitoringText, always: true },
  { label: 'Cautions', get: (p) => p.contraindicationsText },
  { label: 'Side effects reported', get: (p) => p.safetyNotes },
];

function ProtocolRecord({ protocol }: { protocol: LibraryProtocol }) {
  const source = protocol.sources[0];
  return (
    <li className="flex flex-col rounded-lg border border-rule bg-warm-white px-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ProtocolContextBadge
          evidenceTypeKey={protocol.evidenceTypeKey}
          evidenceTypeLabel={protocol.evidenceTypeLabel}
        />
        <span className="text-xs text-slate">{source?.sourceKey ?? protocol.protocolKey}</span>
      </div>
      <p className="mt-2 font-serif text-base leading-snug text-ink">
        {source?.authors?.[0] ?? 'Author not recorded'}
        {source?.year ? ` (${String(source.year)})` : ''}
      </p>
      <p className="text-sm text-slate">{source?.sourceTitle}</p>
      <p className="mt-2 text-sm text-ink-soft">{protocol.objectiveContext}</p>

      <dl className="mt-3 space-y-1.5 text-sm">
        {FIELDS.map((field) => {
          const value = field.get(protocol);
          if (value === null && field.always !== true) return null;
          return (
            <div key={field.label} className="grid grid-cols-[9.5rem_1fr] gap-3">
              <dt className="text-xs tracking-wide text-slate uppercase">{field.label}</dt>
              <dd className={value === null ? 'text-slate italic' : 'text-ink-soft'}>
                {value ?? 'Not stated by this source'}
              </dd>
            </div>
          );
        })}
      </dl>

      {protocol.regulatoryContext === null ? null : (
        <p className="mt-3 border-t border-rule-soft pt-2.5 text-xs text-slate">
          {protocol.regulatoryContext}
        </p>
      )}
      <div className="mt-auto pt-3">{source === undefined ? null : <CitationLine citation={source} />}</div>
    </li>
  );
}
