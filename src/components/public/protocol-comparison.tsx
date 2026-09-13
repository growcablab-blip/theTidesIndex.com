import type { PractitionerProtocol } from '@/server/public/queries';

/**
 * Source-reported regimens, side by side.
 *
 * BPC-157 carries five regimens from three books, and reading them as a vertical
 * list invites the reader to average them in their head. Placed in a grid with a
 * fixed row order, the differences are the first thing visible — which is the
 * only reason this view exists.
 *
 * **It ranks nothing.** There is no recommended column, no consensus row and no
 * ordering by quality, because the evidence here does not support one: three
 * practitioner handbooks, none of which cites a study for its amounts. Where a
 * regimen did rest on stronger evidence the label on it would say so, and the
 * reader would draw their own conclusion from the label rather than from a
 * position in a table.
 *
 * Practitioner mode only. The rows are amounts.
 */

/**
 * What kind of thing a regimen is.
 *
 * The single most consequential label in the product. A clinic reading a table
 * of regimens must never take "reported by a practitioner handbook" for
 * "validated in a trial", and the distinction has to be visible on each row
 * rather than inferable from a citation underneath it.
 */
const EVIDENCE_CONTEXT: Readonly<
  Record<string, { label: string; tone: 'approved' | 'human' | 'reported' | 'preclinical' }>
> = {
  approved_label_evidence: { label: 'Approved-label regimen', tone: 'approved' },
  human_rct: { label: 'Human trial regimen', tone: 'human' },
  human_controlled_nonrandomized: { label: 'Human trial regimen', tone: 'human' },
  human_prospective_uncontrolled: { label: 'Human study regimen', tone: 'human' },
  human_observational: { label: 'Human observational', tone: 'human' },
  human_case_series: { label: 'Human case series', tone: 'human' },
  human_case_report: { label: 'Human case report', tone: 'human' },
  human_pk_pd: { label: 'Human pharmacokinetic study', tone: 'human' },
  animal_in_vivo: { label: 'Preclinical — animal', tone: 'preclinical' },
  in_vitro: { label: 'Preclinical — laboratory', tone: 'preclinical' },
  practitioner_reference: { label: 'Practitioner handbook', tone: 'reported' },
  expert_commentary: { label: 'Expert commentary', tone: 'reported' },
  experiential_anecdotal: { label: 'Experiential report', tone: 'reported' },
  regulatory_reference: { label: 'Regulatory reference', tone: 'approved' },
  academic_reference: { label: 'Academic reference', tone: 'reported' },
};

export function evidenceContextLabel(evidenceTypeLabel: string, evidenceTypeKey?: string): string {
  if (evidenceTypeKey !== undefined && evidenceTypeKey in EVIDENCE_CONTEXT) {
    return EVIDENCE_CONTEXT[evidenceTypeKey]!.label;
  }
  return evidenceTypeLabel;
}

function toneClasses(tone: 'approved' | 'human' | 'reported' | 'preclinical'): string {
  switch (tone) {
    case 'approved':
      return 'border-[var(--color-evidence-human)] bg-[var(--color-evidence-human-bg)] text-[var(--color-evidence-human)]';
    case 'human':
      return 'border-[var(--color-evidence-human)] bg-[var(--color-evidence-human-bg)] text-[var(--color-evidence-human)]';
    case 'preclinical':
      return 'border-[var(--color-evidence-preclinical)] bg-[var(--color-evidence-preclinical-bg)] text-[var(--color-evidence-preclinical)]';
    default:
      return 'border-rule bg-surface-sunk text-slate';
  }
}

/**
 * The taxonomy's public label, mapped to the context wording.
 *
 * The protocol shape carries the display label rather than the key, and
 * "Practitioner reference" is the taxonomy's word for a *source type*. What a
 * clinic needs on a regimen is what kind of thing the regimen is, which is not
 * quite the same sentence — so the mapping is by label where the key is not to
 * hand, and falls through to the label itself when it is a type this component
 * has no wording for.
 */
const BY_LABEL: Readonly<Record<string, string>> = {
  // The taxonomy's current public labels, exactly as evidence_types.json has
  // them. When the first human-study regimens arrived these were missing, so a
  // trial column in the comparison read "Randomised human trial" while the
  // same record's card read "Human trial regimen" — one regimen, two wordings.
  'Approved product labelling': 'approved_label_evidence',
  'Randomised human trial': 'human_rct',
  'Controlled human study, not randomised': 'human_controlled_nonrandomized',
  'Uncontrolled human study': 'human_prospective_uncontrolled',
  'Human observational study': 'human_observational',
  'Human case series': 'human_case_series',
  'Human case report': 'human_case_report',
  'Human pharmacokinetic study': 'human_pk_pd',
  'Animal study': 'animal_in_vivo',
  'Laboratory (in vitro) study': 'in_vitro',
  'Practitioner reference': 'practitioner_reference',
  'Expert commentary': 'expert_commentary',
  'Experiential report': 'experiential_anecdotal',
  'Academic reference': 'academic_reference',
  // Older wordings, kept so a stale label still maps.
  'Approved label': 'approved_label_evidence',
  'Approved-label evidence': 'approved_label_evidence',
  'Randomised controlled trial': 'human_rct',
  'Human pharmacokinetics': 'human_pk_pd',
};

export function ProtocolContextBadge({
  evidenceTypeKey,
  evidenceTypeLabel,
}: {
  evidenceTypeKey?: string | undefined;
  evidenceTypeLabel: string;
}) {
  const key = evidenceTypeKey ?? BY_LABEL[evidenceTypeLabel];
  const entry =
    key !== undefined && key in EVIDENCE_CONTEXT
      ? EVIDENCE_CONTEXT[key]!
      : { label: evidenceTypeLabel, tone: 'reported' as const };

  return (
    <span
      className={`inline-block rounded-sm border px-2 py-0.5 text-2xs font-medium tracking-wide uppercase ${toneClasses(entry.tone)}`}
    >
      {entry.label}
    </span>
  );
}

/** The rows, in a fixed order so two columns can be read across. */
const ROWS: readonly { label: string; get: (p: PractitionerProtocol) => string | null }[] = [
  { label: 'Context / objective', get: (p) => p.objectiveContext },
  { label: 'Population or model', get: (p) => p.populationModel },
  { label: 'Route', get: (p) => p.routeName },
  { label: 'Formulation', get: (p) => p.formulation },
  // The source's own wording, which already carries its unit. `amountUnit` is a
  // normalisation hint for filtering; appending it printed "500 mcg mcg".
  { label: 'Amount as reported', get: (p) => p.amountReported },
  { label: 'Frequency', get: (p) => p.frequencyText },
  { label: 'Timing', get: (p) => p.timingText ?? null },
  { label: 'Duration', get: (p) => p.durationText },
  { label: 'Titration', get: (p) => p.titrationText ?? null },
  { label: 'Cycle / off period', get: (p) => p.cycleText ?? null },
  { label: 'Combinations', get: (p) => p.combinationsText ?? null },
  { label: 'Monitoring', get: (p) => p.monitoringText },
  { label: 'Cautions', get: (p) => p.contraindicationsText },
  { label: 'Regulatory context', get: (p) => p.regulatoryContext },
];

/** Which rows actually differ. Named, so a reader is not left to spot them. */
function differingRows(protocols: readonly PractitionerProtocol[]): string[] {
  if (protocols.length < 2) return [];
  return ROWS.filter((row) => {
    const values = protocols.map((p) => row.get(p) ?? '');
    return new Set(values).size > 1;
  }).map((row) => row.label);
}

export function ProtocolComparison({
  protocols,
  compoundName,
}: {
  protocols: readonly PractitionerProtocol[];
  compoundName: string;
}) {
  if (protocols.length < 2) return null;
  const differs = differingRows(protocols);

  return (
    <div>
      <div className="rounded-md border border-rule bg-mist px-4 py-3.5">
        <p className="text-sm text-ink-soft">
          <span className="font-medium text-ink">
            {protocols.length} regimens from{' '}
            {new Set(protocols.flatMap((p) => p.sources.map((s) => s.sourceKey))).size} sources.
          </span>{' '}
          Shown side by side so the differences are visible. No column is recommended and none is
          ranked: this comparison shows what each named source reports and the evidence context each
          sits in. It does not establish what {compoundName} should be used at, and nothing here
          should be read as endorsement.
        </p>
        {differs.length > 0 ? (
          <p className="mt-2.5 text-sm text-[var(--color-caution)]">
            <span className="font-medium">Differs between sources:</span> {differs.join(' · ')}
          </p>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse text-sm">
          <caption className="sr-only">
            Source-reported regimens for {compoundName}, compared. No regimen is recommended.
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-40 border-b border-ink pb-2 text-left align-bottom">
                <span className="meta-label">Field</span>
              </th>
              {protocols.map((protocol) => (
                <th
                  key={protocol.id}
                  scope="col"
                  className="border-b border-ink pb-2 pl-4 text-left align-bottom"
                >
                  <span className="block font-serif text-base leading-snug text-ink">
                    {protocol.sources[0]?.sourceTitle ?? protocol.protocolKey}
                  </span>
                  <span className="mt-1 block text-xs text-slate">
                    {protocol.sources[0]?.authors?.[0] ?? 'Author not recorded'}
                    {protocol.sources[0]?.year ? ` (${String(protocol.sources[0].year)})` : ''}
                  </span>
                  <span className="mt-1.5 block">
                    <ProtocolContextBadge evidenceTypeLabel={protocol.evidenceTypeLabel} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => {
              const values = protocols.map((p) => row.get(p));
              if (values.every((v) => v === null)) return null;
              const varies = new Set(values.map((v) => v ?? '')).size > 1;

              return (
                <tr key={row.label} className="border-b border-rule-soft align-top">
                  <th scope="row" className="py-3 pr-4 text-left">
                    <span className="text-xs tracking-wide text-slate uppercase">{row.label}</span>
                    {varies ? (
                      <span className="mt-0.5 block text-2xs text-[var(--color-caution)]">
                        differs
                      </span>
                    ) : null}
                  </th>
                  {protocols.map((protocol, index) => (
                    <td key={protocol.id} className="py-3 pl-4 text-ink-soft">
                      {values[index] ?? (
                        // Missing means missing. Not "standard", not inferred
                        // from the neighbouring column.
                        <span className="text-slate italic">Not stated by this source</span>
                      )}
                    </td>
                  ))}
                </tr>
              );
            })}
            <tr className="align-top">
              <th scope="row" className="py-3 pr-4 text-left">
                <span className="text-xs tracking-wide text-slate uppercase">Exact locator</span>
              </th>
              {protocols.map((protocol) => (
                <td key={protocol.id} className="py-3 pl-4 text-xs text-slate">
                  {protocol.sources.map((source) => (
                    <span key={source.sourceKey} className="block">
                      {source.sourceKey}
                      {source.locatorText ? ` — ${source.locatorText}` : ' — location not recorded'}
                    </span>
                  ))}
                  {/*
                    Verification state is carried on the evidence link rather
                    than on the citation, so it is stated here as the record's
                    standing position: nothing on a practitioner-reported
                    regimen has had its primary source traced.
                  */}
                  <span className="mt-1 block">Primary source not traced</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
