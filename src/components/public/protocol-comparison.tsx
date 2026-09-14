import type { ReactNode } from 'react';
import type { PractitionerProtocol } from '@/server/public/queries';
import { amountAsReported } from '@/domain/protocols/amount';

/**
 * Source-reported regimens, side by side.
 *
 * BPC-157 carries several regimens from several sources, and reading them as a
 * vertical list invites the reader to average them in their head. Placed in a
 * grid with a fixed row order, the differences are the first thing visible —
 * which is the only reason this view exists.
 *
 * **It ranks nothing.** There is no recommended column, no consensus row and no
 * ordering by quality. Columns keep the order the records arrive in. Where a
 * regimen rests on stronger evidence the label on its column says so, and the
 * reader draws their own conclusion from the label rather than from a position
 * in a table.
 *
 * **It computes nothing.** Values are compared as worded. Two cells "agree" only
 * when the source text is identical; the same schedule written two ways counts
 * as two wordings, because deciding that "twice a day" and "twice daily" are one
 * thing is the first step towards deciding that 250 and 500 are one thing.
 *
 * Practitioner mode only. The rows are amounts.
 */

/* ==========================================================================
   Evidence context
   ========================================================================== */

type ContextTone = 'approved' | 'human' | 'reported' | 'preclinical';

/**
 * What kind of thing a regimen is.
 *
 * The single most consequential label in the product. A clinic reading a table
 * of regimens must never take "reported by a practitioner handbook" for
 * "validated in a trial", and the distinction has to be visible on each column
 * rather than inferable from a citation underneath it.
 */
const EVIDENCE_CONTEXT: Readonly<Record<string, { label: string; tone: ContextTone }>> = {
  approved_label_evidence: { label: 'Approved-label regimen', tone: 'approved' },
  human_rct: { label: 'Human trial regimen', tone: 'human' },
  human_controlled_nonrandomized: { label: 'Human trial regimen', tone: 'human' },
  human_prospective_uncontrolled: { label: 'Human study regimen', tone: 'human' },
  human_observational: { label: 'Human observational', tone: 'human' },
  human_case_series: { label: 'Human case series', tone: 'human' },
  human_case_report: { label: 'Human case report', tone: 'human' },
  human_pk_pd: { label: 'Human pharmacokinetic study', tone: 'human' },
  animal_in_vivo: { label: 'Preclinical — animal', tone: 'preclinical' },
  in_vitro: { label: 'Preclinical — laboratory', tone: 'preclinical' },
  practitioner_reference: { label: 'Practitioner handbook', tone: 'reported' },
  expert_commentary: { label: 'Expert commentary', tone: 'reported' },
  experiential_anecdotal: { label: 'Experiential report', tone: 'reported' },
  regulatory_reference: { label: 'Regulatory reference', tone: 'approved' },
  academic_reference: { label: 'Academic reference', tone: 'reported' },
};

/**
 * The taxonomy's public label, mapped to the context wording.
 *
 * The protocol shape carries the display label rather than the key, and
 * "Practitioner reference" is the taxonomy's word for a *source type*. What a
 * clinic needs on a regimen is what kind of thing the regimen is, which is not
 * quite the same sentence — so the mapping is by label where the key is not to
 * hand, and falls through to the label itself when it is a type this component
 * has no wording for.
 */
const BY_LABEL: Readonly<Record<string, string>> = {
  // The taxonomy's current public labels, exactly as evidence_types.json has
  // them. When the first human-study regimens arrived these were missing, so a
  // trial column in the comparison read "Randomised human trial" while the
  // same record's card read "Human trial regimen" — one regimen, two wordings.
  'Approved product labelling': 'approved_label_evidence',
  'Randomised human trial': 'human_rct',
  'Controlled human study, not randomised': 'human_controlled_nonrandomized',
  'Uncontrolled human study': 'human_prospective_uncontrolled',
  'Human observational study': 'human_observational',
  'Human case series': 'human_case_series',
  'Human case report': 'human_case_report',
  'Human pharmacokinetic study': 'human_pk_pd',
  'Animal study': 'animal_in_vivo',
  'Laboratory (in vitro) study': 'in_vitro',
  'Practitioner reference': 'practitioner_reference',
  'Expert commentary': 'expert_commentary',
  'Experiential report': 'experiential_anecdotal',
  'Academic reference': 'academic_reference',
  // Older wordings, kept so a stale label still maps.
  'Approved label': 'approved_label_evidence',
  'Approved-label evidence': 'approved_label_evidence',
  'Randomised controlled trial': 'human_rct',
  'Human pharmacokinetics': 'human_pk_pd',
};

function contextFor(
  evidenceTypeLabel: string,
  evidenceTypeKey?: string,
): { label: string; tone: ContextTone } {
  const key = evidenceTypeKey ?? BY_LABEL[evidenceTypeLabel];
  if (key !== undefined && key in EVIDENCE_CONTEXT) return EVIDENCE_CONTEXT[key]!;
  return { label: evidenceTypeLabel, tone: 'reported' };
}

export function evidenceContextLabel(evidenceTypeLabel: string, evidenceTypeKey?: string): string {
  return contextFor(evidenceTypeLabel, evidenceTypeKey).label;
}

/** The key where the record carries one (library rows do; compound-page rows do not). */
function keyOf(protocol: PractitionerProtocol): string | undefined {
  const key = (protocol as { evidenceTypeKey?: unknown }).evidenceTypeKey;
  return typeof key === 'string' ? key : undefined;
}

function toneClasses(tone: ContextTone): string {
  switch (tone) {
    case 'approved':
    case 'human':
      return 'border-[var(--color-evidence-human)]/40 bg-[var(--color-evidence-human-bg)] text-[var(--color-evidence-human)]';
    case 'preclinical':
      return 'border-[var(--color-evidence-preclinical)]/40 bg-[var(--color-evidence-preclinical-bg)] text-[var(--color-evidence-preclinical)]';
    default:
      return 'border-rule bg-surface-sunk text-slate';
  }
}

/**
 * A shape per tone, so the badge does not rely on its tint: a filled square for
 * labelling, a filled circle for a study in people, a triangle for preclinical
 * work and an open circle for reported practice.
 */
function ToneShape({ tone }: { tone: ContextTone }) {
  return (
    <svg viewBox="0 0 10 10" width="8" height="8" aria-hidden="true" className="shrink-0">
      {tone === 'approved' ? (
        <rect x="1" y="1" width="8" height="8" rx="1" fill="currentColor" />
      ) : tone === 'human' ? (
        <circle cx="5" cy="5" r="4" fill="currentColor" />
      ) : tone === 'preclinical' ? (
        <path d="M5 1 L9 9 L1 9 Z" fill="currentColor" />
      ) : (
        <circle cx="5" cy="5" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      )}
    </svg>
  );
}

export function ProtocolContextBadge({
  evidenceTypeKey,
  evidenceTypeLabel,
}: {
  evidenceTypeKey?: string | undefined;
  evidenceTypeLabel: string;
}) {
  const entry = contextFor(evidenceTypeLabel, evidenceTypeKey);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-2xs font-medium tracking-wide uppercase ${toneClasses(entry.tone)}`}
    >
      <ToneShape tone={entry.tone} />
      {entry.label}
    </span>
  );
}

/* ==========================================================================
   Comparing fields — as worded, never reconciled
   ========================================================================== */

export interface ComparisonField {
  readonly key: string;
  readonly label: string;
  readonly group: 'context' | 'regimen' | 'safety';
  readonly get: (p: PractitionerProtocol) => string | null;
}

/** The rows, in a fixed order so columns can be read across. */
export const COMPARISON_FIELDS: readonly ComparisonField[] = [
  { key: 'objective', label: 'Context / objective', group: 'context', get: (p) => p.objectiveContext },
  { key: 'population', label: 'Population or model', group: 'context', get: (p) => p.populationModel },
  { key: 'route', label: 'Route', group: 'regimen', get: (p) => p.routeName },
  { key: 'formulation', label: 'Formulation', group: 'regimen', get: (p) => p.formulation },
  // The source's own wording, which already carries its unit. `amountUnit` is a
  // normalisation hint for filtering; appending it printed "500 mcg mcg".
  { key: 'amount', label: 'Amount as reported', group: 'regimen', get: (p) => amountAsReported(p) },
  { key: 'frequency', label: 'Frequency', group: 'regimen', get: (p) => p.frequencyText },
  { key: 'timing', label: 'Timing', group: 'regimen', get: (p) => p.timingText },
  { key: 'duration', label: 'Duration', group: 'regimen', get: (p) => p.durationText },
  { key: 'titration', label: 'Titration', group: 'regimen', get: (p) => p.titrationText },
  { key: 'cycle', label: 'Cycle / off period', group: 'regimen', get: (p) => p.cycleText },
  { key: 'combinations', label: 'Combinations', group: 'regimen', get: (p) => p.combinationsText },
  { key: 'monitoring', label: 'Monitoring', group: 'safety', get: (p) => p.monitoringText },
  { key: 'cautions', label: 'Cautions', group: 'safety', get: (p) => p.contraindicationsText },
  { key: 'regulatory', label: 'Regulatory context', group: 'safety', get: (p) => p.regulatoryContext },
];

const GROUP_LABEL: Readonly<Record<ComparisonField['group'], string>> = {
  context: 'What it was for, and in whom',
  regimen: 'The regimen, in each source’s words',
  safety: 'Monitoring, cautions and standing',
};

/** The fields a clinic compares first, used where there is room for only a few. */
export const KEY_COMPARISON_FIELDS: readonly string[] = [
  'route',
  'population',
  'amount',
  'frequency',
  'duration',
  'monitoring',
];

export type FieldStatus = 'differs' | 'same' | 'partial' | 'unstated';

export interface FieldComparison {
  readonly field: ComparisonField;
  /** Display values, one per column, exactly as the record holds them. */
  readonly values: readonly (string | null)[];
  /**
   * Which wording each column uses: 0 for the first wording met reading left to
   * right, 1 for the next, and so on. Null where the source states nothing. An
   * index, not a rank.
   */
  readonly wordings: readonly (number | null)[];
  readonly wordingCount: number;
  readonly statedCount: number;
  readonly status: FieldStatus;
  /** True when the differing wordings come from more than one source. */
  readonly acrossSources: boolean;
}

function stated(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * How one field reads across the columns.
 *
 * Identity is exact text after trimming surrounding whitespace — nothing else
 * is normalised. A column that states nothing is never counted as agreeing or
 * disagreeing; it is silent, and the row says how many columns were.
 */
export function compareField(
  protocols: readonly PractitionerProtocol[],
  field: ComparisonField,
): FieldComparison {
  const values = protocols.map((p) => stated(field.get(p)));
  const seen = new Map<string, number>();
  const wordings = values.map((value) => {
    if (value === null) return null;
    if (!seen.has(value)) seen.set(value, seen.size);
    return seen.get(value)!;
  });
  const statedCount = values.filter((v) => v !== null).length;
  const wordingCount = seen.size;
  const status: FieldStatus =
    statedCount === 0
      ? 'unstated'
      : wordingCount > 1
        ? 'differs'
        : statedCount === protocols.length
          ? 'same'
          : 'partial';
  const statingSources = new Set(
    protocols
      .filter((_, index) => values[index] !== null)
      .map((p) => p.sources[0]?.sourceKey ?? p.id),
  );
  return {
    field,
    values: protocols.map((p) => field.get(p)),
    wordings,
    wordingCount,
    statedCount,
    status,
    acrossSources: statingSources.size > 1,
  };
}

export function compareProtocols(protocols: readonly PractitionerProtocol[]): FieldComparison[] {
  return COMPARISON_FIELDS.map((field) => compareField(protocols, field));
}

export function differsLabel(comparison: Pick<FieldComparison, 'acrossSources'>): string {
  return comparison.acrossSources ? 'Differs between sources' : 'Differs within one source’s records';
}

function wordingLetter(index: number): string {
  return index < 26 ? String.fromCharCode(65 + index) : String(index + 1);
}

/* ==========================================================================
   Marks and legend
   ========================================================================== */

/** The shape that accompanies each row status. Always beside a word, never alone. */
export function StatusShape({ status }: { status: FieldStatus }) {
  return (
    <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" className="shrink-0">
      {status === 'differs' ? (
        <path d="M6 0.8 L11.2 6 L6 11.2 L0.8 6 Z" fill="var(--color-caution)" />
      ) : status === 'same' ? (
        <g stroke="var(--color-tide-teal)" strokeWidth="1.8" strokeLinecap="round">
          <line x1="2" y1="4.2" x2="10" y2="4.2" />
          <line x1="2" y1="7.8" x2="10" y2="7.8" />
        </g>
      ) : status === 'partial' ? (
        <g>
          <circle cx="6" cy="6" r="4.6" fill="none" stroke="var(--color-slate)" strokeWidth="1.2" />
          <path d="M6 1.4 A4.6 4.6 0 0 0 6 10.6 Z" fill="var(--color-slate)" />
        </g>
      ) : (
        <circle
          cx="6"
          cy="6"
          r="4.6"
          fill="none"
          stroke="var(--color-slate)"
          strokeWidth="1.2"
          strokeDasharray="2 1.6"
        />
      )}
    </svg>
  );
}

function StatusMark({ comparison, total }: { comparison: FieldComparison; total: number }) {
  switch (comparison.status) {
    case 'differs':
      return (
        <span className="mt-1 flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-caution)]">
            <StatusShape status="differs" />
            {differsLabel(comparison)}
          </span>
          <span className="text-2xs text-slate">
            {comparison.wordingCount} wordings · stated in {comparison.statedCount} of {total}
          </span>
        </span>
      );
    case 'same':
      return (
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-tide-teal">
          <StatusShape status="same" />
          Same wording in every column
        </span>
      );
    case 'partial':
      return (
        <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate">
          <StatusShape status="partial" />
          Stated in {comparison.statedCount} of {total}; no wording differs
        </span>
      );
    default:
      return null;
  }
}

function WordingTag({ index }: { index: number }) {
  return (
    <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-[var(--color-caution-rule)] bg-warm-white px-1 align-[1px] text-2xs font-medium text-[var(--color-caution)]">
      <span className="sr-only">Wording </span>
      {wordingLetter(index)}
    </span>
  );
}

function NotStated() {
  // Missing means missing. Not "standard", not inferred from the neighbouring column.
  return <span className="text-slate italic">Not stated by this source</span>;
}

export function ComparisonLegend() {
  const items: readonly { mark: ReactNode; term: string; body: string }[] = [
    {
      mark: <StatusShape status="differs" />,
      term: 'Differs between sources',
      body: 'At least two columns state this field in different words. Those cells are tinted, and a letter groups the columns that share identical wording.',
    },
    {
      mark: <StatusShape status="same" />,
      term: 'Same wording in every column',
      body: 'Every column states it, word for word. Agreement between sources is not evidence that the value is right.',
    },
    {
      mark: <StatusShape status="partial" />,
      term: 'Stated by only some',
      body: 'The columns that state it use one wording; the rest are silent.',
    },
    {
      mark: (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-[var(--color-caution-rule)] bg-warm-white px-1 text-2xs font-medium text-[var(--color-caution)]">
          A
        </span>
      ),
      term: 'Wording letters',
      body: 'A is the first wording met reading left to right, B the next. Letters group identical text; they carry no rank.',
    },
    {
      mark: <StatusShape status="unstated" />,
      term: 'Not stated by this source',
      body: 'The source is silent on it. Nothing is filled in from another column.',
    },
  ];
  return (
    <div className="rounded-md border border-rule-soft px-4 py-3.5">
      <p className="meta-label">Reading the marks</p>
      <dl className="mt-2.5 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div key={item.term} className="flex gap-2.5">
            <span className="mt-1 flex w-4 shrink-0 justify-center">{item.mark}</span>
            <div>
              <dt className="font-medium text-ink">{item.term}</dt>
              <dd className="text-slate">{item.body}</dd>
            </div>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-slate">
        Compared as worded: the same schedule written two ways counts as two wordings. Nothing is
        converted, normalised, averaged or ranged across columns.
      </p>
    </div>
  );
}

/* ==========================================================================
   The comparison
   ========================================================================== */

function columnAuthor(protocol: PractitionerProtocol): string {
  const source = protocol.sources[0];
  const author = source?.authors[0] ?? 'Author not recorded';
  return source?.year ? `${author} (${String(source.year)})` : author;
}

function evidenceMix(
  protocols: readonly PractitionerProtocol[],
): { label: string; key: string | undefined; typeLabel: string; count: number }[] {
  const mix = new Map<string, { label: string; key: string | undefined; typeLabel: string; count: number }>();
  for (const protocol of protocols) {
    const label = evidenceContextLabel(protocol.evidenceTypeLabel, keyOf(protocol));
    const entry = mix.get(label) ?? {
      label,
      key: keyOf(protocol),
      typeLabel: protocol.evidenceTypeLabel,
      count: 0,
    };
    entry.count += 1;
    mix.set(label, entry);
  }
  return [...mix.values()];
}

export function ProtocolComparison({
  protocols,
  compoundName,
}: {
  protocols: readonly PractitionerProtocol[];
  compoundName: string;
}) {
  if (protocols.length < 2) return null;

  const total = protocols.length;
  const comparisons = compareProtocols(protocols);
  const shown = comparisons.filter((c) => c.status !== 'unstated');
  const byStatus = (status: FieldStatus) =>
    comparisons.filter((c) => c.status === status).map((c) => c.field.label);
  const differs = comparisons.filter((c) => c.status === 'differs');
  const sourceCount = new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey))).size;
  const groups = (['context', 'regimen', 'safety'] as const)
    .map((group) => ({ group, rows: shown.filter((c) => c.field.group === group) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-5">
      {/* --- At a glance ---------------------------------------------------- */}
      <div className="rounded-md border border-rule bg-mist px-4 py-4 sm:px-5">
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {total} regimens from {sourceCount} {sourceCount === 1 ? 'source' : 'sources'}.
          </span>{' '}
          No column is recommended and none is ranked: each shows what one named source reports, in
          the evidence context it sits in. This comparison does not establish what {compoundName}{' '}
          should be used at.
        </p>

        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2" aria-label="Evidence context of the columns">
          {evidenceMix(protocols).map((entry) => (
            <li key={entry.label} className="inline-flex items-center gap-1.5 text-xs text-slate">
              <ProtocolContextBadge evidenceTypeKey={entry.key} evidenceTypeLabel={entry.typeLabel} />
              <span>× {entry.count}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 grid gap-3 border-t border-rule pt-3.5 text-sm sm:grid-cols-2">
          {differs.length > 0 ? (
            <div className="sm:col-span-2">
              <dt className="inline-flex items-center gap-1.5 font-medium text-[var(--color-caution)]">
                <StatusShape status="differs" />
                Differs between sources
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {differs.map((c) => (
                  <span
                    key={c.field.key}
                    className="rounded-sm border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-2 py-0.5 text-xs text-ink-soft"
                  >
                    {c.field.label}
                    <span className="text-slate"> · {c.wordingCount} wordings</span>
                    {c.acrossSources ? null : <span className="text-slate"> · one source</span>}
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {/*
            Agreement is worth naming too. A reader told only what differs will
            assume the rest was never reported; these are the fields every
            column states identically — still not an endorsement of the value.
          */}
          {byStatus('same').length > 0 ? (
            <div>
              <dt className="inline-flex items-center gap-1.5 font-medium text-ink">
                <StatusShape status="same" />
                Same wording in every column
              </dt>
              <dd className="mt-0.5 text-ink-soft">{byStatus('same').join(' · ')}</dd>
            </div>
          ) : null}
          {byStatus('partial').length > 0 ? (
            <div>
              <dt className="inline-flex items-center gap-1.5 font-medium text-ink">
                <StatusShape status="partial" />
                Stated by only some
              </dt>
              <dd className="mt-0.5 text-ink-soft">{byStatus('partial').join(' · ')}</dd>
            </div>
          ) : null}
          {byStatus('unstated').length > 0 ? (
            <div>
              <dt className="inline-flex items-center gap-1.5 font-medium text-ink">
                <StatusShape status="unstated" />
                Not stated by any column
              </dt>
              <dd className="mt-0.5 text-ink-soft">{byStatus('unstated').join(' · ')}</dd>
            </div>
          ) : null}
        </dl>
      </div>

      <ComparisonLegend />

      {/* --- Wide screens: the matrix, scrolling inside itself ---------------- */}
      <div className="hidden md:block">
        <p className="no-print mb-2 text-xs text-slate">
          {total > 3 ? 'Scroll the table sideways to see every column. ' : ''}Field names stay pinned
          on the left.
        </p>
        <div className="scroll-x rounded-md border border-rule bg-warm-white">
          <table className="w-max min-w-full border-collapse text-sm">
            <caption className="sr-only">
              Source-reported regimens for {compoundName}, one column per record, compared field by
              field. No column is recommended.
            </caption>
            <thead>
              <tr className="align-bottom">
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-44 min-w-44 border-r border-b border-rule bg-warm-white px-4 py-3 text-left"
                >
                  <span className="meta-label">Field</span>
                </th>
                {protocols.map((protocol, index) => (
                  <th
                    key={protocol.id}
                    scope="col"
                    className="w-60 min-w-60 border-b border-rule px-4 py-3 text-left align-top font-normal"
                  >
                    <span className="meta-label">Column {index + 1}</span>
                    <span className="mt-1 block font-serif text-base leading-snug text-ink">
                      {columnAuthor(protocol)}
                    </span>
                    <span className="mt-0.5 line-clamp-2 text-xs text-slate">
                      {protocol.sources[0]?.sourceTitle ?? protocol.protocolKey}
                    </span>
                    <span className="mt-2 block">
                      <ProtocolContextBadge
                        evidenceTypeKey={keyOf(protocol)}
                        evidenceTypeLabel={protocol.evidenceTypeLabel}
                      />
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            {groups.map(({ group, rows }) => (
              <tbody key={group}>
                <tr>
                  <th
                    scope="colgroup"
                    colSpan={total + 1}
                    className="border-b border-rule bg-surface-sunk px-4 py-1.5 text-left"
                  >
                    <span className="meta-label sticky left-4">{GROUP_LABEL[group]}</span>
                  </th>
                </tr>
                {rows.map((comparison) => (
                  <tr key={comparison.field.key} className="border-b border-rule-soft align-top">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-rule bg-warm-white px-4 py-3 text-left font-normal"
                    >
                      <span className="block text-xs font-medium tracking-wide text-ink uppercase">
                        {comparison.field.label}
                      </span>
                      <StatusMark comparison={comparison} total={total} />
                    </th>
                    {protocols.map((protocol, index) => {
                      const value = comparison.values[index] ?? null;
                      const wording = comparison.wordings[index] ?? null;
                      const tinted = comparison.status === 'differs' && wording !== null;
                      return (
                        <td
                          key={protocol.id}
                          className={`px-4 py-3 ${
                            tinted
                              ? 'border-l-2 border-l-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] text-ink'
                              : 'text-ink-soft'
                          }`}
                        >
                          {wording === null ? (
                            <NotStated />
                          ) : (
                            <>
                              {tinted ? <WordingTag index={wording} /> : null}
                              {value}
                            </>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            ))}
            <tbody>
              <tr className="align-top">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-rule bg-warm-white px-4 py-3 text-left font-normal"
                >
                  <span className="block text-xs font-medium tracking-wide text-ink uppercase">
                    Where it is printed
                  </span>
                </th>
                {protocols.map((protocol) => (
                  <td key={protocol.id} className="px-4 py-3 text-xs text-slate">
                    <Locator protocol={protocol} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Narrow screens and print: the same comparison, field by field ---- */}
      <div className="md:hidden">
        <div className="rounded-md border border-rule bg-warm-white px-4 py-3">
          <p className="meta-label">The columns</p>
          <ol className="mt-2 space-y-2.5">
            {protocols.map((protocol, index) => (
              <li key={protocol.id} className="flex gap-3 text-sm">
                <ColumnNumber n={index + 1} />
                <div className="min-w-0">
                  <p className="font-serif leading-snug text-ink">{columnAuthor(protocol)}</p>
                  <p className="text-xs text-slate">
                    {protocol.sources[0]?.sourceTitle ?? protocol.protocolKey}
                  </p>
                  <p className="mt-1">
                    <ProtocolContextBadge
                      evidenceTypeKey={keyOf(protocol)}
                      evidenceTypeLabel={protocol.evidenceTypeLabel}
                    />
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {groups.map(({ group, rows }) => (
          <div key={group} className="mt-5">
            <h3 className="meta-label border-b border-rule pb-1.5">{GROUP_LABEL[group]}</h3>
            {rows.map((comparison) => (
              <section
                key={comparison.field.key}
                aria-label={comparison.field.label}
                className="avoid-break border-b border-rule-soft py-3"
              >
                <p className="text-xs font-medium tracking-wide text-ink uppercase">
                  {comparison.field.label}
                </p>
                <StatusMark comparison={comparison} total={total} />
                {comparison.status === 'same' ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    <span className="text-slate">Every column: </span>
                    {comparison.values[0]}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {protocols.map((protocol, index) => {
                      const wording = comparison.wordings[index] ?? null;
                      const tinted = comparison.status === 'differs' && wording !== null;
                      return (
                        <li
                          key={protocol.id}
                          className={`flex gap-2.5 rounded-sm px-2 py-1.5 text-sm ${
                            tinted
                              ? 'border-l-2 border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] text-ink'
                              : 'text-ink-soft'
                          }`}
                        >
                          <ColumnNumber n={index + 1} />
                          <span className="min-w-0">
                            {wording === null ? (
                              <NotStated />
                            ) : (
                              <>
                                {tinted ? <WordingTag index={wording} /> : null}
                                {comparison.values[index]}
                              </>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            ))}
          </div>
        ))}

        <div className="mt-5">
          <h3 className="meta-label border-b border-rule pb-1.5">Where it is printed</h3>
          <ul className="mt-2 space-y-1.5">
            {protocols.map((protocol, index) => (
              <li key={protocol.id} className="flex gap-2.5 px-2 text-xs text-slate">
                <ColumnNumber n={index + 1} />
                <span className="min-w-0">
                  <Locator protocol={protocol} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function ColumnNumber({ n }: { n: number }) {
  return (
    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rule bg-mist text-2xs font-medium text-deep-tide">
      <span className="sr-only">Column </span>
      {n}
    </span>
  );
}

function Locator({ protocol }: { protocol: PractitionerProtocol }) {
  const reported = contextFor(protocol.evidenceTypeLabel, keyOf(protocol)).tone === 'reported';
  return (
    <>
      {protocol.sources.map((source) => (
        <span key={source.sourceKey} className="block">
          {source.sourceKey}
          {source.locatorText ? ` — ${source.locatorText}` : ' — location not recorded'}
        </span>
      ))}
      {/*
        Verification state is carried on the evidence link rather than on the
        citation. For reported practice the record's standing position is that
        the primary source behind the amount has not been traced; a study column
        is itself the primary report, so the line is not printed there.
      */}
      {reported ? <span className="mt-1 block">Primary source not traced</span> : null}
    </>
  );
}
