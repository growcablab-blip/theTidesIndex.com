import Link from 'next/link';
import type { PractitionerProtocol } from '@/server/public/shapes';
import type { CombinationReport, StackMemberReading, StackPage } from '@/server/public/stacks';
import { Band, BandHeading, CompoundMark } from './visual-system';
import { NumberedStep, ProtocolDataCard } from './research-visuals';
import { protocolSourceName } from './compound-experience';

/**
 * The combination experience.
 *
 * Built around one distinction and organised so a reader cannot miss it:
 * evidence about each compound alone is not evidence about the two together.
 * The page states, on its first screen, how many sources report the pairing and
 * how much of that is a record of people rather than advice — and where that
 * number is small, it says so rather than filling the space.
 *
 * There is no combined regimen anywhere on this page and there will not be
 * one. Each source's report appears under that source's name, unaveraged.
 */

const ACCENTS = ['#22d3ee', '#2563eb', '#7c6ce0', '#1f6b73', '#4f46e5', '#5d8a99'];

// ---------------------------------------------------------------------------
// The hero visual
// ---------------------------------------------------------------------------

/** Wrap a compound name to at most two lines, so a long one still fits. */
function nameLines(name: string, max: number): string[] {
  if (name.length <= max) return [name];
  const words = name.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line === '') line = w;
    else if ((line + ' ' + w).length <= max) line = `${line} ${w}`;
    else {
      lines.push(line);
      line = w;
    }
    if (lines.length === 1 && line.length > max) break;
  }
  if (line !== '') lines.push(line);
  return lines.slice(0, 2);
}

function NodeLabel({
  x,
  y,
  name,
  max,
  size,
}: {
  readonly x: number;
  readonly y: number;
  readonly name: string;
  readonly max: number;
  readonly size: number;
}) {
  const lines = nameLines(name, max);
  const start = y - ((lines.length - 1) * size * 0.6) / 1;
  return (
    <text textAnchor="middle" fill="#eaf4f6" fontSize={size} fontWeight="500">
      {lines.map((l, i) => (
        <tspan key={l} x={x} y={start + i * (size * 1.25)}>
          {l}
        </tspan>
      ))}
    </text>
  );
}

/**
 * Two compounds and the space between them.
 *
 * The connector is dashed, deliberately: a solid line between two molecules
 * reads as a mechanism, and nothing held establishes one. Where the register
 * holds a name that denotes more than one member, those members are drawn
 * inside a dashed boundary that overlaps rather than merges — the ambiguity is
 * shown as an ambiguity, never resolved by the picture into a single thing.
 */
function CombinationField({
  left,
  right,
  ambiguousPair,
}: {
  readonly left: string;
  readonly right: readonly string[];
  readonly ambiguousPair: boolean;
}) {
  return (
    <svg
      role="img"
      aria-label={`Illustration: ${left} shown beside ${right.join(' and ')}, joined by a dashed line meaning reported together rather than shown to interact.`}
      viewBox="0 0 640 380"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="cf-a" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.36" />
          <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="cf-b" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c6ce0" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#7c6ce0" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="132" cy="190" r="140" fill="url(#cf-a)" className="anim-drift-slow" />
      <circle cx="486" cy="190" r="155" fill="url(#cf-b)" className="anim-drift" />

      {/* The join: dashed, because it is a report and not a mechanism. */}
      <line
        x1="196"
        y1="196"
        x2="336"
        y2="196"
        stroke="#a5f3fc"
        strokeOpacity="0.45"
        strokeWidth="1.5"
        strokeDasharray="5 7"
      />
      <text
        x="266"
        y="182"
        textAnchor="middle"
        fill="#a5f3fc"
        fillOpacity="0.72"
        fontSize="10.5"
        letterSpacing="1.8"
      >
        REPORTED TOGETHER
      </text>

      {/* Left compound */}
      <g>
        <circle cx="132" cy="196" r="78" fill="none" stroke="#22d3ee" strokeOpacity="0.32" strokeWidth="1" />
        <circle cx="132" cy="196" r="58" fill="#05161f" fillOpacity="0.5" />
        <NodeLabel x={132} y={200} name={left} max={12} size={14} />
      </g>

      {/* Right compound, or the pair the register cannot tell apart */}
      {right.length > 1 && ambiguousPair ? (
        <g>
          <ellipse
            cx="482"
            cy="192"
            rx="146"
            ry="104"
            fill="none"
            stroke="#7c6ce0"
            strokeOpacity="0.42"
            strokeWidth="1"
            strokeDasharray="6 6"
          />
          <circle cx="430" cy="158" r="58" fill="#05161f" fillOpacity="0.5" stroke="#7c6ce0" strokeOpacity="0.4" strokeWidth="1" />
          <circle cx="536" cy="228" r="58" fill="#05161f" fillOpacity="0.5" stroke="#7c6ce0" strokeOpacity="0.4" strokeWidth="1" />
          <NodeLabel x={430} y={160} name={right[0] ?? ''} max={13} size={12} />
          <NodeLabel x={536} y={230} name={right[1] ?? ''} max={13} size={12} />
          <text x="482" y="330" textAnchor="middle" fill="#a5f3fc" fillOpacity="0.72" fontSize="10.5" letterSpacing="1.5">
            NAMED INTERCHANGEABLY BY SOURCES
          </text>
        </g>
      ) : (
        <g>
          <circle cx="470" cy="196" r="78" fill="none" stroke="#7c6ce0" strokeOpacity="0.32" strokeWidth="1" />
          <circle cx="470" cy="196" r="58" fill="#05161f" fillOpacity="0.5" />
          <NodeLabel x={470} y={200} name={right[0] ?? ''} max={13} size={13} />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function MemberCard({
  member,
  simple,
  accent,
}: {
  readonly member: StackMemberReading;
  readonly simple: boolean;
  readonly accent: string;
}) {
  const human = member.page.claims.filter((c) =>
    c.evidence.some((e) => e.evidenceClass === 'human'),
  ).length;
  const protocols = member.page.protocols.length;
  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-2xl border border-rule bg-warm-white">
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: accent }} />
      <div className="flex items-start justify-between gap-4 p-6 pb-4">
        <Link href={`/peptides/${member.slug}`} className="group">
          <h3 className="max-w-[18ch] font-serif text-xl leading-snug text-deep-tide group-hover:text-scientific-teal">
            {member.name}
          </h3>
        </Link>
        <span className="shrink-0" style={{ color: accent }}>
          <CompoundMark slug={member.slug} size={48} />
        </span>
      </div>
      {member.shortDescription === null ? null : (
        <p className="grow px-6 text-sm leading-relaxed text-ink-soft">{member.shortDescription}</p>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-px border-t border-rule bg-rule">
        <div className="bg-warm-white px-5 py-4">
          <dt className="label-micro text-slate">Human-evidence findings</dt>
          <dd className="numeric mt-1.5 font-serif text-3xl leading-none text-deep-tide">{human}</dd>
        </div>
        {/* Simple reading holds no regimen, so a count of them would read as
            "none exist" rather than "none is shown here". */}
        <div className="bg-warm-white px-5 py-4">
          <dt className="label-micro text-slate">
            {simple ? 'Full research' : 'Reported protocols'}
          </dt>
          <dd className="mt-1.5">
            {simple ? (
              <Link
                href={`/peptides/${member.slug}`}
                className="text-sm text-scientific-teal underline decoration-rule underline-offset-4"
              >
                Open
              </Link>
            ) : (
              <span className="numeric font-serif text-3xl leading-none text-deep-tide">
                {protocols}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </article>
  );
}

function CombinationReportCard({
  report,
  accent,
}: {
  readonly report: CombinationReport;
  readonly accent: string;
}) {
  return (
    <article className="relative overflow-hidden rounded-2xl border border-rule bg-warm-white">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} />
      <div className="border-b border-rule/70 bg-mist/40 py-4 pr-5 pl-7">
        <p className="label-micro text-slate">{report.evidenceTypeLabel}</p>
        <h3 className="mt-1 font-serif text-xl leading-snug text-ink">{report.sourceName}</h3>
        <p className="mt-1.5 text-sm text-slate">
          Reported for {report.memberName}
          {report.partnerNames.length === 0 ? null : ` · with ${report.partnerNames.join(' and ')}`}
        </p>
      </div>
      <div className="py-5 pr-5 pl-7">
        <p className="text-sm leading-relaxed text-ink-soft">{report.objectiveContext}</p>
        {report.combinationsText === null ? null : (
          <blockquote className="mt-4 border-l-2 border-scientific-teal/50 pl-4 text-sm leading-relaxed text-ink">
            {report.combinationsText}
          </blockquote>
        )}
        {report.ambiguousNames.map((a) => (
          <p
            key={a.term}
            className="mt-4 rounded-lg border border-amber-300/70 bg-amber-50/70 px-4 py-3.5 text-sm leading-relaxed text-ink-soft"
          >
            <span className="label-micro mb-1.5 block text-amber-700">Which compound is unclear</span>
            This source says <strong className="font-medium text-ink">{a.term}</strong>, a name used
            for {a.candidates.join(' and ')} alike. Which one was used cannot be determined from the
            report, and Tides does not choose for it.
          </p>
        ))}
        {report.citations.length === 0 ? null : (
          <details className="group mt-4 border-t border-rule/70 pt-3">
            <summary className="label-micro flex cursor-pointer list-none items-center gap-1.5 text-slate marker:content-none hover:text-deep-tide">
              <span aria-hidden="true" className="text-[0.6rem] leading-none transition-transform group-open:rotate-90">
                &#9656;
              </span>
              Source
            </summary>
            <ul className="mt-3 space-y-2">
              {report.citations.map((c) => (
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
// The page
// ---------------------------------------------------------------------------

export function StackExperience({
  stack,
  simple,
}: {
  readonly stack: StackPage;
  readonly simple: boolean;
}) {
  const reports = stack.combination;
  const humanReports = stack.combinationHuman;
  const sourceCount = new Set(reports.flatMap((r) => r.citations.map((c) => c.sourceKey))).size;
  const ambiguousReports = reports.filter((r) => r.ambiguousNames.length > 0);
  const humanResolved = humanReports.filter((r) => r.partnerNames.length > 0);

  const [first, ...others] = stack.members;
  const ambiguousTerms = [
    ...new Set(ambiguousReports.flatMap((r) => r.ambiguousNames.map((a) => a.term))),
  ];

  const byMember = stack.members.map((m) => ({ member: m, protocols: m.page.protocols }));

  return (
    <>
      {/* ── 1 · Hero ─────────────────────────────────────────────────── */}
      <Band tone="deep" grid className="pt-10 pb-14 md:pt-14 md:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            <p className="label-micro text-cyan">Research combination</p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] tracking-[-0.02em] text-on-deep md:text-7xl">
              {stack.title}
            </h1>
            <p className="mt-4 font-serif text-2xl leading-snug text-cyan-soft/90 md:text-3xl">
              {stack.subtitle}
            </p>
            <p className="mt-7 max-w-[56ch] text-lg leading-relaxed text-on-deep-soft">
              {reports.length === 0
                ? 'No source Tides holds reports these compounds being used together.'
                : `BPC-157 and TB-500 are discussed together across practitioner and research sources. Tides tracks what research shows for each compound separately, which sources report combining them, and how much evidence exists for the combination itself.`}
            </p>

            {/* The naming problem is prominent but secondary: visible on the
                first screen, and deliberately not inside the headline. */}
            {ambiguousTerms.length === 0 ? null : (
              <div className="mt-7 max-w-[56ch] rounded-xl border border-amber-300/30 bg-amber-100/[0.06] px-5 py-4">
                <p className="label-micro text-amber-200/90">A note on TB-500</p>
                <p className="mt-2 text-sm leading-relaxed text-on-deep-soft">
                  Sources do not always distinguish TB-500 from thymosin beta-4 consistently. Tides
                  preserves that uncertainty rather than assuming the terms are interchangeable, so
                  both compounds appear here and reports that do not identify which was used say so.
                </p>
              </div>
            )}

            {reports.length === 0 ? null : (
              <dl className="mt-8 grid max-w-[38rem] grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[
                  { value: String(sourceCount), label: 'Sources' },
                  { value: String(reports.length), label: 'Combination reports' },
                  {
                    value: humanReports.length === 0 ? 'None' : 'Limited',
                    label: 'Direct human evidence',
                  },
                ].map((r) => (
                  <div key={r.label} className="glass px-4 py-3.5">
                    <dt className="label-micro text-on-deep-faint">{r.label}</dt>
                    <dd className="numeric mt-1.5 font-serif text-2xl leading-none text-on-deep">
                      {r.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="relative -mx-5 h-[17rem] sm:h-[20rem] md:mx-0 lg:h-[24rem]">
            <CombinationField
              left={first?.name ?? ''}
              right={others.map((m) => m.name)}
              ambiguousPair={ambiguousTerms.length > 0}
            />
          </div>
        </div>
      </Band>

      {/* ── 2 · The three questions ──────────────────────────────────── */}
      <Band id="how-to-read" tone="deep" className="border-t border-cyan-soft/10 py-16 md:py-24">
        <BandHeading
          tone="deep"
          eyebrow="How to read this"
          title="Understanding the evidence"
          lede="Research around this combination falls into three layers. Looking at them separately makes it easier to see what is known — and where the evidence is still thin."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <NumberedStep index={1} title="Each compound" accent="#22d3ee">
            What research tells us about {stack.members.map((m) => m.name).join(', ')}{' '}
            individually. Summarised below, with the full record for each one linked.
          </NumberedStep>
          <NumberedStep index={2} title="Used together" accent="#2563eb">
            What practitioners and other sources report when the compounds are combined — each
            report under the name of the source that published it.
          </NumberedStep>
          <NumberedStep index={3} title="The combination itself" accent="#7c6ce0" emphasis>
            {humanReports.length === 0
              ? 'What has actually been studied about using them together. Nothing so far — no study Tides holds compares the combination against either compound alone.'
              : humanResolved.length === 0
                ? `What has actually been studied about using them together. ${String(humanReports.length)} report${
                    humanReports.length === 1 ? '' : 's'
                  } involve${humanReports.length === 1 ? 's' : ''} human use with a second compound, named in a way that does not identify which one. No study compares the combination against either compound alone.`
                : `What has actually been studied about using them together. ${String(humanResolved.length)} report${
                    humanResolved.length === 1 ? '' : 's'
                  } involve${humanResolved.length === 1 ? 's' : ''} human use of both. No study compares the combination against either compound alone.`}
          </NumberedStep>
        </div>
      </Band>

      {/* ── 3 · The compounds individually ───────────────────────────── */}
      <Band id="members" tone="light" className="py-16 md:py-24">
        <BandHeading
          eyebrow="Each compound"
          title="What research shows for each one"
          lede="Each compound has its own body of research, unchanged by appearing on a combination page."
        />
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {stack.members.map((m, i) => (
            <MemberCard
              key={m.slug}
              member={m}
              simple={simple}
              accent={ACCENTS[i % ACCENTS.length] ?? '#22d3ee'}
            />
          ))}
        </div>
      </Band>

      {/* ── 4 · The combination reports ──────────────────────────────── */}
      <Band id="combination" tone="ivory" className="py-16 md:py-24">
        <BandHeading
          eyebrow="Used together"
          title="Sources that report combining them"
          lede="Each card is one source describing its own approach. That several sources describe the same pairing tells you what is commonly done — not that it works."
        />
        {reports.length === 0 ? (
          <p className="mt-10 text-ink-soft">No source reports combining these compounds.</p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {reports.map((r, i) => (
              <CombinationReportCard
                key={r.protocolId}
                report={r}
                accent={ACCENTS[i % ACCENTS.length] ?? '#22d3ee'}
              />
            ))}
          </div>
        )}
      </Band>

      {/* ── 5 · What none of this establishes ────────────────────────── */}
      <Band id="unsettled" tone="soft" className="py-16 md:py-24">
        <BandHeading
          eyebrow="Open questions"
          title="What remains uncertain"
          lede="The questions this research does not answer."
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            'Whether using these together does more than using either alone. No study compares them.',
            'Whether the combination is safer, or less safe, than either compound by itself.',
            'Whether these sources arrived at the pairing independently, or from one another.',
            humanReports.length === 0
              ? 'What happens to people given both, in any setting. No source describes it.'
              : 'What the combination itself contributed where people received both — those reports were not designed to separate it.',
            ...(ambiguousTerms.length === 0
              ? []
              : [
                  `Which compound was actually used, where a source says ${ambiguousTerms.join(' or ')}. Sources use that name for more than one of these compounds, and the reports do not settle which was meant.`,
                ]),
          ].map((line) => (
            <li
              key={line}
              className="rounded-2xl border border-rule bg-warm-white px-6 py-5 text-sm leading-relaxed text-ink-soft"
            >
              {line}
            </li>
          ))}
        </ul>
      </Band>

      {/* ── 6 · Single-compound regimens ─────────────────────────────── */}
      {simple ? null : (
        <Band id="regimens" tone="light" className="py-16 md:py-24">
          <BandHeading
            eyebrow="Reported protocols"
            title="Protocols for each compound on its own"
            lede="These are single-compound protocols. No source states a combined amount, and Tides does not assemble one."
          />
          <div className="mt-10 grid gap-14">
            {byMember
              .filter((m) => m.protocols.length > 0)
              .map(({ member, protocols }) => (
                <section key={member.slug}>
                  <h3 className="font-serif text-2xl text-deep-tide">{member.name}</h3>
                  <div className="mt-5 grid gap-6 lg:grid-cols-2">
                    {protocols.map((protocol, i) => (
                      <ProtocolDataCard
                        key={protocol.id}
                        sourceName={protocolSourceName(protocol)}
                        protocol={protocol as PractitionerProtocol}
                        simple={simple}
                        accent={ACCENTS[i % ACCENTS.length] ?? '#22d3ee'}
                        citations={protocol.sources}
                      />
                    ))}
                  </div>
                </section>
              ))}
          </div>
        </Band>
      )}

      {/* ── 7 · Onward ───────────────────────────────────────────────── */}
      <Band id="records" tone="deep" className="py-16 md:py-24">
        <BandHeading tone="deep" eyebrow="Go deeper" title="Read the full research for each" />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {stack.members.map((m, i) => (
            <Link
              key={m.slug}
              href={`/peptides/${m.slug}`}
              className="glass group flex items-center gap-4 px-5 py-5 transition-colors hover:border-cyan-soft/40"
            >
              <span style={{ color: ACCENTS[i % ACCENTS.length] }}>
                <CompoundMark slug={m.slug} size={40} />
              </span>
              <span>
                <span className="block font-serif text-lg text-on-deep group-hover:text-cyan">
                  {m.name}
                </span>
                <span className="block text-sm text-on-deep-faint">
                  Research, sources and regulatory status
                </span>
              </span>
            </Link>
          ))}
        </div>
        <p className="mt-8 max-w-[72ch] text-sm leading-relaxed text-on-deep-faint">
          These compounds appear together because sources report using them together, not because
          Tides endorses the pairing. Each has its own uncertainties, set out on its own page.
        </p>
      </Band>
    </>
  );
}
