import type {
  CompoundIdentityClaim,
  EvidenceGap,
  PeptidePage,
  ReplicationAssessment,
} from '@/server/public/queries';
import { CitationLine } from '@/components/public/citation';

/**
 * Identity, replication and research opportunity.
 *
 * The three modules the site-wide emphasis reset needed. Each answers a
 * question a researcher or a clinic actually asks and none of them is about a
 * regulator:
 *
 *   what does this name refer to
 *   has anybody else found the same thing
 *   what would be useful to study next
 *
 * As with every figure here, nothing is written into the markup that the
 * database does not hold.
 */

// --- Nomenclature -----------------------------------------------------------

const FORM_LABELS: Record<string, string> = {
  full_length: 'The complete molecule',
  fragment: 'A fragment of it',
  analogue: 'A modified variant',
  preparation: 'A preparation, contents not chemically defined',
  unspecified: 'Not stated by the source',
};

const VERIFICATION_LABELS: Record<string, string> = {
  analytically_characterised: 'Measured analytically',
  stated_by_primary_source: 'Stated by a primary source',
  stated_by_secondary_source: 'Stated by a secondary source',
  asserted_without_detail: 'Asserted, no chemical detail given',
  contradicted: 'Contradicted by better evidence',
};

/** Strongest first, so a reader meets the measurement before the assertion. */
const VERIFICATION_RANK: Record<string, number> = {
  analytically_characterised: 0,
  stated_by_primary_source: 1,
  stated_by_secondary_source: 2,
  asserted_without_detail: 3,
  contradicted: 4,
};

/**
 * What each source says a name refers to.
 *
 * Grouped by the name as written, because the whole subject is that one name is
 * used by different sources for different molecules. A reader should be able to
 * see the disagreement by reading down a column rather than by being told about
 * it.
 */
export function NomenclatureMap({
  identities,
}: {
  identities: readonly CompoundIdentityClaim[];
}) {
  if (identities.length === 0) return null;

  const byName = new Map<string, CompoundIdentityClaim[]>();
  for (const claim of identities) {
    const list = byName.get(claim.nameUsed) ?? [];
    list.push(claim);
    byName.set(claim.nameUsed, list);
  }

  const contested = [...byName.values()].some(
    (group) => new Set(group.map((c) => c.form)).size > 1,
  );

  return (
    <div>
      {contested ? (
        <p className="text-sm text-ink-soft">
          One name, more than one molecule. The rows below are what each source says the name refers
          to, strongest evidence first — a measurement of the substance outranks a statement
          about it.
        </p>
      ) : null}

      <div className="mt-4 space-y-6">
        {[...byName.entries()].map(([name, group]) => (
          <section key={name} className="rounded-lg border border-rule bg-warm-white px-4 py-4">
            <h3 className="font-serif text-lg text-deep-tide">“{name}”</h3>
            <p className="mt-0.5 text-xs text-slate">
              {group.length === 1
                ? 'One source uses this name on this record.'
                : `${String(group.length)} sources use this name on this record.`}
            </p>

            <ol className="mt-3 space-y-3">
              {[...group]
                .sort(
                  (a, b) =>
                    (VERIFICATION_RANK[a.verification] ?? 9) -
                    (VERIFICATION_RANK[b.verification] ?? 9),
                )
                .map((claim) => (
                  <li
                    key={claim.id}
                    className={`rounded-md border-l-2 px-3 py-2 ${
                      claim.verification === 'analytically_characterised'
                        ? 'border-deep-tide bg-mist'
                        : claim.verification === 'contradicted'
                          ? 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)]'
                          : 'border-rule bg-mist/50'
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-sm font-medium text-ink">
                        {FORM_LABELS[claim.form] ?? claim.form}
                      </span>
                      <span className="text-xs tracking-wide text-slate uppercase">
                        {VERIFICATION_LABELS[claim.verification] ?? claim.verification}
                      </span>
                    </div>

                    {claim.chemicalForm === null ? null : (
                      <p className="mt-1 text-sm text-ink-soft">{claim.chemicalForm}</p>
                    )}

                    {claim.sequence === null && claim.residueCount === null ? null : (
                      <p className="mt-1 font-mono text-xs break-all text-slate">
                        {claim.sequence ?? ''}
                        {claim.residueCount === null
                          ? ''
                          : `${claim.sequence === null ? '' : '  ·  '}${String(claim.residueCount)} residues`}
                        {claim.molecularWeight === null
                          ? ''
                          : `  ·  ${trimWeight(claim.molecularWeight)} Da`}
                      </p>
                    )}

                    <p className="mt-2 text-sm text-ink-soft">{claim.usageContext}</p>
                    {claim.notes === null ? null : (
                      <p className="mt-1 text-sm text-slate">{claim.notes}</p>
                    )}
                    {claim.citation === null ? null : (
                      <div className="mt-2">
                        <CitationLine citation={claim.citation} />
                      </div>
                    )}
                  </li>
                ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}

function trimWeight(value: string): string {
  return value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
}

// --- Replication -------------------------------------------------------------

/** Ordered by what each state lets a reader conclude. */
const REPLICATION_STEPS = [
  'single_study',
  'repeated_same_group',
  'independent_group',
  'independent_multiple_countries',
  'confirmed_in_humans',
] as const;

export const REPLICATION_LABELS: Record<string, string> = {
  not_assessed: 'Nothing found',
  single_study: 'One study',
  repeated_same_group: 'Repeated, same group',
  independent_group: 'Independent group',
  independent_multiple_countries: 'Independent, more than one country',
  confirmed_in_humans: 'Confirmed in people',
  conflicting_replication: 'Conflicting replications',
  failed_replication: 'Failed to replicate',
};

/**
 * How far each finding has been repeated.
 *
 * A ladder rather than a count, because the two say opposite things about the
 * same corpus: forty papers from one laboratory is a weaker position than two
 * from two, and a page that printed "40" would have told the reader the
 * opposite of what it knows.
 */
export function ReplicationMap({
  assessments,
}: {
  assessments: readonly ReplicationAssessment[];
}) {
  if (assessments.length === 0) return null;

  return (
    <div className="space-y-5">
      <p className="text-sm text-ink-soft">
        Not a count of papers. What matters is whether anybody other than the original group found
        the same thing.
      </p>

      {assessments.map((assessment) => {
        const reached = REPLICATION_STEPS.indexOf(
          assessment.state as (typeof REPLICATION_STEPS)[number],
        );
        const offTrack = reached === -1;

        return (
          <article
            key={assessment.id}
            className="rounded-lg border border-rule bg-warm-white px-4 py-4"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="max-w-[52ch] font-serif text-base text-ink">{assessment.finding}</h3>
              <span
                className={`text-xs tracking-wide uppercase ${
                  assessment.state === 'not_assessed' ||
                  assessment.state === 'failed_replication' ||
                  assessment.state === 'conflicting_replication'
                    ? 'text-[var(--color-caution)]'
                    : reached >= 2
                      ? 'text-deep-tide'
                      : 'text-slate'
                }`}
              >
                {REPLICATION_LABELS[assessment.state] ?? assessment.state}
              </span>
            </div>

            {/* The ladder. Steps beyond the one reached stay visible and unfilled,
                so what has *not* been done is as legible as what has. */}
            {offTrack ? null : (
              <ol className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                {REPLICATION_STEPS.map((step, index) => (
                  <li
                    key={step}
                    className={`h-1.5 flex-1 rounded-full ${
                      index <= reached ? 'bg-deep-tide' : 'bg-rule-soft'
                    }`}
                  />
                ))}
              </ol>
            )}

            <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate">
              {assessment.studyCount === null ? null : (
                <div>
                  <dt className="inline">Studies </dt>
                  <dd className="inline text-ink-soft">{assessment.studyCount}</dd>
                </div>
              )}
              {assessment.groupCount === null ? null : (
                <div>
                  <dt className="inline">Research groups </dt>
                  <dd className="inline text-ink-soft">{assessment.groupCount}</dd>
                </div>
              )}
              {assessment.countryCount === null ? null : (
                <div>
                  <dt className="inline">Countries </dt>
                  <dd className="inline text-ink-soft">{assessment.countryCount}</dd>
                </div>
              )}
              <div>
                <dt className="inline">In people </dt>
                <dd className="inline text-ink-soft">
                  {assessment.humanConfirmed ? 'yes' : 'no'}
                </dd>
              </div>
            </dl>

            {assessment.models === null ? null : (
              <p className="mt-2 text-sm text-ink-soft">{assessment.models}</p>
            )}
            <p className="mt-2 text-sm text-ink-soft">{assessment.basis}</p>
            {assessment.limitations === null ? null : (
              <p className="mt-2 border-t border-rule-soft pt-2 text-sm text-slate">
                {assessment.limitations}
              </p>
            )}
            {assessment.supportingRecords === null ? null : (
              <p className="mt-1 font-mono text-xs text-slate">{assessment.supportingRecords}</p>
            )}
          </article>
        );
      })}
    </div>
  );
}

// --- Research opportunities ---------------------------------------------------

export const OPPORTUNITY_LABELS: Record<string, string> = {
  identity_clarification: 'Identity',
  human_evidence: 'Human evidence',
  human_safety: 'Human safety',
  human_pharmacokinetics: 'Human pharmacokinetics',
  route_comparison: 'Route',
  formulation_comparison: 'Formulation',
  dose_response: 'Dose–response',
  independent_replication: 'Independent replication',
  long_term_outcomes: 'Long-term outcomes',
  mechanism_confirmation: 'Mechanism',
  protocol_validation: 'Protocol validation',
  product_characterisation: 'Product characterisation',
  regulatory_position: 'Regulatory position',
};

/**
 * What would be useful to study next.
 *
 * Derived entirely from recorded gaps and unresolved disagreements, which is
 * what keeps it a research agenda rather than a wish list: a question cannot
 * appear here without the absence that motivates it sitting in the database
 * beneath it.
 *
 * The wording discipline that matters: every entry describes what would be
 * useful to *study*. None describes what anybody should try.
 */
export function ResearchOpportunities({ peptide }: { peptide: PeptidePage }) {
  const fromGaps = peptide.gaps.filter(
    (gap): gap is EvidenceGap & { researchQuestion: string; opportunityType: string } =>
      gap.researchQuestion !== null && gap.opportunityType !== null,
  );
  const openDisagreements = peptide.disagreements.filter(
    (d) => d.resolution === 'unresolved' && d.resolutionRequirement !== null,
  );

  if (fromGaps.length === 0 && openDisagreements.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        No research questions are recorded for this compound yet. They are derived from recorded
        gaps, so they appear as the gaps are written rather than being composed separately.
      </p>
    );
  }

  const byType = new Map<string, typeof fromGaps>();
  for (const gap of fromGaps) {
    const list = byType.get(gap.opportunityType) ?? [];
    list.push(gap);
    byType.set(gap.opportunityType, list);
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-soft">
        Each of these comes from something this index has recorded as missing. They describe what
        would be useful to study — not what anybody should try.
      </p>

      <ul className="space-y-4">
        {[...byType.entries()].map(([type, gaps]) => (
          <li key={type}>
            <p className="meta-label">{OPPORTUNITY_LABELS[type] ?? type}</p>
            <ul className="mt-2 space-y-3">
              {gaps.map((gap) => (
                <li key={gap.id} className="rounded-md border border-rule-soft bg-mist px-4 py-3">
                  <p className="font-serif text-base text-ink">{gap.researchQuestion}</p>
                  <p className="mt-1.5 text-sm text-ink-soft">
                    <span className="text-slate">Because: </span>
                    {gap.statement}
                  </p>
                  {gap.whatWouldResolveIt === null ? null : (
                    <p className="mt-1 text-sm text-ink-soft">
                      <span className="text-slate">What would answer it: </span>
                      {gap.whatWouldResolveIt}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {openDisagreements.length > 0 ? (
        <div className="border-t border-rule pt-4">
          <p className="meta-label">Open disagreements</p>
          <ul className="mt-2 space-y-2">
            {openDisagreements.map((disagreement) => (
              <li key={disagreement.id} className="text-sm text-ink-soft">
                <span className="text-ink">{disagreement.topic}</span>
                <span className="block text-slate">
                  Settled by: {disagreement.resolutionRequirement}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
