import Link from 'next/link';
import type { Metadata } from 'next';
import { getQualityTopicPage } from '@/server/public/queries';
import { previewQualityTopic } from '@/server/public/preview';
import type { QualityTopicReading } from '@/server/public/quality-topic';
import type { PublicClaim } from '@/server/public/shapes';
import { getReadingMode } from '@/server/public/reading-mode';
import { Callout, Container, EmptyState } from '@/components/public/primitives';
import { ModeSwitch } from '@/components/public/mode-switch';
import { ClaimCard } from '@/components/public/evidence';
import { EvidenceGapList } from '@/components/public/quality-evidence';
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
 * The page is a reading order laid over five quality topics. What a stage
 * *says* comes from claims in those topics, looked up by key, so every sentence
 * a reader takes away has a source location behind it. What is written here is
 * structure: the order of stages, the question each stage answers, and which
 * claims belong to it — the same kind of editorial decision as a pathway.
 *
 * A stage whose claims did not load (unpublished outside preview, or never
 * written because no usable source is held) renders as "source needed" and is
 * drawn dashed in the figure. The flag is computed from what loaded, not
 * declared, so the page cannot claim coverage it does not have.
 */

const TOPIC_SLUGS = SEQUENCE_TO_VIAL_TOPICS;
const STAGES = SEQUENCE_TO_VIAL_STAGES;
type Stage = VialStage;
const KNOW = KNOW_THE_FIVE;
const CHECKPOINTS: readonly Checkpoint[] = VIAL_CHECKPOINTS;

async function loadTopic(slug: string): Promise<QualityTopicReading | null> {
  const published = await getQualityTopicPage(slug);
  if (published) return published;
  return previewQualityTopic(slug);
}

export default async function SequenceToVialPage() {
  const mode = await getReadingMode();
  // Sequential on purpose. The preview reader shares one staff connection, and
  // five concurrent reads on it fail at bind time in development.
  const topics: QualityTopicReading[] = [];
  for (const slug of TOPIC_SLUGS) {
    const topic = await loadTopic(slug);
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
  const checkpoints = CHECKPOINTS.filter((c) => claims.has(c.claimKey));
  const gaps = topics.flatMap((t) => t.gaps);
  const sourcedCount = flow.filter((s) => s.sourced).length;

  return (
    <Container width="wide" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <Link href="/quality" className="hover:text-deep-tide">
          Quality and testing
        </Link>{' '}
        / From sequence to final vial
      </nav>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-[64ch]">
          <p className="meta-label text-tide-teal">Learning pathway two</p>
          <h1 className="mt-2 font-serif text-3xl text-ink sm:text-5xl">From sequence to final vial</h1>
          <p className="mt-4 text-lg text-ink-soft">
            A peptide begins as a sequence of letters and ends as material in a vial. Most of what
            decides its quality happens in between, where nobody holding the vial can see it. This
            page follows the stages in general order, says what each one can get wrong, and is
            plain about the stages no source here describes.
          </p>
        </div>
        <ModeSwitch mode={mode} path="/quality/sequence-to-vial" />
      </header>

      {isPreview ? (
        <p className="mt-6 max-w-[66ch] rounded-md border border-[var(--color-caution)] px-4 py-3 text-sm text-ink-soft">
          Development preview. These records are awaiting review and are not published. Nothing on
          this page has been reviewed by a person.
        </p>
      ) : null}

      {topics.length === 0 ? (
        <div className="mt-10 max-w-[66ch]">
          <EmptyState
            headline="No manufacturing topic is published yet"
            detail="The stages below will fill in from reviewed records. Until then there is nothing sourced to show, and this page does not substitute unsourced text."
          />
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Callout title="There is no single process">
          <p>
            The same textbook describes research-scale peptides made quickly on automated equipment
            with little process development, and pharmaceutical-scale peptides made with extensive
            development. The flow below is a general order of stages, not a description of how any
            product was made.
          </p>
        </Callout>
        <Callout title="Country of origin is not a quality test">
          <p>
            Where a peptide was made does not tell you whether it was made well. The questions that
            do — who made it, by what process, tested how, recorded where, and handled by whom since
            — can be asked of any manufacturer anywhere, and the harmonised guideline held here asks
            them the same way for every region that adopted it. A good answer and a bad one are
            both possible in any country.
          </p>
        </Callout>
      </div>

      <section aria-labelledby="flow" className="mt-14">
        <h2 id="flow" className="font-serif text-2xl text-ink sm:text-3xl">
          The flow
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">
          {sourcedCount} of {flow.length} stages are described by a held source. The rest are drawn
          dashed and listed as source needed, rather than filled in.
        </p>
        <div className="mt-5">
          <SequenceToVialFigure stages={flow} />
        </div>
      </section>

      <section aria-labelledby="stages" className="mt-14">
        <h2 id="stages" className="font-serif text-2xl text-ink sm:text-3xl">
          Stage by stage
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">
          {simple
            ? 'Each stage in plain language. Switch to the practitioner view for the technical wording and the exact source location of every statement.'
            : 'Each stage with its source-linked statements, in technical wording, with the location each rests on.'}
        </p>

        <ol className="mt-8 space-y-10">
          {STAGES.map((stage, index) => {
            const list = stageClaims(stage);
            return (
              <li
                key={stage.key}
                id={`stage-${stage.key}`}
                className="scroll-mt-24 grid gap-x-10 gap-y-4 border-t border-rule pt-6 lg:grid-cols-[18rem_1fr]"
              >
                <div>
                  <span className="text-xs tracking-wide text-slate uppercase">
                    Stage {index + 1}
                  </span>
                  <h3 className="mt-1 font-serif text-xl text-ink">{stage.name}</h3>
                  <p className="mt-2 text-sm text-ink-soft">{stage.question}</p>
                  {stage.related ? (
                    <p className="mt-3 text-sm">
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
                <div className="max-w-[70ch] space-y-5">
                  {list.length > 0 ? (
                    list.map((claim) => <ClaimCard key={claim.id} claim={claim} simple={simple} />)
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
                    What leaves this stage. It turns a list of topics into a
                    journey, and it says nothing about the material beyond
                    naming it — everything a stage establishes is in the
                    claims above.
                  */}
                  {stage.handsOn === undefined ? null : (
                    <p className="flex gap-2.5 text-sm text-slate">
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
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="api-vs-vial" className="mt-16 max-w-[80ch]">
        <h2 id="api-vs-vial" className="font-serif text-2xl text-ink">
          The bulk peptide is not the vial
        </h2>
        <div className="mt-5">
          <ApiVersusVialFigure />
        </div>
      </section>

      {checkpoints.length > 0 ? (
        <section aria-labelledby="checkpoints" className="mt-14 max-w-[80ch]">
          <h2 id="checkpoints" className="font-serif text-2xl text-ink">
            Where checks happen
          </h2>
          <div className="mt-5">
            <QualityCheckpointsFigure checkpoints={checkpoints} />
          </div>
        </section>
      ) : null}

      <section aria-labelledby="know" className="mt-14">
        <h2 id="know" className="font-serif text-2xl text-ink sm:text-3xl">
          Five things worth knowing
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">
          None of these can be answered by looking at a vial. Each is a fair question because a
          source below says the information is supposed to exist.
        </p>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {KNOW.map((item) => {
            const claim = claims.get(item.claimKey);
            return (
              <li key={item.title} className="rounded-md border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-4 py-4">
                <span className="meta-label">{item.title}</span>
                <p className="mt-2 font-serif text-base text-ink">{item.question}</p>
                {claim ? (
                  <p className="mt-2 text-xs text-slate">
                    Why it is fair to ask: {claim.plainLanguageText ?? claim.claimText}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="traceability" className="mt-14 max-w-[80ch]">
        <h2 id="traceability" className="font-serif text-2xl text-ink">
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
        <section aria-labelledby="not-established" className="mt-14 max-w-[80ch]">
          <h2 id="not-established" className="font-serif text-2xl text-ink">
            Not established here
          </h2>
          <p className="mt-2 text-ink-soft">
            What the held sources do not cover, recorded so the gaps are visible rather than filled.
          </p>
          <div className="mt-5">
            <EvidenceGapList gaps={gaps} />
          </div>
        </section>
      ) : null}
    </Container>
  );
}
