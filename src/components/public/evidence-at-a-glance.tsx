import type { PeptidePage } from '@/server/public/queries';

/**
 * What a reader needs before they read anything else.
 *
 * A compound record is long, and the two compounds it was designed against fail
 * in opposite directions. Tesamorelin has an approved product and named Phase
 * III trials, and the risk is that a reader takes the strength of that evidence
 * and applies it to a use it does not cover. BPC-157 has more written about it
 * than almost anything in the field and, in everything this index holds, no
 * human study at all — and the risk is that the sheer volume reads as weight.
 *
 * Both risks are answered by the same thing: putting the shape of the evidence
 * above the evidence itself. A reader who stops after this panel should already
 * know whether there are human studies, whether a regulator has said anything,
 * how many sources describe a regimen, and what the index admits it cannot tell
 * them.
 *
 * Every figure is counted from the record. Nothing here is written by hand, so
 * the panel cannot say something the page below contradicts.
 */

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
  const protocolSources = new Set(
    peptide.protocols.flatMap((protocol) => protocol.sources.map((s) => s.sourceKey)),
  );

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
          value={humanClaims === 0 ? 'None held' : `${String(humanClaims)} statements`}
          tone={humanClaims === 0 ? 'absent' : 'present'}
          note={
            humanClaims === 0
              ? 'No study in people is held by this index for this compound.'
              : 'Statements resting on evidence from people.'
          }
        />
        <Item
          label="Preclinical evidence"
          value={
            preclinicalClaims === 0 ? 'None recorded' : `${String(preclinicalClaims)} statements`
          }
          tone="neutral"
          note="Laboratory and animal work. Not evidence about people."
        />
        <Item
          label="Regulatory status"
          value={
            peptide.regulatoryStatuses.length === 0
              ? 'Nothing recorded'
              : approved.length > 0
                ? `Approved — ${approved.map((s) => s.jurisdiction).join(', ')}`
                : 'No approval recorded'
          }
          tone={approved.length > 0 ? 'present' : 'absent'}
          note={
            approved.length > 0
              ? 'An approval covers a stated indication and nothing else.'
              : 'No regulator, in any source held here, has assessed this compound.'
          }
        />
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
            protocolSources.size === 0
              ? 'None'
              : `${String(protocolSources.size)} source${protocolSources.size === 1 ? '' : 's'}`
          }
          tone="neutral"
          note={
            simple
              ? 'Practitioner protocol records exist. Amounts are shown in the practitioner view, attributed to the source that reported each.'
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
          note="Questions a reader would reasonably expect this page to answer, and the sources here do not."
        />
      </dl>

      {peptide.disagreements.length > 0 ? (
        <p className="mt-5 border-t border-rule pt-4 text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {peptide.disagreements.length} recorded disagreement
            {peptide.disagreements.length === 1 ? '' : 's'}
          </span>{' '}
          between or within the sources held here. Both positions are shown with their attribution;
          neither is resolved by averaging.
        </p>
      ) : null}
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
