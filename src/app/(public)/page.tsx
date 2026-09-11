import Link from 'next/link';
import { getCoverageSnapshot } from '@/server/public/queries';
import { Container, MetaItem } from '@/components/public/primitives';

/**
 * Home.
 *
 * Deliberately restrained. The job of this page is to say what the index is, let
 * someone search, and be honest about how much is in it — not to sell. A
 * reference that oversells its coverage on the front page loses the reader at
 * the first sparse record.
 *
 * The coverage figures are read live rather than written in, so this page cannot
 * claim more than the database actually holds.
 */
/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const snapshot = await getCoverageSnapshot();

  return (
    <>
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="page" className="py-16 sm:py-24">
          <div className="max-w-[54ch]">
            <p className="meta-label">Independent peptide science &amp; clinical reference</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight text-ink">
              Every statement here can be traced to a source, a page, and a review.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              A reference for clinicians and the people they treat. It records what named sources
              actually report, keeps evidence from people separate from evidence from animals, and
              says plainly where the evidence runs out.
            </p>

            <form method="get" action="/search" className="mt-8 flex flex-col gap-3 sm:flex-row">
              <label htmlFor="home-search" className="sr-only">
                Search the index
              </label>
              <input
                id="home-search"
                name="q"
                type="search"
                placeholder="Search a peptide, pathway, route, test or topic…"
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
        </Container>
        <hr className="tide-rule border-0" aria-hidden="true" />
      </section>

      <Container width="page" className="py-14">
        <div className="grid gap-10 lg:grid-cols-[1fr_18rem] lg:gap-16">
          <div>
            <h2 className="font-serif text-2xl text-ink">What makes this different</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <Point title="Provenance, not assertion">
                Nothing is written straight onto a page. Every statement points at a specific
                location in a specific source, and you can follow it back.
              </Point>
              <Point title="Human evidence kept separate">
                Animal and laboratory work is labelled as such wherever it appears. A result in mice
                never reads as a finding in people.
              </Point>
              <Point title="Protocols are never merged">
                Where several sources describe a regimen differently, each is shown attributed to the
                source that reported it. There is no averaged &ldquo;standard protocol&rdquo;,
                because no source stated one.
              </Point>
              <Point title="Uncertainty is a required field">
                A high-impact statement cannot be published without saying what remains unknown about
                it. &ldquo;Not established&rdquo; is an answer.
              </Point>
              <Point title="Two reading depths, one record">
                Plain language for patients, full evidence and source-reported regimens for
                clinicians — over the same reviewed data. The patient view carries no doses, and that
                is enforced at the data layer.
              </Point>
              <Point title="No scores, nothing to sell">
                No evidence ratings out of ten, no vendor rankings, no affiliate links, no products.
              </Point>
            </div>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href="/peptides"
                className="rounded-md border border-deep-tide px-5 py-2.5 text-sm font-medium text-deep-tide transition-colors hover:bg-deep-tide hover:text-warm-white"
              >
                Browse compounds
              </Link>
              <Link
                href="/methodology"
                className="rounded-md border border-rule px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
              >
                How it works
              </Link>
            </div>
          </div>

          <aside>
            <div className="rounded-md border border-rule bg-mist px-5 py-5">
              <p className="meta-label">Coverage right now</p>
              <dl className="mt-3 space-y-4">
                <MetaItem label="Compounds published">{snapshot.publishedPeptides}</MetaItem>
                <MetaItem label="Quality topics published">
                  {snapshot.publishedQualityTopics}
                </MetaItem>
                <MetaItem label="Reviewed statements">{snapshot.publishedClaims}</MetaItem>
                <MetaItem label="Sources registered">{snapshot.registeredSources}</MetaItem>
              </dl>
              <p className="mt-4 border-t border-rule pt-3 text-sm text-slate">
                This index is early, and these numbers are small on purpose — a statement is
                published only once it has been traced and reviewed.{' '}
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

function Point({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-serif text-base text-deep-tide">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}
