import Link from 'next/link';
import type { Metadata } from 'next';
import { listQualityRegister, type QualityRegisterEntry } from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import { Container } from '@/components/public/primitives';
import { AnalyticalQuestionsFigure } from '@/components/public/quality-figures';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { SequenceToVialJourneyIllustration } from '@/components/illustrations';
import { QualityMark } from '@/components/public/quality-marks';
import {
  QUALITY_MOVEMENTS,
  isReadable,
  stateLabel,
  type QualityDimension,
} from './quality-dimensions';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quality and testing',
  description:
    'What each analytical test establishes about a peptide preparation — and, more importantly, what it does not.',
};

/**
 * The quality section index.
 *
 * Four movements, in the order a reader meets them:
 *
 *   1. the journey — a sequence becoming a vial, drawn, as the anchor for
 *      everything below;
 *   2. the twelve dimensions of what "quality" means, each marked with whether
 *      this index has written it;
 *   3. the analytical pathway, for a reader holding a report;
 *   4. the full register, by family, with what is unwritten kept visible.
 *
 * State is content here rather than metadata. Every "written" or "not yet
 * written" is read from the register, never declared, so the page cannot say
 * more is finished than is. A topic links once it has evidence behind it;
 * a topic without any is named, quietly, and not linked — there is nothing
 * to read.
 *
 * Grouping into families comes from `quality_topics.family`, deliberately not
 * from the relationship map. A map edge is a claim about how two topics relate
 * and must cite its basis; a family is a shelf somebody put a topic on.
 */

/**
 * The analytical pathway: an editorial argument about reading order, kept here
 * rather than in the database for the same reason families are not derived from
 * the map. The questions are navigation; each answer is on its topic page.
 */
const PATHWAY: readonly { slug: string; step: string; question: string }[] = [
  {
    slug: 'hplc-purity',
    step: 'Start with the number on the report',
    question: 'What does a purity figure actually describe?',
  },
  {
    slug: 'identity-testing',
    step: 'Then ask what the material is',
    question: 'Is this the substance it is supposed to be?',
  },
  {
    slug: 'peptide-content-assay',
    step: 'Then ask how much there is',
    question: 'How much of the target material is present?',
  },
  {
    slug: 'certificate-of-analysis',
    step: 'Then read the document itself',
    question: 'Does this certificate describe what I am holding?',
  },
];

const FAMILIES: readonly { key: string; name: string; blurb: string }[] = [
  {
    key: 'analytical',
    name: 'Analytical characterisation',
    blurb: 'What the material is, how mixed it is, and how much of it there is.',
  },
  {
    key: 'microbiological',
    name: 'Microbiological quality',
    blurb: 'A separate class of question from the analytical tests above.',
  },
  {
    key: 'chemical-physical',
    name: 'Chemical and physical attributes',
    blurb: 'What else is present besides the intended substance.',
  },
  {
    key: 'manufacturing',
    name: 'Manufacturing and traceability',
    blurb: 'How material is made, and whether a batch can be followed.',
  },
  {
    key: 'handling',
    name: 'Storage, transport and administration',
    blurb: 'What happens to a material after it is released.',
  },
  {
    key: 'documents',
    name: 'Reading the documents',
    blurb: 'What a certificate is, and whether it describes the material in hand.',
  },
];

const PARTS = ['Part one', 'Part two', 'Part three', 'Part four'] as const;

export default async function QualityIndexPage() {
  const [register, mode] = await Promise.all([listQualityRegister(), getReadingMode()]);
  const practitioner = mode === 'practitioner';
  const bySlug = new Map(register.map((entry) => [entry.slug, entry]));

  const dimensionCount = QUALITY_MOVEMENTS.reduce((n, m) => n + m.dimensions.length, 0);
  const writtenDimensions = QUALITY_MOVEMENTS.flatMap((m) => m.dimensions).filter((d) =>
    isReadable(bySlug.get(d.topicSlug)),
  ).length;
  // Numbered across movements, computed before render rather than counted in it.
  const dimensionNumbers = new Map(
    QUALITY_MOVEMENTS.flatMap((m) => m.dimensions).map((d, i) => [d.key, i + 1]),
  );

  return (
    <>
      {/* --- The journey, as the anchor --------------------------------------- */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="wide" className="pt-10 pb-6 sm:pt-14">
          <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
            <div className="max-w-[60ch]">
              <p className="meta-label text-tide-teal">Quality and manufacturing</p>
              <h1 className="mt-2 font-serif text-4xl leading-tight text-ink sm:text-5xl">
                Quality and testing
              </h1>
              <p className="depth-body mt-4 text-lg leading-relaxed text-ink-soft">
                How a peptide gets from synthesis to a vial, what is tested along the way, and what
                each test can and cannot establish.
              </p>
            </div>
            <ModeSwitch mode={mode} path="/quality" />
          </div>

          <div className="mt-6 max-w-[68ch]">
            <ModeExplainer mode={mode} />
          </div>

          <SequenceToVialJourneyIllustration id="quality-index-journey" />

          <Link
            href="/quality/sequence-to-vial"
            className="group mb-4 inline-flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-md border border-l-[3px] border-rule border-l-deep-tide bg-warm-white px-5 py-3.5 transition-colors hover:border-deep-tide"
          >
            <span className="font-serif text-lg text-ink group-hover:text-deep-tide">
              Follow the journey, stage by stage
              <span aria-hidden="true"> →</span>
            </span>
            <span className="text-sm text-slate">
              Fifteen stages, where checks sit, and what a batch number should lead to.
            </span>
          </Link>
        </Container>
      </section>

      <Container width="wide" className="pb-14">
        {/* --- The organising idea: two halves --------------------------------- */}
        <section aria-labelledby="two-halves" className="mt-12 sm:mt-16">
          <h2 id="two-halves" className="max-w-[40ch] font-serif text-2xl text-ink sm:text-3xl">
            Why every page here has two halves
          </h2>
          <div className="mt-6 grid overflow-hidden rounded-xl border border-rule lg:grid-cols-2">
            <div className="bg-warm-white px-6 py-5 sm:px-7">
              <p className="meta-label text-tide-teal">What a result says</p>
              <p className="depth-body mt-2 text-ink-soft">
                A certificate of analysis is easy to over-read. A high chromatographic purity figure
                is a statement about the sample that was analysed.
              </p>
            </div>
            <div className="border-t border-dashed border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-6 py-5 sm:px-7 lg:border-t-0 lg:border-l">
              <p className="meta-label text-[var(--color-caution)]">What it does not</p>
              <p className="depth-body mt-2 text-ink-soft">
                It is not a statement about identity, nor about how much peptide is in the vial, nor
                about sterility, nor about endotoxin. Those are four further questions, each
                answered by a different test.
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-[66ch] text-sm text-slate">
            So every topic here states what its test establishes and what it does not. A topic that
            cannot say both is not published.
          </p>
        </section>

        {/* --- Twelve dimensions ------------------------------------------------ */}
        <section aria-labelledby="dimensions" className="editorial-break mt-14">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <h2 id="dimensions" className="font-serif text-2xl text-ink sm:text-3xl">
              What quality means, in {dimensionCount} questions
            </h2>
            <p className="text-sm text-slate">
              <span className="tabular">{writtenDimensions}</span> of{' '}
              <span className="tabular">{dimensionCount}</span> have evidence behind them
            </p>
          </div>
          <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
            Quality is not one property. It is a set of separate questions about how material was
            made, what is in it, and whether it can be followed — each with its own page, and each
            answered, or not, by its own sources.
          </p>

          <div className="mt-8 space-y-10">
            {QUALITY_MOVEMENTS.map((movement, movementIndex) => (
              <div
                key={movement.key}
                className="grid gap-x-10 gap-y-4 border-t border-rule pt-6 lg:grid-cols-[14rem_minmax(0,1fr)]"
              >
                <div>
                  <p className="meta-label">{PARTS[movementIndex]}</p>
                  <h3 className="mt-1 font-serif text-xl text-deep-tide">{movement.title}</h3>
                  <p className="mt-1 text-sm text-slate">{movement.line}</p>
                </div>
                <ol
                  className={`grid gap-3 sm:grid-cols-2 ${
                    movement.dimensions.length >= 3 ? 'xl:grid-cols-3' : ''
                  }`}
                >
                  {movement.dimensions.map((dimension) => (
                    <li key={dimension.key}>
                      <DimensionCard
                        dimension={dimension}
                        number={dimensionNumbers.get(dimension.key) ?? 0}
                        entry={bySlug.get(dimension.topicSlug)}
                        practitioner={practitioner}
                      />
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </section>

        {/* --- The analytical pathway ----------------------------------------- */}
        <section aria-labelledby="start-here" className="editorial-break mt-16">
          <div className="grid gap-x-12 gap-y-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div>
              <p className="meta-label text-tide-teal">If you are holding a report</p>
              <h2 id="start-here" className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
                Understanding analytical testing
              </h2>
              <p className="depth-body mt-2 max-w-[56ch] text-ink-soft">
                Four pages, in order. They follow the questions a test report raises rather than the
                order a laboratory would teach them.
              </p>

              <ol className="journey-thread mt-6 space-y-2">
                {PATHWAY.map((step, index) => {
                  const entry = bySlug.get(step.slug);
                  const readable = isReadable(entry);
                  const inner = (
                    <>
                      <span
                        aria-hidden="true"
                        className="tabular relative z-[1] flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-tide-teal bg-warm-white font-serif text-lg text-deep-tide"
                      >
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 pt-0.5">
                        <span className="block text-xs tracking-wide text-slate uppercase">
                          <span className="sr-only">Step {index + 1}: </span>
                          {step.step}
                        </span>
                        <span className="mt-0.5 block font-serif text-lg text-ink group-hover:text-deep-tide">
                          {entry?.name ?? step.slug}
                        </span>
                        <span className="mt-0.5 block text-sm text-ink-soft">{step.question}</span>
                        {entry ? (
                          <span className="mt-1 block text-xs text-slate">
                            {stateLabel(entry).label}
                          </span>
                        ) : null}
                      </span>
                    </>
                  );
                  return (
                    <li key={step.slug}>
                      {readable ? (
                        <Link
                          href={`/quality/${step.slug}`}
                          className="group flex gap-4 rounded-lg px-1 py-3 transition-colors hover:bg-mist"
                        >
                          {inner}
                        </Link>
                      ) : (
                        <div className="flex gap-4 px-1 py-3 opacity-80">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="min-w-0 lg:pt-10">
              <h3 className="font-serif text-lg text-ink">
                Three questions a report answers separately
              </h3>
              <p className="mt-1 text-sm text-slate">
                The first three pages. A result for one is not an answer about another.
              </p>
              <div className="mt-4">
                <AnalyticalQuestionsFigure id="fig-quality-index" />
              </div>
            </div>
          </div>
        </section>

        {/* --- The register, by family ------------------------------------------ */}
        <section aria-labelledby="everything-else" className="editorial-break mt-16">
          <h2 id="everything-else" className="font-serif text-2xl text-ink sm:text-3xl">
            The full topic directory
          </h2>
          <p className="depth-body mt-2 max-w-[64ch] text-ink-soft">
            Every topic this index recognises, and how far each has got. Where no source has been
            captured yet a topic is named but not linked — what is unwritten is listed rather than
            hidden.
          </p>

          <div className="mt-8">
            {FAMILIES.map((family) => {
              const topics = register.filter((entry) => entry.family === family.key);
              if (topics.length === 0) return null;
              const readable = topics.filter((entry) => isReadable(entry));
              const unwritten = topics.filter((entry) => !isReadable(entry));

              return (
                <div
                  key={family.key}
                  className="grid gap-x-10 gap-y-3 border-t border-rule py-6 lg:grid-cols-[16rem_minmax(0,1fr)]"
                >
                  <div>
                    <h3 className="font-serif text-lg text-deep-tide">{family.name}</h3>
                    <p className="mt-1 text-sm text-slate">{family.blurb}</p>
                    <p className="mt-2 text-xs text-slate">
                      <span className="tabular">{readable.length}</span> of{' '}
                      <span className="tabular">{topics.length}</span> with evidence captured
                    </p>
                  </div>

                  <div className="min-w-0">
                    {readable.length > 0 ? (
                      <ul className="grid gap-x-8 sm:grid-cols-2">
                        {readable.map((entry) => (
                          <li key={entry.id} className="border-b border-rule-soft">
                            <Link
                              href={`/quality/${entry.slug}`}
                              className="group flex items-baseline justify-between gap-3 py-2.5"
                            >
                              <span className="min-w-0">
                                <span className="block font-medium text-ink group-hover:text-deep-tide">
                                  {entry.name}
                                </span>
                                <TopicState entry={entry} practitioner={practitioner} />
                              </span>
                              <span
                                aria-hidden="true"
                                className="shrink-0 text-tide-teal transition-transform group-hover:translate-x-0.5"
                              >
                                →
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {unwritten.length > 0 ? (
                      <div className={readable.length > 0 ? 'mt-4' : ''}>
                        <p className="meta-label">Not yet written</p>
                        <ul className="mt-2 flex flex-wrap gap-2">
                          {unwritten.map((entry) => (
                            // Named, not hidden, and not a link: there is nothing
                            // to read. A reader still learns the question exists.
                            <li
                              key={entry.id}
                              className="rounded-md border border-dashed border-rule bg-mist px-3 py-1.5 text-sm"
                            >
                              <span className="text-ink-soft">{entry.name}</span>
                              <span className="ml-2 text-xs text-slate">
                                {stateLabel(entry).label}
                              </span>
                              {entry.needsUpdate ? (
                                <span className="ml-2 text-xs text-[var(--color-caution)]">
                                  Flagged for re-review
                                </span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <p className="mt-10 max-w-[62ch] text-sm text-slate">
          Where a topic is unwritten, this index has usually recorded why: most often a compendial
          or regulatory reference it does not hold. The{' '}
          <Link href="/sources" className="underline decoration-rule underline-offset-2">
            source register
          </Link>{' '}
          records which are held, which are awaiting replacement, and which require access this
          index does not have.
        </p>
      </Container>
    </>
  );
}

function DimensionCard({
  dimension,
  number,
  entry,
  practitioner,
}: {
  dimension: QualityDimension;
  number: number;
  entry: QualityRegisterEntry | undefined;
  practitioner: boolean;
}) {
  const readable = isReadable(entry);
  // A dimension covered inside another topic links to its stage in the journey,
  // where its own claims are shown; the others link to their topic page.
  const href =
    dimension.withinTopic === true && dimension.stage !== undefined
      ? `/quality/sequence-to-vial#stage-${dimension.stage}`
      : `/quality/${dimension.topicSlug}`;

  const stateText = !entry
    ? 'Not yet written'
    : readable && dimension.withinTopic === true
      ? `Within ${entry.name}`
      : readable
        ? stateLabel(entry).label
        : `Not yet written · ${stateLabel(entry).label}`;

  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <QualityMark kind={dimension.key} className={readable ? '' : 'opacity-50'} />
        <span className="tabular text-xs text-slate" aria-hidden="true">
          {String(number).padStart(2, '0')}
        </span>
      </div>
      <span className="mt-3 block font-serif text-lg text-ink group-hover:text-deep-tide">
        {dimension.name}
      </span>
      <span className="mt-1 block flex-1 text-sm text-ink-soft">{dimension.question}</span>
      <span
        className={`mt-3 block text-xs ${readable ? 'text-deep-tide' : 'text-slate'}`}
      >
        {stateText}
      </span>
      {practitioner && entry && readable && dimension.withinTopic !== true ? (
        <span className="mt-0.5 block text-xs text-slate">
          <span className="tabular">{entry.claimCount}</span> claim
          {entry.claimCount === 1 ? '' : 's'} · <span className="tabular">{entry.gapCount}</span>{' '}
          recorded gap{entry.gapCount === 1 ? '' : 's'}
        </span>
      ) : null}
    </>
  );

  return readable ? (
    <Link
      href={href}
      className="group flex h-full flex-col rounded-xl border border-rule bg-warm-white px-4 py-4 transition-colors hover:border-tide-teal"
    >
      {body}
    </Link>
  ) : (
    <div className="flex h-full flex-col rounded-xl border border-dashed border-rule bg-mist px-4 py-4">
      {body}
    </div>
  );
}

function TopicState({
  entry,
  practitioner,
}: {
  entry: QualityRegisterEntry;
  practitioner: boolean;
}) {
  const state = stateLabel(entry);
  return (
    <span className="mt-0.5 block text-xs text-slate">
      <span className={state.tone === 'ready' ? 'text-deep-tide' : ''}>{state.label}</span>
      {practitioner && (entry.claimCount > 0 || entry.gapCount > 0) ? (
        // Counts are a practitioner's orientation, not a reader's. A number of
        // claims tells somebody assessing the section how much is behind a
        // topic; to everyone else it reads like a score.
        <>
          {' · '}
          <span className="tabular">{entry.claimCount}</span> claim
          {entry.claimCount === 1 ? '' : 's'} · <span className="tabular">{entry.gapCount}</span>{' '}
          recorded gap{entry.gapCount === 1 ? '' : 's'}
        </>
      ) : null}
      {entry.needsUpdate ? (
        <span className="text-[var(--color-caution)]"> · Flagged for re-review</span>
      ) : null}
    </span>
  );
}
