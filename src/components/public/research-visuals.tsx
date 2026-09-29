import type { ReactNode } from 'react';
import type { Citation, PractitionerProtocol, SimpleProtocol } from '@/server/public/shapes';
import type { ResolvedStage } from '@/domain/presentation/mechanism-pathway';
import type { ProtocolComparison } from '@/domain/presentation/protocol-comparison';
import { CompoundMark } from './visual-system';

/**
 * Data visuals for the two transformed prototypes.
 *
 * Each one renders a structure the records already have. None computes a
 * score, a rank or a recommendation, and none uses colour or length as its
 * only signal — every bar carries its own number, every lane its own word.
 */

// ---------------------------------------------------------------------------
// Mechanism pathway
// ---------------------------------------------------------------------------

const STAGE_ACCENT = ['#22d3ee', '#2563eb', '#4f46e5', '#7c6ce0'];

/**
 * The mechanism as a four-stage pathway.
 *
 * Every box is a verbatim phrase from the record named beneath it, and a box
 * whose record is unpublished or reworded does not render at all — the
 * guarantee lives in `mechanism-pathway.ts` and is tested there.
 *
 * The arrows are the delicate part. They say "this is the order the sources
 * describe", not "this causes that", and the caption says so in words rather
 * than relying on the reader to infer it.
 */
export function PathwayDiagram({
  stages,
  hasHuman,
}: {
  readonly stages: readonly ResolvedStage[];
  readonly hasHuman: boolean;
}) {
  if (stages.length === 0) return null;
  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-4">
        {stages.map((stage, i) => (
          <div key={stage.key} className="relative">
            {/* The connector. Hidden from assistive tech: the reading order
                already carries the sequence. */}
            {i < stages.length - 1 ? (
              <span
                aria-hidden="true"
                className="absolute top-7 -right-2.5 hidden h-px w-5 bg-gradient-to-r from-cyan-soft/50 to-transparent lg:block"
              />
            ) : null}
            <div className="glass h-full p-5">
              <div className="flex items-baseline gap-2.5">
                <span
                  className="numeric font-serif text-lg"
                  style={{ color: STAGE_ACCENT[i % STAGE_ACCENT.length] }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="text-sm font-medium text-on-deep">{stage.label}</h3>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-on-deep-faint">{stage.detail}</p>
              <ul className="mt-4 space-y-2.5">
                {stage.nodes.map((node) => (
                  <li
                    key={`${node.claimKey}-${node.phrase}`}
                    className="rounded-lg border-l-2 bg-on-deep/[0.05] py-2 pr-3 pl-3"
                    style={{ borderLeftColor: STAGE_ACCENT[i % STAGE_ACCENT.length] }}
                  >
                    <span className="block text-sm leading-snug text-on-deep-soft">
                      {node.phrase}
                    </span>
                    <span className="label-micro mt-1.5 block text-on-deep-faint">
                      {node.claimKey}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-6 max-w-[74ch] text-sm leading-relaxed text-on-deep-soft">
        Each step is taken word for word from the research named beneath it, in the order the
        sources describe. An arrow means <em>reported next</em>, not <em>causes</em> — no study
        has tested one step against another.{' '}
        {hasHuman ? null : (
          <strong className="font-medium text-on-deep">
            No step here rests on evidence from people: every study behind this diagram is animal
            or laboratory research.
          </strong>
        )}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence landscape
// ---------------------------------------------------------------------------

export interface EvidenceLaneReading {
  readonly key: string;
  readonly label: string;
  readonly meaning: string;
  readonly sources: number;
  readonly claims: number;
}

const LANE_COLOR: Record<string, string> = {
  human: '#22d3ee',
  preclinical: '#7c6ce0',
  reference_opinion: '#5d8a99',
};

/**
 * The evidence landscape: a shape, not a score.
 *
 * Bars are proportional to the largest lane so the reader sees the imbalance
 * immediately, which on most compounds here is the whole point. There is no
 * total, no rating and no ordering by quality — and each bar prints its own
 * counts, so the picture is never the only thing saying what is there.
 */
export function EvidenceLandscape({ lanes }: { readonly lanes: readonly EvidenceLaneReading[] }) {
  const max = Math.max(1, ...lanes.map((l) => l.claims));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {lanes.map((lane) => {
        const color = LANE_COLOR[lane.key] ?? '#5d8a99';
        const pct = Math.round((lane.claims / max) * 100);
        return (
          <div key={lane.key} className="glass p-5 md:p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-medium text-on-deep">{lane.label}</h3>
              <span className="numeric font-serif text-3xl text-on-deep" style={{ color }}>
                {lane.claims}
              </span>
            </div>
            <div
              className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-on-deep/10"
              role="img"
              aria-label={`${lane.label}: ${String(lane.claims)} statements, ${String(lane.sources)} sources`}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${String(Math.max(pct, 4))}%`, backgroundColor: color }}
              />
            </div>
            <p className="mt-3 text-xs text-on-deep-faint">
              {lane.claims} {lane.claims === 1 ? 'statement' : 'statements'} · {lane.sources}{' '}
              {lane.sources === 1 ? 'source' : 'sources'}
            </p>
            <p className="mt-2.5 text-sm leading-relaxed text-on-deep-soft">{lane.meaning}</p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Research interests
// ---------------------------------------------------------------------------

/** A research interest, with a generated mark. Categories come from records. */
export function InterestCard({
  title,
  detail,
  index,
}: {
  readonly title: string;
  readonly detail: string;
  readonly index: number;
}) {
  return (
    <article className="group relative overflow-hidden rounded-2xl border border-rule bg-warm-white p-6 transition-colors hover:border-scientific-teal/50">
      <span
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ backgroundColor: STAGE_ACCENT[index % STAGE_ACCENT.length], opacity: 0.75 }}
      />
      <div className="flex items-start justify-between gap-4">
        <h3 className="max-w-[22ch] font-serif text-xl leading-snug text-ink">{title}</h3>
        <span className="shrink-0 text-tide-teal/55">
          <CompoundMark slug={title} size={44} />
        </span>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">{detail}</p>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Protocol cards
// ---------------------------------------------------------------------------

interface Field {
  readonly label: string;
  readonly value: string | null;
  /** Dose-bearing fields get the display treatment; context fields do not. */
  readonly emphasis?: boolean;
}

function amountWithUnit(p: PractitionerProtocol): string | null {
  if (p.amountReported === null) return null;
  if (p.amountUnit === null) return p.amountReported;
  // The unit lives in its own column; a figure without it is the one kind of
  // dose error that reads as authoritative.
  return /[a-z]/i.test(p.amountReported) ? p.amountReported : `${p.amountReported} ${p.amountUnit}`;
}

/**
 * One source's reported regimen.
 *
 * The heading is the source's name, because that is what the record is: a
 * report by an identifiable person or study, not an instruction. The amount,
 * frequency and duration are given display weight so the card is useful at a
 * glance — and a field the record does not carry is not rendered at all,
 * rather than shown as "not specified", which reads like an omission the
 * reader could fill in.
 */
export function ProtocolDataCard({
  sourceName,
  protocol,
  simple,
  accent,
  citations,
}: {
  readonly sourceName: string;
  readonly protocol: SimpleProtocol;
  readonly simple: boolean;
  readonly accent: string;
  readonly citations: readonly Citation[];
}) {
  const detailed = simple ? null : (protocol as PractitionerProtocol);

  const headline: readonly Field[] =
    detailed === null
      ? []
      : [
          { label: 'Amount', value: amountWithUnit(detailed), emphasis: true },
          { label: 'Frequency', value: detailed.frequencyText, emphasis: true },
          { label: 'Duration', value: detailed.durationText, emphasis: true },
        ];

  const secondary: readonly Field[] =
    detailed === null
      ? []
      : [
          { label: 'Route', value: protocol.routeName },
          { label: 'Formulation', value: detailed.formulation },
          { label: 'Timing', value: detailed.timingText },
          { label: 'Cycle', value: detailed.cycleText },
          { label: 'Titration', value: detailed.titrationText },
          { label: 'Alongside', value: detailed.combinationsText },
          { label: 'Monitoring', value: detailed.monitoringText },
          { label: 'Reported outcome', value: detailed.outcomeContext },
        ];

  const shown = headline.filter((f) => f.value !== null);
  const rest = secondary.filter((f) => f.value !== null);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-rule bg-warm-white">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
      <div className="border-b border-rule/70 bg-mist/40 py-4 pr-5 pl-7">
        <p className="label-micro text-slate">{protocol.evidenceTypeLabel}</p>
        <h3 className="mt-1 font-serif text-xl leading-snug text-ink">{sourceName}</h3>
      </div>

      <div className="py-5 pr-5 pl-7">
        <p className="text-sm leading-relaxed text-ink-soft">{protocol.objectiveContext}</p>

        {simple ? (
          <p className="mt-4 rounded-lg border border-rule bg-mist/50 px-4 py-3 text-sm leading-relaxed text-slate">
            Amounts, frequency and duration are not shown in this view.
          </p>
        ) : null}

        {shown.length === 0 ? null : (
          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-rule bg-rule">
            {shown.map((f) => (
              <div key={f.label} className="bg-warm-white px-3 py-3.5 text-center">
                <dt className="label-micro text-slate">{f.label}</dt>
                <dd className="numeric mt-1.5 font-serif text-lg leading-tight break-words text-deep-tide">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {rest.length === 0 ? null : (
          <dl className="mt-4 divide-y divide-rule/60">
            {rest.map((f) => (
              <div key={f.label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5">
                <dt className="label-micro pt-0.5 text-slate">{f.label}</dt>
                <dd className="text-sm leading-relaxed text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {protocol.regulatoryContext === null ? null : (
          <p className="mt-4 text-xs leading-relaxed text-slate">{protocol.regulatoryContext}</p>
        )}

        {citations.length === 0 ? null : (
          <details className="group mt-4 border-t border-rule/70 pt-3">
            <summary className="label-micro flex cursor-pointer list-none items-center gap-1.5 text-slate marker:content-none hover:text-deep-tide">
              <span aria-hidden="true" className="text-[0.6rem] leading-none transition-transform group-open:rotate-90">
                &#9656;
              </span>
              Source
            </summary>
            <ul className="mt-3 space-y-2">
              {citations.map((c) => (
                <li key={`${c.sourceKey}-${c.locatorText ?? ''}`} className="text-sm leading-relaxed">
                  <span className="text-ink">{c.sourceTitle}</span>
                  <span className="block text-slate">
                    {c.authors[0] ?? ''}
                    {c.year === null ? '' : ` · ${String(c.year)}`}
                    {c.locatorText === null ? '' : ` · ${c.locatorText}`}
                  </span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Comparison matrix
// ---------------------------------------------------------------------------

const COLUMNS = [
  { key: 'agree', title: 'Where they agree', accent: '#1f6b73', empty: 'Nothing: no part of a protocol is described the same way by every source of either kind.' },
  { key: 'differ', title: 'Where they differ', accent: '#4f46e5', empty: 'Nothing: every field that is stated is stated the same way.' },
  { key: 'unknown', title: 'What none of them settles', accent: '#5d6b72', empty: 'Every source states every part of its protocol.' },
] as const;

/**
 * The comparison, as a matrix rather than three lists of sentences.
 *
 * The derivation is untouched — every line is still counted off the records by
 * `compareProtocols`, still grouped so a trial is never compared with a
 * handbook, and an empty column still says so in words rather than rendering
 * blank.
 */
export function ComparisonMatrix({ comparison }: { readonly comparison: ProtocolComparison }) {
  const data: Record<string, readonly { key: string; group: string; groupLabel: string; text: string }[]> = {
    agree: comparison.agree,
    differ: comparison.differ,
    unknown: comparison.unknown,
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {COLUMNS.map((col) => {
        const points = data[col.key] ?? [];
        const groups = [...new Map(points.map((p) => [p.group, p.groupLabel])).entries()];
        return (
          <section
            key={col.key}
            className="relative overflow-hidden rounded-2xl border border-rule bg-warm-white"
          >
            <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: col.accent }} />
            <div className="border-b border-rule/70 px-5 pt-5 pb-4">
              <h3 className="font-serif text-lg text-ink">{col.title}</h3>
              <p className="numeric mt-1 text-xs text-slate">
                {points.length} {points.length === 1 ? 'line' : 'lines'}
              </p>
            </div>
            <div className="px-5 py-4">
              {points.length === 0 ? (
                <p className="text-sm leading-relaxed text-ink-soft">{col.empty}</p>
              ) : (
                groups.map(([group, groupLabel]) => (
                  <div key={group} className="mt-4 first:mt-0">
                    <p className="label-micro text-slate">{groupLabel}</p>
                    <ul className="mt-2 space-y-2">
                      {points
                        .filter((p) => p.group === group)
                        .map((p) => (
                          <li
                            key={p.key}
                            className="rounded-lg bg-mist/50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft"
                          >
                            {p.text}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

/** A numbered step, for the combination page's framework. */
export function NumberedStep({
  index,
  title,
  children,
  accent,
  emphasis = false,
}: {
  readonly index: number;
  readonly title: string;
  readonly children: ReactNode;
  readonly accent: string;
  readonly emphasis?: boolean;
}) {
  return (
    <div className={`relative h-full rounded-2xl p-6 md:p-7 ${emphasis ? 'glass-strong' : 'glass'}`}>
      <span
        className="numeric block font-serif text-5xl leading-none md:text-6xl"
        style={{ color: accent }}
      >
        {String(index).padStart(2, '0')}
      </span>
      <h3 className="mt-4 font-serif text-xl leading-snug text-on-deep">{title}</h3>
      <div className="mt-3 text-sm leading-relaxed text-on-deep-soft">{children}</div>
    </div>
  );
}
