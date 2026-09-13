import Link from 'next/link';
import { getCoverageSnapshot } from '@/server/public/queries';
import { ProvenanceFigure } from '@/components/public/provenance-figure';
import { AudiencePaths, TaskGrid } from '@/components/public/entry-paths';
import { Container } from '@/components/public/primitives';

/**
 * Home.
 *
 * The previous version was credible and gave a reader nothing to do: it said
 * what the index is and left them to work out whether any of it was for them.
 * It also reported coverage as published counts, which — with the demonstration
 * fixture correctly excluded — is now zero across the board.
 *
 * So the page answers three questions in order, and each has its own band:
 *
 *   what is here        the promise, the search box, and how a statement is built
 *   who is it for       two ways in, patient and clinician, over one database
 *   what can I do next  six tasks, with the unwritten ones saying so
 *
 * Coverage is now stated as work in progress rather than as publication,
 * because that is what it is. Ten compounds in development and four quality
 * references written is true and useful; "zero published" is true and reads as
 * an empty site; "one published" was neither.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const snapshot = await getCoverageSnapshot();

  return (
    <>
      {/* --- What is here ------------------------------------------------ */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="page" className="py-14 sm:py-20">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-16">
            <div className="max-w-[54ch]">
              <p className="meta-label">Independent peptide science &amp; clinical reference</p>
              <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
                What has actually been studied, what was found, and what nobody knows yet.
              </h1>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                A scientific and clinical reference for peptides. It records what named sources
                report, keeps evidence from people separate from evidence from animals, shows
                whether anybody has repeated a finding, and says plainly where the evidence runs
                out — with every statement traceable to a source, a page and a review.
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
                  className="rounded-md bg-deep-tide px-6 py-3 font-medium text-warm-white sm:w-auto"
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
        </Container>
        <hr className="tide-rule border-0" aria-hidden="true" />
      </section>

      {/* --- Who is it for ----------------------------------------------- */}
      <section className="border-b border-rule bg-warm-white">
        <Container width="page" className="py-14 sm:py-16">
          <div className="max-w-[62ch]">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">
              Two ways in. One set of records.
            </h2>
            <p className="mt-3 text-ink-soft">
              The same reviewed evidence, read at two depths. Nothing is written for one audience
              and hidden from the other — the plain-language view carries no doses, and that is
              enforced in the query rather than by leaving them off the page.
            </p>
          </div>
          <div className="mt-9">
            <AudiencePaths />
          </div>
        </Container>
      </section>

      {/* --- What can I do next ------------------------------------------ */}
      <section className="border-b border-rule bg-mist">
        <Container width="page" className="py-14 sm:py-16">
          <div className="max-w-[62ch]">
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">
              What do you want to understand?
            </h2>
            <p className="mt-3 text-ink-soft">
              Six ways to start. Where a subject is registered and not yet written, the card says
              so rather than leading somewhere empty.
            </p>
          </div>
          <div className="mt-9">
            <TaskGrid />
          </div>
        </Container>
      </section>

      {/* --- What makes this different ------------------------------------ */}
      <Container width="page" className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-16">
          <div>
            <h2 className="font-serif text-2xl text-ink sm:text-3xl">What makes this different</h2>
            <p className="mt-3 max-w-[62ch] text-ink-soft">
              Six rules. Each is enforced by the database rather than by editorial habit, which is
              why they hold on a bad day.
            </p>

            <div className="mt-8 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              <Point title="Provenance, not assertion">
                Nothing is written straight onto a page. Every statement points at a specific
                location in a specific source, and you can follow it back.
              </Point>
              <Point title="Human evidence kept separate">
                Animal and laboratory work is labelled as such wherever it appears. A result in mice
                never reads as a finding in people.
              </Point>
              <Point title="Protocols are never merged">
                Where several sources describe a regimen differently, each is shown attributed to
                the source that reported it. There is no averaged &ldquo;standard protocol&rdquo;,
                because no source stated one.
              </Point>
              <Point title="Uncertainty is a required field">
                A high-impact statement cannot be published without saying what remains unknown
                about it. &ldquo;Not established&rdquo; is an answer.
              </Point>
              <Point title="Two reading depths, one record">
                Plain language for patients, full evidence and source-reported regimens for
                clinicians — over the same reviewed data.
              </Point>
              <Point title="No scores, nothing to sell">
                No evidence ratings out of ten, no vendor rankings, no affiliate links, no products.
              </Point>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/methodology"
                className="rounded-md border border-deep-tide px-5 py-2.5 text-sm font-medium text-deep-tide transition-colors hover:bg-deep-tide hover:text-warm-white"
              >
                How this works
              </Link>
              <Link
                href="/sources"
                className="rounded-md border border-rule px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
              >
                The source register
              </Link>
            </div>
          </div>

          <aside>
            <div className="rounded-lg border border-rule bg-mist px-5 py-5">
              <p className="meta-label">Where this has got to</p>
              <dl className="mt-4 space-y-4">
                <Figure
                  value={snapshot.compoundsInDevelopment}
                  label="compounds in development"
                />
                <Figure
                  value={snapshot.qualityReferencesWritten}
                  label={`quality references written, of ${String(snapshot.qualityTopicsRegistered)} registered`}
                />
                <Figure
                  value={snapshot.statementsAwaitingReview}
                  label="statements extracted and awaiting scientific review"
                />
                <Figure value={snapshot.registeredSources} label="sources registered" />
              </dl>
              <p className="mt-5 border-t border-rule pt-4 text-sm text-slate">
                Nothing is published yet. A statement becomes public only after a named scientific
                reviewer has approved it against the exact version they read.{' '}
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
function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <dt className="font-serif text-3xl leading-none text-deep-tide">{value}</dt>
      <dd className="mt-1.5 text-sm leading-snug text-ink-soft">{label}</dd>
    </div>
  );
}

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-base text-deep-tide">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}
