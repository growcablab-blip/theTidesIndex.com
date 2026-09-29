import type { ReactNode } from 'react';
import type { Citation, PractitionerProtocol, SimpleProtocol } from '@/server/public/shapes';
import type { PeptidePage } from '@/server/public/queries';

/**
 * The research-first reading surface.
 *
 * The evidence architecture underneath is unchanged — same views, same claims,
 * same provenance, same mode boundary. What changes is the order a reader meets
 * it in. The record page put review state, nomenclature and evidence machinery
 * first, which is the order the *system* cares about; a reader arrives wanting
 * to know what the compound is, what it is being studied for, and what people
 * report doing with it. The citations stay, every one of them, and move behind
 * a marker that opens.
 *
 * Nothing here invents content. Every component takes records that already
 * exist and renders them differently; where a record has no data for a field,
 * the field is absent rather than filled.
 */

// ---------------------------------------------------------------------------
// Shared atoms
// ---------------------------------------------------------------------------

/** A section that breathes: generous rhythm, one idea, no border box. */
export function Movement({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  readonly id?: string;
  readonly eyebrow?: string;
  readonly title: string;
  readonly lede?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 py-12 md:py-16">
      {eyebrow === undefined ? null : (
        <p className="text-xs font-medium tracking-[0.14em] text-scientific-teal uppercase">
          {eyebrow}
        </p>
      )}
      <h2 className="mt-2 font-serif text-2xl leading-tight text-ink md:text-3xl">{title}</h2>
      {lede === undefined ? null : (
        <p className="mt-3 max-w-[62ch] text-ink-soft md:text-lg">{lede}</p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

/**
 * The citation marker.
 *
 * One small, quiet control per passage rather than a card per claim. Closed it
 * says how many sources stand behind what was just read; open it gives each one
 * with its exact locator, which is the promise the whole index rests on.
 */
export function SourceDrawer({
  label,
  citations,
  children,
}: {
  readonly label?: string;
  readonly citations: readonly Citation[];
  readonly children?: ReactNode;
}) {
  if (citations.length === 0) return null;
  const heading = label ?? `Sources for this section (${String(citations.length)})`;
  return (
    <details className="group mt-5 border-t border-rule/70 pt-3">
      <summary className="cursor-pointer list-none text-sm text-scientific-teal marker:content-none hover:text-deep-tide">
        <span className="underline decoration-rule underline-offset-4 group-open:no-underline">
          {heading}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        {children}
        <ul className="space-y-3">
          {citations.map((c) => (
            <li key={`${c.sourceKey}-${c.locatorText ?? ''}`} className="text-sm leading-relaxed">
              <span className="font-medium text-ink">{c.sourceTitle}</span>
              <span className="text-slate">
                {c.authors.length > 0 ? ` · ${c.authors[0]!}` : ''}
                {c.year === null ? '' : ` · ${String(c.year)}`}
              </span>
              <span className="block text-slate">
                {c.sourceTypeLabel}
                {c.locatorText === null ? '' : ` · ${c.locatorText}`}
                {c.printedPage === null ? '' : ` · p. ${String(c.printedPage)}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

/** A research-interest chip. Only ever rendered from a category a record holds. */
export function Chip({ children }: { readonly children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-scientific-teal/30 bg-scientific-teal/[0.07] px-3 py-1 text-sm text-deep-tide">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

/**
 * The opening.
 *
 * Name, a sentence a non-specialist can hold, the research areas the record
 * actually carries, and four numbers that say how much is behind the page. The
 * visual is drawn, not photographed: a peptide chain over a field of depth,
 * built from the brand tokens rather than stock imagery.
 */
export function CompoundHero({
  peptide,
  interests,
  sourceCount,
  protocolCount,
  showProtocolCount,
  routeNames,
}: {
  readonly peptide: PeptidePage;
  readonly interests: readonly string[];
  readonly sourceCount: number;
  readonly protocolCount: number;
  /**
   * Whether to show it. Simple reading holds no regimen, so the figure there
   * is always nought — which reads as "none has ever been recorded" rather
   * than "none is shown in this view".
   */
  readonly showProtocolCount: boolean;
  readonly routeNames: readonly string[];
}) {
  return (
    <header className="relative overflow-hidden rounded-2xl bg-deep-tide text-warm-white">
      <ChainField />
      <div className="relative px-6 py-12 md:px-12 md:py-16">
        <p className="text-xs font-medium tracking-[0.16em] text-cyan-200/80 uppercase">
          {peptide.compoundTypeLabel ?? 'Compound'}
          {peptide.categoryLabel === null ? '' : ` · ${peptide.categoryLabel}`}
        </p>
        <h1 className="mt-3 font-serif text-4xl leading-[1.05] md:text-6xl">
          {peptide.canonicalName}
        </h1>
        {peptide.shortDescription === null ? null : (
          <p className="mt-5 max-w-[54ch] text-lg leading-relaxed text-warm-white/85 md:text-xl">
            {peptide.shortDescription}
          </p>
        )}

        {interests.length === 0 ? null : (
          <ul className="mt-7 flex flex-wrap gap-2">
            {interests.map((i) => (
              <li
                key={i}
                className="rounded-full border border-cyan-200/25 bg-white/[0.06] px-3 py-1 text-sm text-cyan-50"
              >
                {i}
              </li>
            ))}
          </ul>
        )}

        <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-white/15 pt-8 sm:grid-cols-4">
          <HeroStat value={String(sourceCount)} label={sourceCount === 1 ? 'source' : 'sources'} />
          {showProtocolCount ? (
            <HeroStat
              value={String(protocolCount)}
              label={protocolCount === 1 ? 'reported protocol' : 'reported protocols'}
            />
          ) : null}
          <HeroStat
            value={String(routeNames.length)}
            label={routeNames.length === 1 ? 'route reported' : 'routes reported'}
            detail={routeNames.join(', ')}
          />
          <HeroStat
            value={peptide.lastReviewedAt === null ? 'Not yet' : 'Recorded'}
            label="human review"
            detail={peptide.lastReviewedAt === null ? 'Source-linked, unreviewed' : undefined}
          />
        </dl>
      </div>
    </header>
  );
}

function HeroStat({
  value,
  label,
  detail,
}: {
  readonly value: string;
  readonly label: string;
  readonly detail?: string | undefined;
}) {
  return (
    <div>
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="block font-serif text-3xl leading-none text-warm-white">{value}</span>
        <span className="mt-1.5 block text-xs tracking-wide text-cyan-100/70 uppercase">
          {label}
        </span>
        {detail === undefined ? null : (
          <span className="mt-1 block text-xs text-warm-white/55">{detail}</span>
        )}
      </dd>
    </div>
  );
}

/**
 * The hero field: a peptide backbone, drawn as one.
 *
 * Deliberately angular. An earlier version used smooth sine curves, which on a
 * site called The Tides Index read as waves — the one association this brand
 * must not have. A backbone is a zig-zag of tetrahedral bonds with a residue at
 * every second vertex, so that is what is drawn, and it is kept to the right of
 * the panel so no line crosses the text.
 */
function ChainField() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 60"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="tide-hero-glow" cx="80%" cy="26%" r="64%">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#2563eb" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#123f4a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="tide-hero-chain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#5eead4" stopOpacity="0.06" />
          <stop offset="45%" stopColor="#67e8f9" stopOpacity="0.50" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <rect width="100" height="60" fill="url(#tide-hero-glow)" />
      <g transform="translate(0 6)">
      <line x1="52.0" y1="26.0" x2="52.0" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="62.4" y1="26.0" x2="62.4" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="72.8" y1="26.0" x2="72.8" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="83.2" y1="26.0" x2="83.2" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="93.6" y1="26.0" x2="93.6" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="104.0" y1="26.0" x2="104.0" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
      <line x1="114.4" y1="26.0" x2="114.4" y2="22.6" stroke="#67e8f9" strokeWidth="0.18" opacity="0.28" />
        <polyline
          points="52.0,26.0 54.6,23.8 57.2,26.0 59.8,23.8 62.4,26.0 65.0,23.8 67.6,26.0 70.2,23.8 72.8,26.0 75.4,23.8 78.0,26.0 80.6,23.8 83.2,26.0 85.8,23.8 88.4,26.0 91.0,23.8 93.6,26.0 96.2,23.8 98.8,26.0 101.4,23.8 104.0,26.0 106.6,23.8 109.2,26.0 111.8,23.8 114.4,26.0 117.0,23.8"
          fill="none"
          stroke="url(#tide-hero-chain)"
          strokeWidth="0.55"
          strokeLinejoin="miter"
        />
      <circle cx="52.0" cy="26.0" r="0.85" fill="#a5f3fc" opacity="0.3" />
      <circle cx="57.2" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.37" />
      <circle cx="62.4" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.44" />
      <circle cx="67.6" cy="26.0" r="0.85" fill="#a5f3fc" opacity="0.51" />
      <circle cx="72.8" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.3" />
      <circle cx="78.0" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.37" />
      <circle cx="83.2" cy="26.0" r="0.85" fill="#a5f3fc" opacity="0.44" />
      <circle cx="88.4" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.51" />
      <circle cx="93.6" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.3" />
      <circle cx="98.8" cy="26.0" r="0.85" fill="#a5f3fc" opacity="0.37" />
      <circle cx="104.0" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.44" />
      <circle cx="109.2" cy="26.0" r="0.55" fill="#a5f3fc" opacity="0.51" />
      <circle cx="114.4" cy="26.0" r="0.85" fill="#a5f3fc" opacity="0.3" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Evidence landscape
// ---------------------------------------------------------------------------

export interface EvidenceLane {
  readonly key: 'human' | 'preclinical' | 'reference_opinion';
  readonly label: string;
  readonly meaning: string;
  readonly sources: number;
  readonly claims: number;
}

/**
 * The evidence in one look.
 *
 * Distinct source counts per lane, and a sentence saying what the lane means,
 * because "3 sources" tells a reader nothing unless they know that human and
 * practitioner are different kinds of thing. Bars are proportional to the
 * largest lane — a shape, not a score. There is no grade here and there will
 * not be one.
 */
export function EvidenceLandscape({ lanes }: { readonly lanes: readonly EvidenceLane[] }) {
  const peak = Math.max(1, ...lanes.map((l) => l.sources));
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {lanes.map((lane) => (
        <div key={lane.key} className="rounded-xl border border-rule/70 bg-warm-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-sm font-medium text-ink">{lane.label}</span>
            <span className="font-serif text-2xl leading-none text-deep-tide">
              {String(lane.sources)}
            </span>
          </div>
          <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-mist">
            <div
              className={
                lane.key === 'human'
                  ? 'h-full rounded-full bg-deep-tide'
                  : lane.key === 'preclinical'
                    ? 'h-full rounded-full bg-scientific-teal'
                    : 'h-full rounded-full bg-slate/60'
              }
              style={{ width: `${String(Math.round((lane.sources / peak) * 100))}%` }}
            />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{lane.meaning}</p>
          <p className="mt-2 text-xs text-slate">
            {String(lane.claims)} {lane.claims === 1 ? 'statement' : 'statements'} on this record
          </p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reported protocols
// ---------------------------------------------------------------------------

/** One field of a reported regimen. Absent fields are not rendered at all. */
function ProtocolField({ label, value }: { readonly label: string; readonly value: string | null }) {
  if (value === null || value.trim() === '') return null;
  return (
    <div className="border-t border-rule/60 py-2.5 first:border-t-0">
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-ink">{value}</dd>
    </div>
  );
}

/**
 * A source-reported regimen, attributed in the card's own heading.
 *
 * The source is the title, not a footnote, because the whole point is that this
 * is *their* regimen and not the index's. There is no Tides dose and this card
 * is the reason: put two of them side by side and the question "which is right"
 * belongs to the reader, with both sources named.
 */
export function ReportedProtocolCard({
  sourceName,
  contextLabel,
  protocol,
  simple,
}: {
  readonly sourceName: string;
  readonly contextLabel: string;
  readonly protocol: SimpleProtocol | PractitionerProtocol;
  readonly simple: boolean;
}) {
  const detailed = 'amountReported' in protocol ? protocol : null;
  return (
    <article className="rounded-xl border border-rule/70 bg-warm-white p-5 md:p-6">
      <header>
        <p className="text-xs font-medium tracking-[0.12em] text-scientific-teal uppercase">
          {contextLabel}
        </p>
        <h3 className="mt-1.5 font-serif text-xl text-ink">{sourceName}</h3>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{protocol.objectiveContext}</p>
      </header>

      {simple || detailed === null ? (
        <p className="mt-5 rounded-lg bg-mist/60 p-4 text-sm leading-relaxed text-ink-soft">
          Amounts, frequency and duration are part of this record and are shown in the practitioner
          view. They are what this source reports doing, not a recommendation.
        </p>
      ) : (
        <dl className="mt-5">
          <ProtocolField label="Route" value={protocol.routeName} />
          <ProtocolField
            label="Reported amount"
            value={
              detailed.amountReported === null
                ? null
                : detailed.amountUnit === null
                  ? detailed.amountReported
                  : // The unit lives in its own column; a figure without it is
                    // the one kind of dose error that reads as authoritative.
                    /[a-z]/i.test(detailed.amountReported)
                    ? detailed.amountReported
                    : `${detailed.amountReported} ${detailed.amountUnit}`
            }
          />
          <ProtocolField label="Frequency" value={detailed.frequencyText} />
          <ProtocolField label="Timing" value={detailed.timingText} />
          <ProtocolField label="Duration" value={detailed.durationText} />
          <ProtocolField label="Cycle" value={detailed.cycleText} />
          <ProtocolField label="Titration" value={detailed.titrationText} />
          <ProtocolField label="Monitoring" value={detailed.monitoringText} />
          <ProtocolField label="Reported alongside" value={detailed.combinationsText} />
          <ProtocolField label="Population" value={protocol.populationModel} />
        </dl>
      )}

      <p className="mt-5 border-t border-rule/60 pt-3 text-xs leading-relaxed text-slate">
        {protocol.regulatoryContext ?? 'Context not recorded.'}
      </p>
      <SourceDrawer label="Where this comes from" citations={protocol.sources} />
    </article>
  );
}

// ---------------------------------------------------------------------------
// Agreement and difference
// ---------------------------------------------------------------------------

export interface ReadingPoint {
  readonly key: string;
  readonly group: string;
  readonly groupLabel: string;
  readonly text: string;
}

export interface SourceReading {
  readonly heading: string;
  readonly points: readonly ReadingPoint[];
  /** What the column says when it holds nothing. Never left blank. */
  readonly emptyText: string;
}

/**
 * Where the sources agree, where they differ, and what none of them settles.
 *
 * The third column is the one that makes this honest. Two practitioners
 * agreeing is not evidence that either is right, and a comparison that only
 * showed agreement and difference would imply that between them they had
 * covered the question.
 */
/** Points in the order their groups first appear, so the columns line up. */
function groupsOf(
  points: readonly ReadingPoint[],
): { label: string; points: ReadingPoint[] }[] {
  const byGroup = new Map<string, { label: string; points: ReadingPoint[] }>();
  for (const point of points) {
    const entry = byGroup.get(point.group) ?? { label: point.groupLabel, points: [] };
    entry.points.push(point);
    byGroup.set(point.group, entry);
  }
  return [...byGroup.values()];
}

export function AgreementDifference({
  agree,
  differ,
  unknown,
}: {
  readonly agree: SourceReading;
  readonly differ: SourceReading;
  readonly unknown: SourceReading;
}) {
  const columns: readonly (SourceReading & { tone: string })[] = [
    { ...agree, tone: 'border-scientific-teal/40 bg-scientific-teal/[0.05]' },
    { ...differ, tone: 'border-indigo-400/40 bg-indigo-50/60' },
    { ...unknown, tone: 'border-rule bg-mist/50' },
  ];
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {columns.map((c) => (
        <div key={c.heading} className={`rounded-xl border p-5 ${c.tone}`}>
          <h3 className="font-serif text-lg text-ink">{c.heading}</h3>
          {c.points.length === 0 ? (
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">{c.emptyText}</p>
          ) : (
            groupsOf(c.points).map((g) => (
              <div key={g.label} className="mt-4 first:mt-3">
                <p className="text-xs tracking-[0.1em] text-slate uppercase">{g.label}</p>
                <ul className="mt-2 space-y-2.5">
                  {g.points.map((p) => (
                    <li key={p.key} className="text-sm leading-relaxed text-ink-soft">
                      {p.text}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stack diagram
// ---------------------------------------------------------------------------

export interface StackMember {
  readonly name: string;
  readonly href: string;
  readonly role: string;
  readonly pathways: readonly string[];
}

/**
 * Two compounds, what each is reported to contribute, and the join.
 *
 * The join is the careful part. Drawing an arrow from two mechanisms into one
 * outcome would assert that the combination works, which nothing held
 * establishes; the label under the join says what is actually known about the
 * pair, and the caller passes it.
 */
export function StackDiagram({
  members,
  rationale,
  evidenceNote,
}: {
  readonly members: readonly [StackMember, StackMember];
  readonly rationale: string;
  readonly evidenceNote: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-rule/70 bg-warm-white">
      <div className="grid gap-px bg-rule/60 md:grid-cols-2">
        {members.map((m, index) => (
          <div key={m.name} className="bg-warm-white p-6">
            <p className="text-xs tracking-[0.12em] text-slate uppercase">
              Compound {index === 0 ? 'A' : 'B'}
            </p>
            <h3 className="mt-1.5 font-serif text-xl text-deep-tide">{m.name}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{m.role}</p>
            <ul className="mt-4 space-y-2">
              {m.pathways.map((p) => (
                <li key={p} className="flex gap-2.5 text-sm text-ink-soft">
                  <span aria-hidden="true" className="mt-[0.45rem] h-1 w-3 shrink-0 rounded-full bg-scientific-teal/70" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-rule/70 bg-mist/40 p-6">
        <p className="text-xs tracking-[0.12em] text-slate uppercase">Why they are combined</p>
        <p className="mt-2 max-w-[70ch] text-sm leading-relaxed text-ink">{rationale}</p>
        <p className="mt-3 max-w-[70ch] border-t border-rule/60 pt-3 text-sm leading-relaxed text-ink-soft">
          {evidenceNote}
        </p>
      </div>
    </div>
  );
}
