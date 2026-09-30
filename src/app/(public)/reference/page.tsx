import Link from 'next/link';
import { getCoverageSnapshot } from '@/server/public/queries';
import { AudiencePaths } from '@/components/public/entry-paths';
import { Container } from '@/components/public/primitives';
import { EditorialStateLegend } from '@/components/public/editorial-state';
import { ProvenanceFigure } from '@/components/public/provenance-figure';
import { JourneyIcon } from '@/components/illustrations/journey-icons';
import { LEARNING_JOURNEY } from '@/domain/learn/journey';

/**
 * Home.
 *
 * Three questions, in the order a stranger asks them, and each has its own
 * movement of the page:
 *
 *   what is this          the promise, the search box, and the depth it goes to
 *   where do I start      the seven questions, as a path rather than a menu
 *   why trust it          the three kinds of statement, the rules, the coverage
 *
 * The page states nothing about any peptide. Every scientific sentence a reader
 * meets is one click away, on a record, with its source attached.
 */
export const dynamic = 'force-dynamic';

/*
 * This was the home page until the public holding experience took `/`. It stays
 * here, reachable by direct route, as the entry to the research application.
 */
export const metadata = { title: 'Research reference' };

const DEPTHS = [
  {
    time: 'In 60 seconds',
    title: 'Understand the subject',
    body: 'A drawing and a few plain sentences per question. No jargon, no doses.',
    href: '/learn',
    cta: 'Start learning',
  },
  {
    time: 'In 5 minutes',
    title: 'Useful in a clinic',
    body: 'What the sources actually report, side by side, with what remains unsettled.',
    href: '/peptides',
    cta: 'Open the register',
  },
  {
    time: 'At depth',
    title: 'Follow the trail',
    body: 'Each statement to a passage in a named source, and how far it was checked.',
    href: '/sources',
    cta: 'See the sources',
  },
] as const;

const RULES = [
  ['Provenance, not assertion', 'Every statement points at a location in a source, and you can follow it back.'],
  ['Human evidence kept separate', 'Animal and laboratory work is labelled wherever it appears. A result in mice never reads as a finding in people.'],
  ['Protocols are never merged', 'Each regimen stays attributed to the source that published it. There is no averaged standard protocol, because no source stated one.'],
  ['Uncertainty is a required field', 'A high-impact statement cannot be published without saying what remains unknown. “Not established” is an answer.'],
  ['Two reading depths, one record', 'Plain language for patients, full evidence for clinicians — over the same source-linked records, with doses withheld in the query.'],
  ['No scores, nothing to sell', 'No ratings out of ten, no vendor rankings, no affiliate links, no products.'],
] as const;

export default async function HomePage() {
  const snapshot = await getCoverageSnapshot();

  return (
    <>
      {/* --- What this is -------------------------------------------------- */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="page" className="py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
            <div className="max-w-[56ch]">
              <p className="meta-label">Independent peptide science &amp; clinical reference</p>
              <h1 className="mt-3 font-serif text-4xl leading-[1.06] text-ink sm:text-5xl">
                What has actually been studied, what was found, and what nobody knows yet.
              </h1>
              <p className="depth-body mt-5 text-lg leading-relaxed text-ink-soft">
                A reference for peptides that records what named sources report, keeps evidence from
                people separate from evidence from animals, and says plainly where the evidence runs
                out — with every statement traceable to a named source at an exact page.
              </p>

              <form method="get" action="/search" className="mt-8 flex flex-col gap-3 sm:flex-row">
                <label htmlFor="home-search" className="sr-only">
                  Search the index
                </label>
                <input
                  id="home-search"
                  name="q"
                  type="search"
                  placeholder="Search a compound, mechanism, route, protocol or research question…"
                  className="w-full rounded-md border border-rule bg-warm-white px-4 py-3 text-base text-ink placeholder:text-slate-light focus:border-tide-teal"
                />
                <button
                  type="submit"
                  className="rounded-md bg-deep-tide px-6 py-3 font-medium text-warm-white transition-colors hover:bg-ink sm:w-auto"
                >
                  Search
                </button>
              </form>
            </div>

            <div className="hidden lg:block">
              <p className="meta-label mb-4">How a statement is built</p>
              <ProvenanceFigure />
            </div>
          </div>

          {/* The progression the whole product is designed around. */}
          <ol className="mt-12 grid gap-4 sm:grid-cols-3">
            {DEPTHS.map((d) => (
              <li key={d.time} className="flex flex-col rounded-xl border border-rule bg-warm-white px-5 py-5">
                <p className="meta-label text-tide-teal">{d.time}</p>
                <p className="mt-1.5 font-serif text-xl text-ink">{d.title}</p>
                <p className="depth-body mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{d.body}</p>
                <Link
                  href={d.href}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-deep-tide underline decoration-tide-teal/40 underline-offset-4 hover:decoration-tide-teal"
                >
                  {d.cta} <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ol>
        </Container>
        <hr className="tide-rule border-0" aria-hidden="true" />
      </section>

      {/* --- Where do I start ---------------------------------------------- */}
      <section>
        <Container width="page" className="py-14 sm:py-18">
          <div className="max-w-[60ch]">
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">Start with a question</h2>
            <p className="depth-body mt-3 text-ink-soft">
              {LEARNING_JOURNEY.length} questions, in the order understanding builds. Follow them through, or enter
              wherever your question already is.
            </p>
          </div>

          <ol className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LEARNING_JOURNEY.map((step, index) => (
              <li key={step.key} className={index === 0 ? 'sm:col-span-2 lg:col-span-2' : ''}>
                <Link
                  href={step.start.href}
                  className="group flex h-full items-start gap-4 rounded-xl border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal/60"
                >
                  <JourneyIcon kind={step.illustration} className="hidden shrink-0 sm:block" />
                  <span className="min-w-0">
                    <span className="meta-label">Step {index + 1}</span>
                    <span className="mt-0.5 block font-serif text-lg leading-snug text-ink group-hover:text-deep-tide">
                      {step.question}
                    </span>
                    {index === 0 ? (
                      <span className="depth-body mt-1 block text-sm leading-relaxed text-ink-soft">
                        {step.brief}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <Link
              href="/learn#journey"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-deep-tide underline decoration-tide-teal/40 underline-offset-4 hover:decoration-tide-teal"
            >
              See the whole path, with what each step rests on <span aria-hidden="true">→</span>
            </Link>
          </div>
        </Container>
      </section>

      {/* --- Two ways in ----------------------------------------------------- */}
      <section className="border-y border-rule bg-mist">
        <Container width="page" className="py-14 sm:py-16">
          <div className="max-w-[62ch]">
            <h2 className="font-serif text-3xl text-ink">Two ways in. One set of records.</h2>
            <p className="depth-body mt-3 text-ink-soft">
              The same source-linked records, read at two depths. Nothing is written for one audience and
              hidden from the other — the plain-language view carries no doses, and that is enforced
              in the query rather than by leaving them off the page.
            </p>
          </div>
          <div className="mt-9">
            <AudiencePaths />
          </div>
        </Container>
      </section>

      {/* --- Why trust it ---------------------------------------------------- */}
      <Container width="page" className="py-14 sm:py-18">
        <div className="max-w-[62ch]">
          <h2 className="font-serif text-3xl text-ink sm:text-4xl">Every page tells you what it is telling you</h2>
          <p className="depth-body mt-3 text-ink-soft">
            Three kinds of statement, marked wherever they appear.
          </p>
        </div>
        <div className="mt-8">
          <EditorialStateLegend />
        </div>

        <div className="editorial-break mt-14 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-16">
          <div>
            <h3 className="font-serif text-2xl text-ink">{RULES.length} rules the database keeps</h3>
            <p className="depth-body mt-2 max-w-[62ch] text-ink-soft">
              Each is enforced in the schema rather than by editorial habit, which is why they hold
              on a bad day.
            </p>
            <dl className="mt-7 grid gap-x-10 gap-y-6 sm:grid-cols-2">
              {RULES.map(([title, body]) => (
                <div key={title} className="border-l-2 border-sea-glass pl-4">
                  <dt className="font-serif text-base text-deep-tide">{title}</dt>
                  <dd className="depth-body mt-1 text-sm leading-relaxed text-ink-soft">{body}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/methodology"
                className="rounded-md border border-deep-tide px-5 py-2.5 text-sm font-medium text-deep-tide transition-colors hover:bg-deep-tide hover:text-warm-white"
              >
                How this works
              </Link>
              <Link
                href="/research"
                className="rounded-md border border-rule px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
              >
                What nobody has shown yet
              </Link>
            </div>
          </div>

          <aside>
            <div className="rounded-xl border border-rule bg-mist px-5 py-5">
              <p className="meta-label">Where this has got to</p>
              <dl className="mt-4 space-y-4">
                <Stat value={snapshot.compoundsInDevelopment} label="compounds in development" />
                <Stat
                  value={snapshot.qualityReferencesWritten}
                  label={`quality references written, of ${String(snapshot.qualityTopicsRegistered)} registered`}
                />
                <Stat
                  value={snapshot.statementsAwaitingReview}
                  label="quality statements extracted and awaiting scientific review"
                />
                <Stat value={snapshot.registeredSources} label="sources registered" />
              </dl>
              {/* Derived, not asserted. This line read "Nothing is published yet"
                  while the counts above it came from the database; the day the
                  library was published it would have contradicted them. */}
              <p className="mt-5 border-t border-rule pt-4 text-sm leading-relaxed text-slate">
                {snapshot.publishedPeptides === 0
                  ? 'Nothing is published yet. '
                  : 'A statement becomes public once it is linked to a named source at an exact location. That is not the same as a person having checked it, and each record says which it has. '}
                <Link
                  href="/coverage"
                  className="underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
                >
                  What is and is not here
                </Link>
                .
              </p>
            </div>
          </aside>
        </div>
      </Container>
    </>
  );
}

/** A number worth reading, sized so it is read before its label. */
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-serif text-3xl leading-none text-deep-tide">{value}</dt>
      <dd className="mt-1.5 text-sm leading-snug text-ink-soft">{label}</dd>
    </div>
  );
}
