import Link from 'next/link';
import { setReadingModeAction } from '@/app/(public)/actions';
import type { ReadingMode } from '@/domain/presentation/reading-mode';
import type { PeptidePage, PublicClaim } from '@/server/public/queries';
import type { Citation, PractitionerProtocol, SimpleProtocol } from '@/server/public/shapes';
import { pathwayHasHumanEvidence, resolvePathway } from '@/domain/presentation/mechanism-pathway';
import { rankProse } from '@/domain/presentation/prose';

/**
 * A compound's published record, in the showcase's own register.
 *
 * This is the research engine rendered in the public site's visual language
 * rather than the reference application's. Nothing about the data changed on
 * the way here: the page is built from `getPeptidePage`, the same gated reader
 * every other public surface uses, and every number is counted from the record
 * it is drawn on.
 *
 * The styling is entirely `sx-*` and `--sx-*` — the classes the home page
 * already uses. No new design system, no competing tokens, and no change to
 * anything the showcase renders today.
 */

const ACCENTS = ['#22d3ee', '#3b82f6', '#6366f1', '#8b7cf6'] as const;

const LANE_LABEL: Readonly<Record<string, string>> = {
  human: 'Human',
  preclinical: 'Preclinical',
  reference_opinion: 'Practitioner',
};

// ---------------------------------------------------------------------------
// Pieces
// ---------------------------------------------------------------------------

function Readout({ value, label, detail }: { value: string; label: string; detail?: string | undefined }) {
  return (
    <div className="flex flex-col border-t border-[rgb(165_243_252/0.16)] pt-5">
      <dt className="order-2 mt-2.5 text-sm font-medium text-[var(--sx-soft)]">{label}</dt>
      <dd className="order-1">
        <span className="sx-stat-value block text-[var(--sx-text)]">{value}</span>
      </dd>
      {detail === undefined ? null : (
        <dd className="order-3 mt-1 text-xs text-[var(--sx-faint)]">{detail}</dd>
      )}
    </div>
  );
}

/** The reading-depth control, in the showcase register. Same action, same cookie. */
function ReadingDepth({ mode, path }: { mode: ReadingMode; path: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="sx-mono text-[0.6875rem] tracking-[0.14em] text-[var(--sx-faint)] uppercase">
        Reading depth
      </span>
      <div className="inline-flex rounded-full border border-[var(--sx-line-strong)] p-1">
        {(['simple', 'practitioner'] as const).map((m) => (
          <form key={m} action={setReadingModeAction}>
            <input type="hidden" name="mode" value={m} />
            <input type="hidden" name="path" value={path} />
            <button
              type="submit"
              aria-current={mode === m ? 'true' : undefined}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                mode === m
                  ? 'bg-[var(--sx-cyan)]/15 text-[var(--sx-text)]'
                  : 'text-[var(--sx-faint)] hover:text-[var(--sx-soft)]'
              }`}
            >
              {m === 'simple' ? 'Simple' : 'Practitioner'}
            </button>
          </form>
        ))}
      </div>
      <span className="text-xs text-[var(--sx-faint)]">
        {mode === 'simple'
          ? 'Plain language, no amounts.'
          : 'Full evidence and source-reported amounts.'}
      </span>
    </div>
  );
}

/** Citations, behind a quiet marker. Provenance is never removed, only folded. */
function Sources({ citations, label }: { citations: readonly Citation[]; label?: string }) {
  if (citations.length === 0) return null;
  return (
    <details className="group mt-6 border-t border-[var(--sx-line)] pt-4">
      <summary className="sx-mono flex cursor-pointer list-none items-center gap-2 text-[0.6875rem] tracking-[0.14em] text-[var(--sx-faint)] uppercase marker:content-none hover:text-[var(--sx-soft)]">
        <span aria-hidden="true" className="text-[0.6rem] transition-transform group-open:rotate-90">
          &#9656;
        </span>
        {label ?? `Sources (${String(citations.length)})`}
      </summary>
      <ul className="mt-4 space-y-3">
        {citations.map((c) => (
          <li key={`${c.sourceKey}-${c.locatorText ?? ''}`} className="text-sm leading-relaxed">
            <span className="text-[var(--sx-text)]">{c.sourceTitle}</span>
            <span className="mt-0.5 block text-[var(--sx-faint)]">
              {c.authors[0] ?? ''}
              {c.year === null ? '' : ` · ${String(c.year)}`}
              {' · '}
              {c.sourceTypeLabel}
              {c.locatorText === null ? '' : ` · ${c.locatorText}`}
              {c.printedPage === null ? '' : ` · p. ${String(c.printedPage)}`}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function ClaimBlock({ claim, simple }: { claim: PublicClaim; simple: boolean }) {
  const body =
    simple && claim.plainLanguageText !== null ? claim.plainLanguageText : claim.claimText;
  const { lead, rest } = rankProse(body);
  const lanes = [...new Set(claim.evidence.map((e) => e.evidenceClass))];
  return (
    <div className="max-w-[68ch]">
      <p className="sx-mono flex flex-wrap items-center gap-x-3 text-[0.6875rem] tracking-[0.14em] text-[var(--sx-faint)] uppercase">
        {lanes.map((l) => (
          <span key={l}>{LANE_LABEL[l] ?? l}</span>
        ))}
        {claim.evidence.length > 0 ? (
          <span className="tracking-normal normal-case">
            {claim.evidence.length} {claim.evidence.length === 1 ? 'citation' : 'citations'}
          </span>
        ) : null}
      </p>
      <p className="mt-2.5 text-lg leading-relaxed text-[var(--sx-text)]">{lead}</p>
      {rest.map((p, i) => (
        <p key={i} className="mt-3 leading-relaxed text-[var(--sx-soft)]">
          {p}
        </p>
      ))}
      {claim.uncertaintyText === null ? null : (
        <p className="mt-4 border-l-2 border-[var(--sx-line-strong)] pl-4 text-sm leading-relaxed text-[var(--sx-soft)]">
          {claim.uncertaintyText}
        </p>
      )}
    </div>
  );
}

function amountWithUnit(p: PractitionerProtocol): string | null {
  if (p.amountReported === null) return null;
  if (p.amountUnit === null) return p.amountReported;
  return /[a-z]/i.test(p.amountReported) ? p.amountReported : `${p.amountReported} ${p.amountUnit}`;
}

function sourceName(protocol: SimpleProtocol): string {
  const first = protocol.sources[0];
  if (first === undefined) return 'Source not recorded';
  return first.authors[0] ?? first.sourceTitle;
}

/**
 * One source's reported protocol.
 *
 * Simple reading receives a protocol object with no dosing fields on it at all
 * — the view it came from has no such columns — so the amount band below
 * cannot render there even in principle.
 */
function ProtocolCard({
  protocol,
  simple,
  accent,
}: {
  protocol: SimpleProtocol;
  simple: boolean;
  accent: string;
}) {
  const detailed = simple ? null : (protocol as PractitionerProtocol);
  const stated = (fields: readonly (readonly [string, string | null])[]): [string, string][] =>
    fields.flatMap(([label, value]) => (value === null ? [] : [[label, value] as [string, string]]));

  const headline =
    detailed === null
      ? []
      : stated([
          ['Amount', amountWithUnit(detailed)],
          ['Frequency', detailed.frequencyText],
          ['Duration', detailed.durationText],
        ]);
  const rest =
    detailed === null
      ? []
      : stated([
          ['Route', protocol.routeName],
          ['Formulation', detailed.formulation],
          ['Timing', detailed.timingText],
          ['Cycle', detailed.cycleText],
          ['Alongside', detailed.combinationsText],
          ['Monitoring', detailed.monitoringText],
          ['Reported outcome', detailed.outcomeContext],
        ]);

  return (
    <article className="relative overflow-hidden rounded-2xl border border-[var(--sx-line)] bg-[var(--sx-panel)]">
      <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
      <div className="border-b border-[var(--sx-line)] py-4 pr-5 pl-7">
        <p className="sx-mono text-[0.6875rem] tracking-[0.14em] text-[var(--sx-faint)] uppercase">
          {protocol.evidenceTypeLabel}
        </p>
        <h3 className="sx-h3 mt-1 text-[var(--sx-text)]">{sourceName(protocol)}</h3>
      </div>
      <div className="py-5 pr-5 pl-7">
        <p className="text-sm leading-relaxed text-[var(--sx-soft)]">{protocol.objectiveContext}</p>

        {simple ? (
          <p className="mt-4 rounded-lg border border-[var(--sx-line)] px-4 py-3 text-sm text-[var(--sx-faint)]">
            Amounts, frequency and duration are not shown in this view.
          </p>
        ) : null}

        {headline.length === 0 ? null : (
          <dl className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-[var(--sx-line)] bg-[var(--sx-line)]">
            {headline.map(([label, value]) => (
              <div key={label} className="bg-[var(--sx-panel-solid)] px-3 py-3.5 text-center">
                <dt className="sx-mono text-[0.625rem] tracking-[0.12em] text-[var(--sx-faint)] uppercase">
                  {label}
                </dt>
                <dd className="mt-1.5 text-lg leading-tight break-words text-[var(--sx-cyan-soft)]">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {rest.length === 0 ? null : (
          <dl className="mt-4 divide-y divide-[var(--sx-line)]">
            {rest.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[8.5rem_1fr] gap-3 py-2.5">
                <dt className="sx-mono pt-0.5 text-[0.625rem] tracking-[0.12em] text-[var(--sx-faint)] uppercase">
                  {label}
                </dt>
                <dd className="text-sm leading-relaxed text-[var(--sx-text)]">{value}</dd>
              </div>
            ))}
          </dl>
        )}

        <Sources citations={protocol.sources} label="Source" />
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export function CompoundProfile({
  peptide,
  mode,
  backTo,
}: {
  peptide: PeptidePage;
  mode: ReadingMode;
  backTo: { href: string; label: string } | null;
}) {
  const simple = mode === 'simple';
  const path = `/compounds/${peptide.slug}`;

  const lanes = { human: new Set<string>(), preclinical: new Set<string>(), reference: new Set<string>() };
  const sourceKeys = new Set<string>();
  for (const claim of peptide.claims) {
    for (const e of claim.evidence) {
      if (e.evidenceClass === 'human') lanes.human.add(claim.id);
      else if (e.evidenceClass === 'preclinical') lanes.preclinical.add(claim.id);
      else lanes.reference.add(claim.id);
      if (e.citation !== null) sourceKeys.add(e.citation.sourceKey);
    }
  }

  const routeNames = [
    ...new Set(peptide.routes.map((r) => r.routeName).filter((n): n is string => n !== null)),
  ];
  const inCategory = (keys: readonly string[]): PublicClaim[] =>
    peptide.claims.filter((c) => c.claimCategory !== null && keys.includes(c.claimCategory));

  const identity = inCategory(['identity']);
  const mechanism = inCategory(['mechanism', 'preclinical-mechanism']);
  const findings = inCategory(['preclinical-effect', 'efficacy', 'outcome', 'evidence-base', 'evidence-quality']);
  const safety = inCategory(['safety']);

  const pathway = resolvePathway(peptide.slug, peptide.claims);
  const pathwayHuman = pathwayHasHumanEvidence(pathway);

  const allCitations = (claims: readonly PublicClaim[]): Citation[] => {
    const seen = new Map<string, Citation>();
    for (const c of claims) {
      for (const e of c.evidence) {
        if (e.citation === null) continue;
        const k = `${e.citation.sourceKey}·${e.citation.locatorText ?? ''}`;
        if (!seen.has(k)) seen.set(k, e.citation);
      }
    }
    return [...seen.values()];
  };

  return (
    <article className="bg-[var(--sx-bg)] pb-24">
      {/* Hero ----------------------------------------------------------- */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32">
        {/* The instrument grid is an absolutely positioned child layer, as it
            is everywhere else in the showcase — never the section itself. */}
        <div className="sx-grid-bg" aria-hidden="true" />
        <div className="sx-wrap relative">
          {backTo === null ? null : (
            <Link
              href={backTo.href}
              className="sx-mono inline-flex items-center gap-2 text-[0.6875rem] tracking-[0.14em] text-[var(--sx-faint)] uppercase transition-colors hover:text-[var(--sx-cyan-soft)]"
            >
              <span aria-hidden="true">&larr;</span> {backTo.label}
            </Link>
          )}
          <p className="sx-kicker mt-8">
            Compound profile{peptide.categoryLabel === null ? '' : ` · ${peptide.categoryLabel}`}
          </p>
          <h1 className="sx-display mt-5 text-[var(--sx-text)]">{peptide.canonicalName}</h1>
          {peptide.shortDescription === null ? null : (
            <p className="sx-lede mt-7 max-w-[60ch]">{peptide.shortDescription}</p>
          )}

          <div className="mt-10">
            <ReadingDepth mode={mode} path={path} />
          </div>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-9 lg:grid-cols-4">
            <Readout value={String(sourceKeys.size)} label="Research sources" />
            <Readout
              value={String(lanes.human.size)}
              label="Human-evidence findings"
              detail={lanes.human.size === 0 ? 'None recorded' : undefined}
            />
            {simple ? null : (
              <Readout value={String(peptide.protocols.length)} label="Reported protocols" />
            )}
            <Readout
              value={peptide.lastReviewedAt === null ? 'Not yet' : 'Recorded'}
              label="Human review"
              detail={peptide.lastReviewedAt === null ? 'Source-linked, unreviewed' : undefined}
            />
          </dl>
        </div>
      </section>

      <div className="sx-divider" aria-hidden="true" />

      {/* What it is ------------------------------------------------------ */}
      {identity.length === 0 && peptide.simpleSummary === null ? null : (
        <section className="sx-section" aria-labelledby="what-title">
          <div className="sx-wrap">
            <p className="sx-kicker">Start here</p>
            <h2 id="what-title" className="sx-h2 mt-5">
              What {peptide.canonicalName} is
            </h2>
            <div className="mt-8 space-y-7">
              {identity.map((c) => (
                <ClaimBlock key={c.id} claim={c} simple={simple} />
              ))}
            </div>
            <Sources citations={allCitations(identity)} />
          </div>
        </section>
      )}

      {/* Evidence -------------------------------------------------------- */}
      <section className="sx-section" aria-labelledby="evidence-title">
        <div className="sx-wrap">
          <p className="sx-kicker">The evidence</p>
          <h2 id="evidence-title" className="sx-h2 mt-5">
            What the evidence <span className="sx-glow-text">looks like.</span>
          </h2>
          <p className="sx-lede mt-6 max-w-[56ch]">
            Research on this compound comes in three kinds, and they answer different questions.
            Counts show how much of each exists — they are not a grade.
          </p>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              { k: 'human', n: lanes.human.size, label: 'Human', meaning: 'Research in people — the only kind that can show what a compound does in a person.' },
              { k: 'preclinical', n: lanes.preclinical.size, label: 'Preclinical', meaning: 'Animal, cell and computational research. A reason to study something in people, not a result in them.' },
              { k: 'reference', n: lanes.reference.size, label: 'Practitioner reports', meaning: 'What clinicians and handbooks report doing and observing. Always attributed, never a trial.' },
            ].map((lane, i) => (
              <div
                key={lane.k}
                className="rounded-2xl border border-[var(--sx-line)] bg-[var(--sx-panel)] p-6"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-sm font-medium text-[var(--sx-text)]">{lane.label}</h3>
                  <span className="sx-stat-value" style={{ color: ACCENTS[i] ?? ACCENTS[0] }}>
                    {lane.n}
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-[var(--sx-soft)]">{lane.meaning}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mechanism ------------------------------------------------------- */}
      {pathway.length === 0 ? null : (
        <section className="sx-section" aria-labelledby="mechanism-title">
          <div className="sx-wrap">
            <p className="sx-kicker">Mechanism</p>
            <h2 id="mechanism-title" className="sx-h2 mt-5">
              How it is thought to <span className="sx-glow-text">work.</span>
            </h2>
            <div className="mt-10 grid gap-4 lg:grid-cols-4">
              {pathway.map((stage, i) => (
                <div
                  key={stage.key}
                  className="rounded-2xl border border-[var(--sx-line)] bg-[var(--sx-panel)] p-5"
                >
                  <div className="flex items-baseline gap-2.5">
                    <span className="sx-mono text-base" style={{ color: ACCENTS[i % ACCENTS.length] ?? ACCENTS[0] }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-sm font-medium text-[var(--sx-text)]">{stage.label}</h3>
                  </div>
                  <p className="mt-1.5 text-xs text-[var(--sx-faint)]">{stage.detail}</p>
                  <ul className="mt-4 space-y-2.5">
                    {stage.nodes.map((n) => (
                      <li
                        key={`${n.claimKey}-${n.phrase}`}
                        className="rounded-lg border-l-2 bg-[rgb(165_243_252/0.04)] py-2 pr-3 pl-3"
                        style={{ borderLeftColor: ACCENTS[i % ACCENTS.length] ?? ACCENTS[0] }}
                      >
                        <span className="block text-sm leading-snug text-[var(--sx-soft)]">
                          {n.phrase}
                        </span>
                        <span className="sx-mono mt-1.5 block text-[0.625rem] tracking-[0.12em] text-[var(--sx-faint)] uppercase">
                          {n.claimKey}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-7 max-w-[74ch] text-sm leading-relaxed text-[var(--sx-soft)]">
              Each step is taken word for word from the research named beneath it, in the order the
              sources describe. An arrow means <em>reported next</em>, not <em>causes</em> — no study
              has tested one step against another.{' '}
              {pathwayHuman ? null : (
                <strong className="font-medium text-[var(--sx-text)]">
                  No step here rests on evidence from people: every study behind this diagram is
                  animal or laboratory research.
                </strong>
              )}
            </p>
            <Sources citations={allCitations(mechanism)} />
          </div>
        </section>
      )}

      {/* Findings -------------------------------------------------------- */}
      {findings.length === 0 ? null : (
        <section className="sx-section" aria-labelledby="findings-title">
          <div className="sx-wrap">
            <p className="sx-kicker">Findings</p>
            <h2 id="findings-title" className="sx-h2 mt-5">
              What the research has found
            </h2>
            <div className="mt-10 space-y-9">
              {findings.map((c) => (
                <ClaimBlock key={c.id} claim={c} simple={simple} />
              ))}
            </div>
            <Sources citations={allCitations(findings)} />
          </div>
        </section>
      )}

      {/* Protocols ------------------------------------------------------- */}
      <section className="sx-section" aria-labelledby="protocols-title">
        <div className="sx-wrap">
          <p className="sx-kicker">Reported protocols</p>
          <h2 id="protocols-title" className="sx-h2 mt-5">
            Protocols reported by <span className="sx-glow-text">named sources.</span>
          </h2>
          <p className="sx-lede mt-6 max-w-[58ch]">
            Each card is one source&rsquo;s approach, published under that source&rsquo;s name.
            Tides never averages them into a single dose.
          </p>
          {peptide.protocols.length === 0 ? (
            <p className="mt-10 text-[var(--sx-soft)]">
              {simple
                ? 'Source-reported protocols are shown in the practitioner view.'
                : 'No source has published a protocol for this compound.'}
            </p>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {peptide.protocols.map((p, i) => (
                <ProtocolCard
                  key={p.id}
                  protocol={p}
                  simple={simple}
                  accent={ACCENTS[i % ACCENTS.length] ?? ACCENTS[0]}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Safety and open questions --------------------------------------- */}
      {safety.length === 0 && peptide.gaps.length === 0 ? null : (
        <section className="sx-section" aria-labelledby="uncertain-title">
          <div className="sx-wrap">
            <p className="sx-kicker">Safety and open questions</p>
            <h2 id="uncertain-title" className="sx-h2 mt-5">
              What remains uncertain
            </h2>
            {safety.length === 0 ? null : (
              <div className="mt-10 space-y-9">
                {safety.map((c) => (
                  <ClaimBlock key={c.id} claim={c} simple={simple} />
                ))}
              </div>
            )}
            {peptide.gaps.length === 0 ? null : (
              <ul className="mt-10 grid gap-4 md:grid-cols-2">
                {peptide.gaps.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-2xl border border-[var(--sx-line)] bg-[var(--sx-panel)] p-6"
                  >
                    <p className="text-base leading-snug text-[var(--sx-text)]">{g.statement}</p>
                    <p className="mt-2.5 text-sm leading-relaxed text-[var(--sx-soft)]">
                      {g.whyNotSupported}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <Sources citations={allCitations(safety)} />
          </div>
        </section>
      )}

      {/* Routes and regulatory ------------------------------------------- */}
      {routeNames.length === 0 && peptide.regulatoryStatuses.length === 0 ? null : (
        <section className="sx-section" aria-labelledby="context-title">
          <div className="sx-wrap">
            <p className="sx-kicker">Context</p>
            <h2 id="context-title" className="sx-h2 mt-5">
              Administration and regulatory status
            </h2>
            {routeNames.length === 0 ? null : (
              <ul className="mt-8 flex flex-wrap gap-2.5">
                {routeNames.map((n) => (
                  <li
                    key={n}
                    className="rounded-full border border-[var(--sx-line-strong)] px-4 py-1.5 text-sm text-[var(--sx-soft)]"
                  >
                    {n}
                  </li>
                ))}
              </ul>
            )}
            {peptide.regulatoryStatuses.length === 0 ? null : (
              <ul className="mt-8 grid gap-3 md:grid-cols-2">
                {peptide.regulatoryStatuses.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-[var(--sx-line)] bg-[var(--sx-panel)] px-5 py-4 text-sm"
                  >
                    <span className="sx-mono block text-[0.625rem] tracking-[0.12em] text-[var(--sx-faint)] uppercase">
                      {s.jurisdiction}
                    </span>
                    <span className="mt-1.5 block text-[var(--sx-text)]">{s.status}</span>
                    <span className="mt-1 block text-[var(--sx-faint)]">checked {s.checkedAt}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </article>
  );
}
