import Link from 'next/link';
import type {
  CompoundProtocolSummary,
  FacetOption,
  LibraryProtocol,
  ProtocolLibraryFilters,
} from '@/server/public/protocol-library';
import { ProtocolComparisonIllustration } from '@/components/illustrations';
import {
  KEY_COMPARISON_FIELDS,
  ProtocolContextBadge,
  StatusShape,
  compareProtocols,
  evidenceContextLabel,
} from './protocol-comparison';

/**
 * The protocol library's own presentation pieces.
 *
 * Everything here is navigation and method. No component in this file states a
 * medical fact: counts, routes and labels arrive from the records, and the copy
 * describes how the library is built and how to move through it.
 */

/* ==========================================================================
   Practitioner: choosing a compound to compare
   ========================================================================== */

interface ChooserEntry {
  readonly slug: string;
  readonly name: string;
  readonly protocols: readonly LibraryProtocol[];
}

function groupByCompound(protocols: readonly LibraryProtocol[]): ChooserEntry[] {
  const map = new Map<string, { name: string; protocols: LibraryProtocol[] }>();
  for (const protocol of protocols) {
    const entry = map.get(protocol.peptideSlug) ?? { name: protocol.peptideName, protocols: [] };
    entry.protocols.push(protocol);
    map.set(protocol.peptideSlug, entry);
  }
  return [...map.entries()].map(([slug, e]) => ({ slug, name: e.name, protocols: e.protocols }));
}

function hrefFor(slug: string, filters: ProtocolLibraryFilters): string {
  const params = new URLSearchParams({ peptide: slug });
  if (filters.source !== undefined) params.set('source', filters.source);
  if (filters.route !== undefined) params.set('route', filters.route);
  if (filters.evidence !== undefined) params.set('evidence', filters.evidence);
  return `/protocols?${params.toString()}`;
}

/**
 * One line per compound: how many records, from how many sources, by which
 * routes, on what kind of evidence — and, where there is more than one record,
 * which of the fields a clinic compares first are worded differently.
 *
 * Alphabetical within two plain groups: compounds with something to compare,
 * and compounds with a single record. The grouping is about whether a
 * comparison exists, not about which compound is better supported.
 */
export function CompoundChooser({
  protocols,
  filters,
}: {
  protocols: readonly LibraryProtocol[];
  filters: ProtocolLibraryFilters;
}) {
  const entries = groupByCompound(protocols).sort((a, b) => a.name.localeCompare(b.name));
  const several = entries.filter((e) => e.protocols.length > 1);
  const single = entries.filter((e) => e.protocols.length === 1);

  return (
    <div className="space-y-10">
      {several.length > 0 ? (
        <div>
          <h3 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
            <span className="font-serif text-xl text-ink">Several records to compare</span>
            <span className="text-sm text-slate">
              {several.length} compound{several.length === 1 ? '' : 's'}
            </span>
          </h3>
          <ul className="divide-y divide-rule">
            {several.map((entry) => (
              <ChooserRow key={entry.slug} entry={entry} filters={filters} />
            ))}
          </ul>
        </div>
      ) : null}
      {single.length > 0 ? (
        <div>
          <h3 className="flex flex-wrap items-baseline justify-between gap-2 border-b border-ink pb-2">
            <span className="font-serif text-xl text-ink">A single record on file</span>
            <span className="text-sm text-slate">
              {single.length} compound{single.length === 1 ? '' : 's'}
            </span>
          </h3>
          <p className="mt-2 max-w-[62ch] text-sm text-slate">
            One source, one regimen. There is nothing to set it beside yet, which is itself worth
            knowing before reading it.
          </p>
          <ul className="divide-y divide-rule">
            {single.map((entry) => (
              <ChooserRow key={entry.slug} entry={entry} filters={filters} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ChooserRow({ entry, filters }: { entry: ChooserEntry; filters: ProtocolLibraryFilters }) {
  const { protocols } = entry;
  const sources = new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey)));
  const routes = [...new Set(protocols.map((p) => p.routeName).filter((r): r is string => r !== null))];
  const evidence = new Map<string, { key: string; label: string; count: number }>();
  for (const p of protocols) {
    const label = evidenceContextLabel(p.evidenceTypeLabel, p.evidenceTypeKey);
    const e = evidence.get(label) ?? { key: p.evidenceTypeKey, label: p.evidenceTypeLabel, count: 0 };
    e.count += 1;
    evidence.set(label, e);
  }
  const comparisons = protocols.length > 1 ? compareProtocols(protocols) : [];
  const keyDiffers = comparisons.filter(
    (c) => c.status === 'differs' && KEY_COMPARISON_FIELDS.includes(c.field.key),
  );
  const otherDiffers = comparisons.filter(
    (c) => c.status === 'differs' && !KEY_COMPARISON_FIELDS.includes(c.field.key),
  ).length;
  const href = hrefFor(entry.slug, filters);

  return (
    <li className="grid gap-x-8 gap-y-3 py-5 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto] md:items-start">
      <div>
        <Link
          href={href}
          className="font-serif text-xl text-ink decoration-rule underline-offset-4 hover:text-deep-tide hover:underline"
        >
          {entry.name}
        </Link>
        <p className="mt-1 text-sm text-slate">
          {protocols.length} record{protocols.length === 1 ? '' : 's'} · {sources.size} source
          {sources.size === 1 ? '' : 's'}
        </p>
        {routes.length > 0 ? (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {routes.map((route) => (
              <span
                key={route}
                className="rounded-full border border-rule bg-warm-white px-2 py-0.5 text-xs text-ink-soft"
              >
                {route}
              </span>
            ))}
          </p>
        ) : null}
      </div>

      <div className="space-y-2.5">
        <ul className="flex flex-wrap gap-x-3 gap-y-1.5" aria-label="Evidence context">
          {[...evidence.values()].map((e) => (
            <li key={e.key} className="inline-flex items-center gap-1.5 text-xs text-slate">
              <ProtocolContextBadge evidenceTypeKey={e.key} evidenceTypeLabel={e.label} />
              {protocols.length > 1 ? <span>× {e.count}</span> : null}
            </li>
          ))}
        </ul>
        {protocols.length === 1 ? null : keyDiffers.length > 0 ? (
          <p className="text-sm text-ink-soft">
            <span className="mr-1.5 inline-flex items-center gap-1.5 font-medium text-[var(--color-caution)]">
              <StatusShape status="differs" />
              {keyDiffers.some((c) => c.acrossSources)
                ? 'Differs between sources'
                : 'Differs within one source’s records'}
              :
            </span>
            {keyDiffers.map((c) => c.field.label.replace(' as reported', '')).join(' · ')}
            {otherDiffers > 0 ? (
              <span className="text-slate">
                {' '}
                · and {otherDiffers} further field{otherDiffers === 1 ? '' : 's'}
              </span>
            ) : null}
          </p>
        ) : (
          <p className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <StatusShape status="same" />
            No difference in wording on route, population, amount, frequency, duration or monitoring
            {otherDiffers > 0 ? ` (${String(otherDiffers)} other field${otherDiffers === 1 ? '' : 's'} differ)` : ''}
          </p>
        )}
      </div>

      <div className="md:text-right">
        <Link
          href={href}
          className="inline-flex items-center gap-1.5 rounded-md border border-deep-tide/30 px-3.5 py-2 text-sm font-medium whitespace-nowrap text-deep-tide transition-colors hover:bg-mist"
        >
          {protocols.length > 1 ? `Compare ${String(protocols.length)} side by side` : 'Read the record'}
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </li>
  );
}

/* ==========================================================================
   Simple: which compounds have records, without a single amount
   ========================================================================== */

export function SimpleCompoundIndex({
  compounds,
}: {
  compounds: readonly CompoundProtocolSummary[];
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {compounds.map((compound) => (
        <li
          key={compound.slug}
          className="flex flex-col rounded-lg border border-rule bg-warm-white px-5 py-5"
        >
          <p className="font-serif text-xl text-ink">{compound.name}</p>
          <p className="mt-1 text-ink-soft">
            {compound.sourceCount === 1
              ? 'One source has reported a regimen.'
              : `${String(compound.sourceCount)} sources have reported regimens.`}
          </p>
          {compound.routes.length > 0 ? (
            <p className="mt-3 text-sm text-slate">
              <span className="meta-label mr-1.5">Given by</span>
              {compound.routes.join(', ')}
            </p>
          ) : null}
          <div className="mt-3">
            <p className="meta-label">Kind of source</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {[...new Set(compound.evidenceLabels)].map((label) => (
                <li key={label}>
                  <ProtocolContextBadge evidenceTypeLabel={label} />
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-auto pt-4">
            <Link
              href={`/peptides/${compound.slug}#protocols`}
              className="text-sm font-medium text-deep-tide underline decoration-rule underline-offset-4 hover:decoration-tide-teal"
            >
              Read about {compound.name}
            </Link>
          </p>
        </li>
      ))}
    </ul>
  );
}

/* ==========================================================================
   Method: how the library is built
   ========================================================================== */

const STEPS: readonly { title: string; body: string }[] = [
  {
    title: 'Recorded as published',
    body: 'Each regimen is copied in the words of the source that reported it, with the page it appears on.',
  },
  {
    title: 'Kept with its source',
    body: 'One record, one source. The kind of evidence behind it is the first label on it.',
  },
  {
    title: 'Set side by side, never merged',
    body: 'Records for a compound are compared field by field. Differences are marked; nothing is averaged into a single regimen.',
  },
];

export function LibraryMethod() {
  return (
    <div>
      <ol className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="border-t-2 border-sea-glass pt-3">
            <p className="font-serif text-sm text-tide-teal">{index + 1}</p>
            <p className="mt-1 font-serif text-lg text-ink">{step.title}</p>
            <p className="mt-1 text-sm text-ink-soft">{step.body}</p>
          </li>
        ))}
      </ol>
      <ProtocolComparisonIllustration />
    </div>
  );
}

const CONTEXT_EXPLAINED: readonly { label: string; body: string }[] = [
  {
    label: 'Approved product labelling',
    body: 'Specified in labelling a medicines regulator authorised, for that product and indication only.',
  },
  {
    label: 'Randomised human trial',
    body: 'The schedule used in a study in people. What the trial tested, not what it proved beyond its population.',
  },
  {
    label: 'Human observational study',
    body: 'What was given to people outside a controlled study, reported afterwards.',
  },
  {
    label: 'Animal study',
    body: 'An animal or laboratory dosing schedule. Not a human regimen, and never presented as one.',
  },
  {
    label: 'Practitioner reference',
    body: 'What a clinician or author reports using. It carries no study behind it unless the record says so.',
  },
];

/** The evidence labels, each shown as the badge a reader will meet on a record. */
export function EvidenceContextKey() {
  return (
    <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
      {CONTEXT_EXPLAINED.map((entry) => (
        <div key={entry.label}>
          <dt>
            <ProtocolContextBadge evidenceTypeLabel={entry.label} />
          </dt>
          <dd className="mt-1.5 text-sm text-ink-soft">{entry.body}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ==========================================================================
   Filters
   ========================================================================== */

export function LibraryFilters({
  filters,
  facets,
  filteredCount,
  totalCount,
}: {
  filters: ProtocolLibraryFilters;
  facets: {
    readonly peptides: readonly FacetOption[];
    readonly sources: readonly FacetOption[];
    readonly routes: readonly FacetOption[];
    readonly evidence: readonly FacetOption[];
  };
  filteredCount: number;
  totalCount: number;
}) {
  const filtering = Object.values(filters).some((v) => v !== undefined);
  return (
    <form
      method="get"
      action="/protocols"
      className="no-print rounded-md border border-rule bg-mist/60 px-4 py-4"
      aria-label="Narrow the protocol library"
    >
      <p className="meta-label">Narrow by</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Filter name="peptide" label="Compound" value={filters.peptide} options={facets.peptides} />
        <Filter name="source" label="Source" value={filters.source} options={facets.sources} />
        <Filter name="route" label="Route" value={filters.route} options={facets.routes} />
        <Filter
          name="evidence"
          label="Evidence context"
          value={filters.evidence}
          // The regimen wording, not the taxonomy's: a filter offering
          // "Randomised human trial" beside cards badged "Human trial regimen"
          // is two names for one thing.
          options={facets.evidence.map((o) => ({ ...o, label: evidenceContextLabel(o.label, o.value) }))}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-md bg-deep-tide px-5 py-2 text-sm font-medium text-warm-white"
        >
          Show regimens
        </button>
        {filtering ? (
          <>
            <Link href="/protocols" className="text-sm underline decoration-rule underline-offset-2">
              Clear filters
            </Link>
            <span className="text-sm text-slate">
              {filteredCount} of {totalCount} records match.
            </span>
          </>
        ) : null}
      </div>
    </form>
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
