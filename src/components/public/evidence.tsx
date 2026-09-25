import {
  EVIDENCE_STATEMENT_TEXT,
  summariseEvidence,
  type EvidenceTypeDescriptor,
} from '@/domain/evidence/evidence-types';
import {
  countEvidenceRecords,
  EVIDENCE_LANES,
  EVIDENCE_RECORD_DEFINITION,
  EVIDENCE_RECORD_NOUN,
  formatStatementCount,
  laneOfClaim,
  laneOfEvidence,
} from '@/domain/evidence/evidence-counts';
import { EditorialStateChip } from './editorial-state';
import type { EvidenceRecord, PublicClaim } from '@/server/public/queries';
import { CitationLine } from './citation';
import { Disclosure } from '@/components/public/disclosure';
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
  /*
   * One descriptor per source per lane, so the sentence ("a single human study
   * is recorded") reads the same unit as the numbers printed beside it. It used
   * to read one descriptor per citation, and a trial cited by four statements
   * counted as four.
   */
  const seen = new Set<string>();
  const descriptors: EvidenceTypeDescriptor[] = [];
  for (const claim of claims) {
    for (const evidence of claim.evidence) {
      const key = `${laneOfEvidence(evidence)}:${String(evidence.isInterpretive)}:${evidence.citation.sourceKey}`;
      if (seen.has(key)) continue;
      seen.add(key);
      descriptors.push(toDescriptor(evidence));
    }
  }
  const snapshot = summariseEvidence(descriptors);
  const records = countEvidenceRecords(claims);

  return (
    <div className="rounded-md border border-rule bg-mist px-5 py-4">
      <p className="meta-label">Evidence recorded here</p>
      <p className="mt-1.5 text-ink-soft">{EVIDENCE_STATEMENT_TEXT[snapshot.statement]}</p>

      {snapshot.hasAnyEvidence ? (
        <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
          {EVIDENCE_LANES.map((lane) => (
            <CountItem key={lane} label={EVIDENCE_RECORD_NOUN[lane].heading} value={records[lane]} />
          ))}
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

/**
 * How close this citation gets to the research, in words.
 *
 * Four states a clinician actually cares about, and no score. "Secondary
 * source" is not a criticism of the source — a handbook is a legitimate record
 * of what its author does — it is a statement about what standing between this
 * index and a study means for the claim.
 */
const TRACE_LABEL: Record<string, string> = {
  primary_source_is_cited: 'Primary source cited directly',
  abstract_only: 'Abstract reviewed; full text not obtained',
  cited_not_obtained: 'Secondary source; its citations not obtained',
  not_attempted: 'Primary source not yet traced',
  full_text_supports: 'Full text reviewed — supports this',
  full_text_partially_supports: 'Full text reviewed — supports this in part',
  full_text_does_not_support: 'Full text reviewed — does not support this',
  full_text_different_context: 'Full text reviewed — different context',
};

/** One evidence link: the source, what kind of evidence it is, and its reading. */
export function EvidenceCard({
  evidence,
  simple = false,
}: {
  evidence: EvidenceRecord;
  simple?: boolean;
}) {
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
        {/*
          Practitioner only. A patient reading "abstract reviewed" has more to
          be confused by than to gain; a clinician deciding how much weight to
          put on a line needs it, and it is the honest answer to "have you
          actually read this?".
        */}
        {simple ? null : (
          <p className="mt-1.5 text-xs text-slate">
            <span className="tracking-wide uppercase">Primary source status:</span>{' '}
            {TRACE_LABEL[evidence.primaryTrace] ?? 'Not recorded'}
          </p>
        )}
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

/**
 * What kinds of source stand behind a claim, in one line.
 *
 * Printed on the closed disclosure so that collapsing the detail does not
 * collapse the distinction the page exists to keep: "a handbook says" and "a
 * trial found" must stay visibly different whether or not anybody opens it.
 */
function evidenceSummaryLine(claim: PublicClaim): string {
  const counts = new Map<string, number>();
  for (const evidence of claim.evidence) {
    counts.set(evidence.evidenceTypeLabel, (counts.get(evidence.evidenceTypeLabel) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, n]) => (n === 1 ? label : `${label} (${String(n)})`))
    .join(' · ');
}

export function ClaimCard({ claim, simple }: { claim: PublicClaim; simple: boolean }) {
  const text = simple ? (claim.plainLanguageText ?? claim.claimText) : claim.claimText;
  const hasPlainLanguage = claim.plainLanguageText !== null;

  return (
    <article
      id={`claim-${claim.claimKey}`}
      className="avoid-break scroll-mt-28 border-t border-rule pt-5 first:border-t-0 first:pt-0"
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {claim.evidence.length > 0 && !claim.isEditorialNonEvidentiary ? (
          <EditorialStateChip kind="source-fact" />
        ) : null}
        <ScopeBadge scope={claim.certificateTypeScope} />
      </div>
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
        /*
         * The evidence behind a claim, behind a disclosure.
         *
         * Not a hiding place. A claim carrying four evidence cards, each with a
         * population, a route, an editorial note and a citation, runs to about a
         * screen and a half; ten such claims made the BPC-157 evidence section
         * ten thousand pixels tall, which is a section nobody reads to the end
         * of. What stays visible without a click is the claim, its uncertainty,
         * and the tag saying what class of evidence stands behind it, so the
         * shape of the support is legible before the detail.
         *
         * The disclosure is a native `details`, open in print, open with
         * JavaScript off, and reachable by find-in-page in browsers that
         * implement it. Nothing here is conditional on a reading mode.
         */
        <div className="mt-4">
          <Disclosure
            summary={`The ${claim.evidence.length === 1 ? 'source' : 'sources'} behind this`}
            detail={evidenceSummaryLine(claim)}
            count={claim.evidence.length}
          >
            <ul className="space-y-2.5">
              {claim.evidence.map((evidence) => (
                <EvidenceCard key={evidence.id} evidence={evidence} simple={simple} />
              ))}
            </ul>
          </Disclosure>
        </div>
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
  const human = claims.filter((c) => laneOfClaim(c) === 'human');
  const preclinical = claims.filter((c) => laneOfClaim(c) === 'preclinical');
  const reference = claims.filter((c) => laneOfClaim(c) === 'reference');

  return (
    <div className="space-y-[calc(var(--rhythm)*2)]">
      {/*
        Where the counts at the top of the page are defined. Visible text, not a
        tooltip: a number whose unit has to be hovered for is read without it.
      */}
      <p id="how-evidence-is-counted" className="max-w-[64ch] text-sm leading-relaxed text-slate">
        <span className="font-medium text-ink-soft">How evidence is counted. </span>
        {simple ? EVIDENCE_RECORD_DEFINITION.simpleFull : EVIDENCE_RECORD_DEFINITION.full}
        {simple ? null : ' Each statement below is filed under the strongest kind of evidence behind it.'}
      </p>
      <ClaimGroup
        heading="Human evidence"
        description="Findings from studies carried out in people."
        claims={human}
        simple={simple}
        emptyHeadline="No human evidence is currently recorded here."
        emptyDetail="That is a statement about this index, not about the literature: human studies may exist that have not yet been extracted and linked to a source here."
      />
      <ClaimGroup
        heading="Preclinical evidence"
        description="Animal and laboratory work. These results do not establish what happens in people."
        claims={preclinical}
        simple={simple}
        emptyHeadline="No preclinical evidence is currently recorded here."
        emptyDetail="Extraction from the registered sources has not reached this compound yet."
      />
      <ClaimGroup
        heading="Reference and practice"
        description="What textbooks, practitioner references and named clinicians describe. Attributed, and never presented as a study result."
        claims={reference}
        simple={simple}
        emptyHeadline="No reference or practitioner statements are currently recorded here."
        emptyDetail="Several registered sources discuss this compound; none has been extracted into a sourced statement yet."
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
      <h3 className="font-serif text-lg text-deep-tide">
        {heading}
        {/* Statement counts live here, at depth, and always say "statements". */}
        {!simple && claims.length > 0 ? (
          <span className="tabular ml-2 font-sans text-xs text-slate">{formatStatementCount(claims.length)}</span>
        ) : null}
      </h3>
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
