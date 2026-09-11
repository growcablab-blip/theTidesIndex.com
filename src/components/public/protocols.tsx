import type {
  PractitionerProtocol,
  SimpleProtocol,
} from '@/server/public/queries';
import { CitationLine } from './citation';
import { Callout, EmptyState, NotRecorded, TableScroller } from './primitives';

/**
 * Source-reported protocols.
 *
 * Every card names one source and shows what that source said. There is no
 * combined view, no range across sources, no "typical" column — regimens are
 * never merged, averaged or reconciled, and the interface is built so that
 * doing so would be conspicuous rather than convenient.
 *
 * When several sources describe the same compound differently, that difference
 * is the information. Presenting it as a disagreement is more useful to a
 * clinician than presenting a synthesised number that no source actually stated.
 */

export function ProtocolSectionLede({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <Callout title="How to read these">
      <p>
        {count === 1
          ? 'One source describes a regimen for this compound.'
          : `${String(count)} sources describe regimens for this compound.`}{' '}
        Each is recorded exactly as that source stated it, with its own context, population and
        route. They are shown side by side and are not combined: where they differ, the difference
        is a finding in itself rather than something to average away.
      </p>
    </Callout>
  );
}

/**
 * Patient-facing protocol summary.
 *
 * Receives no dose, because the relation it was read from has no dose columns
 * in it. What a patient gets is the fact that named sources describe regimens,
 * what those regimens were aiming at, in whom, and by which route — enough to
 * have a real conversation with a clinician, and nothing that works as an
 * instruction.
 */
export function SimpleProtocolCard({ protocol }: { protocol: SimpleProtocol }) {
  return (
    <li className="avoid-break rounded-md border border-rule bg-warm-white px-5 py-4">
      <p className="meta-label">Described by</p>
      <div className="mt-0.5">
        {protocol.sources.length === 0 ? (
          <NotRecorded what="source attribution is missing" />
        ) : (
          <ul className="space-y-1">
            {protocol.sources.map((citation) => (
              <li key={citation.sourceKey}>
                <CitationLine citation={citation} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <dl className="mt-3.5 grid gap-x-6 gap-y-2.5 text-sm sm:grid-cols-2">
        <Field label="What it was for">{protocol.objectiveContext}</Field>
        <Field label="In whom">
          {protocol.populationModel ?? <NotRecorded what="the source does not state it" />}
        </Field>
        <Field label="How it was given">
          {protocol.routeName ?? <NotRecorded what="the source does not state it" />}
        </Field>
        <Field label="Kind of source">{protocol.evidenceTypeLabel}</Field>
      </dl>

      {protocol.regulatoryContext ? (
        <p className="mt-3 text-sm text-ink-soft">{protocol.regulatoryContext}</p>
      ) : null}

      <p className="mt-3.5 border-t border-rule-soft pt-3 text-sm text-slate">
        Amounts, frequency and duration are not shown here.
        {protocol.hasMonitoringGuidance || protocol.hasSafetyGuidance
          ? ' This source also records monitoring and safety guidance. Both belong in a conversation with a clinician who knows your history.'
          : ' Discuss this compound with a clinician who knows your history.'}
      </p>
    </li>
  );
}

/** The regimen exactly as the named source reported it. Practitioner mode only. */
export function PractitionerProtocolCard({ protocol }: { protocol: PractitionerProtocol }) {
  const amount = [protocol.amountReported, protocol.amountUnit].filter(Boolean).join(' ');

  return (
    <li className="avoid-break rounded-md border border-rule bg-warm-white">
      <header className="border-b border-rule bg-mist px-5 py-3">
        <p className="meta-label">Source-reported protocol</p>
        <div className="mt-1">
          {protocol.sources.length === 0 ? (
            <NotRecorded what="source attribution is missing" />
          ) : (
            <ul className="space-y-1">
              {protocol.sources.map((citation) => (
                <li key={citation.sourceKey}>
                  <CitationLine citation={citation} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      <div className="px-5 py-4">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Field label="Objective or context">{protocol.objectiveContext}</Field>
          <Field label="Population or model">
            {protocol.populationModel ?? <NotRecorded what="the source does not state it" />}
          </Field>
          <Field label="Route">
            {protocol.routeName ?? <NotRecorded what="the source does not state it" />}
          </Field>
          <Field label="Formulation">
            {protocol.formulation ?? <NotRecorded what="the source does not state it" />}
          </Field>
          <Field label="Evidence type">{protocol.evidenceTypeLabel}</Field>
          <Field label="Regulatory context">
            {protocol.regulatoryContext ?? <NotRecorded />}
          </Field>
        </dl>

        <div className="mt-4 rounded-md border border-rule-soft bg-mist/50 px-4 py-3">
          <p className="meta-label">As reported by this source</p>
          <TableScroller>
            <table className="mt-2 w-full text-sm">
              <thead>
                <tr className="text-left">
                  {['Amount', 'Frequency', 'Timing', 'Duration', 'Cycle'].map((head) => (
                    <th key={head} className="pr-4 pb-1.5 font-medium text-slate">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="align-top">
                  <Cell value={amount || null} />
                  <Cell value={protocol.frequencyText} />
                  <Cell value={protocol.timingText} />
                  <Cell value={protocol.durationText} />
                  <Cell value={protocol.cycleText} />
                </tr>
              </tbody>
            </table>
          </TableScroller>
          {protocol.titrationText ? (
            <p className="mt-2.5 text-sm text-ink-soft">
              <span className="meta-label">Titration</span> {protocol.titrationText}
            </p>
          ) : null}
          <p className="mt-2.5 text-xs text-slate">
            Values are reproduced in the source&rsquo;s own wording. They are not converted,
            normalised or reconciled with any other source.
          </p>
        </div>

        <dl className="mt-4 space-y-3 text-sm">
          {protocol.monitoringText ? (
            <Field label="Monitoring and labs">{protocol.monitoringText}</Field>
          ) : null}
          {protocol.contraindicationsText ? (
            <Field label="Contraindications and cautions">{protocol.contraindicationsText}</Field>
          ) : null}
          {protocol.safetyNotes ? <Field label="Safety notes">{protocol.safetyNotes}</Field> : null}
          {protocol.adverseEventsText ? (
            <Field label="Adverse events reported">{protocol.adverseEventsText}</Field>
          ) : null}
          {protocol.outcomeContext ? (
            <Field label="Outcome as reported">{protocol.outcomeContext}</Field>
          ) : null}
        </dl>
      </div>
    </li>
  );
}

function Cell({ value }: { value: string | null }) {
  return (
    <td className="pr-4 text-ink-soft">
      {value ?? <span className="text-slate-light italic">not stated</span>}
    </td>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="meta-label">{label}</dt>
      <dd className="mt-0.5 text-ink-soft">{children}</dd>
    </div>
  );
}

export function NoProtocolsYet({ simple }: { simple: boolean }) {
  return (
    <EmptyState
      headline="Source-specific protocol records have not yet passed review."
      detail={
        simple
          ? 'When they do, this section will show which named sources describe regimens for this compound and what those regimens were aiming at. It will not show doses.'
          : 'Registered practitioner sources discuss this compound. Extracting a regimen requires the exact page it appears on, the population it applies to, and scientific, clinical and compliance review before it can be shown here.'
      }
    />
  );
}
