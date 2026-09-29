import Link from 'next/link';
import type { PeptidePage, PublicClaim } from '@/server/public/queries';
import type { PractitionerProtocol, SimpleProtocol } from '@/server/public/shapes';
import type { StackLink } from '@/server/public/stacks';
import { compareProtocols } from '@/domain/presentation/protocol-comparison';
import { rankProse } from '@/domain/presentation/prose';
import {
  AgreementDifference,
  CompoundHero,
  EvidenceLandscape,
  Movement,
  ReportedProtocolCard,
  SourceDrawer,
  type EvidenceLane,
} from './experience';
import { Disclosure } from './disclosure';

/**
 * The research-first compound experience.
 *
 * Same records, different order. The record page opened with review state and
 * nomenclature — the order the evidence system cares about. A reader arrives
 * wanting to know what the compound is, what it is being studied for, how it is
 * thought to work, what the evidence actually amounts to, and what identifiable
 * sources report doing with it. Regulatory context is real and stays; it stops
 * being the first thing anybody learns.
 *
 * Every section below renders records that already exist. Nothing is composed,
 * inferred or filled in: where a record has no data for a field, the field does
 * not appear.
 */

// ---------------------------------------------------------------------------
// Deriving what a reader sees, from what the record holds
// ---------------------------------------------------------------------------

/**
 * Research-area chips.
 *
 * Each fires only when a phrase appears in a *held* protocol objective, so a
 * chip is always traceable to a record on this page. Deliberately a short,
 * explicit table rather than anything clever: a chip is a claim about what the
 * compound is studied for, and an inferred one would be a claim nobody made.
 */
const INTEREST_SIGNALS: readonly (readonly [RegExp, string])[] = [
  [/tendon|ligament|tissue repair|joint|musculoskelet/i, 'Tissue and joint repair'],
  [/heal|recovery|repair/i, 'Healing and recovery'],
  [/gastro|gut|intestin|ulcer|colitis/i, 'Gastrointestinal research'],
  [/inflamm/i, 'Inflammation'],
  [/skin|derma|hair/i, 'Skin and hair'],
  [/cystitis|bladder|urolog/i, 'Urological research'],
  [/knee|pain/i, 'Pain research'],
  [/muscle|hypertroph|anabolic/i, 'Muscle'],
  [/sleep/i, 'Sleep'],
  [/cognit|neuro|brain/i, 'Neurological research'],
  [/immune/i, 'Immune research'],
  [/metabol|fat loss|weight/i, 'Metabolic research'],
];

export function researchInterests(protocols: readonly SimpleProtocol[]): string[] {
  const text = protocols.map((p) => p.objectiveContext).join(' | ');
  const found: string[] = [];
  for (const [pattern, label] of INTEREST_SIGNALS) {
    if (pattern.test(text) && !found.includes(label)) found.push(label);
  }
  return found.slice(0, 5);
}

/** Distinct source keys behind a set of claims, per evidence lane. */
export function evidenceLanes(claims: readonly PublicClaim[]): EvidenceLane[] {
  const lanes: Record<EvidenceLane['key'], { sources: Set<string>; claims: Set<string> }> = {
    human: { sources: new Set(), claims: new Set() },
    preclinical: { sources: new Set(), claims: new Set() },
    reference_opinion: { sources: new Set(), claims: new Set() },
  };

  for (const claim of claims) {
    for (const record of claim.evidence) {
      const key = record.evidenceClass;
      if (!(key in lanes)) continue;
      lanes[key].claims.add(claim.id);
      if (record.citation !== null) lanes[key].sources.add(record.citation.sourceKey);
    }
  }

  return [
    {
      key: 'human',
      label: 'Human',
      meaning: 'Measured in people. The only lane that can show what a compound does in a person.',
      sources: lanes.human.sources.size,
      claims: lanes.human.claims.size,
    },
    {
      key: 'preclinical',
      label: 'Preclinical',
      meaning: 'Animals, cells and computation. A reason to study something in people, not a result in them.',
      sources: lanes.preclinical.sources.size,
      claims: lanes.preclinical.claims.size,
    },
    {
      key: 'reference_opinion',
      label: 'Practitioner and reference',
      meaning: 'What experts and handbooks report doing and observing. Attributed, never a trial.',
      sources: lanes.reference_opinion.sources.size,
      claims: lanes.reference_opinion.claims.size,
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
   * Published combination pages this compound appears in.
   *
   * Derived from the stack register by the route, not written here: a hard-coded
   * "commonly stacked with" sentence in a component is a medical claim nobody
   * reviewed.
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
  const routeNames = [...new Set(peptide.routes.map((r) => r.routeName).filter((n): n is string => n !== null))];

  /*
   * Simple mode never receives a practitioner protocol, so the comparison
   * cannot be computed there at all — which is the boundary doing its own
   * work rather than a component remembering to hide something.
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
    [...mechanism, ...effects, ...evidenceBase, ...administration, ...safety, ...regulatory, ...identity].map(
      (c) => c.id,
    ),
  );
  const remaining = peptide.claims.filter((c) => !covered.has(c.id));

  return (
    <>
      <CompoundHero
        peptide={peptide}
        interests={interests}
        sourceCount={sourceCount}
        protocolCount={protocols.length}
        showProtocolCount={!simple}
        routeNames={routeNames}
      />

      {/* The review state stays truthful and stops shouting. */}
      <p className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-scientific-teal" />
          Source-linked
        </span>
        <span aria-hidden="true">·</span>
        <span>
          {peptide.lastReviewedAt === null
            ? 'Human review not yet recorded'
            : `Human review recorded ${peptide.lastReviewedAt}`}
        </span>
        <Link href="/methodology" className="underline decoration-rule underline-offset-4 hover:text-deep-tide">
          What that means
        </Link>
      </p>

      {/* 1 · Understand ---------------------------------------------------- */}
      <Movement id="understand" eyebrow="Start here" title={`What ${peptide.canonicalName} is`}>
        <div className="max-w-[68ch] space-y-4 text-lg leading-relaxed text-ink">
          {(simple ? peptide.simpleSummary : peptide.practitionerSummary)
            ?.split('\n\n')
            .filter((p) => p.trim() !== '')
            .map((paragraph) => <SummaryParagraph key={paragraph.slice(0, 40)} text={paragraph} />) ?? (
            <p className="text-ink-soft">A summary has not been written for this record yet.</p>
          )}
        </div>
        {identity.length === 0 ? null : (
          <SourceDrawer label={`What the name refers to (${String(identity.length)})`} citations={citationsOf(identity)}>
            <ul className="space-y-3">
              {identity.map((c) => (
                <li key={c.id} className="text-sm leading-relaxed text-ink-soft">
                  {c.claimText}
                </li>
              ))}
            </ul>
          </SourceDrawer>
        )}
      </Movement>

      {/* 2 · Evidence landscape -------------------------------------------- */}
      <Movement
        id="evidence"
        eyebrow="The evidence"
        title="What kind of evidence stands behind this"
        lede="Three different kinds of thing, kept apart. A count is not a grade, and nothing here is scored."
      >
        <EvidenceLandscape lanes={lanes} />
      </Movement>

      {/* 3 · Mechanism ------------------------------------------------------ */}
      {mechanism.length === 0 ? null : (
        <Movement
          id="mechanism"
          eyebrow="Mechanism"
          title="How it is thought to work"
          lede="Proposed mechanisms, at the population each was observed in. A mechanism is a reason to look, not a result."
        >
          <div className="space-y-5">
            {mechanism.map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
          <SourceDrawer citations={citationsOf(mechanism)} />
        </Movement>
      )}

      {/* 4 · What the research says ----------------------------------------- */}
      {effects.length + evidenceBase.length === 0 ? null : (
        <Movement
          id="research"
          eyebrow="Findings"
          title="What the research says"
          lede="What has been reported, and how far it has been shown. Read each with the lane it came from."
        >
          <div className="space-y-5">
            {[...effects, ...evidenceBase].map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
          <SourceDrawer citations={citationsOf([...effects, ...evidenceBase])} />
        </Movement>
      )}

      {/* 5 · Reported protocols -------------------------------------------- */}
      <Movement
        id="protocols"
        eyebrow="Reported protocols"
        title="What identifiable sources report doing"
        lede={
          <>
            Each card is one source&rsquo;s regimen, under that source&rsquo;s name. There is no
            Tides dose and there will not be one: these are not averaged, reconciled or ranked.
          </>
        }
      >
        {protocols.length === 0 ? (
          <p className="text-ink-soft">
            No source-reported protocol has been published for this compound.
          </p>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {protocols.map((protocol) => (
              <ReportedProtocolCard
                key={protocol.id}
                sourceName={protocolSourceName(protocol)}
                contextLabel={protocol.evidenceTypeLabel}
                protocol={protocol}
                simple={simple}
              />
            ))}
          </div>
        )}
      </Movement>

      {/* 6 · Compare ------------------------------------------------------- */}
      {comparison === null ? null : (
        <Movement
          id="compare"
          eyebrow="Compare"
          title="Where the sources agree, and where they do not"
          lede="Read across rather than down. Every line is counted off the records themselves; no source is adjudicated here, because nothing held settles it."
        >
          <AgreementDifference
            agree={{
              heading: 'Where the sources agree',
              points: comparison.agree,
              emptyText:
                'Nothing. No field of a reported regimen is stated the same way by every record of either kind.',
            }}
            differ={{
              heading: 'Where they differ',
              points: comparison.differ,
              emptyText: 'Nothing: every field that is stated is stated the same way.',
            }}
            unknown={{
              heading: 'What none of them settles',
              points: comparison.unknown,
              emptyText: 'Every field is stated by every record.',
            }}
          />
        </Movement>
      )}

      {/* 7 · Stack --------------------------------------------------------- */}
      {stackLinks.length === 0 ? null : (
        <Movement
          id="stacks"
          eyebrow="Combinations"
          title="Reported alongside"
          lede="Appearing together in a source is not evidence that the pairing works. Each page below separates what is known about the compounds individually from what is known about them together."
        >
          <div className="grid gap-4">
            {stackLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group block rounded-xl border border-rule/70 bg-warm-white p-6 transition-colors hover:border-scientific-teal/60"
              >
                <p className="font-serif text-xl text-deep-tide group-hover:text-scientific-teal">
                  {link.title}
                </p>
                <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">
                  {link.summary}
                </p>
              </Link>
            ))}
          </div>
        </Movement>
      )}

      {/* 8 · Administration ------------------------------------------------ */}
      {administration.length === 0 && routeNames.length === 0 ? null : (
        <Movement
          id="routes"
          eyebrow="Administration"
          title="How it is reported to be given"
          lede="Route evidence is specific to a compound and a formulation. That one peptide is absorbed by a route says nothing about another."
        >
          {routeNames.length === 0 ? null : (
            <ul className="mb-6 flex flex-wrap gap-2">
              {routeNames.map((r) => (
                <li
                  key={r}
                  className="rounded-full border border-rule bg-mist/50 px-3 py-1 text-sm text-ink"
                >
                  {r}
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-5">
            {administration.map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
          <SourceDrawer citations={citationsOf(administration)} />
        </Movement>
      )}

      {/* 9 · Safety and unknowns ------------------------------------------- */}
      <Movement
        id="safety"
        eyebrow="Safety and uncertainty"
        title="What is reported, and what is not established"
        lede="Observations from sources, kept apart from the questions nobody here can answer."
      >
        {safety.length === 0 ? null : (
          <div className="space-y-5">
            {safety.map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
        )}
        {peptide.gaps.length === 0 ? null : (
          <div className={safety.length === 0 ? '' : 'mt-8'}>
            <h3 className="font-serif text-lg text-ink">What this index cannot tell you</h3>
            <ul className="mt-4 space-y-3">
              {peptide.gaps.slice(0, 6).map((gap) => (
                <li key={gap.id} className="max-w-[68ch] border-l-2 border-rule pl-4">
                  <p className="leading-relaxed text-ink">{gap.statement}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-soft">{gap.whyNotSupported}</p>
                </li>
              ))}
            </ul>
            {peptide.gaps.length > 6 ? (
              <p className="mt-3 text-sm text-slate">
                {String(peptide.gaps.length - 6)} further open questions are recorded here.
              </p>
            ) : null}
          </div>
        )}
        <SourceDrawer citations={citationsOf(safety)} />
      </Movement>

      {/* 10 · Quality ------------------------------------------------------ */}
      <Movement id="quality" eyebrow="Quality" title="What is in the vial is a separate question">
        <p className="max-w-[68ch] leading-relaxed text-ink-soft">
          Identity, purity, sterility and storage are properties of a supplied material, not of a
          compound. They are covered in their own section rather than repeated here.
        </p>
        <p className="mt-4">
          <Link
            href="/quality"
            className="text-scientific-teal underline decoration-rule underline-offset-4 hover:text-deep-tide"
          >
            How peptides are tested, and what each test proves
          </Link>
        </p>
      </Movement>

      {/* 11 · Regulatory --------------------------------------------------- */}
      {regulatory.length === 0 && peptide.regulatoryStatuses.length === 0 ? null : (
        <Movement
          id="regulatory"
          eyebrow="Context"
          title="Regulatory and sport context"
          lede="One jurisdiction at one date. It bears on whether something may be sold, not on what has been studied."
        >
          {peptide.regulatoryStatuses.length === 0 ? null : (
            <ul className="mb-6 space-y-3">
              {peptide.regulatoryStatuses.map((status) => (
                <li key={status.id} className="max-w-[68ch] text-sm leading-relaxed text-ink-soft">
                  <span className="font-medium text-ink">{status.jurisdiction}</span>
                  {status.indicationContext === null ? '' : ` · ${status.indicationContext}`}
                  {' — '}
                  {status.status}, checked {status.checkedAt}
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-5">
            {regulatory.map((c) => (
              <ClaimProse key={c.id} claim={c} simple={simple} />
            ))}
          </div>
          <SourceDrawer citations={citationsOf(regulatory)} />
        </Movement>
      )}

      {/* 12 · Everything else ---------------------------------------------- */}
      {remaining.length === 0 ? null : (
        <Movement id="references" eyebrow="Depth" title="The rest of the record">
          <Disclosure summary={`Further statements on this compound (${String(remaining.length)})`}>
            <div className="space-y-5 pt-4">
              {remaining.map((c) => (
                <ClaimProse key={c.id} claim={c} simple={simple} />
              ))}
            </div>
          </Disclosure>
        </Movement>
      )}
    </>
  );
}

function SummaryParagraph({ text }: { readonly text: string }) {
  // The summaries carry **bold** lead-ins. Rendered without a markdown
  // dependency: split on the marker and emphasise the odd segments.
  const parts = text.split('**');
  return (
    <p>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <strong key={`${part.slice(0, 12)}-${String(index)}`} className="font-medium text-ink">
            {part}
          </strong>
        ) : (
          <span key={`${part.slice(0, 12)}-${String(index)}`}>{part}</span>
        ),
      )}
    </p>
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
function ClaimProse({ claim, simple }: { readonly claim: PublicClaim; readonly simple: boolean }) {
  const body = simple && claim.plainLanguageText !== null ? claim.plainLanguageText : claim.claimText;
  const { lead, rest } = rankProse(body);
  const lanes = [...new Set(claim.evidence.map((e) => e.evidenceClass))];
  return (
    <div className="max-w-[68ch]">
      {/* The kind of evidence comes before the statement, not after it: a
          reader deciding whether to read a paragraph is owed that first. */}
      <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-2xs tracking-[0.1em] text-slate uppercase">
        {lanes.map((lane) => (
          <span key={lane}>{LANE_LABEL[lane] ?? lane}</span>
        ))}
        {claim.evidence.length > 0 ? (
          <span className="normal-case tracking-normal text-slate/80">
            {String(claim.evidence.length)}{' '}
            {claim.evidence.length === 1 ? 'citation' : 'citations'}
          </span>
        ) : null}
      </p>
      <p className="mt-1.5 text-[1.0625rem] leading-relaxed text-ink">{lead}</p>
      {/* Index keys: this list is derived from one string, never reordered,
          and two paragraphs of a claim can legitimately read alike. */}
      {rest.map((paragraph, i) => (
        <p key={i} className="mt-2.5 leading-relaxed text-ink-soft">
          {paragraph}
        </p>
      ))}
      {claim.uncertaintyText === null ? null : (
        <p className="mt-3 border-l-2 border-rule pl-3.5 text-sm leading-relaxed text-ink-soft">
          {claim.uncertaintyText}
        </p>
      )}
    </div>
  );
}
