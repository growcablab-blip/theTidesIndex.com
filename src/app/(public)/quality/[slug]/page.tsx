import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getQualityTopicPage, type Citation } from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import {
  Container,
  EmptyState,
  MetaItem,
  Section,
  formatDate,
} from '@/components/public/primitives';
import { ContentsRail, ReferenceLayout } from '@/components/public/contents-rail';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { ClaimCard } from '@/components/public/evidence';
import { ReferenceList } from '@/components/public/citation';

/**
 * A quality topic.
 *
 * The page is built around the two-sided structure the section depends on:
 * "what this establishes" and "what this does not establish" sit next to each
 * other, given equal weight. Putting the limits in a footnote would let a reader
 * take away only the reassuring half, which is precisely how a purity figure
 * ends up being read as proof of sterility.
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getQualityTopicPage(slug);
  if (!topic) return { title: 'Topic not found' };

  return {
    title: topic.name,
    description: topic.shortDescription ?? `What ${topic.name} establishes, and what it does not.`,
  };
}

export default async function QualityTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = await getReadingMode();
  const topic = await getQualityTopicPage(slug);

  if (!topic) notFound();

  const simple = mode === 'simple';
  const citations: Citation[] = topic.claims.flatMap((claim) =>
    claim.evidence.map((e) => e.citation),
  );

  const contents = [
    { id: 'overview', label: 'In short' },
    { id: 'establishes', label: 'What it establishes' },
    { id: 'limits', label: 'What it does not establish' },
    {
      id: 'evidence',
      label: 'Source-linked detail',
      count: topic.claims.length,
      empty: topic.claims.length === 0,
    },
    { id: 'related', label: 'Related topics' },
    { id: 'references', label: 'References', count: citations.length, empty: citations.length === 0 },
    { id: 'record', label: 'About this record' },
  ];

  return (
    <Container width="wide" className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-slate">
        <Link href="/quality" className="hover:text-deep-tide">
          Quality and testing
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{topic.name}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl text-ink sm:text-4xl">{topic.name}</h1>
            {topic.shortDescription ? (
              <p className="mt-2 max-w-[58ch] text-lg text-ink-soft">{topic.shortDescription}</p>
            ) : null}
          </div>
          <ModeSwitch mode={mode} path={`/quality/${topic.slug}`} />
        </div>
        <div className="mt-5 max-w-[64ch]">
          <ModeExplainer mode={mode} />
        </div>
      </header>

      <ReferenceLayout rail={<ContentsRail entries={contents} />}>
        <Section id="overview" title="In short">
          {simple ? (
            topic.simpleSummary ? (
              <p className="max-w-[62ch] text-lg leading-relaxed text-ink-soft">
                {topic.simpleSummary}
              </p>
            ) : (
              <EmptyState
                headline="A plain-language explanation has not been written yet."
                detail="Quality explainers are written from reviewed analytical sources. Several of the sources this topic depends on are still being obtained."
              />
            )
          ) : topic.practitionerSummary ? (
            <p className="max-w-[62ch] text-lg leading-relaxed text-ink-soft">
              {topic.practitionerSummary}
            </p>
          ) : (
            <EmptyState
              headline="A practitioner explanation has not been written yet."
              detail="Method detail is recorded as individual source-linked statements before it is summarised here."
            />
          )}
        </Section>

        {/* The two halves, deliberately adjacent and deliberately equal. */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Section id="establishes" title="What it establishes">
            {topic.whatItProves ? (
              <div className="rounded-md border border-rule bg-warm-white px-5 py-4">
                <p className="text-ink-soft">{topic.whatItProves}</p>
              </div>
            ) : (
              <EmptyState headline="Not yet written." />
            )}
          </Section>

          <Section id="limits" title="What it does not establish">
            {topic.whatItDoesNotProve ? (
              <div className="rounded-md border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-5 py-4">
                <p className="text-ink-soft">{topic.whatItDoesNotProve}</p>
              </div>
            ) : (
              <EmptyState
                headline="Not yet written."
                detail="A topic cannot be published without this half. If you are reading it, something has gone wrong — please report it."
              />
            )}
          </Section>
        </div>

        {topic.commonMisinterpretations ? (
          <Section id="misreadings" title="Common misreadings">
            <div className="max-w-[62ch] rounded-md border border-rule bg-mist px-5 py-4">
              <p className="text-ink-soft">{topic.commonMisinterpretations}</p>
            </div>
          </Section>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="evidence"
          title="Source-linked detail"
          lede="Each statement here resolves to an exact location in a named analytical source."
        >
          {topic.claims.length === 0 ? (
            <EmptyState
              headline="No source-linked statements have been reviewed for this topic yet."
              detail="Analytical statements need a compendial or methods source at an exact page. Several of the references this section depends on are held only as partial copies and are awaiting replacement."
            >
              <p>
                The{' '}
                <Link href="/sources" className="underline decoration-rule underline-offset-2">
                  source register
                </Link>{' '}
                records which copies are usable and which are not.
              </p>
            </EmptyState>
          ) : (
            <div className="space-y-5">
              {topic.claims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} simple={simple} />
              ))}
            </div>
          )}
        </Section>

        <Section
          id="related"
          title="Related topics"
          lede="These answer different questions. A result from one does not substitute for another."
        >
          <ul className="grid gap-3 sm:grid-cols-2">
            {topic.relatedTopics.map((related) => (
              <li key={related.id}>
                <Link
                  href={`/quality/${related.slug}`}
                  className="block rounded-md border border-rule px-4 py-3 text-sm transition-colors hover:border-tide-teal"
                >
                  <span className="font-medium text-deep-tide">{related.name}</span>
                  {related.shortDescription ? (
                    <span className="mt-0.5 block text-slate">{related.shortDescription}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="references" title="References">
          {citations.length === 0 ? (
            <EmptyState headline="No references yet." />
          ) : (
            <ReferenceList citations={citations} />
          )}
        </Section>

        <Section id="record" title="About this record">
          <div className="rounded-md border border-rule bg-mist px-5 py-5">
            <dl className="grid gap-5 sm:grid-cols-3">
              <MetaItem label="Version">{topic.version}</MetaItem>
              <MetaItem label="First published">{formatDate(topic.publishedAt)}</MetaItem>
              <MetaItem label="Last reviewed">{formatDate(topic.lastReviewedAt)}</MetaItem>
            </dl>
          </div>
        </Section>
      </ReferenceLayout>
    </Container>
  );
}
