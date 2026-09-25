import Link from 'next/link';
import type { Metadata } from 'next';
import { getQualityTopicPage } from '@/server/public/queries';
import { previewQualityTopic } from '@/server/public/preview';
import type { QualityTopicReading } from '@/server/public/quality-topic';
import type { EvidenceGap, PublicClaim } from '@/server/public/shapes';
import { getReadingMode } from '@/server/public/reading-mode';
import { Callout, Container, EmptyState } from '@/components/public/primitives';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { ClaimCard } from '@/components/public/evidence';
import { Disclosure } from '@/components/public/disclosure';
import { GapResolutionNote } from '@/components/public/quality-evidence';
import { EditorialStateChip, SourceNeededCard } from '@/components/public/editorial-state';
import { SequenceToVialJourneyIllustration } from '@/components/illustrations';
import {
  ApiVersusVialFigure,
  BatchTraceabilityFigure,
  QualityCheckpointsFigure,
  SequenceToVialFigure,
  StorageTransportChainFigure,
  type Checkpoint,
  type FlowStage,
} from '@/components/public/manufacturing-figures';
import {
  KNOW_THE_FIVE,
  SEQUENCE_TO_VIAL_STAGES,
  SEQUENCE_TO_VIAL_TOPICS,
  VIAL_CHECKPOINTS,
  type VialStage,
} from '@/domain/quality/sequence-to-vial';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'From sequence to final vial',
  description:
    'How a peptide generally gets from a sequence on paper to material in a vial, what is checked along the way, and what the held sources do not describe.',
  robots: { index: false, follow: false },
};

/**
 * FROM SEQUENCE TO FINAL VIAL.
 *
 * The page is a reading order laid over the manufacturing quality topics. What
 * a stage *says* comes from claims in those topics, looked up by key, so every
 * sentence a reader takes away has a source location behind it. What is
 * written here is structure: the order of stages, the four parts they are
 * grouped into, the question each stage answers, and which claims belong to
 * it — the same kind of editorial decision as a pathway.
 *
 * A stage whose claims did not load (unpublished outside preview, or never
 * written because no usable source is held) renders as "source needed" and is
 * drawn dashed. The flag is computed from what loaded, not declared, so the
 * page cannot claim coverage it does not have.
 */

const STAGES = SEQUENCE_TO_VIAL_STAGES;
type Stage = VialStage;
const CHECKPOINTS: readonly Checkpoint[] = VIAL_CHECKPOINTS;

/**
 * Packet keys that differ from the topic's public slug.
 *
 * The domain module lists evidence packets by key, and the lyophilisation
 * packet is keyed with a z while the topic's slug uses an s. Looking the key up
 * as a slug found nothing, and the stage rendered as "source needed" despite
 * holding claims.
 */
const SLUG_FOR_KEY: Readonly<Record<string, string>> = {
  lyophilization: 'lyophilisation',
};

/**
 * The four parts of the story. Grouping only — which stages sit together — so a
 * fifteen-step list reads as movements rather than a column of equal boxes.
 */
const PARTS: readonly { key: string; label: string; title: string; stages: readonly string[] }[] = [
  {
    key: 'making',
    label: 'Part one',
    title: 'Making the peptide',
    stages: ['design', 'raw-materials', 'assembly', 'cleavage', 'crude'],
  },
  {
    key: 'knowing',
    label: 'Part two',
    title: 'Purifying it, and knowing what it is',
    stages: ['purification', 'characterisation', 'api'],
  },
  {
    key: 'vial',
    label: 'Part three',
    title: 'Making the vial',
    stages: ['formulation', 'fill-finish', 'lyophilisation', 'release'],
  },
  {
    key: 'after',
    label: 'Part four',
    title: 'After release',
    stages: ['storage', 'transport', 'vial'],
  },
];

/** How many statements a simple reader sees before the rest fold away. */
const SIMPLE_VISIBLE = 2;

async function loadTopic(key: string): Promise<QualityTopicReading | null> {
  const slug = SLUG_FOR_KEY[key] ?? key;
  const published = await getQualityTopicPage(slug);
  if (published) return published;
  return previewQualityTopic(slug);
}

export default async function SequenceToVialPage() {
  const mode = await getReadingMode();
  // Sequential on purpose. The preview reader shares one staff connection, and
  // concurrent reads on it fail at bind time in development.
  const topics: QualityTopicReading[] = [];
  for (const key of SEQUENCE_TO_VIAL_TOPICS) {
    const topic = await loadTopic(key);
    if (topic) topics.push(topic);
  }
  const simple = mode === 'simple';
  const claims = new Map<string, PublicClaim>();
  for (const topic of topics) for (const claim of topic.claims) claims.set(claim.claimKey, claim);
  const isPreview = topics.some((t) => t.isPreview);

  const stageClaims = (stage: Stage) =>
    stage.claimKeys.map((key) => claims.get(key)).filter((c): c is PublicClaim => c !== undefined);

  const flow: FlowStage[] = STAGES.map((stage) => ({
    key: stage.key,
    lines: stage.lines,
    sourced: stageClaims(stage).length > 0,
  }));
  const sourcedByKey = new Map(flow.map((s) => [s.key, s.sourced]));
  const numberByKey = new Map(STAGES.map((s, i) => [s.key, i + 1]));
  const stageByKey = new Map(STAGES.map((s) => [s.key, s]));
  const checkpoints = CHECKPOINTS.filter((c) => claims.has(c.claimKey));
  const gaps = topics.flatMap((t) => t.gaps);
  const openGaps = gaps.filter(
    (g) => g.resolutionState !== 'resolved' && g.resolutionState !== 'superseded',
  );
  const sourcedCount = flow.filter((s) => s.sourced).length;
  // The finished-vial side of the bulk-versus-vial figure is drawn solid only
  // when every finished-product stage actually loaded claims.
  const finishedSourced = ['formulation', 'fill-finish', 'lyophilisation', 'release'].every(
    (key) => sourcedByKey.get(key) === true,
  );

  return (
    <>
      {/* --- Hero ---------------------------------------------------------------- */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="wide" className="pt-10 pb-4 sm:pt-14">
          <nav aria-label="Breadcrumb" className="text-sm text-slate">
            <Link href="/quality" className="hover:text-deep-tide">
              Quality and testing
            </Link>{' '}
            <span aria-hidden="true">/</span> From sequence to final vial
          </nav>

          <header className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="max-w-[62ch]">
              <p className="meta-label text-tide-teal">The manufacturing story</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
                From sequence to final vial
              </h1>
              <p className="depth-body mt-4 text-lg leading-relaxed text-ink-soft">
                A peptide begins as a sequence of letters and ends as material in a vial. Most of
                what decides its quality happens in between, where nobody holding the vial can see
                it. This page follows the stages in general order, says what each one can get wrong,
                and is plain about the stages no source here describes.
              </p>
            </div>
            <ModeSwitch mode={mode} path="/quality/sequence-to-vial" />
          </header>

          <div className="mt-5 max-w-[68ch]">
            <ModeExplainer mode={mode} />
          </div>

          {isPreview ? (
            <p
              role="note"
              className="mt-5 inline-block rounded-md border border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--color-caution)] uppercase"
            >
              Development preview — awaiting review, not published. Nothing on this page has been
              reviewed by a person.
            </p>
          ) : null}

          <SequenceToVialJourneyIllustration id="s2v-hero-journey" />
        </Container>
      </section>

      <Container width="wide" className="pb-16">
        {topics.length === 0 ? (
          <div className="mt-10 max-w-[66ch]">
            <EmptyState
              headline="No manufacturing topic is published yet"
              detail="The stages below fill in from source-linked records. Until then there is nothing sourced to show, and this page does not substitute unsourced text."
            />
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 lg:grid-cols-2">
          <Callout title="There is no single process">
            <p>
              The same textbook describes research-scale peptides made quickly on automated
              equipment with little process development, and pharmaceutical-scale peptides made
              with extensive development. The flow below is a general order of stages, not a
              description of how any product was made.
            </p>
          </Callout>
          <Callout title="Country of origin is not a quality test">
            <p>
              Where a peptide was made does not tell you whether it was made well. The questions
              that do — who made it, by what process, tested how, recorded where, and handled by
              whom since — can be asked of any manufacturer anywhere, and the harmonised guideline
              held here asks them the same way for every region that adopted it. A good answer and
              a bad one are both possible in any country.
            </p>
          </Callout>
        </div>

        {/* --- The whole flow at a glance ----------------------------------------- */}
        <section aria-labelledby="flow" className="editorial-break mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="flow" className="font-serif text-2xl text-ink sm:text-3xl">
              Fifteen stages at a glance
            </h2>
            <p className="text-sm text-slate">
              <span className="tabular">{sourcedCount}</span> of{' '}
              <span className="tabular">{flow.length}</span> stages described by a held source
            </p>
          </div>
          <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
            {sourcedCount === flow.length
              ? 'Every stage below rests on at least one held source. A stage that lost its sources would be drawn dashed and marked source needed, rather than filled in.'
              : 'Stages without a held source are drawn dashed and listed as source needed, rather than filled in.'}
          </p>
          <div className="mt-5">
            <SequenceToVialFigure stages={flow} />
          </div>
        </section>

        {/* --- Stage by stage, with a sticky stepper ------------------------------ */}
        <section aria-labelledby="stages" className="editorial-break mt-14">
          <h2 id="stages" className="font-serif text-2xl text-ink sm:text-3xl">
            Stage by stage
          </h2>
          <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
            {simple
              ? 'Each stage in plain language, with the first statements shown and the rest a click away. Switch to the practitioner view for the technical wording and the exact source location of every statement.'
              : 'Each stage with all of its source-linked statements, in technical wording, with the location each rests on.'}
          </p>

          <div className="relative mt-6">
            <nav
              aria-label="Stages"
              className="no-print sticky top-16 z-30 -mx-5 border-y border-rule bg-warm-white/95 px-5 backdrop-blur-sm sm:-mx-8 sm:px-8"
            >
              <ol className="scroll-x flex gap-1 py-2">
                {PARTS.map((part, partIndex) =>
                  part.stages.map((key, i) => {
                    const stage = stageByKey.get(key);
                    if (!stage) return null;
                    const sourced = sourcedByKey.get(key) === true;
                    return (
                      <li
                        key={key}
                        className={`shrink-0 ${
                          i === 0 && partIndex > 0 ? 'ml-2 border-l border-rule pl-3' : ''
                        }`}
                      >
                        <a
                          href={`#stage-${key}`}
                          className={`flex items-baseline gap-1.5 rounded-full px-2.5 py-1.5 text-xs whitespace-nowrap transition-colors hover:bg-mist hover:text-deep-tide ${
                            sourced ? 'text-ink-soft' : 'border border-dashed border-rule text-slate'
                          }`}
                        >
                          <span className="tabular text-slate">
                            {String(numberByKey.get(key) ?? 0).padStart(2, '0')}
                          </span>
                          {stage.lines.join(' ')}
                          {sourced ? null : <span className="sr-only"> (source needed)</span>}
                        </a>
                      </li>
                    );
                  }),
                )}
              </ol>
            </nav>

            {PARTS.map((part) => {
              const first = numberByKey.get(part.stages[0] ?? '') ?? 0;
              const last = numberByKey.get(part.stages[part.stages.length - 1] ?? '') ?? 0;
              return (
                <section
                  key={part.key}
                  aria-labelledby={`part-${part.key}`}
                  className="mt-12"
                >
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-rule pb-3">
                    <p className="meta-label text-tide-teal">{part.label}</p>
                    <h3 id={`part-${part.key}`} className="font-serif text-2xl text-deep-tide sm:text-3xl">
                      {part.title}
                    </h3>
                    <p className="text-sm text-slate">
                      Stages <span className="tabular">{first}</span>–
                      <span className="tabular">{last}</span>
                    </p>
                  </div>

                  <ol className="journey-thread mt-2">
                    {part.stages.map((key) => {
                      const stage = stageByKey.get(key);
                      if (!stage) return null;
                      return (
                        <StageBlock
                          key={key}
                          stage={stage}
                          number={numberByKey.get(key) ?? 0}
                          claims={stageClaims(stage)}
                          checkpoints={checkpoints.filter((c) => stage.claimKeys.includes(c.claimKey))}
                          simple={simple}
                        />
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </section>

        {/* --- Checkpoints ------------------------------------------------------ */}
        {checkpoints.length > 0 ? (
          <section aria-labelledby="checkpoints" className="editorial-break mt-16 max-w-[80ch]">
            <h2 id="checkpoints" className="font-serif text-2xl text-ink sm:text-3xl">
              Where checks happen
            </h2>
            <p className="depth-body mt-2 text-ink-soft">
              Checks sit at several points along the flow, not only at the end. Each is marked on its
              stage above.
            </p>
            <div className="mt-5">
              <QualityCheckpointsFigure checkpoints={checkpoints} />
            </div>
          </section>
        ) : null}

        <section aria-labelledby="api-vs-vial" className="mt-14 max-w-[80ch]">
          <h2 id="api-vs-vial" className="font-serif text-2xl text-ink">
            The bulk peptide is not the vial
          </h2>
          <div className="mt-5">
            <ApiVersusVialFigure finishedSourced={finishedSourced} />
          </div>
        </section>

        {/* --- Five things -------------------------------------------------------- */}
        <section aria-labelledby="know" className="editorial-break mt-16">
          <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div>
              <p className="meta-label text-tide-teal">To take away</p>
              <h2 id="know" className="mt-2 font-serif text-3xl text-ink sm:text-4xl">
                Five things worth knowing
              </h2>
              <p className="depth-body mt-3 max-w-[48ch] text-ink-soft">
                None of these can be answered by looking at a vial. Each is a fair question because
                a source says the information is supposed to exist.
              </p>
            </div>
            <ol className="divide-y divide-rule border-y border-rule">
              {KNOW_THE_FIVE.map((item, index) => {
                const claim = claims.get(item.claimKey);
                return (
                  <li key={item.title} className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-5">
                    <span
                      aria-hidden="true"
                      className="tabular font-serif text-3xl leading-none text-tide-teal"
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="meta-label">{item.title}</p>
                      <p className="mt-1.5 font-serif text-xl leading-snug text-ink">
                        {item.question}
                      </p>
                      {claim ? (
                        <p className="mt-2 text-sm text-slate">
                          <span className="font-medium text-ink-soft">Why it is fair to ask: </span>
                          {simple ? (claim.plainLanguageText ?? claim.claimText) : claim.claimText}
                          {simple ? null : (
                            <>
                              {' '}
                              <a
                                href={`#claim-${claim.claimKey}`}
                                className="tabular text-deep-tide underline decoration-rule underline-offset-2"
                              >
                                {claim.claimKey}
                              </a>
                            </>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section aria-labelledby="traceability" className="editorial-break mt-16 max-w-[80ch]">
          <h2 id="traceability" className="font-serif text-2xl text-ink sm:text-3xl">
            Batch, sample, test, document
          </h2>
          <div className="mt-5">
            <BatchTraceabilityFigure />
          </div>
        </section>

        <section aria-labelledby="chain" className="mt-14 max-w-[80ch]">
          <h2 id="chain" className="font-serif text-2xl text-ink">
            Between the test and the vial
          </h2>
          <div className="mt-5">
            <StorageTransportChainFigure />
          </div>
        </section>

        {gaps.length > 0 ? (
          <section aria-labelledby="not-established" className="editorial-break mt-16 max-w-[80ch]">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="not-established" className="font-serif text-2xl text-ink sm:text-3xl">
                Not established here
              </h2>
              <EditorialStateChip kind="source-needed" />
            </div>
            <p className="depth-body mt-2 text-ink-soft">
              What the held sources do not cover, recorded so the gaps are visible rather than
              filled.
            </p>
            <div className="mt-5">
              {simple ? (
                <Disclosure
                  summary="What the sources here do not settle"
                  detail="Each point, and why this index does not make it."
                  count={openGaps.length}
                >
                  <GapCards gaps={openGaps} simple />
                </Disclosure>
              ) : (
                <GapCards gaps={openGaps} simple={false} />
              )}
            </div>
          </section>
        ) : null}

        <nav aria-label="Continue" className="no-print editorial-break mt-16 grid gap-4 sm:grid-cols-2">
          <Link
            href="/quality"
            className="group rounded-xl border border-rule bg-warm-white px-5 py-4 hover:border-tide-teal/60"
          >
            <p className="meta-label">Back to</p>
            <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
              <span aria-hidden="true">← </span>What quality means
            </p>
          </Link>
          <Link
            href="/quality/certificate-of-analysis"
            className="group rounded-xl border border-rule bg-warm-white px-5 py-4 text-right hover:border-tide-teal/60"
          >
            <p className="meta-label">Next</p>
            <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
              Reading the paperwork<span aria-hidden="true"> →</span>
            </p>
          </Link>
        </nav>
      </Container>
    </>
  );
}

function StageBlock({
  stage,
  number,
  claims,
  checkpoints,
  simple,
}: {
  stage: Stage;
  number: number;
  claims: readonly PublicClaim[];
  checkpoints: readonly Checkpoint[];
  simple: boolean;
}) {
  const sourced = claims.length > 0;
  const visible = simple ? claims.slice(0, SIMPLE_VISIBLE) : claims;
  const folded = simple ? claims.slice(SIMPLE_VISIBLE) : [];

  return (
    <li
      id={`stage-${stage.key}`}
      className="grid scroll-mt-32 grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 py-7 sm:gap-x-6"
    >
      <span
        aria-hidden="true"
        className={`tabular relative z-[1] flex h-11 w-11 items-center justify-center rounded-full bg-warm-white font-serif text-lg ${
          sourced
            ? 'border border-tide-teal text-deep-tide'
            : 'border border-dashed border-[var(--color-caution-rule)] text-slate'
        }`}
      >
        {number}
      </span>

      <div className="grid min-w-0 gap-x-10 gap-y-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="text-xs tracking-wide text-slate uppercase">Stage {number}</p>
          <h4 className="mt-0.5 font-serif text-xl text-ink">{stage.name}</h4>
          <p className="depth-body mt-2 font-serif text-lg leading-snug text-ink-soft">
            {stage.question}
          </p>

          {checkpoints.map((checkpoint) => (
            <p
              key={checkpoint.claimKey}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-deep-tide/30 bg-sea-glass/50 px-3 py-1 text-xs text-deep-tide"
            >
              <span aria-hidden="true" className="inline-block h-2 w-2 rotate-45 bg-deep-tide" />
              <span>
                <span className="font-medium">Checkpoint:</span> {checkpoint.label}, {checkpoint.detail}
              </span>
            </p>
          ))}

          {stage.related ? (
            <p className="mt-3 text-sm">
              <span className="text-slate">Read more: </span>
              {stage.related.map((r, i) => (
                <span key={r.href}>
                  {i > 0 ? ' · ' : ''}
                  <Link href={r.href} className="text-deep-tide underline-offset-2 hover:underline">
                    {r.label}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </div>

        <div className="min-w-0 max-w-[70ch] space-y-5">
          {sourced ? (
            <>
              {visible.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} simple={simple} />
              ))}
              {folded.length > 0 ? (
                <Disclosure
                  summary="More from the sources for this stage"
                  count={folded.length}
                >
                  <div className="space-y-5">
                    {folded.map((claim) => (
                      <ClaimCard key={claim.id} claim={claim} simple={simple} />
                    ))}
                  </div>
                </Disclosure>
              ) : null}
            </>
          ) : (
            <EmptyState
              headline="Source needed"
              detail={
                stage.missing ??
                'The records for this stage are not published yet, so nothing is shown in their place.'
              }
            />
          )}

          {/*
            What leaves this stage. It turns a list of topics into a journey,
            and it says nothing about the material beyond naming it —
            everything a stage establishes is in the claims above.
          */}
          {stage.handsOn === undefined ? null : (
            <p className="flex gap-2.5 border-t border-rule-soft pt-3 text-sm text-slate">
              <span aria-hidden="true" className="text-tide-teal">
                ↓
              </span>
              <span>
                <span className="tracking-wide uppercase">Hands on: </span>
                {stage.handsOn}
              </span>
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function GapCards({
  gaps,
  simple,
}: {
  gaps: readonly EvidenceGap[];
  simple: boolean;
}) {
  if (gaps.length === 0) {
    return <p className="text-sm text-slate">Every recorded gap has since been answered.</p>;
  }
  return (
    <ul className="space-y-4">
      {gaps.map((gap) => (
        <li key={gap.id}>
          <SourceNeededCard gap={gap} simple={simple} />
          {!simple && (gap.verificationIssueKey || gap.resolutionState === 'partially_resolved') ? (
            <div className="px-5">
              {gap.resolutionState === 'partially_resolved' ? <GapResolutionNote gap={gap} /> : null}
              {gap.verificationIssueKey ? (
                <p className="mt-1.5 text-xs tracking-wide text-slate uppercase">
                  Tracked as {gap.verificationIssueKey}
                </p>
              ) : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
