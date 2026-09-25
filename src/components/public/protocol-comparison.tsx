import type { ReactNode } from 'react';
import type { PractitionerProtocol } from '@/server/public/queries';
import { hasDistinctWordings, type FieldState } from '@/domain/protocols/field-comparison';
import {
  compareProtocolFields,
  groupByState,
  type ComparisonGroup,
  type ProtocolFieldComparison,
} from '@/domain/protocols/protocol-comparison';

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
 * **It computes nothing.** Each field is classified by
 * `@/domain/protocols/field-comparison` into agreement, difference between
 * sources, within-source variation, reported by one only, or not reported. Absence never counts as a difference: a source
 * that does not specify a field is silent, not in conflict. Wording is compared
 * after normalising presentation only (case, spacing, punctuation, unit
 * spacing); nothing is converted, so "twice daily" and "every 12 hours" remain
 * two wordings.
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
   Field states — wording and marks
   ========================================================================== */

const GROUP_LABEL: Readonly<Record<ComparisonGroup, string>> = {
  context: 'What it was for, and in whom',
  regimen: 'The regimen, in each source’s words',
  safety: 'Monitoring, cautions and standing',
};

/** The row label for a field's state. Words carry the meaning; the mark repeats it. */
export function fieldStateLabel(
  comparison: Pick<ProtocolFieldComparison, 'state' | 'acrossSources'>,
): string {
  switch (comparison.state) {
    case 'difference':
      return 'Difference between sources';
    case 'variation':
      return 'Within-source variation';
    case 'agreement':
      return comparison.acrossSources
        ? 'Agreement between sources'
        : 'Agreement within one source’s records';
    case 'single':
      return 'Reported by one source only';
    default:
      return 'Not reported by any source';
  }
}

/**
 * The mark beside each state. Always beside a word, never alone.
 *
 * A family of bars, chosen so nothing here reuses the circle, square, triangle
 * or diamond the evidence-context badges and evidence marks already mean: a
 * solid bar is a source that reports the field, a dotted bar is silence.
 *
 *   agreement  — two solid bars, an equals sign
 *   difference — two solid bars struck through, a not-equals sign
 *   variation  — two short solid bars offset from each other: one source's
 *                records reporting the field in more than one way
 *   single     — one solid bar over one dotted bar
 *   none       — two dotted bars
 */
export function FieldStateMark({ state }: { state: FieldState }) {
  const solid = { strokeWidth: 1.8, strokeLinecap: 'round' as const };
  const dotted = { strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeDasharray: '0.1 2.6' };
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" className="shrink-0">
      {state === 'variation' ? (
        <g stroke="var(--color-caution)" {...solid}>
          <line x1="1.4" y1="4.2" x2="7.2" y2="4.2" />
          <line x1="4.8" y1="7.8" x2="10.6" y2="7.8" />
        </g>
      ) : state === 'difference' ? (
        <g stroke="var(--color-caution)" {...solid}>
          <line x1="1.8" y1="4.2" x2="10.2" y2="4.2" />
          <line x1="1.8" y1="7.8" x2="10.2" y2="7.8" />
          <line x1="8.4" y1="1.2" x2="3.6" y2="10.8" />
        </g>
      ) : state === 'agreement' ? (
        <g stroke="var(--color-tide-teal)" {...solid}>
          <line x1="1.8" y1="4.2" x2="10.2" y2="4.2" />
          <line x1="1.8" y1="7.8" x2="10.2" y2="7.8" />
        </g>
      ) : state === 'single' ? (
        <g stroke="var(--color-slate)">
          <line x1="1.8" y1="4.2" x2="10.2" y2="4.2" {...solid} />
          <line x1="1.8" y1="7.8" x2="10.2" y2="7.8" {...dotted} />
        </g>
      ) : (
        <g stroke="var(--color-slate)">
          <line x1="1.8" y1="4.2" x2="10.2" y2="4.2" {...dotted} />
          <line x1="1.8" y1="7.8" x2="10.2" y2="7.8" {...dotted} />
        </g>
      )}
    </svg>
  );
}

const STATE_TEXT: Readonly<Record<FieldState, string>> = {
  difference: 'text-[var(--color-caution)] font-medium',
  variation: 'text-[var(--color-caution)]',
  agreement: 'text-tide-teal',
  single: 'text-slate',
  none: 'text-slate',
};

/** The line under a state label: counts only, never a value. */
export function fieldStateDetail(comparison: ProtocolFieldComparison): string | null {
  const { state, total, reportedCount, wordings, reportingSourceCount, sourcesWithVariation } = comparison;
  const of = `${String(reportedCount)} of ${String(total)}`;
  switch (state) {
    case 'difference':
      return [
        `${String(wordings.length)} distinct wordings from ${String(reportingSourceCount)} sources`,
        `reported by ${of}`,
        ...(sourcesWithVariation.length > 0 ? [`also varies within ${sourcesWithVariation.join(', ')}`] : []),
      ].join(' · ');
    case 'variation':
      return `${String(wordings.length)} wordings, all from ${sourcesWithVariation[0] ?? 'one source'} · reported by ${of}`;
    case 'agreement':
      return `Reported alike by ${of}`;
    case 'single':
      return `Reported by 1 of ${String(total)} · nothing to compare it with`;
    default:
      return null;
  }
}

function StateMark({ comparison }: { comparison: ProtocolFieldComparison }) {
  const { state } = comparison;
  const detail = fieldStateDetail(comparison);
  return (
    <span className="mt-1 flex flex-col gap-0.5" data-field-state={state}>
      <span className={`inline-flex items-center gap-1.5 text-xs ${STATE_TEXT[state]}`}>
        <FieldStateMark state={state} />
        {fieldStateLabel(comparison)}
      </span>
      {detail === null ? null : <span className="text-2xs text-slate">{detail}</span>}
    </span>
  );
}

function WordingTag({ letter }: { letter: string }) {
  return (
    <span className="mr-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-[var(--color-caution-rule)] bg-warm-white px-1 align-[1px] text-2xs font-medium text-[var(--color-caution)]">
      <span className="sr-only">Wording </span>
      {letter}
    </span>
  );
}

/**
 * A field this source does not specify.
 *
 * Quiet absence: a dash and two words, never tinted, never lettered, and never
 * filled in from a neighbouring column. Where the record's placeholder carried a
 * qualification, it is shown underneath rather than dropped.
 */
function NotReported({ note }: { note: string | null }) {
  return (
    <span className="text-slate-light" data-cell-state="not_reported">
      <span aria-hidden="true">— </span>
      <span className="italic">Not reported</span>
      {note === null ? null : (
        <span className="mt-0.5 block text-2xs text-slate not-italic">Record note: {note}</span>
      )}
    </span>
  );
}

function Cell({ comparison, index }: { comparison: ProtocolFieldComparison; index: number }) {
  const cell = comparison.cells[index];
  if (cell === undefined || cell.state === 'not_reported') {
    return <NotReported note={cell?.note ?? null} />;
  }
  const letter =
    hasDistinctWordings(comparison.state) && cell.wording !== null
      ? comparison.wordings[cell.wording]?.letter
      : undefined;
  return (
    <span data-cell-state="reported">
      {letter === undefined ? null : <WordingTag letter={letter} />}
      {cell.value}
    </span>
  );
}

function cellTone(comparison: ProtocolFieldComparison, index: number): string {
  const cell = comparison.cells[index];
  if (cell?.state !== 'reported') return '';
  // Variation is tinted like a difference, since the wordings do differ, but
  // without the heavier rule: the mark and the words say which it is.
  return comparison.state === 'difference'
    ? 'border-l-2 border-l-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] text-ink'
    : comparison.state === 'variation'
      ? 'bg-[var(--color-caution-bg)] text-ink'
      : 'text-ink-soft';
}

export function ComparisonLegend() {
  const items: readonly { mark: ReactNode; term: string; body: string }[] = [
    {
      mark: <FieldStateMark state="difference" />,
      term: 'Difference',
      body: 'Columns from two or more different sources report this field, and what they report differs. Those cells are tinted, and a letter groups the columns that report the same wording.',
    },
    {
      mark: <FieldStateMark state="variation" />,
      term: 'Within-source variation',
      body: 'Two or more columns report it differently, but every one of them comes from the same source — one book giving more than one schedule. Not a disagreement between sources.',
    },
    {
      mark: <FieldStateMark state="agreement" />,
      term: 'Agreement',
      body: 'Two or more columns report it, and what they report is the same. Agreement between sources is not evidence that the value is right.',
    },
    {
      mark: <FieldStateMark state="single" />,
      term: 'Reported by one source only',
      body: 'Only one column reports it. That is neither agreement nor difference — there is nothing to compare it with.',
    },
    {
      mark: (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border border-[var(--color-caution-rule)] bg-warm-white px-1 text-2xs font-medium text-[var(--color-caution)]">
          A
        </span>
      ),
      term: 'Wording letters',
      body: 'On a difference or a variation, A is the first wording met reading left to right, B the next. Letters group matching wording; they carry no rank.',
    },
    {
      mark: <span className="text-slate-light">—</span>,
      term: 'Not reported',
      body: 'The source does not specify it. Silence is never counted as a difference or as agreement, and nothing is filled in from another column.',
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
        Wording is matched ignoring only letter case, spacing, punctuation and the space between a
        number and its unit. Nothing is converted or interpreted: “mcg” and “µg”, or “twice daily”
        and “every 12 hours”, count as different wordings. Nothing is averaged or ranged across
        columns, and no dose is suggested.
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

function SummaryList({
  state,
  title,
  comparisons,
}: {
  state: FieldState;
  title: string;
  comparisons: readonly ProtocolFieldComparison[];
}) {
  if (comparisons.length === 0) return null;
  return (
    <div data-summary-state={state}>
      <dt className="inline-flex items-center gap-1.5 font-medium text-ink">
        <FieldStateMark state={state} />
        {title}
      </dt>
      <dd className={`mt-0.5 ${state === 'none' ? 'text-slate' : 'text-ink-soft'}`}>
        {comparisons.map((c) => c.field.label).join(' · ')}
      </dd>
    </div>
  );
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
  const comparisons = compareProtocolFields(protocols);
  const byState = groupByState(comparisons);
  const shown = comparisons.filter((c) => c.state !== 'none');
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
          {byState.difference.length > 0 ? (
            <div className="sm:col-span-2" data-summary-state="difference">
              <dt className="inline-flex items-center gap-1.5 font-medium text-[var(--color-caution)]">
                <FieldStateMark state="difference" />
                Difference — sources report different things
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {byState.difference.map((c) => (
                  <span
                    key={c.field.key}
                    className="rounded-sm border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-2 py-0.5 text-xs text-ink-soft"
                  >
                    {c.field.label}
                    <span className="text-slate"> · {c.wordings.length} wordings</span>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {byState.variation.length > 0 ? (
            <div className="sm:col-span-2" data-summary-state="variation">
              <dt className="inline-flex items-center gap-1.5 font-medium text-[var(--color-caution)]">
                <FieldStateMark state="variation" />
                Within-source variation — one source reports more than one wording
              </dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {byState.variation.map((c) => (
                  <span
                    key={c.field.key}
                    className="rounded-sm border border-dashed border-[var(--color-caution-rule)] px-2 py-0.5 text-xs text-ink-soft"
                  >
                    {c.field.label}
                    <span className="text-slate">
                      {' '}
                      · {c.wordings.length} wordings within {c.sourcesWithVariation[0] ?? 'one source'}
                    </span>
                  </span>
                ))}
              </dd>
            </div>
          ) : null}
          {/*
            Agreement is worth naming too. A reader told only what differs will
            assume the rest was never reported; these are the fields reported
            alike wherever they are reported — still not an endorsement.
          */}
          <SummaryList state="agreement" title="Agreement — reported alike" comparisons={byState.agreement} />
          <SummaryList state="single" title="Reported by one source only" comparisons={byState.single} />
          <SummaryList state="none" title="Not reported by any source" comparisons={byState.none} />
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
                  className="sticky left-0 z-10 w-48 min-w-48 border-r border-b border-rule bg-warm-white px-4 py-3 text-left"
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
                  <tr
                    key={comparison.field.key}
                    className="border-b border-rule-soft align-top"
                    data-field={comparison.field.key}
                  >
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-r border-rule bg-warm-white px-4 py-3 text-left font-normal"
                    >
                      <span className="block text-xs font-medium tracking-wide text-ink uppercase">
                        {comparison.field.label}
                      </span>
                      <StateMark comparison={comparison} />
                    </th>
                    {protocols.map((protocol, index) => (
                      <td key={protocol.id} className={`px-4 py-3 ${cellTone(comparison, index)}`}>
                        <Cell comparison={comparison} index={index} />
                      </td>
                    ))}
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
                <StateMark comparison={comparison} />
                <ul className="mt-2 space-y-1.5">
                  {protocols.map((protocol, index) => (
                    <li
                      key={protocol.id}
                      className={`flex gap-2.5 rounded-sm px-2 py-1.5 text-sm ${cellTone(comparison, index)}`}
                    >
                      <ColumnNumber n={index + 1} />
                      <span className="min-w-0">
                        <Cell comparison={comparison} index={index} />
                      </span>
                    </li>
                  ))}
                </ul>
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
