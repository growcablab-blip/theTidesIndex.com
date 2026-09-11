import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getQualityTopicPage, type Citation } from '@/server/public/queries';
import { previewQualityTopic } from '@/server/public/preview';
import type { QualityTopicReading } from '@/server/public/quality-topic';
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
import { PrintHeader } from '@/components/public/print-header';
import {
  ChromatographyFlowFigure,
  QualityDimensionsFigure,
} from '@/components/public/quality-figures';
import {
  EvidenceGapList,
  EvidenceLegend,
  RelatedTopicMap,
} from '@/components/public/quality-evidence';
import {
  EvidenceCutoff,
  PreviewBanner,
  ReviewStatusPanel,
} from '@/components/public/record-status';

/**
 * A quality topic.
 *
 * The page is built around the two-sided structure the section depends on:
 * "what this establishes" and "what this does not establish" sit next to each
 * other, given equal weight. Putting the limits in a footnote would let a reader
 * take away only the reassuring half, which is precisely how a purity figure
 * ends up being read as proof of sterility.
 *
 * Three things are stated before any of the content, because each one changes
 * how the rest should be read: how far the record has been checked, that the
 * limits section exists, and what the four evidence treatments mean.
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

/**
 * Published first, then — locally only — the unpublished record.
 *
 * `previewQualityTopic` returns null unless this is a non-production build with
 * the preview explicitly enabled, so in production this is exactly the published
 * lookup it was before.
 */
async function loadTopic(slug: string): Promise<QualityTopicReading | null> {
  const published = await getQualityTopicPage(slug);
  if (published) return published;
  return previewQualityTopic(slug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) return { title: 'Topic not found' };

  return {
    title: topic.name,
    description: topic.shortDescription ?? `What ${topic.name} establishes, and what it does not.`,
    // An unpublished preview must never be indexed even if the site's global
    // noindex is one day lifted.
    ...(topic.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function QualityTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = await getReadingMode();
  const topic = await loadTopic(slug);

  if (!topic) notFound();

  const simple = mode === 'simple';
  const citations: Citation[] = topic.claims.flatMap((claim) =>
    claim.evidence.map((e) => e.citation),
  );
  // The reference list is deduplicated by source, so counting citations would
  // promise ten references and deliver one.
  const referenceCount = new Set(citations.map((c) => c.sourceKey)).size;

  // Only the HPLC page has figures drawn for it. A topic without them simply
  // does not get that section, rather than getting a generic diagram that would
  // imply more than this index knows.
  const hasFigures = topic.slug === 'hplc-purity';

  const contents = [
    { id: 'overview', label: 'In short' },
    { id: 'establishes', label: 'What it establishes' },
    { id: 'limits', label: 'What it does not establish' },
    ...(hasFigures ? [{ id: 'how-it-works', label: 'How the test works' }] : []),
    {
      id: 'evidence',
      label: 'Source-linked detail',
      count: topic.claims.length,
      empty: topic.claims.length === 0,
    },
    {
      id: 'not-established',
      label: 'Not established here',
      count: topic.gaps.length,
      empty: topic.gaps.length === 0,
    },
    ...(hasFigures ? [{ id: 'dimensions', label: 'Separate questions' }] : []),
    {
      id: 'related',
      label: 'Related topics',
      count: topic.relationships.length,
      empty: topic.relationships.length === 0,
    },
    {
      id: 'references',
      label: 'References',
      count: referenceCount,
      empty: referenceCount === 0,
    },
    { id: 'record', label: 'About this record' },
  ];

  return (
    <Container width="wide" className="py-8 sm:py-12">
      <PrintHeader
        title={topic.name}
        mode={mode}
        path={`/quality/${topic.slug}`}
        version={topic.version}
        lastReviewed={formatDate(topic.lastReviewedAt)}
      />

      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-slate">
        <Link href="/quality" className="hover:text-deep-tide">
          Quality and testing
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{topic.name}</span>
      </nav>

      <PreviewBanner state={topic} />

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

        <div className="mt-5 max-w-[68ch] space-y-4">
          <ReviewStatusPanel state={topic} />
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
              <div className="h-full rounded-md border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-5 py-4">
                <p className="text-ink-soft">{topic.whatItProves}</p>
              </div>
            ) : (
              <EmptyState headline="Not yet written." />
            )}
          </Section>

          <Section id="limits" title="What it does not establish">
            {topic.whatItDoesNotProve ? (
              <div className="h-full rounded-md border border-l-[3px] border-[var(--color-caution-rule)] border-l-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4">
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

        {hasFigures ? (
          <Section
            id="how-it-works"
            title="How the test works"
            lede="The mechanism, without numbers. Nothing in this figure asserts anything the sources below do not."
          >
            <ChromatographyFlowFigure />
          </Section>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="evidence"
          title="Source-linked detail"
          lede="Each statement here resolves to an exact location in a named analytical source."
        >
          <div className="mb-5 no-print">
            <EvidenceLegend />
          </div>

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

        {/*
          The section that keeps an absence of evidence from reading as evidence
          of absence. Worded throughout as a statement about this library rather
          than about the world.
        */}
        <Section
          id="not-established"
          title="Not established by the sources held here"
          lede="These are points a reader would reasonably expect this page to settle. The sources currently in this index do not settle them, so the index does not claim to."
        >
          {topic.gaps.length === 0 ? (
            <EmptyState headline="No gaps have been recorded for this topic." />
          ) : (
            <EvidenceGapList gaps={topic.gaps} />
          )}
        </Section>

        {hasFigures ? (
          <Section
            id="dimensions"
            title="Separate questions, separate answers"
            lede="A result for one quality attribute is not an answer about another."
          >
            <QualityDimensionsFigure />
          </Section>
        ) : null}

        <Section
          id="related"
          title="Related quality topics"
          lede="What else this relates to, what it is routinely confused with, and what it does not answer. Each link says which of those it is."
        >
          {topic.relationships.length === 0 ? (
            <EmptyState headline="No relationships have been recorded for this topic yet." />
          ) : (
            <RelatedTopicMap relationships={topic.relationships} />
          )}
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
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Version">{topic.version}</MetaItem>
              <MetaItem label="Review state">{reviewStateLabel(topic.reviewState)}</MetaItem>
              <MetaItem label="Publication">
                {topic.publicationState === 'published' ? 'Published' : 'Not published'}
              </MetaItem>
              <MetaItem label="First published">{formatDate(topic.publishedAt)}</MetaItem>
              <MetaItem label="Last reviewed">{formatDate(topic.lastReviewedAt)}</MetaItem>
              <MetaItem label="Evidence cutoff">
                <EvidenceCutoff value={topic.evidenceCutoffAt} />
              </MetaItem>
            </dl>
            <p className="mt-5 border-t border-rule pt-4 text-sm text-slate">
              Found something wrong?{' '}
              <Link
                href="/corrections"
                className="underline decoration-rule underline-offset-2 hover:text-deep-tide"
              >
                How corrections work
              </Link>
              .
            </p>
          </div>
        </Section>
      </ReferenceLayout>
    </Container>
  );
}

/** The rung, spelled out. Never abbreviated into something that reads stronger. */
function reviewStateLabel(state: string): string {
  return state.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase());
}
