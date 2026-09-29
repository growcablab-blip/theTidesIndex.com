import Link from 'next/link';
import type { PeptidePage, PublicClaim } from '@/server/public/queries';
import type { PractitionerProtocol, SimpleProtocol } from '@/server/public/shapes';
import type { StackLink } from '@/server/public/stacks';
import { compareProtocols } from '@/domain/presentation/protocol-comparison';
import { rankProse } from '@/domain/presentation/prose';
import { researchInterests } from '@/domain/presentation/research-interests';
import { pathwayHasHumanEvidence, resolvePathway } from '@/domain/presentation/mechanism-pathway';
import { Band, BandHeading, CompoundMark, MolecularField, Tag, TelemetryRow } from './visual-system';
import {
  ComparisonMatrix,
  EvidenceLandscape,
  InterestCard,
  PathwayDiagram,
  ProtocolDataCard,
  type EvidenceLaneReading,
} from './research-visuals';
import { SourceDrawer } from './experience';
import { Disclosure } from './disclosure';

/**
 * The research-first compound experience.
 *
 * Same records, different order and — since Phase 1C — a different register.
 * The record page opened with review state and nomenclature, the order the
 * evidence system cares about. A reader arrives wanting to know what the
 * compound is, what it is studied for, how it is thought to work, what the
 * evidence amounts to, and what identifiable sources report doing with it.
 *
 * The page alternates surfaces on purpose. Read entirely on white a reference
 * looks like a white paper however good the words are; read entirely on black
 * it looks like a brochure. The deep bands carry the visuals, the light bands
 * carry the reading, and the rhythm is what makes it feel composed.
 *
 * Nothing below is composed, inferred or filled in. Where a record has no data
 * for a field, the field does not appear.
 */

// ---------------------------------------------------------------------------
// Deriving what a reader sees, from what the record holds
// ---------------------------------------------------------------------------

/** Distinct source keys behind a set of claims, per evidence lane. */
export function evidenceLanes(claims: readonly PublicClaim[]): EvidenceLaneReading[] {
  const lanes: Record<string, { sources: Set<string>; claims: Set<string> }> = {
    human: { sources: new Set(), claims: new Set() },
    preclinical: { sources: new Set(), claims: new Set() },
    reference_opinion: { sources: new Set(), claims: new Set() },
  };

  for (const claim of claims) {
    for (const record of claim.evidence) {
      const key = record.evidenceClass;
      const lane = lanes[key];
      if (lane === undefined) continue;
      lane.claims.add(claim.id);
      if (record.citation !== null) lane.sources.add(record.citation.sourceKey);
    }
  }

  return [
    {
      key: 'human',
      label: 'Human',
      meaning: 'Research in people — the only kind that can show what a compound does in a person.',
      sources: lanes['human']?.sources.size ?? 0,
      claims: lanes['human']?.claims.size ?? 0,
    },
    {
      key: 'preclinical',
      label: 'Preclinical',
      meaning:
        'Animal, cell and computational research. A reason to study something in people, not a result in them.',
      sources: lanes['preclinical']?.sources.size ?? 0,
      claims: lanes['preclinical']?.claims.size ?? 0,
    },
    {
      key: 'reference_opinion',
      label: 'Practitioner reports',
      meaning:
        'What clinicians and handbooks report doing and observing. Always attributed, never a trial.',
      sources: lanes['reference_opinion']?.sources.size ?? 0,
      claims: lanes['reference_opinion']?.claims.size ?? 0,
    },
  ];
}

/** The name a protocol should be filed under: its source, not its key. */
export function protocolSourceName(protocol: SimpleProtocol): string {
  const first = protocol.sources[0];
  if (first === undefined) return 'Source not recorded';
  if (first.authors.length > 0) return first.authors[0]!;
  return first.sourceTitle;
}

function claimsInCategories(
  claims: readonly PublicClaim[],
  categories: readonly string[],
): PublicClaim[] {
  return claims.filter((c) => c.claimCategory !== null && categories.includes(c.claimCategory));
}

function citationsOf(claims: readonly PublicClaim[]) {
  const seen = new Map<string, NonNullable<PublicClaim['evidence'][number]['citation']>>();
  for (const claim of claims) {
    for (const record of claim.evidence) {
      if (record.citation === null) continue;
      const key = `${record.citation.sourceKey}·${record.citation.locatorText ?? ''}`;
      if (!seen.has(key)) seen.set(key, record.citation);
    }
  }
  return [...seen.values()];
}

/** Accents for the protocol cards. Identity only; never a rank or a quality. */
const PROTOCOL_ACCENTS = ['#22d3ee', '#2563eb', '#4f46e5', '#7c6ce0', '#1f6b73', '#5d8a99'];

// ---------------------------------------------------------------------------
// The page
// ---------------------------------------------------------------------------

export function CompoundExperience({
  peptide,
  simple,
  stackLinks = [],
}: {
  readonly peptide: PeptidePage;
  readonly simple: boolean;
  /**
   * Published combination pages this compound appears in. Derived from the
   * stack register by the route, never written here.
   */
  readonly stackLinks?: readonly StackLink[];
}) {
  const protocols = peptide.protocols;
  const interests = researchInterests(protocols);
  const lanes = evidenceLanes(peptide.claims);
  const sourceCount = new Set(
    peptide.claims.flatMap((c) =>
      c.evidence.flatMap((e) => (e.citation === null ? [] : [e.citation.sourceKey])),
    ),
  ).size;
  const routeNames = [
    ...new Set(peptide.routes.map((r) => r.routeName).filter((n): n is string => n !== null)),
  ];

  /*
   * Simple reading never receives a practitioner protocol, so the comparison
   * cannot be computed there at all — the boundary doing its own work rather
   * than a component remembering to hide something.
   */
  const reported: readonly PractitionerProtocol[] = simple
    ? []
    : (protocols as readonly PractitionerProtocol[]);
  const comparison =
    reported.length < 2 ? null : compareProtocols(reported, { includeDosing: !simple });

  const mechanism = claimsInCategories(peptide.claims, ['mechanism', 'preclinical-mechanism']);
  const effects = claimsInCategories(peptide.claims, ['preclinical-effect', 'efficacy', 'outcome']);
  const evidenceBase = claimsInCategories(peptide.claims, ['evidence-base', 'evidence-quality']);
  const administration = claimsInCategories(peptide.claims, ['administration', 'route']);
  const safety = claimsInCategories(peptide.claims, ['safety']);
  const regulatory = claimsInCategories(peptide.claims, ['regulatory']);
  const identity = claimsInCategories(peptide.claims, ['identity']);

  const covered = new Set(
    [
      ...mechanism,
      ...effects,
      ...evidenceBase,
      ...administration,
      ...safety,
      ...regulatory,
      ...identity,
    ].map((c) => c.id),
  );
  const remaining = peptide.claims.filter((c) => !covered.has(c.id));

  // The diagram is assembled from the records on this page and disappears if
  // they do. See `mechanism-pathway.ts` for the guarantee.
  const pathway = resolvePathway(peptide.slug, peptide.claims);
  const pathwayHuman = pathwayHasHumanEvidence(pathway);

  const humanLane = lanes.find((l) => l.key === 'human');
  const summary = simple ? peptide.simpleSummary : peptide.practitionerSummary;

  const readings = [
    { value: String(sourceCount), label: 'Published sources', detail: 'Behind the research on this page' },
    {
      value: String(humanLane?.claims ?? 0),
      label: 'Human evidence',
      detail: `Findings from ${String(humanLane?.sources ?? 0)} ${(humanLane?.sources ?? 0) === 1 ? 'source' : 'sources'}`,
    },
    ...(simple
      ? []
      : [
          {
            value: String(protocols.length),
            label: 'Reported protocols',
            detail: 'Each published under its source’s name',
          },
        ]),
    ...(routeNames.length > 0
      ? [{ value: String(routeNames.length), label: 'Routes researched', detail: routeNames.join(' · ') }]
      : []),
    {
      value: peptide.lastReviewedAt === null ? 'Not yet' : 'Recorded',
      label: 'Human review',
      detail: peptide.lastReviewedAt === null ? 'Source-linked, unreviewed' : peptide.lastReviewedAt,
      muted: true,
    },
  ].slice(0, 4);

  return (
    <>
      {/* ── 1 · Hero ─────────────────────────────────────────────────── */}
      <Band tone="deep" grid className="pt-10 pb-14 md:pt-14 md:pb-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          <div>
            {/* The compound's own reviewed category, which both readings
                carry — rather than an interest inferred from protocols that
                simple reading cannot see. */}
            <p className="label-micro text-cyan">
              Peptide{peptide.categoryLabel === null ? '' : ` · ${peptide.categoryLabel}`}
            </p>
            <h1 className="mt-4 font-serif text-5xl leading-[0.98] tracking-[-0.02em] text-on-deep md:text-7xl">
              {peptide.canonicalName}
            </h1>
            {peptide.shortDescription === null ? null : (
              <p className="mt-6 max-w-[54ch] text-lg leading-relaxed text-on-deep-soft md:text-xl">
                {peptide.shortDescription}
              </p>
            )}
            {interests.length === 0 ? null : (
              <ul className="mt-7 flex flex-wrap gap-2">
                {interests.map((i) => (
                  <Tag key={i.label}>{i.label}</Tag>
                ))}
              </ul>
            )}
            <p className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-on-deep-faint">
              <span className="inline-flex items-center gap-1.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cyan anim-pulse" />
                Source-linked
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {peptide.lastReviewedAt === null
                  ? 'Human review not yet recorded'
                  : `Human review recorded ${peptide.lastReviewedAt}`}
              </span>
              <Link
                href="/methodology"
                className="underline decoration-cyan-soft/30 underline-offset-4 hover:text-on-deep"
              >
                What that means
              </Link>
            </p>
          </div>

          {/* The visual sits in the layout, not in a card. */}
          <div className="relative -mx-5 h-[20rem] sm:h-[24rem] md:mx-0 lg:h-[30rem]">
            <MolecularField />
          </div>
        </div>

        <div className="mt-10 md:mt-12">
          <TelemetryRow readings={readings} />
        </div>
      </Band>

      {/* ── 2 · What it is ───────────────────────────────────────────── */}
      <Band id="understand" tone="light" className="py-16 md:py-24">
        <div className="grid gap-10 lg:grid-cols-[0.34fr_0.66fr] lg:gap-16">
          <div>
            <BandHeading eyebrow="Start here" title={`What ${peptide.canonicalName} is`} />
            <div className="mt-8 text-tide-teal/45">
              <CompoundMark slug={peptide.slug} size={96} />
            </div>
          </div>
          <div>
            {summary === null ? null : <SummaryProse text={summary} />}
            {identity.length === 0 ? null : (
              <div className="mt-8 space-y-6 border-t border-rule pt-8">
                {identity.map((c) => (
                  <ClaimProse key={c.id} claim={c} simple={simple} />
                ))}
                <SourceDrawer citations={citationsOf(identity)} />
              </div>
            )}
          </div>
        </div>
      </Band>

      {/* ── 3 · Research interests ───────────────────────────────────── */}
      {interests.length === 0 ? null : (
        <Band id="interests" tone="soft" className="py-16 md:py-24">
          <BandHeading
            eyebrow="Research context"
            title="Why it is being researched"
            lede="The areas the published protocols set out to address, in the sources’ own words. These are research contexts, not approved uses."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {interests.map((interest, i) => (
              <InterestCard
                key={interest.label}
                title={interest.label}
                detail={`Named in ${String(interest.count)} of ${String(protocols.length)} reported ${
                  protocols.length === 1 ? 'protocol' : 'protocols'
                }. One describes it as: “${interest.example}”`}
                index={i}
              />
            ))}
          </div>
        </Band>
      )}

      {/* ── 4 · Evidence landscape and mechanism ─────────────────────── */}
      <Band id="evidence" tone="deep" grid className="py-16 md:py-24">
        <BandHeading
          tone="deep"
          eyebrow="The evidence"
          title="What the evidence looks like"
          lede="Research on this compound comes in three kinds, and they answer different questions. Counts show how much of each exists — they are not a grade."
        />
        <div className="mt-10">
          <EvidenceLandscape lanes={lanes} />
        </div>

        {pathway.length === 0 ? null : (
          <div id="mechanism" className="mt-20 md:mt-28">
            <BandHeading
              tone="deep"
              eyebrow="Mechanism"
              title="How it is thought to work"
              lede="Proposed mechanisms, at the population each was observed in. A mechanism is a reason to look, not a result."
            />
            <div className="mt-10">
              <PathwayDiagram stages={pathway} hasHuman={pathwayHuman} />
            </div>
          </div>
        )}
      </Band>

      {/* ── 5 · What the research says ───────────────────────────────── */}
      {mechanism.length + effects.length + evidenceBase.length === 0 ? null : (
        <Band id="research" tone="light" className="py-16 md:py-24">
          <BandHeading
            eyebrow="Findings"
            title="What the research has found"
            lede="Each finding is labelled with the kind of research behind it, because an animal result and a human result answer different questions."
          />
          <div className="mt-10 space-y-8">
            {[...mechanism, ...effects, ...evidenceBase].map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
          <SourceDrawer citations={citationsOf([...mechanism, ...effects, ...evidenceBase])} />
        </Band>
      )}

      {/* ── 6 · Reported protocols ───────────────────────────────────── */}
      <Band id="protocols" tone="ivory" className="py-16 md:py-24">
        <BandHeading
          eyebrow="Reported protocols"
          title="Protocols reported by named sources"
          lede={
            <>
              Each card is one source&rsquo;s approach, published under that source&rsquo;s name.
              Tides never averages them into a single dose.
            </>
          }
        />
        {protocols.length === 0 ? (
          <p className="mt-10 max-w-[62ch] text-ink-soft">
            No source has published a protocol for this compound.
          </p>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            {protocols.map((protocol, i) => (
              <ProtocolDataCard
                key={protocol.id}
                sourceName={protocolSourceName(protocol)}
                protocol={protocol}
                simple={simple}
                accent={PROTOCOL_ACCENTS[i % PROTOCOL_ACCENTS.length] ?? '#22d3ee'}
                citations={protocol.sources}
              />
            ))}
          </div>
        )}

        {comparison === null ? null : (
          <div id="compare" className="mt-20 md:mt-24">
            <BandHeading
              eyebrow="Compare"
              title="How the sources differ"
              lede="Counted directly from the protocols above. Where sources disagree, Tides shows the disagreement rather than picking a winner."
            />
            <div className="mt-10">
              <ComparisonMatrix comparison={comparison} />
            </div>
          </div>
        )}
      </Band>

      {/* ── 7 · Combinations ─────────────────────────────────────────── */}
      {stackLinks.length === 0 ? null : (
        <Band id="stacks" tone="soft" className="py-16 md:py-24">
          <BandHeading
            eyebrow="Combinations"
            title="Researched alongside"
            lede="Compounds that sources report using with this one. Each page keeps the evidence for the individual compounds separate from the evidence for the combination."
          />
          <div className="mt-10 grid gap-5">
            {stackLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group relative overflow-hidden rounded-2xl border border-rule bg-warm-white p-7 transition-colors hover:border-scientific-teal/60 md:p-9"
              >
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-cyan to-indigo-500"
                />
                <p className="font-serif text-2xl text-deep-tide group-hover:text-scientific-teal md:text-3xl">
                  {link.title}
                </p>
                <p className="mt-3 max-w-[68ch] leading-relaxed text-ink-soft">{link.summary}</p>
              </Link>
            ))}
          </div>
        </Band>
      )}

      {/* ── 8 · Administration, safety, unknowns ─────────────────────── */}
      <Band tone="light" className="py-16 md:py-24">
        {administration.length === 0 && routeNames.length === 0 ? null : (
          <div id="routes">
            <BandHeading
              eyebrow="Administration"
              title="How it is given in research"
              lede="Route findings apply to one compound in one formulation. That a peptide is absorbed by a route says nothing about another."
            />
            {routeNames.length === 0 ? null : (
              <ul className="mt-7 flex flex-wrap gap-2.5">
                {routeNames.map((name) => (
                  <li
                    key={name}
                    className="rounded-full border border-rule bg-mist/60 px-4 py-1.5 text-sm text-ink-soft"
                  >
                    {name}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 space-y-8">
              {administration.map((c) => (
                <ClaimProse key={c.id} claim={c} simple={simple} />
              ))}
            </div>
            <SourceDrawer citations={citationsOf(administration)} />
          </div>
        )}

        {safety.length === 0 ? null : (
          <div id="safety" className="mt-20 md:mt-24">
            <BandHeading
              eyebrow="Safety"
              title="What is known about safety"
              lede="No reported harm is not the same as evidence of safety: small studies cannot detect rare effects."
            />
            <div className="mt-10 space-y-8">
              {safety.map((c) => (
                <ClaimProse key={c.id} claim={c} simple={simple} />
              ))}
            </div>
            <SourceDrawer citations={citationsOf(safety)} />
          </div>
        )}

        {peptide.gaps.length === 0 ? null : (
          <div id="unknowns" className="mt-20 md:mt-24">
            <BandHeading
              eyebrow="Open questions"
              title="What remains uncertain"
              lede="Questions the research does not currently answer. Tides records these rather than leaving them out."
            />
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {peptide.gaps.map((gap) => (
                <li key={gap.id} className="rounded-2xl border border-rule bg-mist/40 p-6">
                  <p className="font-serif text-lg leading-snug text-ink">{gap.statement}</p>
                  <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
                    {gap.whyNotSupported}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div id="quality" className="mt-20 md:mt-24">
          <BandHeading
            eyebrow="Quality"
            title="What is in the vial is a separate question"
            lede="Identity, purity, sterility and storage describe a supplied material, not a compound. Research findings say nothing about what a given vial contains."
          />
          <p className="mt-6">
            <Link
              href="/quality"
              className="text-scientific-teal underline decoration-rule underline-offset-4 hover:text-deep-tide"
            >
              How peptides are tested, and what each test proves
            </Link>
          </p>
        </div>
      </Band>

      {/* ── 9 · Context and the rest of the record ───────────────────── */}
      <Band tone="deep" className="py-16 md:py-24">
        {regulatory.length === 0 && peptide.regulatoryStatuses.length === 0 ? null : (
          <div id="regulatory">
            <BandHeading
              tone="deep"
              eyebrow="Context"
              title="Regulatory and sport status"
              lede="Each entry is one jurisdiction on one date. Status affects whether a compound may be sold — not what research has found."
            />
            {peptide.regulatoryStatuses.length === 0 ? null : (
              <ul className="mt-8 grid gap-3 md:grid-cols-2">
                {peptide.regulatoryStatuses.map((status) => (
                  <li key={status.id} className="glass px-5 py-4 text-sm leading-relaxed">
                    <span className="label-micro block text-on-deep-faint">
                      {status.jurisdiction}
                    </span>
                    <span className="mt-1.5 block text-on-deep">{status.status}</span>
                    <span className="mt-1 block text-on-deep-faint">
                      {status.indicationContext === null ? '' : `${status.indicationContext} · `}
                      checked {status.checkedAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-8 space-y-8">
              {regulatory.map((c) => (
                <ClaimProse key={c.id} claim={c} simple={simple} deep />
              ))}
            </div>
          </div>
        )}

        {remaining.length === 0 ? null : (
          <div id="references" className="mt-16 md:mt-20">
            <BandHeading tone="deep" eyebrow="More" title="Further research notes" />
            <div className="mt-8 rounded-2xl border border-cyan-soft/15 bg-on-deep/[0.04] px-5 py-2">
              <Disclosure
                summary={`Further findings on this compound (${String(remaining.length)})`}
              >
                <div className="space-y-8 pt-4">
                  {remaining.map((c) => (
                    <ClaimProse key={c.id} claim={c} simple={simple} deep />
                  ))}
                </div>
              </Disclosure>
            </div>
          </div>
        )}
      </Band>
    </>
  );
}

// ---------------------------------------------------------------------------
// Prose
// ---------------------------------------------------------------------------

/** The record's summary, with its **bold** runs, and no markdown dependency. */
function SummaryProse({ text }: { readonly text: string }) {
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim() !== '');
  return (
    <div className="space-y-5">
      {paragraphs.map((paragraph, i) => (
        <p
          key={paragraph.slice(0, 40)}
          className={
            i === 0
              ? 'text-xl leading-relaxed text-ink md:text-[1.35rem] md:leading-[1.6]'
              : 'leading-relaxed text-ink-soft'
          }
        >
          {paragraph.split(/(\*\*[^*]+\*\*)/).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <strong key={`${String(i)}-${String(j)}`} className="font-medium text-ink">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}

const LANE_LABEL: Readonly<Record<string, string>> = {
  human: 'Human',
  preclinical: 'Preclinical',
  reference_opinion: 'Practitioner',
};

/**
 * One claim, ranked so it can be scanned.
 *
 * These records run to five or six hundred characters and in a single block
 * nothing in them can be found. The lead sentence — which in every record on
 * this page carries the finding — is set at reading size and the remainder
 * follows under it in paragraphs.
 *
 * Nothing is summarised and nothing is hidden. `rankProse` moves no words, and
 * the whole text is on the page either way; what changes is which part of it
 * the eye lands on first.
 */
function ClaimProse({
  claim,
  simple,
  deep = false,
}: {
  readonly claim: PublicClaim;
  readonly simple: boolean;
  readonly deep?: boolean;
}) {
  const body =
    simple && claim.plainLanguageText !== null ? claim.plainLanguageText : claim.claimText;
  const { lead, rest } = rankProse(body);
  const lanes = [...new Set(claim.evidence.map((e) => e.evidenceClass))];
  return (
    <div className="max-w-[68ch]">
      {/* The kind of evidence comes before the statement, not after it: a
          reader deciding whether to read a paragraph is owed that first. */}
      <p
        className={`label-micro flex flex-wrap items-center gap-x-2.5 gap-y-1 ${
          deep ? 'text-on-deep-faint' : 'text-slate'
        }`}
      >
        {lanes.map((lane) => (
          <span key={lane}>{LANE_LABEL[lane] ?? lane}</span>
        ))}
        {claim.evidence.length > 0 ? (
          <span className="tracking-normal normal-case opacity-80">
            {String(claim.evidence.length)}{' '}
            {claim.evidence.length === 1 ? 'citation' : 'citations'}
          </span>
        ) : null}
      </p>
      <p
        className={`mt-2 text-lg leading-relaxed ${deep ? 'text-on-deep' : 'text-ink'}`}
      >
        {lead}
      </p>
      {/* Index keys: this list is derived from one string, never reordered,
          and two paragraphs of a claim can legitimately read alike. */}
      {rest.map((paragraph, i) => (
        <p
          key={i}
          className={`mt-3 leading-relaxed ${deep ? 'text-on-deep-soft' : 'text-ink-soft'}`}
        >
          {paragraph}
        </p>
      ))}
      {claim.uncertaintyText === null ? null : (
        <p
          className={`mt-4 border-l-2 pl-4 text-sm leading-relaxed ${
            deep ? 'border-cyan-soft/25 text-on-deep-soft' : 'border-rule text-ink-soft'
          }`}
        >
          {claim.uncertaintyText}
        </p>
      )}
    </div>
  );
}
