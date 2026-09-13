import type { PeptidePage } from '@/server/public/queries';

/**
 * What a reader needs before they read anything else.
 *
 * A compound record is long, and the compounds it was designed against fail in
 * opposite directions. Tesamorelin has an approved product and named Phase III
 * trials, and the risk is that a reader takes the strength of that evidence and
 * applies it to a use it does not cover. BPC-157 has more written about it than
 * almost anything in the field and three small uncontrolled human studies, and
 * the risk is that the volume reads as weight.
 *
 * Both risks are answered by putting the shape of the evidence above the
 * evidence itself. A reader who stops after this panel should already know
 * whether there are human studies, whether anybody has repeated them, how many
 * sources describe a regimen, and what the index admits it cannot tell them.
 *
 * **Regulatory status is last, deliberately.** It used to lead, because it is
 * the cleanest data on the page — one field, one date, one authority — and
 * that is exactly the wrong reason. What a regulator has said about a compound
 * in one jurisdiction is a useful fact and is not a measure of the science.
 * Leading with it teaches a reader to sort compounds by approval, which
 * inverts what this platform is for: an unapproved compound with two
 * independently replicated human safety studies is better evidenced than an
 * approved one used outside its indication, and a panel that put the badge
 * first would say the opposite.
 *
 * Every figure is counted from the record. Nothing here is written by hand, so
 * the panel cannot say something the page below contradicts. The values are
 * descriptive first and numeric second, because a count alone misleads in both
 * directions.
 */

const PRECLINICAL_TYPES = new Set(['animal_in_vivo', 'ex_vivo', 'in_vitro']);
const HUMAN_ADMINISTERED = new Set([
  'human_interventional',
  'human_observational',
  'case_report',
]);

/** Ordered by what each state lets a reader conclude. */
const REPLICATION_SUMMARY: Record<string, string> = {
  confirmed_in_humans: 'Confirmed in people',
  independent_multiple_countries: 'Independent, more than one country',
  independent_group: 'Independent group',
  repeated_same_group: 'Repeated by the same group only',
  single_study: 'One study only',
  conflicting_replication: 'Replications conflict',
  failed_replication: 'Failed to replicate',
  not_assessed: 'Nothing found to assess',
};

const REPLICATION_RANK = [
  'confirmed_in_humans',
  'independent_multiple_countries',
  'independent_group',
  'repeated_same_group',
  'single_study',
  'conflicting_replication',
  'failed_replication',
  'not_assessed',
];

export function EvidenceAtAGlance({
  peptide,
  simple,
}: {
  peptide: PeptidePage;
  simple: boolean;
}) {
  const humanClaims = peptide.claims.filter((claim) =>
    claim.evidence.some((evidence) => evidence.evidenceClass === 'human'),
  ).length;
  const preclinicalClaims = peptide.claims.filter((claim) =>
    claim.evidence.some((evidence) => evidence.evidenceClass === 'preclinical'),
  ).length;

  const approved = peptide.regulatoryStatuses.filter((status) => status.status === 'approved');
  /*
   * Counted from `protocolCountAll`, not from the rendered list.
   *
   * Simple mode receives no protocol rows at all, so counting the list printed
   * "None" on a compound with a recorded regimen — the panel contradicting
   * the section below it. `protocolCountAll` is carried precisely so that a
   * patient can be told records exist without being shown the amounts.
   */
  const protocolSources = new Set(
    peptide.protocols.flatMap((protocol) => protocol.sources.map((s) => s.sourceKey)),
  );
  const hasProtocols = peptide.protocolCountAll > 0;

  /*
   * A screen answers the evidence questions better than the claim layer can.
   * The claim layer says what this index has written down; the screen says what
   * the literature contains. Where both exist, the screen is what a reader
   * means by "is there any evidence".
   */
  const screen = peptide.literatureScreens[0];
  const screenedPreclinical =
    screen === undefined
      ? 0
      : screen.typeCounts
          .filter((t) => PRECLINICAL_TYPES.has(t.studyType))
          .reduce((n, t) => n + t.count, 0);
  const screenedHuman =
    screen === undefined
      ? 0
      : screen.typeCounts
          .filter((t) => HUMAN_ADMINISTERED.has(t.studyType))
          .reduce((n, t) => n + t.count, 0);

  const humanValue =
    screen !== undefined
      ? screen.humanPrimaryCount === 0
        ? 'None identified'
        : `${String(screen.humanPrimaryCount)} ${screen.humanPrimaryCount === 1 ? 'record' : 'records'} in people`
      : humanClaims === 0
        ? 'None held'
        : `${String(humanClaims)} statements`;

  const humanNote =
    screen !== undefined
      ? screen.humanPrimaryCount === 0
        ? `None found in a ${screen.databaseName.split(' ')[0] ?? 'literature'} screen on ${screen.searchDate}.`
        : `From a ${screen.databaseName.split(' ')[0] ?? 'literature'} screen on ${screen.searchDate}. Open the section below for what each one was.`
      : humanClaims === 0
        ? 'No study in people is held by this index for this compound.'
        : 'Statements resting on evidence from people.';

  const preclinicalValue =
    screen !== undefined
      ? screenedPreclinical === 0
        ? 'None identified'
        : `${String(screenedPreclinical)} studies identified`
      : preclinicalClaims === 0
        ? 'None recorded here'
        : `${String(preclinicalClaims)} statements`;

  // The best replication state on the record, which is what a reader asking
  // "has anybody else found this" wants first.
  const bestReplication =
    [...peptide.replication].sort(
      (a, b) => REPLICATION_RANK.indexOf(a.state) - REPLICATION_RANK.indexOf(b.state),
    )[0] ?? null;

  const contestedNames = new Set(
    peptide.identities.filter((i) => i.verification === 'contradicted').map((i) => i.nameUsed),
  );

  const openQuestions = peptide.gaps.filter((gap) => gap.researchQuestion !== null).length;

  return (
    <section
      aria-labelledby="at-a-glance"
      className="rounded-lg border border-rule bg-mist px-5 py-5 sm:px-6 sm:py-6"
    >
      <h2 id="at-a-glance" className="meta-label">
        Evidence at a glance
      </h2>

      <dl className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
        <Item
          label="Human evidence"
          value={humanValue}
          tone={
            (screen === undefined ? humanClaims : screen.humanPrimaryCount) === 0
              ? 'absent'
              : 'present'
          }
          note={humanNote}
        />
        <Item
          label="Preclinical evidence"
          value={preclinicalValue}
          tone="neutral"
          note="Laboratory and animal work. However much of it there is, it is not evidence about people."
        />
        {bestReplication === null ? (
          <Item
            label="Replication"
            value="Not assessed"
            tone="neutral"
            note="Whether anybody other than the original group found the same thing has not been assessed for this compound."
          />
        ) : (
          <Item
            label="Replication, at best"
            value={REPLICATION_SUMMARY[bestReplication.state] ?? bestReplication.state}
            tone={
              ['confirmed_in_humans', 'independent_multiple_countries', 'independent_group'].includes(
                bestReplication.state,
              )
                ? 'present'
                : 'absent'
            }
            note={`The strongest of ${String(peptide.replication.length)} assessed findings. The rest are weaker, and each is shown with its basis.`}
          />
        )}
        <Item
          label="Routes recorded"
          value={
            peptide.routes.length === 0
              ? 'None'
              : peptide.routes.map((route) => route.routeName ?? route.routeKey).join(', ')
          }
          tone="neutral"
          note="A route a source reports is not a route a source recommends."
        />
        <Item
          label="Protocol sources"
          value={
            !hasProtocols
              ? 'None'
              : protocolSources.size === 0
                ? `${String(peptide.protocolCountAll)} recorded`
                : `${String(protocolSources.size)} source${protocolSources.size === 1 ? '' : 's'}`
          }
          tone="neutral"
          note={
            // The empty case is not the same sentence. "Practitioner protocol
            // records exist" printed beside "None" is a page contradicting
            // itself in adjacent lines.
            !hasProtocols
              ? 'No source held here reports a regimen for this compound.'
              : simple
                ? 'Amounts are shown in the practitioner view, attributed to the source that reported each.'
                : 'Each regimen is shown attributed. None is merged or averaged.'
          }
        />
        <Item
          label="Recorded as unsettled"
          value={
            peptide.gaps.length === 0
              ? 'Nothing recorded'
              : `${String(peptide.gaps.length)} point${peptide.gaps.length === 1 ? '' : 's'}`
          }
          tone="absent"
          note={
            openQuestions === 0
              ? 'Questions a reader would reasonably expect this page to answer, and the sources here do not.'
              : `${String(openQuestions)} of them are written as research questions, further down the page.`
          }
        />
      </dl>

      {contestedNames.size > 0 ? (
        <p className="mt-5 border-t border-rule pt-4 text-sm text-ink-soft">
          <span className="font-medium text-[var(--color-caution)]">
            {[...contestedNames].map((n) => `“${n}”`).join(', ')} is used for this compound by at
            least one source and is contradicted by analytical evidence on this record.
          </span>{' '}
          What a name refers to is the first section below.
        </p>
      ) : null}

      {peptide.disagreements.length > 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {peptide.disagreements.length} recorded disagreement
            {peptide.disagreements.length === 1 ? '' : 's'}
          </span>{' '}
          between or within the sources held here. Both positions are shown with their attribution;
          neither is resolved by averaging.
        </p>
      ) : null}

      {/*
        Last, in small type, and phrased as context rather than as a verdict.
        Non-approval is not evidence weakness and approval is not evidence
        strength, so the line states the position and stops.
      */}
      <p className="mt-3 text-xs text-slate">
        <span className="tracking-wide uppercase">Regulatory context: </span>
        {peptide.regulatoryStatuses.length === 0
          ? 'nothing recorded.'
          : approved.length > 0
            ? `approved in ${approved.map((s) => s.jurisdiction).join(', ')} for a stated indication. An approval covers that indication and nothing else.`
            : 'no approval recorded in any source held here. That is a fact about its regulatory position, not a measure of the evidence above.'}{' '}
        {screenedHuman > 0 && approved.length === 0
          ? 'Regulators have not assessed it; researchers have studied it.'
          : ''}
      </p>
    </section>
  );
}

function Item({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: 'present' | 'absent' | 'neutral';
}) {
  // An absence is coloured the same as a caution rather than the same as a
  // failure. "No human evidence" is a fact about this index, not a verdict on
  // the compound, and the palette should not imply otherwise.
  const valueTone =
    tone === 'present'
      ? 'text-deep-tide'
      : tone === 'absent'
        ? 'text-[var(--color-caution)]'
        : 'text-ink';

  return (
    <div>
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className={`mt-1 font-serif text-lg leading-snug ${valueTone}`}>{value}</dd>
      <dd className="mt-1 text-xs leading-snug text-slate">{note}</dd>
    </div>
  );
}
