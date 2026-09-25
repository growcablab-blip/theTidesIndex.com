import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ClaimCard } from '@/components/public/evidence';
import { Container } from '@/components/public/primitives';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { ContentsRail, ReferenceLayout } from '@/components/public/contents-rail';
import {
  EditorialStateChip,
  SourceNeededCard,
  SynthesisCard,
} from '@/components/public/editorial-state';
import { ILLUSTRATIONS, TOPIC_ILLUSTRATIONS } from '@/components/illustrations';
import { journeyStepForTopic, LEARNING_JOURNEY } from '@/domain/learn/journey';
import { getLearningTopic } from '@/server/public/queries';
import { previewLearningTopic } from '@/server/public/preview';
import { getReadingMode } from '@/server/public/reading-mode';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * A learning topic.
 *
 * The first screen answers the question in a drawing and a few plain sentences.
 * Below it, the conclusions the index draws (each naming its claims), then the
 * sourced statements themselves, then what no source held supports. A reader
 * can stop at any band.
 *
 * Simple mode leads with the plain wording and keeps the working behind
 * disclosures; practitioner mode shows interpretation and evidence detail. Both
 * read the same records.
 */
export default async function LearningTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = (await getLearningTopic(slug)) ?? (await previewLearningTopic(slug));
  if (topic === null) notFound();

  const mode = await getReadingMode();
  const simple = mode === 'simple';
  const placement = journeyStepForTopic(slug);
  const drawings = TOPIC_ILLUSTRATIONS[slug] ?? [];
  const openGaps = topic.gaps.filter((g) => g.resolutionState === 'open' || g.resolutionState === 'partially_resolved');
  const answeredGaps = topic.gaps.filter((g) => g.resolutionState === 'resolved' || g.resolutionState === 'superseded');
  const previous = placement && placement.index > 0 ? LEARNING_JOURNEY[placement.index - 1] : undefined;
  const next = placement ? LEARNING_JOURNEY[placement.index + 1] : undefined;

  const rail = [
    { id: 'in-short', label: 'In short' },
    ...(topic.syntheses.length > 0 ? [{ id: 'conclusions', label: 'What follows', count: topic.syntheses.length }] : []),
    { id: 'facts', label: 'What the sources say', count: topic.claims.length },
    { id: 'source-needed', label: 'Source needed', count: openGaps.length, empty: openGaps.length === 0 },
  ];

  return (
    <>
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="page" className="py-9 sm:py-12">
          <nav aria-label="Breadcrumb" className="text-sm text-slate">
            <Link href="/learn" className="hover:text-deep-tide">
              Learn
            </Link>
            {placement ? (
              <>
                {' '}
                <span aria-hidden="true">/</span>{' '}
                <Link href={`/learn#journey`} className="hover:text-deep-tide">
                  Step {placement.index + 1} · {placement.step.question}
                </Link>
              </>
            ) : null}
          </nav>

          {topic.isPreview ? (
            <p
              role="note"
              className="mt-4 inline-block rounded-md border border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--color-caution)] uppercase"
            >
              Unpublished preview — not live
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-[58ch]">
              <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">{topic.title}</h1>
              {topic.summary ? (
                <p className="depth-body mt-4 text-lg leading-relaxed text-ink-soft">{topic.summary}</p>
              ) : null}
              {/* Stated definitionally rather than as a count. A learning topic
                  carries no review_state of its own, so there is no per-record
                  rung to show here; what the reader needs is the distinction
                  itself, which holds whatever the record's status. */}
              <p className="mt-4 max-w-[58ch] border-l-2 border-rule pl-4 text-sm text-slate">
                Every statement on this page is linked to a named source at an exact location. That
                is what makes it public — it is not the same as a person having checked it.
              </p>
            </div>
            <div className="shrink-0">
              <ModeSwitch mode={mode} path={`/learn/${slug}`} />
            </div>
          </div>
          <div className="mt-5">
            <ModeExplainer mode={mode} />
          </div>
        </Container>
      </section>

      <Container width="page" className="py-10 sm:py-14">
        <ReferenceLayout rail={<ContentsRail entries={rail} />}>
          <section id="in-short" className="scroll-mt-24">
            <h2 className="sr-only">In short</h2>
            {drawings.map((key, i) => {
              const Drawing = ILLUSTRATIONS[key];
              // Simple mode shows the first drawing large and keeps the rest; a
              // practitioner already reading the claims gets all of them.
              if (simple && i > 1) return null;
              return <Drawing key={key} id={`${slug}-${key}`} />;
            })}
          </section>

          {topic.syntheses.length > 0 ? (
            <section id="conclusions" className="editorial-break mt-12 scroll-mt-24">
              <h2 className="font-serif text-2xl text-ink sm:text-3xl">What follows from the sources</h2>
              <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
                {simple
                  ? 'Conclusions this index draws by putting several sourced statements together. Each one names them.'
                  : 'Syntheses drawn from the sourced claims below. Each names its claims, adds no value, mechanism, effect or safety conclusion, and states its limit.'}
              </p>
              <div className="mt-6 space-y-5">
                {topic.syntheses.map((s) => (
                  <SynthesisCard key={s.id} synthesis={s} simple={simple} />
                ))}
              </div>
            </section>
          ) : null}

          <section id="facts" className="editorial-break mt-12 scroll-mt-24">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-2xl text-ink sm:text-3xl">What the sources say</h2>
              <EditorialStateChip kind="source-fact" />
            </div>
            <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
              {simple
                ? 'Each statement below is taken from a named source. Open “the source behind this” to see exactly where.'
                : 'Sourced claims, each with its locator, evidence type, primary-trace state and how this index reads the passage.'}
            </p>
            <div className="mt-7 space-y-7">
              {topic.claims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} simple={simple} />
              ))}
            </div>
          </section>

          <section id="source-needed" className="editorial-break mt-12 scroll-mt-24">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">Source needed</h2>
            <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
              Points this topic would make if a source held by the index supported them. It does not
              make them.
            </p>
            {openGaps.length === 0 ? (
              <p className="mt-5 text-sm text-slate">No open gaps are recorded for this topic.</p>
            ) : (
              <div className="mt-6 space-y-4">
                {openGaps.map((gap) => (
                  <SourceNeededCard key={gap.id} gap={gap} simple={simple} />
                ))}
              </div>
            )}
            {answeredGaps.length > 0 ? (
              <details className="tides-disclosure mt-6 rounded-lg border border-rule bg-warm-white px-5 py-3">
                <summary className="cursor-pointer text-sm text-deep-tide">
                  Gaps since answered ({answeredGaps.length})
                </summary>
                <div className="mt-4 space-y-4">
                  {answeredGaps.map((gap) => (
                    <SourceNeededCard key={gap.id} gap={gap} simple={simple} />
                  ))}
                </div>
              </details>
            ) : null}
          </section>

          <nav aria-label="Journey" className="editorial-break mt-14 grid gap-4 sm:grid-cols-2">
            {previous ? (
              <Link
                href={previous.start.href}
                className="group rounded-xl border border-rule bg-warm-white px-5 py-4 hover:border-tide-teal/60"
              >
                <p className="meta-label">Before this</p>
                <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
                  <span aria-hidden="true">← </span>
                  {previous.question}
                </p>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={next.start.href}
                className="group rounded-xl border border-rule bg-warm-white px-5 py-4 text-right hover:border-tide-teal/60"
              >
                <p className="meta-label">Next</p>
                <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
                  {next.question}
                  <span aria-hidden="true"> →</span>
                </p>
              </Link>
            ) : null}
          </nav>
        </ReferenceLayout>
      </Container>
    </>
  );
}
