import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  getQualityTopicPage,
  getSpecimenCertificate,
  type Citation,
} from "@/server/public/queries";
import {
  previewQualityTopic,
  previewSpecimenCertificate,
} from "@/server/public/preview";
import {
  transparencyDimensions,
  type CertificateReading,
} from "@/server/public/certificate";
import type { QualityTopicReading } from "@/server/public/quality-topic";
import { getReadingMode } from "@/server/public/reading-mode";
import {
  Container,
  EmptyState,
  MetaItem,
  Section,
  formatDate,
} from "@/components/public/primitives";
import {
  ContentsRail,
  ReferenceLayout,
} from "@/components/public/contents-rail";
import { ModeExplainer, ModeSwitch } from "@/components/public/mode-switch";
import { ClaimCard } from "@/components/public/evidence";
import { ReferenceList } from "@/components/public/citation";
import { PrintHeader } from "@/components/public/print-header";
import {
  AnalyticalQuestionsFigure,
  ChromatographyFlowFigure,
  IdentityComparisonFigure,
  QualityDimensionsFigure,
} from "@/components/public/quality-figures";
import {
  BatchTraceabilityFigure,
  StorageTransportChainFigure,
} from "@/components/public/manufacturing-figures";
import {
  EvidenceLegend,
  GapResolutionNote,
  RelatedTopicMap,
} from "@/components/public/quality-evidence";
import {
  EvidenceCutoff,
  PreviewBanner,
  ReviewStatusPanel,
} from "@/components/public/record-status";
import { Disclosure } from "@/components/public/disclosure";
import {
  AnnotatedCertificate,
  ChainOfCustodyFigure,
  TransparencyDimensions,
} from "@/components/public/certificate";
import {
  EditorialStateChip,
  SourceNeededCard,
} from "@/components/public/editorial-state";
import {
  ILLUSTRATIONS,
  QUALITY_ILLUSTRATIONS,
} from "@/components/illustrations";
import { SEQUENCE_TO_VIAL_STAGES } from "@/domain/quality/sequence-to-vial";

/**
 * A quality topic.
 *
 * Read top to bottom, a reader can stop at any band:
 *
 *   1. in short, beside the drawing of how the thing works;
 *   2. the two halves — what it establishes and what it does not — as one
 *      object, deliberately equal, because putting the limits in a footnote
 *      lets a reader take away only the reassuring half;
 *   3. the common misreading;
 *   4. the sourced statements (closed in simple mode, open in practitioner);
 *   5. what the held sources do not settle.
 *
 * Every drawing is chosen per topic from the illustration registry or not at
 * all. A topic without one simply does not get a drawing, rather than a
 * generic diagram that would imply more than this index knows about it.
 */

/**
 * Rendered on demand rather than at build time: the content changes when an
 * editor publishes, not when the application is deployed, and a build does not
 * need database access.
 */
export const dynamic = "force-dynamic";

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

/** The specimen is published content; the preview path is the same fallback. */
const SPECIMEN_KEY = "specimen-third-party-report";

async function loadSpecimen(): Promise<CertificateReading | null> {
  const published = await getSpecimenCertificate(SPECIMEN_KEY);
  if (published) return published;
  return previewSpecimenCertificate(SPECIMEN_KEY);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await loadTopic(slug);
  if (!topic) return { title: "Topic not found" };

  return {
    title: topic.name,
    description:
      topic.shortDescription ??
      `What ${topic.name} establishes, and what it does not.`,
    // An unpublished preview must never be indexed even if the site's global
    // noindex is one day lifted.
    ...(topic.isPreview ? { robots: { index: false, follow: false } } : {}),
  };
}

const ANALYTICAL_TRIO = [
  "hplc-purity",
  "identity-testing",
  "peptide-content-assay",
];

export default async function QualityTopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const mode = await getReadingMode();
  const topic = await loadTopic(slug);

  if (!topic) notFound();

  const simple = mode === "simple";
  const citations: Citation[] = topic.claims.flatMap((claim) =>
    claim.evidence.map((e) => e.citation),
  );
  // The reference list is deduplicated by source, so counting citations would
  // promise ten references and deliver one.
  const referenceCount = new Set(citations.map((c) => c.sourceKey)).size;

  // --- Drawings ------------------------------------------------------------
  // Registry drawings lead in both modes. The older method figures follow: the
  // ones a topic has no drawing for lead too; the ones that repeat a drawing's
  // idea in more detail are practitioner depth.
  const drawings = (QUALITY_ILLUSTRATIONS[topic.slug] ?? []).map((key) => {
    const Drawing = ILLUSTRATIONS[key];
    return <Drawing key={key} id={`${topic.slug}-${key}`} />;
  });
  const leadFigures: ReactNode[] = [
    ...drawings,
    ...(topic.slug === "hplc-purity"
      ? [<ChromatographyFlowFigure key="hplc" />]
      : []),
    ...(topic.slug === "storage-stability"
      ? [<StorageTransportChainFigure key="storage" id="storage-chain" />]
      : []),
  ];
  const depthFigures: ReactNode[] = simple
    ? []
    : [
        ...(topic.slug === "identity-testing"
          ? [<IdentityComparisonFigure key="identity" />]
          : []),
        ...(topic.slug === "batch-traceability"
          ? [<BatchTraceabilityFigure key="batch" id="batch-record-links" />]
          : []),
      ];
  const hasFigures = leadFigures.length + depthFigures.length > 0;

  const showsDimensions = ANALYTICAL_TRIO.includes(topic.slug);

  // --- Where this topic sits in the journey ---------------------------------
  // Derived, not declared: a stage is listed when one of its claims is one of
  // this topic's claims.
  const claimKeys = new Set(topic.claims.map((c) => c.claimKey));
  const stages = SEQUENCE_TO_VIAL_STAGES.map((stage, index) => ({
    stage,
    number: index + 1,
  })).filter(({ stage }) => stage.claimKeys.some((k) => claimKeys.has(k)));

  // The certificate reader belongs to one topic. That slug is normally served
  // by its own static route; this branch remains for completeness.
  const certificate =
    topic.slug === "certificate-of-analysis" ? await loadSpecimen() : null;

  const openGaps = topic.gaps.filter(
    (g) =>
      g.resolutionState !== "resolved" && g.resolutionState !== "superseded",
  );
  const answeredGaps = topic.gaps.filter(
    (g) =>
      g.resolutionState === "resolved" || g.resolutionState === "superseded",
  );

  const contents = [
    { id: "overview", label: "In short" },
    { id: "establishes", label: "What it establishes" },
    { id: "limits", label: "What it does not establish" },
    ...(topic.commonMisinterpretations
      ? [{ id: "misreadings", label: "Common misreadings" }]
      : []),
    {
      id: "evidence",
      label: "Source-linked detail",
      count: topic.claims.length,
      empty: topic.claims.length === 0,
    },
    {
      id: "not-established",
      label: "Not established here",
      count: openGaps.length,
      empty: topic.gaps.length === 0,
    },
    ...(showsDimensions
      ? [{ id: "dimensions", label: "Separate questions" }]
      : []),
    ...(certificate
      ? [
          { id: "specimen", label: "A specimen document" },
          { id: "chain", label: "Which batch was tested?" },
          { id: "transparency", label: "What the document tells you" },
        ]
      : []),
    {
      id: "related",
      label: "Related topics",
      count: topic.relationships.length,
      empty: topic.relationships.length === 0,
    },
    {
      id: "references",
      label: "References",
      count: referenceCount,
      empty: referenceCount === 0,
    },
    { id: "record", label: "About this record" },
  ];

  const summary = simple ? topic.simpleSummary : topic.practitionerSummary;

  return (
    <>
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="wide" className="py-8 sm:py-12">
          <PrintHeader
            title={topic.name}
            mode={mode}
            path={`/quality/${topic.slug}`}
            version={topic.version}
            lastReviewed={formatDate(topic.lastReviewedAt)}
          />

          <nav
            aria-label="Breadcrumb"
            className="no-print mb-6 text-sm text-slate"
          >
            <Link
              href="/quality"
              className="inline-block py-2 hover:text-deep-tide lg:py-0"
            >
              Quality and testing
            </Link>
            <span className="mx-2" aria-hidden="true">
              /
            </span>
            <span className="text-ink-soft">{topic.name}</span>
          </nav>

          <PreviewBanner state={topic} />

          <header>
            <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
              <div className="min-w-0 max-w-[60ch]">
                <h1 className="font-serif text-4xl leading-tight text-ink sm:text-5xl">
                  {topic.name}
                </h1>
                {topic.shortDescription ? (
                  <p className="depth-body mt-3 text-lg leading-relaxed text-ink-soft">
                    {topic.shortDescription}
                  </p>
                ) : null}
              </div>
              <ModeSwitch mode={mode} path={`/quality/${topic.slug}`} />
            </div>

            <div className="mt-5 max-w-[68ch] space-y-4">
              <ReviewStatusPanel state={topic} />
              <ModeExplainer mode={mode} />
            </div>
          </header>
        </Container>
      </section>

      <Container width="wide" className="py-8 sm:py-12">
        <ReferenceLayout rail={<ContentsRail entries={contents} />}>
          {/* --- In short, beside how it works --------------------------------- */}
          <section id="overview" className="scroll-mt-24">
            <h2 className="font-serif text-2xl text-ink">In short</h2>
            {summary ? (
              <p className="depth-body mt-3 max-w-[62ch] text-lg leading-relaxed text-ink-soft">
                {summary}
              </p>
            ) : simple ? (
              <div className="mt-3">
                <EmptyState
                  headline="A plain-language explanation has not been written yet."
                  detail="Quality explainers are written only from analytical sources this index holds in a citable copy. Several of the sources this topic depends on are still being obtained."
                />
              </div>
            ) : (
              <div className="mt-3">
                <EmptyState
                  headline="A practitioner explanation has not been written yet."
                  detail="Method detail is recorded as individual source-linked statements before it is summarised here."
                />
              </div>
            )}

            {hasFigures ? (
              <div id="how-it-works" className="mt-6 scroll-mt-24">
                <p className="meta-label">How it works</p>
                {leadFigures}
                {depthFigures}
              </div>
            ) : null}

            {stages.length > 0 ? (
              <div className="mt-4 rounded-lg border border-rule-soft bg-mist px-4 py-3">
                <p className="text-sm text-ink-soft">
                  <span className="font-medium text-ink">
                    Where this sits in the journey.{" "}
                  </span>
                  Its statements appear at{" "}
                  {stages.length === 1 ? "this stage" : "these stages"} of{" "}
                  <Link
                    href="/quality/sequence-to-vial"
                    className="text-deep-tide underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
                  >
                    from sequence to final vial
                  </Link>
                  :
                </p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {stages.map(({ stage, number }) => (
                    <li key={stage.key}>
                      <Link
                        href={`/quality/sequence-to-vial#stage-${stage.key}`}
                        className="inline-flex items-baseline gap-1.5 rounded-full border border-rule bg-warm-white px-3 py-1 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
                      >
                        <span className="tabular text-xs text-slate">
                          {String(number).padStart(2, "0")}
                        </span>
                        {stage.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          {/* --- The two halves, as one object ----------------------------------- */}
          <div className="editorial-break mt-12">
            <p className="depth-body max-w-[60ch] text-sm text-slate">
              Read together. A topic that cannot say both is not published.
            </p>
            <div className="mt-4 grid overflow-hidden rounded-xl border border-rule lg:grid-cols-2">
              <section
                id="establishes"
                className="scroll-mt-24 border-t-[3px] border-t-tide-teal bg-warm-white px-6 py-6 sm:px-7"
              >
                <h2 className="font-serif text-2xl text-ink">
                  What it establishes
                </h2>
                {topic.whatItProves ? (
                  <p className="depth-body mt-3 leading-relaxed text-ink-soft">
                    {topic.whatItProves}
                  </p>
                ) : (
                  <div className="mt-3">
                    <EmptyState headline="Not yet written." />
                  </div>
                )}
              </section>

              <section
                id="limits"
                className="scroll-mt-24 border-t border-t-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-6 py-6 sm:px-7 lg:border-t-[3px] lg:border-l lg:border-dashed lg:border-t-[var(--color-caution)] lg:border-l-[var(--color-caution-rule)]"
              >
                <h2 className="font-serif text-2xl text-ink">
                  What it does not establish
                </h2>
                {topic.whatItDoesNotProve ? (
                  <p className="depth-body mt-3 leading-relaxed text-ink-soft">
                    {topic.whatItDoesNotProve}
                  </p>
                ) : (
                  <div className="mt-3">
                    <EmptyState
                      headline="Not yet written."
                      detail="A topic cannot be published without this half. If you are reading it, something has gone wrong — please report it."
                    />
                  </div>
                )}
              </section>
            </div>
          </div>

          {topic.commonMisinterpretations ? (
            <section id="misreadings" className="mt-12 scroll-mt-24">
              <h2 className="font-serif text-2xl text-ink">
                Common misreadings
              </h2>
              <div className="mt-4 max-w-[62ch] border-l-2 border-deep-tide/40 pl-5">
                <p className="depth-body font-serif text-lg leading-relaxed text-ink-soft">
                  {topic.commonMisinterpretations}
                </p>
              </div>
            </section>
          ) : null}

          <div className="editorial-break mt-12">
            <Section
              id="evidence"
              title="Source-linked detail"
              lede="Each statement here resolves to an exact location in a named source."
              aside={<EditorialStateChip kind="source-fact" />}
            >
              {/*
                Open by default in practitioner mode and closed in simple mode.
                A practitioner is here for the evidence and should not have to
                ask for it; a reader who switched to plain language has said
                what depth they want. Nothing is removed either way, and
                printing opens it regardless.
              */}
              <Disclosure
                summary={
                  simple
                    ? "Show the evidence behind these statements"
                    : "The evidence, statement by statement"
                }
                detail={
                  simple
                    ? "Every statement above, with the passage it rests on, how this index reads it, and what it records as unsettled."
                    : undefined
                }
                count={topic.claims.length}
                defaultOpen={!simple}
              >
                <div className="no-print mb-5">
                  <EvidenceLegend />
                </div>

                {topic.claims.length === 0 ? (
                  <EmptyState
                    headline="No source-linked statement has been recorded for this topic yet."
                    detail="Analytical statements need a compendial or methods source at an exact page. Several of the references this section depends on are held only as partial copies and are awaiting replacement."
                  >
                    <p>
                      The{" "}
                      <Link
                        href="/sources"
                        className="underline decoration-rule underline-offset-2"
                      >
                        source register
                      </Link>{" "}
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
              </Disclosure>
            </Section>
          </div>

          {/*
            The section that keeps an absence of evidence from reading as
            evidence of absence. Worded throughout as a statement about this
            library rather than about the world.
          */}
          <Section
            id="not-established"
            title="Not established by the sources held here"
            lede={
              simple
                ? "Points a reader would reasonably expect this page to settle, which the sources held here do not."
                : "Points a reader would reasonably expect this page to settle. The sources currently in this index do not settle them, so the index does not claim to — each with what would."
            }
          >
            {topic.gaps.length === 0 ? (
              <EmptyState headline="No gaps have been recorded for this topic." />
            ) : (
              <>
                {openGaps.length === 0 ? (
                  <p className="text-sm text-slate">
                    Every gap recorded for this topic has since been answered.
                  </p>
                ) : (
                  <ul className="space-y-4">
                    {openGaps.map((gap) => (
                      <li key={gap.id}>
                        <SourceNeededCard gap={gap} simple={simple} />
                        {!simple &&
                        (gap.verificationIssueKey ||
                          gap.resolutionState === "partially_resolved") ? (
                          <div className="px-5">
                            {gap.resolutionState === "partially_resolved" ? (
                              <GapResolutionNote gap={gap} />
                            ) : null}
                            {gap.verificationIssueKey ? (
                              <p className="mt-1.5 text-xs tracking-wide text-slate uppercase">
                                Tracked as {gap.verificationIssueKey}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                {answeredGaps.length > 0 ? (
                  <div className="mt-5">
                    <Disclosure
                      summary="Gaps since answered"
                      detail="Kept, with the note that closed each one, so a closed absence is never simply missing."
                      count={answeredGaps.length}
                    >
                      <div className="space-y-4">
                        {answeredGaps.map((gap) => (
                          <SourceNeededCard
                            key={gap.id}
                            gap={gap}
                            simple={simple}
                          />
                        ))}
                      </div>
                    </Disclosure>
                  </div>
                ) : null}
              </>
            )}
          </Section>

          {showsDimensions ? (
            <Section
              id="dimensions"
              title="Separate questions, separate answers"
              lede="A result for one quality attribute is not an answer about another."
            >
              <AnalyticalQuestionsFigure highlight={topic.slug} />
              {topic.slug === "hplc-purity" ? (
                <QualityDimensionsFigure />
              ) : null}
            </Section>
          ) : null}

          {certificate ? (
            <>
              <Section
                id="specimen"
                title="A specimen document, annotated"
                lede="A fictional certificate, built to be read rather than admired. Every field it omits is marked where the field would have been."
              >
                <AnnotatedCertificate
                  certificate={certificate}
                  simple={simple}
                />
              </Section>

              <Section
                id="chain"
                title="Which batch was actually tested?"
                lede="The question worth asking of any certificate. It is answered by following identifiers, not by reading results."
              >
                <ChainOfCustodyFigure certificate={certificate} />
                {certificate.whatItDemonstrates ? (
                  <div className="mt-5 grid gap-5 lg:grid-cols-2">
                    <div className="rounded-md border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-5 py-4">
                      <h3 className="text-sm font-medium text-ink">
                        What this document shows
                      </h3>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {certificate.whatItDemonstrates}
                      </p>
                    </div>
                    <div className="rounded-md border border-l-[3px] border-[var(--color-caution-rule)] border-l-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4">
                      <h3 className="text-sm font-medium text-ink">
                        What it does not show
                      </h3>
                      <p className="mt-1.5 text-sm text-ink-soft">
                        {certificate.whatItDoesNotDemonstrate}
                      </p>
                    </div>
                  </div>
                ) : null}
              </Section>

              <Section
                id="transparency"
                title="What the document tells you, by kind"
                lede="Dimensions, not a score. Nothing here is added up, because a total would be read as a verdict on the material."
              >
                <TransparencyDimensions
                  dimensions={transparencyDimensions(certificate)}
                />
              </Section>
            </>
          ) : null}

          <div className="editorial-break mt-6">
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
          </div>

          <Section id="references" title="References">
            {citations.length === 0 ? (
              <EmptyState headline="No references yet." />
            ) : (
              <ReferenceList citations={citations} />
            )}
          </Section>

          <Section id="record" title="About this record">
            <Disclosure
              summary="Version, review state and how this page is maintained"
              detail="Whether anyone has checked this record, when, and what has not been checked."
            >
              <div className="rounded-md border border-rule bg-mist px-5 py-5">
                <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  <MetaItem label="Version">{topic.version}</MetaItem>
                  <MetaItem label="Review state">
                    {reviewStateLabel(topic.reviewState)}
                  </MetaItem>
                  <MetaItem label="Publication">
                    {topic.publicationState === "published"
                      ? "Published"
                      : "Not published"}
                  </MetaItem>
                  <MetaItem label="First published">
                    {formatDate(topic.publishedAt)}
                  </MetaItem>
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
                  Found something wrong?{" "}
                  <Link
                    href="/corrections"
                    className="underline decoration-rule underline-offset-2 hover:text-deep-tide"
                  >
                    How corrections work
                  </Link>
                  .
                </p>
              </div>
            </Disclosure>
          </Section>

          <nav
            aria-label="Continue"
            className="no-print editorial-break mt-6 grid gap-4 sm:grid-cols-2"
          >
            <Link
              href="/quality"
              className="group rounded-xl border border-rule bg-warm-white px-5 py-4 hover:border-tide-teal/60"
            >
              <p className="meta-label">Back to</p>
              <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
                <span aria-hidden="true">← </span>What quality means
              </p>
            </Link>
            <Link
              href="/quality/sequence-to-vial"
              className="group rounded-xl border border-rule bg-warm-white px-5 py-4 text-right hover:border-tide-teal/60"
            >
              <p className="meta-label">The whole story</p>
              <p className="mt-1 font-serif text-lg text-ink group-hover:text-deep-tide">
                From sequence to final vial<span aria-hidden="true"> →</span>
              </p>
            </Link>
          </nav>
        </ReferenceLayout>
      </Container>
    </>
  );
}

/** The rung, spelled out. Never abbreviated into something that reads stronger. */
function reviewStateLabel(state: string): string {
  return state.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
}
