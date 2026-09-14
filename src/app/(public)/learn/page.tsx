import Link from 'next/link';
import type { Metadata } from 'next';
import { Callout, Container } from '@/components/public/primitives';
import { EditorialStateLegend } from '@/components/public/editorial-state';
import { ChainScaleIllustration } from '@/components/illustrations';
import { JourneyIcon } from '@/components/illustrations/journey-icons';
import { LEARNING_JOURNEY } from '@/domain/learn/journey';
import { listLearningTopics } from '@/server/public/queries';
import { previewLearningTopics } from '@/server/public/preview';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'Understand peptides in the order understanding builds: what they are, how they signal and move through the body, how they are made and tested, and what the evidence says.',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * The Learn hub.
 *
 * Answers four questions at once: what can I learn here, where do I start, how
 * deep can I go, and how does it fit together. The journey is the spine — seven
 * questions in the order understanding builds — and every step points at pages
 * the index already holds, so the hub cannot run ahead of its records.
 *
 * No claim about any peptide is made on this page. The foundations it lists are
 * learning topics whose statements are sourced claims, named syntheses and
 * recorded gaps, and the counts beside them come from the database.
 */

const DEPTHS = [
  {
    label: 'In a minute',
    title: 'The idea',
    body: 'A drawing and a few plain sentences. Enough to follow a conversation.',
  },
  {
    label: 'In five minutes',
    title: 'What a clinic can use',
    body: 'The sourced statements, what they rest on, and what remains unknown.',
  },
  {
    label: 'At depth',
    title: 'The source trail',
    body: 'Every statement traced to a passage in a named source, and how far it was checked.',
  },
] as const;

const DEEPER = [
  { href: '/methodology', title: 'How this index works', body: 'Extraction, locators, review states and the gates a statement passes.' },
  { href: '/editorial-policy', title: 'Editorial policy', body: 'Why it never averages regimens and never issues a dose.' },
  { href: '/coverage', title: 'What is and is not here', body: 'What has been extracted, what awaits review, what has not been attempted.' },
  { href: '/sources', title: 'The source register', body: 'Every source held, including the copies that proved unusable.' },
] as const;

export default async function LearnPage() {
  const published = await listLearningTopics();
  const topics = published.length > 0 ? published : ((await previewLearningTopics()) ?? []);
  const topicBySlug = new Map(topics.map((t) => [t.slug, t]));
  const totals = topics.reduce(
    (acc, t) => ({
      claims: acc.claims + t.claimCount,
      syntheses: acc.syntheses + t.synthesisCount,
      gaps: acc.gaps + t.gapCount,
    }),
    { claims: 0, syntheses: 0, gaps: 0 },
  );

  return (
    <>
      {/* --- Hero ----------------------------------------------------------- */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="page" className="py-12 sm:py-16">
          <p className="meta-label text-tide-teal">Learn</p>
          <div className="mt-3 grid items-end gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="max-w-[56ch]">
              <h1 className="font-serif text-4xl leading-[1.08] text-ink sm:text-5xl">
                Understand peptides in the order understanding builds
              </h1>
              <p className="depth-body mt-5 text-lg leading-relaxed text-ink-soft">
                Seven questions, from what a peptide is to how reported protocols differ. Stop after
                any of them. Every statement you meet on the way is either a sourced fact, a named
                conclusion drawn from several of them, or an honest gap.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/learn/what-is-a-peptide"
                  className="rounded-md bg-deep-tide px-5 py-2.5 text-sm font-medium text-warm-white transition-colors hover:bg-ink"
                >
                  Start at the beginning
                </Link>
                <Link
                  href="#journey"
                  className="rounded-md border border-rule bg-warm-white px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
                >
                  See the whole path
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <ChainScaleIllustration id="learn-hero-chain" minWidth={420} />
            </div>
          </div>

          <ol className="mt-10 grid gap-3 sm:grid-cols-3" aria-label="How deep you can go">
            {DEPTHS.map((d, i) => (
              <li key={d.label} className="rounded-lg border border-rule-soft bg-warm-white/80 px-4 py-3.5">
                <p className="meta-label">
                  <span className="tabular mr-1.5 text-tide-teal">{String(i + 1)}</span>
                  {d.label}
                </p>
                <p className="mt-1 font-serif text-lg text-ink">{d.title}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">{d.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* --- The journey ---------------------------------------------------- */}
      <section id="journey" className="scroll-mt-24">
        <Container width="page" className="py-14 sm:py-20">
          <div className="max-w-[60ch]">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">The path through it</h2>
            <p className="depth-body mt-3 text-ink-soft">
              Each question builds on the one before. The pages behind them are connected, so you
              can also enter anywhere and follow the links back.
            </p>
          </div>

          <ol className="journey-thread mt-10 space-y-5">
            {LEARNING_JOURNEY.map((step, index) => {
              const counts = [step.start, ...step.more]
                .map((l) => (l.href.startsWith('/learn/') ? topicBySlug.get(l.href.slice(7)) : undefined))
                .filter((t) => t !== undefined);
              const claims = counts.reduce((n, t) => n + t.claimCount, 0);
              return (
                <li key={step.key} className="relative grid gap-4 sm:grid-cols-[2.75rem_minmax(0,1fr)] sm:gap-6">
                  <div className="relative z-10 hidden h-11 w-11 items-center justify-center rounded-full border border-tide-teal/40 bg-warm-white font-serif text-lg text-deep-tide sm:flex">
                    {index + 1}
                  </div>
                  <div className="group rounded-xl border border-rule bg-warm-white px-5 py-5 transition-colors hover:border-tide-teal/60 sm:px-7">
                    <div className="flex items-start gap-5">
                      <JourneyIcon kind={step.illustration} className="mt-1 hidden shrink-0 sm:block" />
                      <div className="min-w-0 flex-1">
                        <p className="meta-label sm:hidden">Step {index + 1}</p>
                        <h3 className="font-serif text-2xl text-ink">
                          <Link href={step.start.href} className="hover:text-deep-tide">
                            {step.question}
                          </Link>
                        </h3>
                        <p className="depth-body mt-1.5 max-w-[64ch] leading-relaxed text-ink-soft">{step.brief}</p>
                        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                          <Link
                            href={step.start.href}
                            className="inline-flex items-center gap-1.5 font-medium text-deep-tide underline decoration-tide-teal/40 underline-offset-4 hover:decoration-tide-teal"
                          >
                            {step.start.label}
                            <span aria-hidden="true">→</span>
                          </Link>
                          {step.more.map((l) => (
                            <Link key={l.href} href={l.href} className="text-ink-soft hover:text-deep-tide">
                              {l.label}
                            </Link>
                          ))}
                          {claims > 0 ? (
                            <span className="depth-dense tabular text-2xs text-slate">
                              {claims} sourced statements
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* --- Three editorial states ----------------------------------------- */}
      <section className="border-y border-rule bg-mist">
        <Container width="page" className="py-14 sm:py-16">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-14">
            <div>
              <h2 className="font-serif text-3xl text-ink">Three kinds of statement</h2>
              <p className="depth-body mt-3 leading-relaxed text-ink-soft">
                Every page marks what it is telling you. A fact carries its source; a conclusion drawn
                from several facts names each one; a point no source supports is not made, and says so.
              </p>
            </div>
            <EditorialStateLegend />
          </div>
        </Container>
      </section>

      {/* --- Foundations ------------------------------------------------------ */}
      <Container width="page" className="editorial-break mt-16 py-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-[60ch]">
            <h2 className="font-serif text-3xl text-ink">The foundations</h2>
            <p className="depth-body mt-2 text-ink-soft">
              The general science behind every compound record, written from open-access sources.
            </p>
          </div>
          {topics.length > 0 ? (
            <p className="depth-dense tabular text-sm text-slate">
              {totals.claims} sourced statements · {totals.syntheses} syntheses · {totals.gaps} open gaps
            </p>
          ) : null}
        </div>

        {topics.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-rule bg-mist px-5 py-4 text-sm text-slate">
            The foundation topics are awaiting scientific review and are not published yet.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/learn/${t.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal/60"
                >
                  <p className="font-serif text-lg leading-snug text-ink group-hover:text-deep-tide">{t.title}</p>
                  {t.summary ? (
                    <p className="mt-1.5 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-soft">{t.summary}</p>
                  ) : (
                    <span className="flex-1" />
                  )}
                  <p className="tabular mt-3 text-2xs tracking-[0.04em] text-slate">
                    {t.claimCount} facts
                    {t.synthesisCount > 0 ? ` · ${String(t.synthesisCount)} synthesis` : ''}
                    {t.gapCount > 0 ? ` · ${String(t.gapCount)} source needed` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>

      {/* --- More ways in -------------------------------------------------- */}
      <Container width="page" className="editorial-break mt-16 py-6">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <section aria-labelledby="visual">
            <h2 id="visual" className="font-serif text-2xl text-ink">
              Learn by looking
            </h2>
            <p className="mt-2 text-ink-soft">
              Every drawing in the index in one place — each schematic, without values, and captioned
              with what it rests on.
            </p>
            <Link
              href="/learn/figures"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-deep-tide underline decoration-tide-teal/40 underline-offset-4 hover:decoration-tide-teal"
            >
              Open the figure library <span aria-hidden="true">→</span>
            </Link>
          </section>
          <section aria-labelledby="books">
            <h2 id="books" className="font-serif text-2xl text-ink">
              The publications
            </h2>
            <p className="mt-2 text-ink-soft">
              Five volumes generated from the same records, so a printed page and a web page cannot
              disagree. None is published yet.
            </p>
            <Link
              href="/learn/publications"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-deep-tide underline decoration-tide-teal/40 underline-offset-4 hover:decoration-tide-teal"
            >
              See the volumes and how far each has got <span aria-hidden="true">→</span>
            </Link>
          </section>
        </div>

        <section aria-labelledby="deeper" className="mt-14">
          <h2 id="deeper" className="font-serif text-2xl text-ink">
            How the index is built
          </h2>
          <ul className="mt-5 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {DEEPER.map((d) => (
              <li key={d.href} className="border-l-2 border-rule pl-4">
                <Link href={d.href} className="font-serif text-lg text-ink hover:text-deep-tide">
                  {d.title}
                </Link>
                <p className="text-sm text-ink-soft">{d.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-12 max-w-[70ch]">
          <Callout title="Nothing here is advice">
            <p>
              This index is a reference. It does not recommend treatment, it does not sell anything,
              and it is not a substitute for a clinician who knows your history.
            </p>
          </Callout>
        </div>
      </Container>
    </>
  );
}
