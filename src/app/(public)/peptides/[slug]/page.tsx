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
  SummaryProse,
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
import { previewPeptidePage } from '@/server/public/preview';
import { PrintHeader } from '@/components/public/print-header';
import { EvidenceAtAGlance } from '@/components/public/evidence-at-a-glance';
import { ProtocolComparison } from '@/components/public/protocol-comparison';
import { ProtocolProvenanceFigure } from '@/components/public/protocol-figures';
import { Disclosure } from '@/components/public/disclosure';
import {
  ChemicalForms,
  EvidenceLandscape,
  HumanRecords,
  PharmacokineticsFigure,
  ProductDistinction,
  RouteMap,
  ScreenMethod,
} from '@/components/public/compound-figures';
import {
  NomenclatureMap,
  ReplicationMap,
  ResearchOpportunities,
} from '@/components/public/research-figures';

/**
 * The four questions a record answers, in the order it answers them.
 *
 * A compound page is long because provenance is long, and a reader who only
 * wants to know whether anything has been shown in people should not have to
 * discover that by scrolling past a literature ledger. These are in-page
 * anchors rather than a summary: nothing is duplicated, and the depth is still
 * there for whoever wants it.
 */
const READING_GUIDE: readonly { href: string; title: string; body: string }[] = [
  { href: '#overview', title: 'What it is', body: 'The molecule, and the names it goes by.' },
  {
    href: '#evidence',
    title: 'What is known',
    body: 'In people, in animals, and in practice — kept apart.',
  },
  {
    href: '#research-questions',
    title: 'What is not known',
    body: 'Recorded as carefully as the findings.',
  },
  {
    href: '#protocols',
    title: 'What sources report',
    body: 'Regimens, each attributed. Never averaged.',
  },
];

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
  const peptide = (await getPeptidePage(slug, mode)) ?? (await previewPeptidePage(slug, mode));

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
  const peptide = (await getPeptidePage(slug, mode)) ?? (await previewPeptidePage(slug, mode));

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

  /*
   * The rail, in the order the page is now in.
   *
   * Regulatory status used to sit fourth, between routes and protocols, where a
   * reader scanning the rail met it before the evidence. It is a useful fact
   * about a compound and it is not a measure of the science — this index
   * records approval, non-approval and silence the same way — so it sits
   * near the end, with the products it belongs to.
   *
   * Conditional entries: a rail that lists a section not on the page is worse
   * than a shorter rail. Sections that exist for every compound stay listed
   * even when empty, because an empty "Evidence" heading is an answer.
   */
  const contents = [
    { id: 'overview', label: 'What it is' },
    // Practitioner depth only, like the section itself. A rail entry linking
    // to an anchor that is not on the page is worse than a shorter rail.
    ...(!simple && peptide.identities.length > 0
      ? [
          {
            id: 'nomenclature',
            label: 'What the names refer to',
            count: new Set(peptide.identities.map((i) => i.nameUsed)).size,
          },
        ]
      : []),
    {
      id: 'evidence',
      label: 'Evidence',
      count: peptide.claims.length,
      empty: peptide.claims.length === 0,
    },
    ...(peptide.replication.length > 0
      ? [
          {
            id: 'replication',
            label: 'What has been repeated',
            count: peptide.replication.length,
          },
        ]
      : []),
    ...(peptide.pharmacokinetics.length > 0
      ? [
          {
            id: 'pharmacokinetics',
            label: 'Pharmacokinetics',
            count: peptide.pharmacokinetics.length,
          },
        ]
      : []),
    {
      id: 'routes',
      label: 'Administration routes',
      count: peptide.routes.length,
      empty: peptide.routes.length === 0,
    },
    {
      id: 'protocols',
      label: 'Source-reported protocols',
      // Simple mode receives no protocol rows, so the rail counts what exists
      // rather than what is rendered. "none yet" beside a compound with five
      // recorded regimens is the rail telling a patient something untrue.
      count: peptide.protocolCountAll,
      empty: peptide.protocolCountAll === 0,
    },
    // After the protocols, because that is where the section now sits: the
    // ledger is how the evidence was assembled, not what a reader came for.
    ...(!simple && peptide.literatureScreens.length > 0
      ? [
          {
            id: 'literature',
            label: 'What a literature search returns',
            count: peptide.literatureScreens[0]?.resultCount ?? 0,
          },
        ]
      : []),
    {
      id: 'disagreements',
      label: 'Disagreements and unknowns',
      count: peptide.disagreements.length,
      empty: peptide.disagreements.length === 0,
    },
    {
      id: 'research-questions',
      label: 'What would be useful to study',
      count: peptide.gaps.filter((g) => g.researchQuestion !== null).length,
    },
    // The section simple mode ends on, and the only entry that exists solely
    // for a patient.
    ...(simple ? [{ id: 'ask', label: 'Questions worth asking a clinician' }] : []),
    ...(peptide.products.length > 0 || peptide.forms.length > 0
      ? [
          {
            id: 'products',
            label: 'Products and chemical form',
            count: peptide.products.length + peptide.forms.length,
          },
        ]
      : []),
    {
      id: 'regulatory',
      label: 'Regulatory context',
      count: peptide.regulatoryStatuses.length,
      empty: peptide.regulatoryStatuses.length === 0,
    },
    { id: 'references', label: 'References', count: citations.length },
    { id: 'record', label: 'About this record' },
  ];

  return (
    <Container width="wide" className="py-8 sm:py-12">
      <PrintHeader
        title={peptide.canonicalName}
        mode={mode}
        path={path}
        version={peptide.version}
        lastReviewed={formatDate(peptide.lastReviewedAt)}
      />

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
        {/*
          Above everything, because the two failure modes this record has to
          survive are both failures of proportion: taking a strong result out of
          its indication, and mistaking a large literature for a settled one.
          The shape of the evidence belongs before the evidence.
        */}
        <div className="mb-10">
          <EvidenceAtAGlance peptide={peptide} simple={simple} />
        </div>

        {/*
          Progressive disclosure. A reader should be able to answer the four
          questions that matter and stop, without meeting a literature ledger,
          a locator or a review state on the way. Everything deeper stays on the
          page and stays traceable; it is just not in the path.
        */}
        <nav aria-label="Reading guide" className="mb-12">
          <p className="meta-label">Read as far as you need</p>
          <ol className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {READING_GUIDE.map((item, index) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="flex h-full flex-col rounded-md border border-rule bg-warm-white px-4 py-3 transition-colors hover:border-tide-teal"
                >
                  <span className="font-serif text-xl text-tide-teal">{index + 1}</span>
                  <span className="mt-0.5 font-serif text-base text-ink">{item.title}</span>
                  <span className="mt-1 text-xs leading-relaxed text-ink-soft">{item.body}</span>
                </a>
              </li>
            ))}
          </ol>
          <p className="mt-3 max-w-[66ch] text-xs text-slate">
            Everything past that — the literature ledger, the references, and the record&rsquo;s own
            version history — stays on the page for anyone who wants it.
          </p>
        </nav>

        <Section id="overview" title="What it is">
          <div className="space-y-5">
            {simple ? (
              peptide.simpleSummary ? (
                <SummaryProse text={peptide.simpleSummary} />
              ) : (
                <EmptyState
                  headline="A plain-language summary has not been written yet."
                  detail="Summaries are written from reviewed records rather than composed independently, so this appears once the underlying evidence has been extracted and checked."
                />
              )
            ) : peptide.practitionerSummary ? (
              <SummaryProse text={peptide.practitionerSummary} />
            ) : (
              <EmptyState
                headline="A practitioner summary has not been written yet."
                detail="Mechanism, targets and pharmacokinetics are recorded as individual claims with provenance before they are summarised here."
              />
            )}

            <AliasList aliases={peptide.aliases} />

            {peptide.unknownsSummary ? (
              <UncertaintyNote>
                <SummaryProse
                  text={peptide.unknownsSummary}
                  className="max-w-[62ch] text-sm leading-relaxed text-ink-soft"
                />
              </UncertaintyNote>
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

        {/*
          Nomenclature is practitioner depth. What a name denotes across
          sources, with sequences and masses, is the single most consequential
          thing on a record for somebody buying or prescribing — and for a
          patient reading in plain language it is four analytical tables
          between them and what is known. Simple mode says the compound is
          sold under other names in its summary; this is the evidence for it.
        */}
        {!simple && peptide.identities.length > 0 ? (
          <>
            <hr className="tide-rule border-0" aria-hidden="true" />
            <Section
              id="nomenclature"
              title="What the names refer to"
              lede="A compound is often sold under a name that means something else. This is what each source says the name denotes, with the analytical measurements first — because a measurement of the substance outranks a statement about it."
            >
              <NomenclatureMap identities={peptide.identities} />
            </Section>
          </>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="evidence"
          title="Evidence"
          lede="Grouped by the kind of evidence behind each statement, so that what has been shown in people is never mixed with what has been shown in animals or described in practice."
        >
          <ClaimsByEvidenceClass claims={peptide.claims} simple={simple} />
        </Section>


        {peptide.replication.length > 0 ? (
          <>
            <hr className="tide-rule border-0" aria-hidden="true" />
            <Section
              id="replication"
              title="What has been repeated"
              lede="Whether a finding has been reproduced by somebody other than the people who first reported it. Not a count of papers: forty from one laboratory is a weaker position than two from two."
            >
              <ReplicationMap assessments={peptide.replication} />
            </Section>
          </>
        ) : null}

        {peptide.pharmacokinetics.length > 0 ? (
          <>
            <hr className="tide-rule border-0" aria-hidden="true" />
            <Section
              id="pharmacokinetics"
              title="Pharmacokinetics"
              lede="Every reported value with the conditions it was measured under. Values for the same parameter differ, and the conditions are why — a figure quoted without them is a figure about nothing in particular."
            >
              <PharmacokineticsFigure
                observations={peptide.pharmacokinetics}
                simple={simple}
              />
            </Section>
          </>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="routes"
          title="Administration routes"
          lede="Route evidence is specific to this compound, in a stated formulation and population. Evidence that one peptide is absorbed by a route says nothing about another."
        >
          <div className="space-y-6">
            {/* The map first: which routes, on what kind of evidence, at a
                glance. The table below carries the full record. */}
            <RouteMap peptide={peptide} />
            <RouteEvidenceTable routes={peptide.routes} />
          </div>
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

            {/*
              The comparison first, then the records.
              Five regimens read as a vertical list invite a reader to average
              them; laid side by side the differences are the first thing seen,
              which is the only reason this view exists. Practitioner mode only —
              the rows are amounts.
            */}
            {/*
              Provenance before detail. The table answers "what does each
              source say"; this answers the question asked before that one —
              is any of this from a trial, or is all of it practice?
            */}
            {!simple && peptide.protocols.length > 0 ? (
              <ProtocolProvenanceFigure
                protocols={peptide.protocols as readonly PractitionerProtocol[]}
                compoundName={peptide.canonicalName}
              />
            ) : null}

            {!simple && peptide.protocols.length > 1 ? (
              <Disclosure
                summary="Compare what each source reports"
                detail="Side by side, with the fields that differ named. Nothing is ranked or recommended."
                count={peptide.protocols.length}
                defaultOpen
              >
                <ProtocolComparison
                  protocols={peptide.protocols as readonly PractitionerProtocol[]}
                  compoundName={peptide.canonicalName}
                />
              </Disclosure>
            ) : null}

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

        {/*
          The literature ledger sits after the practical sections rather than
          before them.

          It is the most database-like thing on the page — a screen of 230
          records, their study types and the reason each was counted — and it
          was the second thing a reader met. A clinician arriving for routes,
          pharmacokinetics or what sources report had to scroll past a ledger
          to reach them; the ledger is how the evidence section was built, not
          what a reader came for. It stays in full, further down, where
          somebody interrogating the screen will look for it.
        */}
        {!simple && peptide.literatureScreens.length > 0 ? (
          <>
            <hr className="tide-rule border-0" aria-hidden="true" />
            <Section
              id="literature"
              title="What a literature search returns"
              lede="A search result is a list of things somebody still has to read. This is what one search returned, what each record turned out to be, and what that does and does not establish."
            >
              <div className="space-y-6">
                {peptide.literatureScreens.map((screen) => (
                  <div key={screen.id} className="space-y-6">
                    <EvidenceLandscape screen={screen} />

                    <Disclosure
                      summary="Every human record the screen identified"
                      detail="Including the ones that carry a human sample but gave nobody the compound, with the reason each was counted or was not."
                      count={screen.humanRecords.length}
                      defaultOpen
                    >
                      <HumanRecords screen={screen} />
                    </Disclosure>

                    <Disclosure
                      summary="How this search was run"
                      detail="The query, the date, and the criteria — so that anyone can repeat it and check the answer."
                    >
                      <ScreenMethod screen={screen} />
                    </Disclosure>
                  </div>
                ))}
              </div>
            </Section>
          </>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="disagreements"
          title="Disagreements and unknowns"
          lede="Where sources conflict, both positions are shown with their attribution. Conflicts are not resolved by averaging them."
        >
          <DisagreementList disagreements={peptide.disagreements} simple={simple} />
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

        <Section
          id="research-questions"
          title="What would be useful to study"
          lede="Derived from what this index has recorded as missing, and from the disagreements it has not resolved. These describe research that would be useful — not anything anybody should try."
        >
          <ResearchOpportunities peptide={peptide} />
        </Section>

        {/*
          Simple mode ends by handing the reader somewhere useful.
          A patient-facing record that stops at "this is not established"
          leaves somebody with a worry and nothing to do with it. These are
          questions, not advice: the page answers none of them, and none of
          them is about what to take or how much.
        */}
        {simple ? (
          <>
            <hr className="tide-rule border-0" aria-hidden="true" />
            <Section
              id="ask"
              title="Questions worth asking a clinician"
              lede="If this compound has come up in a conversation about your health, these are the questions this record suggests. It cannot answer them for you."
            >
              <ul className="max-w-[66ch] space-y-3">
                {[
                  'Has this been studied in people for my situation, or only in animals and laboratories?',
                  'If there are human studies, did they have a comparison group — and were the people in them like me?',
                  'What would we be watching to know whether it is working, and by when?',
                  'What would make you stop?',
                  'What is simply unknown here, as opposed to known and reassuring?',
                ].map((question) => (
                  <li key={question} className="flex gap-3 text-ink-soft">
                    <span aria-hidden="true" className="mt-[0.6rem] h-px w-3 shrink-0 bg-tide-teal" />
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 max-w-[66ch] text-sm text-slate">
                The full evidence behind everything above — every source, the exact page, and how
                far each citation has been traced — is in the practitioner view.
              </p>
            </Section>
          </>
        ) : null}

        <hr className="tide-rule border-0" aria-hidden="true" />

        {peptide.products.length > 0 || peptide.forms.length > 0 ? (
          <>
            <Section
              id="products"
              title="Products and chemical form"
              lede="One molecule can be several products, and one substance can be weighed in several forms. Both are routinely quoted without saying which, and both change what a number means."
            >
              <div className="space-y-8">
                <ProductDistinction products={peptide.products} simple={simple} />
                <ChemicalForms forms={peptide.forms} />
              </div>
            </Section>
          </>
        ) : null}

        <Section
          id="regulatory"
          title="Regulatory context"
          lede="Secondary. What a regulator has said about a compound in one jurisdiction on one date is a useful fact and is not a measure of the science: this index records approval, non-approval and silence the same way, and ranks nothing by them."
        >
          <RegulatoryStatusList statuses={peptide.regulatoryStatuses} />
        </Section>

        <hr className="tide-rule border-0" aria-hidden="true" />

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
            /*
              Collapsed by default. The references are the proof and they are
              not the reading: a reader who wants to check a statement opens
              this, and a reader who does not should not have to scroll past
              forty citations to reach the record's history.
            */
            <details>
              <summary className="cursor-pointer text-sm text-deep-tide underline-offset-2 hover:underline">
                Show all {citations.length} references
              </summary>
              <div className="mt-4">
                <ReferenceList citations={citations} />
              </div>
            </details>
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
