import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import {
  getPeptidePage,
  getRegisteredPeptide,
  type Citation,
  type PractitionerProtocol,
} from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import {
  Callout,
  Container,
  DefinitionRow,
  EmptyState,
  MetaItem,
  NotRecorded,
  Section,
  UncertaintyNote,
  formatDate,
} from '@/components/public/primitives';
import { ContentsRail, ReferenceLayout } from '@/components/public/contents-rail';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { ClaimsByEvidenceClass, EvidenceSnapshot } from '@/components/public/evidence';
import {
  AliasList,
  DisagreementList,
  RegulatoryStatusList,
  RouteEvidenceTable,
} from '@/components/public/routes-and-context';
import {
  NoProtocolsYet,
  PractitionerProtocolCard,
  ProtocolSectionLede,
  SimpleProtocolCard,
} from '@/components/public/protocols';
import { ReferenceList } from '@/components/public/citation';
import { RecordInPreparation } from '@/components/public/record-in-preparation';

/**
 * The canonical compound record.
 *
 * One page per compound, one record behind it, two reading depths over the same
 * reviewed data. The order of sections follows what a clinician actually asks,
 * in the order they ask it: what is this, how strong is the evidence, what is
 * only preclinical, how has it been given, what is its regulatory standing, what
 * have named sources reported, and where do sources disagree.
 *
 * Sections are never hidden because they are empty. A compound with no human
 * evidence recorded says so under a "Human evidence" heading, which is the
 * answer to the question a reader came with.
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
  const mode = await getReadingMode();
  const peptide = await getPeptidePage(slug, mode);

  if (!peptide) {
    const registered = await getRegisteredPeptide(slug);
    return registered
      ? {
          title: `${registered.canonicalName} — record in preparation`,
          description: `${registered.canonicalName} is in scope for The Tides Index. No reviewed record has been published yet.`,
        }
      : { title: 'Compound not found' };
  }

  return {
    title: peptide.canonicalName,
    description:
      peptide.shortDescription ??
      `Reviewed evidence, administration routes, source-reported protocols and provenance for ${peptide.canonicalName}.`,
  };
}

export default async function PeptidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mode = await getReadingMode();
  const peptide = await getPeptidePage(slug, mode);

  // A compound that is registered but unpublished gets an honest page rather
  // than a 404: "in scope, not yet reviewed" is useful information, and hiding
  // it would make the index look narrower than it is.
  if (!peptide) {
    const registered = await getRegisteredPeptide(slug);
    if (!registered) notFound();
    return <RecordInPreparation peptide={registered} />;
  }

  const simple = mode === 'simple';
  const path = `/peptides/${peptide.slug}`;

  const humanClaims = peptide.claims.filter((c) => c.evidence.some((e) => e.isHumanEvidence));

  const citations: Citation[] = [
    ...peptide.claims.flatMap((claim) => claim.evidence.map((e) => e.citation)),
    ...peptide.routes.map((route) => route.citation),
    ...peptide.disagreements.flatMap((d) => d.positions.map((p) => p.citation)),
    ...peptide.protocols.flatMap((protocol) => protocol.sources),
    ...peptide.regulatoryStatuses.flatMap((s) => (s.citation ? [s.citation] : [])),
  ];

  const contents = [
    { id: 'overview', label: 'What it is' },
    { id: 'evidence', label: 'Evidence', count: peptide.claims.length, empty: peptide.claims.length === 0 },
    { id: 'routes', label: 'Administration routes', count: peptide.routes.length, empty: peptide.routes.length === 0 },
    {
      id: 'regulatory',
      label: 'Regulatory status',
      count: peptide.regulatoryStatuses.length,
      empty: peptide.regulatoryStatuses.length === 0,
    },
    {
      id: 'protocols',
      label: 'Source-reported protocols',
      count: peptide.protocols.length,
      empty: peptide.protocols.length === 0,
    },
    {
      id: 'disagreements',
      label: 'Disagreements and unknowns',
      count: peptide.disagreements.length,
      empty: peptide.disagreements.length === 0,
    },
    { id: 'references', label: 'References', count: citations.length, empty: citations.length === 0 },
    { id: 'record', label: 'About this record' },
  ];

  return (
    <Container width="wide" className="py-8 sm:py-12">
      <nav aria-label="Breadcrumb" className="no-print mb-6 text-sm text-slate">
        <Link href="/peptides" className="hover:text-deep-tide">
          Compounds
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span className="text-ink-soft">{peptide.canonicalName}</span>
      </nav>

      <header className="mb-8">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0">
            <h1 className="font-serif text-3xl text-ink sm:text-4xl">{peptide.canonicalName}</h1>
            {peptide.shortDescription ? (
              <p className="mt-2 max-w-[58ch] text-lg text-ink-soft">{peptide.shortDescription}</p>
            ) : (
              <p className="mt-2 text-lg text-slate italic">
                A one-line description has not been written and reviewed yet.
              </p>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate">
              {peptide.compoundTypeLabel ? <span>{peptide.compoundTypeLabel}</span> : null}
              {peptide.categoryLabel ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{peptide.categoryLabel}</span>
                </>
              ) : null}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <ModeSwitch mode={mode} path={path} />
          </div>
        </div>

        <div className="mt-5 max-w-[64ch]">
          <ModeExplainer mode={mode} />
        </div>

        {!peptide.isPeptide ? (
          <div className="mt-5 max-w-[64ch]">
            <Callout tone="caution" title="This compound is not a peptide">
              <p>
                It appears in the same clinical conversations as the peptides in this index, which is
                why it is recorded here. It is chemically and pharmacologically a different kind of
                molecule, and evidence about peptides does not transfer to it.
              </p>
            </Callout>
          </div>
        ) : null}

        {peptide.needsUpdate ? (
          <div className="mt-5 max-w-[64ch]">
            <Callout tone="caution" title="This record is flagged for re-review">
              <p>
                It remains published because it is the best reviewed information currently held, but
                it is queued for another editorial pass. Check the review date below.
              </p>
            </Callout>
          </div>
        ) : null}
      </header>

      <ReferenceLayout rail={<ContentsRail entries={contents} />}>
        <Section id="overview" title="What it is">
          <div className="space-y-5">
            {simple ? (
              peptide.simpleSummary ? (
                <p className="max-w-[62ch] text-lg leading-relaxed text-ink-soft">
                  {peptide.simpleSummary}
                </p>
              ) : (
                <EmptyState
                  headline="A plain-language summary has not been written yet."
                  detail="Summaries are written from reviewed records rather than composed independently, so this appears once the underlying evidence has been extracted and checked."
                />
              )
            ) : peptide.practitionerSummary ? (
              <p className="max-w-[62ch] text-lg leading-relaxed text-ink-soft">
                {peptide.practitionerSummary}
              </p>
            ) : (
              <EmptyState
                headline="A practitioner summary has not been written yet."
                detail="Mechanism, targets and pharmacokinetics are recorded as individual claims with provenance before they are summarised here."
              />
            )}

            <AliasList aliases={peptide.aliases} />

            {peptide.unknownsSummary ? (
              <UncertaintyNote>{peptide.unknownsSummary}</UncertaintyNote>
            ) : null}

            {!simple ? (
              <dl className="mt-2 border-t border-rule">
                <DefinitionRow term="Sequence">
                  {peptide.sequence ? (
                    <code className="font-mono text-sm break-all">{peptide.sequence}</code>
                  ) : (
                    <NotRecorded what="no reviewed source has been recorded for it" />
                  )}
                </DefinitionRow>
                <DefinitionRow term="Molecular description">
                  {peptide.molecularDescription ?? (
                    <NotRecorded what="no reviewed source has been recorded for it" />
                  )}
                </DefinitionRow>
                <DefinitionRow term="Origin">
                  {peptide.naturalOrSynthetic ?? <NotRecorded />}
                </DefinitionRow>
              </dl>
            ) : null}

            <EvidenceSnapshot claims={peptide.claims} />
          </div>
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="evidence"
          title="Evidence"
          lede="Grouped by the kind of evidence behind each statement, so that what has been shown in people is never mixed with what has been shown in animals or described in practice."
        >
          <ClaimsByEvidenceClass claims={peptide.claims} simple={simple} />
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="routes"
          title="Administration routes"
          lede="Route evidence is specific to this compound, in a stated formulation and population. Evidence that one peptide is absorbed by a route says nothing about another."
        >
          <RouteEvidenceTable routes={peptide.routes} />
        </Section>

        <Section
          id="regulatory"
          title="Regulatory and development status"
          lede="Jurisdiction-specific, and dated. A status without both is not a status."
        >
          <RegulatoryStatusList statuses={peptide.regulatoryStatuses} />
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="protocols"
          title="Source-reported protocols"
          lede={
            simple
              ? 'What named sources describe, and what they were aiming at. Amounts, frequency and duration are not shown in this reading mode.'
              : 'Each regimen exactly as one named source reported it. Records are never merged, averaged or reconciled across sources.'
          }
        >
          <div className="space-y-5">
            <ProtocolSectionLede count={peptide.protocols.length} />

            {peptide.protocols.length === 0 ? (
              <NoProtocolsYet simple={simple} />
            ) : (
              <ul className="space-y-5">
                {simple
                  ? peptide.protocols.map((protocol) => (
                      <SimpleProtocolCard key={protocol.id} protocol={protocol} />
                    ))
                  : (peptide.protocols as readonly PractitionerProtocol[]).map((protocol) => (
                      <PractitionerProtocolCard key={protocol.id} protocol={protocol} />
                    ))}
              </ul>
            )}

            {simple && peptide.protocolCountAll > 0 ? (
              <Callout>
                <p>
                  {peptide.protocolCountAll === 1
                    ? 'One source-reported regimen is recorded for this compound.'
                    : `${String(peptide.protocolCountAll)} source-reported regimens are recorded for this compound.`}{' '}
                  The amounts and schedules they describe are shown in practitioner mode. They are
                  records of what particular sources have published — not recommendations, and not a
                  guide to self-treatment.
                </p>
              </Callout>
            ) : null}
          </div>
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="disagreements"
          title="Disagreements and unknowns"
          lede="Where sources conflict, both positions are shown with their attribution. Conflicts are not resolved by averaging them."
        >
          <DisagreementList disagreements={peptide.disagreements} simple={simple} />
        </Section>

        <Section
          id="references"
          title="References"
          lede="Every statement on this page resolves to one of these, at the exact location given."
        >
          {citations.length === 0 ? (
            <EmptyState
              headline="No references yet."
              detail="References appear here as claims, route records and protocols pass review. A compound page with no references is a page with nothing asserted on it."
            />
          ) : (
            <ReferenceList citations={citations} />
          )}
        </Section>

        <Section id="record" title="About this record">
          <div className="rounded-md border border-rule bg-mist px-5 py-5">
            <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <MetaItem label="Version">{peptide.version}</MetaItem>
              <MetaItem label="First published">{formatDate(peptide.publishedAt)}</MetaItem>
              <MetaItem label="Last reviewed">{formatDate(peptide.lastReviewedAt)}</MetaItem>
              <MetaItem label="Evidence surveyed to">
                {peptide.evidenceCutoffAt ? (
                  formatDate(peptide.evidenceCutoffAt)
                ) : (
                  <span className="text-slate italic">Not set</span>
                )}
              </MetaItem>
            </dl>

            <p className="mt-5 max-w-[70ch] border-t border-rule pt-4 text-sm text-slate">
              This record is assembled from reviewed, source-linked entries. Nothing appears on it
              that has not passed source checking and scientific review, and{' '}
              {humanClaims.length === 0
                ? 'no statement here rests on human evidence.'
                : `${String(humanClaims.length)} of its statements rest on human evidence.`}{' '}
              If something looks wrong,{' '}
              <Link href="/corrections" className="underline decoration-rule underline-offset-2">
                tell us
              </Link>
              .
            </p>
          </div>
        </Section>
      </ReferenceLayout>
    </Container>
  );
}
