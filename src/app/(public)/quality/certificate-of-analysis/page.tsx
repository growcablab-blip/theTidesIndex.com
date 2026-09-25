import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getQualityTopicPage, getSpecimenCertificate } from '@/server/public/queries';
import { previewQualityTopic, previewSpecimenCertificate } from '@/server/public/preview';
import { transparencyDimensions } from '@/server/public/certificate';
import type { CertificateReading } from '@/server/public/certificate';
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
import { ReferenceList } from '@/components/public/citation';
import { ClaimCard } from '@/components/public/evidence';
import { PrintHeader } from '@/components/public/print-header';
import {
  AnnotatedCertificate,
  ChainOfCustodyFigure,
  SpecimenNotice,
  TransparencyDimensions,
} from '@/components/public/certificate';
import { AnalyticalQuestionsFigure } from '@/components/public/quality-figures';
import {
  EvidenceGapList,
  EvidenceLegend,
  RelatedTopicMap,
} from '@/components/public/quality-evidence';
import { EvidenceCutoff, PreviewBanner, ReviewStatusPanel } from '@/components/public/record-status';
import { CertificateTestList, DocumentTypes, QuestionsToAsk } from './sections';

/**
 * Reading a certificate of analysis.
 *
 * The one page a reader is most likely to arrive at holding something in their
 * hand. Everything else in the quality section answers a question they have
 * already formed; this answers the question they actually have, which is "what
 * am I looking at".
 *
 * Its job is to make "99% purity" feel like one data point rather than the
 * conclusion of a quality evaluation — so the analytical topics are reached
 * *through* the document rather than the other way round, and the document's
 * omissions are given as much room as its results.
 *
 * The certificate rendered here is fictional and says so repeatedly, in its
 * title, in a notice above it, and on the artefact itself. A screenshot of any
 * part of it should be unusable as a real report.
 */

export const dynamic = 'force-dynamic';

// The topic's slug, not its key: `coa-literacy` is the key, and the lookup is
// by slug. This static route shadows /quality/[slug] for the same record.
const TOPIC_SLUG = 'certificate-of-analysis';
const SPECIMEN_KEY = 'specimen-third-party-report';

async function loadTopic(): Promise<QualityTopicReading | null> {
  return (await getQualityTopicPage(TOPIC_SLUG)) ?? previewQualityTopic(TOPIC_SLUG);
}

async function loadSpecimen(): Promise<CertificateReading | null> {
  return (await getSpecimenCertificate(SPECIMEN_KEY)) ?? previewSpecimenCertificate(SPECIMEN_KEY);
}

export async function generateMetadata(): Promise<Metadata> {
  const topic = await loadTopic();
  if (!topic) return { title: 'Certificate of analysis' };
  return {
    title: 'Certificate of analysis',
    description:
      'What a certificate of analysis is, what it reports, and whether it describes the material in front of you.',
    ...(topic.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

export default async function CertificatePage() {
  const mode = await getReadingMode();
  const [topic, specimen] = await Promise.all([loadTopic(), loadSpecimen()]);

  if (!topic) notFound();

  const simple = mode === 'simple';
  const citations = topic.claims.flatMap((claim) => claim.evidence.map((e) => e.citation));
  const referenceCount = new Set(citations.map((c) => c.sourceKey)).size;
  const dimensions = specimen ? transparencyDimensions(specimen) : [];

  const contents = [
    { id: 'overview', label: 'In short' },
    { id: 'document-types', label: 'Which document is it?' },
    { id: 'specimen', label: 'A specimen, annotated', empty: specimen === null },
    { id: 'chain', label: 'Which batch was tested?' },
    { id: 'results', label: 'What the tests address', count: specimen?.tests.length ?? 0 },
    { id: 'questions', label: 'Three different questions' },
    { id: 'transparency', label: 'What the document carries', count: dimensions.length },
    { id: 'document-vs-product', label: 'Document ≠ product' },
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
    { id: 'ask', label: 'Questions to ask' },
    { id: 'related', label: 'Related topics', count: topic.relationships.length },
    { id: 'references', label: 'References', count: referenceCount },
    { id: 'record', label: 'About this record' },
  ];

  return (
    <Container width="wide" className="py-8 sm:py-12">
      <PrintHeader
        title="Certificate of analysis"
        mode={mode}
        path="/quality/certificate-of-analysis"
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
        <span className="text-ink-soft">Certificate of analysis</span>
      </nav>

      <PreviewBanner state={topic} />

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl text-ink sm:text-4xl">Certificate of analysis</h1>
            <p className="mt-2 max-w-[62ch] text-lg text-ink-soft">
              {topic.shortDescription ??
                'What the document is, what it reports, and whether it describes the material in front of you.'}
            </p>
          </div>
          <ModeSwitch mode={mode} path="/quality/certificate-of-analysis" />
        </div>

        <div className="mt-5 max-w-[68ch] space-y-4">
          <ReviewStatusPanel state={topic} />
          <ModeExplainer mode={mode} />
        </div>
      </header>

      <ReferenceLayout rail={<ContentsRail entries={contents} />}>
        <Section id="overview" title="In short">
          <p className="max-w-[62ch] text-lg leading-relaxed text-ink-soft">
            {(simple ? topic.simpleSummary : topic.practitionerSummary) ??
              topic.simpleSummary ??
              ''}
          </p>
        </Section>

        <Section
          id="document-types"
          title="Which document is it?"
          lede="“Certificate of analysis” is used loosely. These are different documents, issued by different parties, answering different questions — and a file named COA tells you which one it is only if you read it."
        >
          <DocumentTypes current={specimen?.certificateType ?? null} />
        </Section>

        {specimen ? (
          <Section
            id="specimen"
            title="A specimen, annotated"
            lede="Every value below was invented for this page. It is deliberately imperfect: what it leaves out is the part worth learning."
          >
            <div className="space-y-5">
              <SpecimenNotice />
              <AnnotatedCertificate certificate={specimen} simple={simple} />
            </div>
          </Section>
        ) : (
          <Section id="specimen" title="A specimen, annotated">
            <EmptyState headline="The specimen document is not available." />
          </Section>
        )}

        <Section
          id="chain"
          title="Which batch was actually tested?"
          lede="The question the whole page turns on. A certificate describes a sample; whether that sample came from the material in front of you is a separate matter, and the document can only state it."
        >
          {specimen ? (
            <ChainOfCustodyFigure certificate={specimen} />
          ) : (
            <EmptyState headline="No specimen to trace." />
          )}
        </Section>

        <Section
          id="results"
          title="What each test actually addresses"
          lede="Every result answers one question. Following a result to its topic is how a reader finds out which."
        >
          {specimen ? (
            <CertificateTestList tests={specimen.tests} simple={simple} />
          ) : (
            <EmptyState headline="No specimen to read." />
          )}
        </Section>

        <Section
          id="questions"
          title="Three different questions"
          lede="The three analytical attributes a certificate most often reports. A result for one is not an answer about another."
        >
          <AnalyticalQuestionsFigure id="fig-coa-triangle" />
        </Section>

        <Section
          id="transparency"
          title="What the document carries, and what it leaves out"
          lede="These are dimensions of what a document states — not a score, and not a judgement about the material it describes."
        >
          {dimensions.length > 0 ? (
            <TransparencyDimensions dimensions={dimensions} />
          ) : (
            <EmptyState headline="No specimen to assess." />
          )}
        </Section>

        <Section id="document-vs-product" title="A complete document is not a good product">
          <div className="grid max-w-[76ch] gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-rule bg-warm-white px-5 py-4">
              <p className="font-medium text-ink">A document can be complete and the material poor.</p>
              <p className="mt-1.5 text-sm text-ink-soft">
                Everything a certificate states can be present, correctly formatted and properly
                signed, and still describe a sample that is not the material in front of you — or a
                material whose attributes were never tested for.
              </p>
            </div>
            <div className="rounded-md border border-rule bg-warm-white px-5 py-4">
              <p className="font-medium text-ink">
                A sparse document does not make a result wrong.
              </p>
              <p className="mt-1.5 text-sm text-ink-soft">
                A report that omits a method or a specification is harder to interpret, and that is
                a fact about the document. It is not evidence that the analysis behind it was
                invalid.
              </p>
            </div>
          </div>
          <p className="mt-4 max-w-[62ch] text-sm text-slate">
            Document quality and product quality are related and not the same thing. This index
            describes what a document states and what it leaves out; it does not grade either, and
            it produces no score.
          </p>
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="evidence"
          title="Source-linked detail"
          lede="Each statement resolves to an exact location in a named source, with the kind of document it governs attached."
        >
          <div className="no-print mb-5">
            <EvidenceLegend />
          </div>
          {topic.claims.length === 0 ? (
            <EmptyState headline="No source-linked statements yet." />
          ) : (
            <div className="space-y-5">
              {topic.claims.map((claim) => (
                <ClaimCard key={claim.id} claim={claim} simple={simple} />
              ))}
            </div>
          )}
        </Section>

        <Section
          id="not-established"
          title="Not established by the sources held here"
          lede="Points a reader would reasonably expect this page to settle. The sources currently in this index do not settle them, so the index does not claim to."
        >
          {topic.gaps.length === 0 ? (
            <EmptyState headline="No gaps recorded." />
          ) : (
            <EvidenceGapList gaps={topic.gaps} />
          )}
        </Section>

        <Section
          id="ask"
          title="Questions to ask"
          lede="None of these implies that any particular answer is required. They are the questions a document either answers or does not."
        >
          <QuestionsToAsk />
        </Section>

        <Section
          id="related"
          title="Related quality topics"
          lede="What a certificate reports on, and what it does not. Each link says which of those it is."
        >
          {topic.relationships.length === 0 ? (
            <EmptyState headline="No relationships recorded." />
          ) : (
            <RelatedTopicMap relationships={topic.relationships} />
          )}
        </Section>

        <Section id="references" title="References">
          {referenceCount === 0 ? (
            <EmptyState headline="No references yet." />
          ) : (
            <ReferenceList citations={citations} />
          )}
        </Section>

        <Section id="record" title="About this record">
          <div className="rounded-md border border-rule bg-mist px-5 py-5">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <MetaItem label="Version">{topic.version}</MetaItem>
              <MetaItem label="Review state">
                {topic.reviewState.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())}
              </MetaItem>
              <MetaItem label="Publication">
                {topic.publicationState === 'published' ? 'Published' : 'Not published'}
              </MetaItem>
              <MetaItem label="First published">{formatDate(topic.publishedAt)}</MetaItem>
              <MetaItem label="Last reviewed">
                {topic.lastReviewedAt === null ? (
                  <span className="text-slate">Not yet reviewed by a person</span>
                ) : (
                  formatDate(topic.lastReviewedAt)
                )}
              </MetaItem>
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
