import {
  EVIDENCE_STATEMENT_TEXT,
  summariseEvidence,
  type EvidenceTypeDescriptor,
} from '@/domain/evidence/evidence-types';
import type { EvidenceRecord, PublicClaim } from '@/server/public/queries';
import { CitationLine } from './citation';
import {
  EmptyState,
  EvidenceClassTag,
  InterpretationNote,
  NotRecorded,
  UncertaintyNote,
} from './primitives';

/**
 * Evidence presentation.
 *
 * Three things have to stay visibly separate on every card: what the source
 * says, what kind of evidence that is, and how The Tides Index reads it. When
 * those blur, an animal study starts to look like a clinical finding and a
 * practitioner's habit starts to look like a consensus — which is the failure
 * this whole system is built to prevent.
 */

const RELATIONSHIP_LABEL: Readonly<Record<string, string>> = {
  supports: 'Supports',
  contradicts: 'Contradicts',
  contextualizes: 'Context',
  cites: 'Cites',
};

function toDescriptor(record: EvidenceRecord): EvidenceTypeDescriptor {
  return {
    key: record.evidenceTypeKey,
    publicLabel: record.evidenceTypeLabel,
    evidenceClass: record.evidenceClass,
    isHumanEvidence: record.isHumanEvidence,
    isInterpretive: record.isInterpretive,
  };
}

/**
 * The orientation line at the top of a compound page.
 *
 * A sentence, not a score. Collapsing a body of evidence into a number invents
 * precision that is not there (EVIDENCE_MODEL.md §7), and a clinician reading
 * "7/10" learns nothing they can act on.
 */
export function EvidenceSnapshot({ claims }: { claims: readonly PublicClaim[] }) {
  const descriptors = claims.flatMap((claim) => claim.evidence.map(toDescriptor));
  const snapshot = summariseEvidence(descriptors);

  return (
    <div className="rounded-md border border-rule bg-mist px-5 py-4">
      <p className="meta-label">Evidence recorded here</p>
      <p className="mt-1.5 text-ink-soft">{EVIDENCE_STATEMENT_TEXT[snapshot.statement]}</p>

      {snapshot.hasAnyEvidence ? (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          <CountItem label="Human" value={snapshot.humanCount} />
          <CountItem label="Preclinical" value={snapshot.preclinicalCount} />
          <CountItem label="Reference and practice" value={snapshot.interpretiveCount} />
        </dl>
      ) : null}
    </div>
  );
}

function CountItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="meta-label">{label}</dt>
      <dd className="tabular font-serif text-xl text-ink">{value}</dd>
    </div>
  );
}

/** One evidence link: the source, what kind of evidence it is, and its reading. */
export function EvidenceCard({ evidence }: { evidence: EvidenceRecord }) {
  const contradicts = evidence.relationship === 'contradicts';

  return (
    <li
      className={`avoid-break rounded-md border bg-warm-white px-4 py-3.5 ${
        contradicts ? 'border-[var(--color-caution-rule)]' : 'border-rule'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <EvidenceClassTag evidenceClass={evidence.evidenceClass} />
        <span className="text-sm font-medium text-deep-tide">{evidence.evidenceTypeLabel}</span>
        {evidence.relationship !== 'supports' ? (
          <span className="rounded-sm border border-rule px-1.5 py-0.5 text-2xs text-slate">
            {RELATIONSHIP_LABEL[evidence.relationship] ?? evidence.relationship}
          </span>
        ) : null}
        {evidence.primarySourceVerified ? (
          <span className="text-2xs text-tide-teal">Primary source checked</span>
        ) : null}
      </div>

      <dl className="mt-2.5 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
        {/*
          Only where the question means something. "Population or model" asks
          what was studied, which is the right question of a trial or an animal
          experiment and a category error of a chemistry textbook. Printing
          "not recorded" against every analytical citation implies a missing
          fact rather than an inapplicable one.
        */}
        {evidence.populationModel !== null || evidence.evidenceClass !== 'reference_opinion' ? (
          <Field label="Population or model">
            {evidence.populationModel ?? <NotRecorded what="the source does not state it" />}
          </Field>
        ) : null}
        {evidence.routeName ? <Field label="Route">{evidence.routeName}</Field> : null}
        {evidence.formulation ? <Field label="Formulation">{evidence.formulation}</Field> : null}
      </dl>

      {evidence.interpretation ? (
        <div className="mt-3">
          <InterpretationNote>{evidence.interpretation}</InterpretationNote>
        </div>
      ) : null}

      <div className="mt-3 border-t border-rule-soft pt-2.5">
        <CitationLine citation={evidence.citation} />
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="meta-label">{label}</dt>
      <dd className="text-ink-soft">{children}</dd>
    </div>
  );
}

/**
 * A claim with its evidence beneath it.
 *
 * In patient mode the plain-language wording is shown where one exists; the
 * claim is never simplified on the fly, because a paraphrase written at render
 * time has not been reviewed.
 */
/**
 * The document type a certificate requirement governs, shown above the
 * requirement rather than buried in its notes.
 *
 * ICH Q7 §11.4 states what an API or intermediate certificate should contain. A
 * reader who meets that requirement without its scope will apply it to whatever
 * document they are holding, which is usually not one of those — and this index
 * will have told them something that is not true. The scope is therefore part of
 * the statement, not a qualification attached to it.
 */
const SCOPE_LABELS: Readonly<Record<string, string>> = {
  manufacturer_coa: "Applies to a manufacturer's certificate for an active ingredient or intermediate",
  supplier_repacker_certificate:
    'Applies to a certificate reissued by a supplier, repacker or distributor of an active ingredient',
  third_party_test_report: "Applies to a third-party laboratory's test report",
  finished_product_release: 'Applies to a finished-product release document',
  other_unknown: 'Scope of application not established',
};

function ScopeBadge({ scope }: { scope: string | null }) {
  if (scope === null) return null;
  return (
    <p className="mb-2 inline-block rounded-sm border border-rule bg-mist px-2 py-0.5 text-xs text-slate">
      {SCOPE_LABELS[scope] ?? scope}
    </p>
  );
}

export function ClaimCard({ claim, simple }: { claim: PublicClaim; simple: boolean }) {
  const text = simple ? (claim.plainLanguageText ?? claim.claimText) : claim.claimText;
  const hasPlainLanguage = claim.plainLanguageText !== null;

  return (
    <article className="avoid-break border-t border-rule pt-5 first:border-t-0 first:pt-0">
      <ScopeBadge scope={claim.certificateTypeScope} />
      <p className="font-serif text-lg leading-snug text-ink">{text}</p>

      {simple && !hasPlainLanguage ? (
        <p className="mt-1.5 text-xs text-slate">
          Shown in its technical wording. A plain-language version of this statement has not been
          written and reviewed yet.
        </p>
      ) : null}

      {claim.needsUpdate ? (
        <p className="mt-2 text-xs text-[var(--color-caution)]">
          This statement is flagged for re-review.
        </p>
      ) : null}

      {!simple && claim.interpretationNotes ? (
        <div className="mt-3">
          <InterpretationNote>{claim.interpretationNotes}</InterpretationNote>
        </div>
      ) : null}

      {claim.uncertaintyText ? (
        <div className="mt-3">
          <UncertaintyNote>{claim.uncertaintyText}</UncertaintyNote>
        </div>
      ) : null}

      {claim.evidence.length > 0 ? (
        <ul className="mt-4 space-y-2.5">
          {claim.evidence.map((evidence) => (
            <EvidenceCard key={evidence.id} evidence={evidence} />
          ))}
        </ul>
      ) : claim.isEditorialNonEvidentiary ? (
        <p className="mt-3 text-xs text-slate">
          Editorial explanation. This is how the platform works, not a finding about the compound.
        </p>
      ) : null}
    </article>
  );
}

/**
 * Claims grouped by the class of evidence behind them.
 *
 * Grouping this way rather than by topic is the single most important
 * presentation decision on the page: it makes "there is no human evidence here"
 * something a reader sees in two seconds instead of something they have to
 * reconstruct by reading every card.
 */
export function ClaimsByEvidenceClass({
  claims,
  simple,
}: {
  claims: readonly PublicClaim[];
  simple: boolean;
}) {
  const human = claims.filter((c) => c.evidence.some((e) => e.isHumanEvidence));
  const preclinical = claims.filter(
    (c) =>
      !c.evidence.some((e) => e.isHumanEvidence) &&
      c.evidence.some((e) => e.evidenceClass === 'preclinical'),
  );
  const reference = claims.filter(
    (c) =>
      c.evidence.length > 0 &&
      !c.evidence.some((e) => e.isHumanEvidence) &&
      !c.evidence.some((e) => e.evidenceClass === 'preclinical'),
  );

  return (
    <div className="space-y-[calc(var(--rhythm)*2)]">
      <ClaimGroup
        heading="Human evidence"
        description="Findings from studies carried out in people."
        claims={human}
        simple={simple}
        emptyHeadline="No reviewed human evidence is currently recorded."
        emptyDetail="That is a statement about this index, not about the literature: human studies may exist that have not yet been extracted, verified and reviewed here."
      />
      <ClaimGroup
        heading="Preclinical evidence"
        description="Animal and laboratory work. These results do not establish what happens in people."
        claims={preclinical}
        simple={simple}
        emptyHeadline="No reviewed preclinical evidence is currently recorded."
        emptyDetail="Extraction from the registered sources has not reached this compound yet."
      />
      <ClaimGroup
        heading="Reference and practice"
        description="What textbooks, practitioner references and named clinicians describe. Attributed, and never presented as a study result."
        claims={reference}
        simple={simple}
        emptyHeadline="No reviewed reference or practitioner statements are currently recorded."
        emptyDetail="Several registered sources discuss this compound; none has passed source checking and review yet."
      />
    </div>
  );
}

function ClaimGroup({
  heading,
  description,
  claims,
  simple,
  emptyHeadline,
  emptyDetail,
}: {
  heading: string;
  description: string;
  claims: readonly PublicClaim[];
  simple: boolean;
  emptyHeadline: string;
  emptyDetail: string;
}) {
  return (
    <div>
      <h3 className="font-serif text-lg text-deep-tide">{heading}</h3>
      <p className="mt-1 mb-4 max-w-[56ch] text-sm text-slate">{description}</p>
      {claims.length === 0 ? (
        <EmptyState headline={emptyHeadline} detail={emptyDetail} />
      ) : (
        <div className="space-y-5">
          {claims.map((claim) => (
            <ClaimCard key={claim.id} claim={claim} simple={simple} />
          ))}
        </div>
      )}
    </div>
  );
}
