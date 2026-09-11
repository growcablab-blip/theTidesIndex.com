import Link from 'next/link';
import type { Metadata } from 'next';
import { listQualityTopics } from '@/server/public/queries';
import { Callout, Container, EmptyState } from '@/components/public/primitives';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quality and testing',
  description:
    'What each analytical test establishes about a peptide preparation — and, more importantly, what it does not.',
};

/**
 * The quality section index.
 *
 * The organising idea is stated up front rather than left implicit: purity,
 * identity, content, sterility and endotoxin are five separate questions, and a
 * result answering one says nothing about the other four. Most misreadings of a
 * certificate of analysis come from collapsing them.
 */
export default async function QualityIndexPage() {
  const topics = await listQualityTopics();

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-[62ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Quality and testing</h1>
        <p className="mt-3 text-lg text-ink-soft">
          How a peptide gets from synthesis to a vial, what is tested along the way, and what each
          test can and cannot establish.
        </p>
      </header>

      <div className="mt-8 max-w-[62ch]">
        <Callout title="Why every page here has two halves">
          <p>
            A certificate of analysis is easy to over-read. A high chromatographic purity figure is a
            statement about the sample that was analysed — it is not a statement about identity, nor
            about how much peptide is in the vial, nor about sterility, nor about endotoxin. Those
            are four further questions, each answered by a different test.
          </p>
          <p className="mt-2">
            So every topic in this section states what its test establishes and what it does not. A
            topic that cannot say both is not published.
          </p>
        </Callout>
      </div>

      <div className="mt-10">
        {topics.length === 0 ? (
          <EmptyState
            headline="No quality topics have been published yet."
            detail="Each topic needs a source-linked account of what its test establishes and what it does not, and scientific review, before it appears. Several depend on compendial and regulatory sources that are not yet in the register."
          >
            <p>
              The{' '}
              <Link href="/sources" className="underline decoration-rule underline-offset-2">
                source register
              </Link>{' '}
              shows which analytical references are held and which are awaiting replacement.
            </p>
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {topics.map((topic) => (
              <li key={topic.id}>
                <Link
                  href={`/quality/${topic.slug}`}
                  className="group flex h-full flex-col rounded-md border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal"
                >
                  <p className="font-serif text-lg text-ink group-hover:text-deep-tide">
                    {topic.name}
                  </p>
                  <p className="mt-1.5 flex-1 text-sm text-ink-soft">
                    {topic.shortDescription ?? (
                      <span className="text-slate italic">Orientation line not yet written.</span>
                    )}
                  </p>
                  {topic.needsUpdate ? (
                    <p className="mt-3 text-xs text-[var(--color-caution)]">
                      Flagged for re-review
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Container>
  );
}
