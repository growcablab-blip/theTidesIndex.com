import type {
  Disagreement,
  PeptideAlias,
  RegulatoryStatus,
  RouteEvidence,
} from '@/server/public/queries';
import { CitationLine } from './citation';
import {
  Callout,
  EmptyState,
  EvidenceClassTag,
  NotRecorded,
  TableScroller,
  formatDate,
} from './primitives';

/**
 * Administration routes, regulatory status, names and disagreements.
 *
 * Each of these is somewhere a reference can quietly mislead, and each is
 * handled by refusing the convenient shortcut:
 *
 *   routes       — never a checklist of "available routes", always evidence for
 *                  one molecule in one formulation in one population
 *   regulatory   — never a global status, always a jurisdiction and a date
 *   names        — never a flat synonym list, because some of those names are
 *                  not established to be the same molecule
 *   disagreement — never resolved into a single answer
 */

// ---------------------------------------------------------------------------
// Administration routes
// ---------------------------------------------------------------------------

export function RouteEvidenceTable({ routes }: { routes: readonly RouteEvidence[] }) {
  if (routes.length === 0) {
    return (
      <EmptyState
        headline="No route evidence has been reviewed for this compound."
        detail="A route record here means one source, one exact page, one formulation and one population. Until that exists, this index makes no statement about how this compound has been given."
      >
        <p>
          Route claims are among the easiest things to get wrong. Bioavailability is specific to a
          molecule and its formulation, so evidence that one peptide crosses the nasal mucosa says
          nothing about another.
        </p>
      </EmptyState>
    );
  }

  const grouped = new Map<string, RouteEvidence[]>();
  for (const route of routes) {
    const list = grouped.get(route.routeName) ?? [];
    list.push(route);
    grouped.set(route.routeName, list);
  }

  return (
    <div className="space-y-6">
      {[...grouped.entries()].map(([routeName, records]) => (
        <div key={routeName} className="avoid-break">
          <h3 className="font-serif text-lg text-deep-tide">{routeName}</h3>
          {records[0]?.routeLimitations ? (
            <p className="mt-1 max-w-[60ch] text-sm text-slate">{records[0].routeLimitations}</p>
          ) : null}

          <TableScroller>
            <table className="mt-3 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-rule text-left">
                  {['Evidence', 'Population or model', 'Formulation', 'Notes', 'Source'].map(
                    (head) => (
                      <th key={head} className="py-2 pr-4 font-medium text-slate">
                        {head}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-rule-soft align-top">
                    <td className="py-3 pr-4">
                      <EvidenceClassTag evidenceClass={record.evidenceClass} />
                      <p className="mt-1 text-ink-soft">{record.evidenceTypeLabel}</p>
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {record.populationModel ?? <NotRecorded />}
                    </td>
                    <td className="py-3 pr-4 text-ink-soft">
                      {record.formulation ?? <NotRecorded />}
                    </td>
                    <td className="max-w-[24rem] py-3 pr-4 text-ink-soft">
                      {record.pkNotes ?? record.bioavailabilityNotes ?? record.limitationsNotes ?? (
                        <NotRecorded />
                      )}
                    </td>
                    <td className="py-3">
                      <CitationLine citation={record.citation} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroller>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regulatory and development status
// ---------------------------------------------------------------------------

const REGULATORY_LABEL: Readonly<Record<string, string>> = {
  approved: 'Approved',
  authorized_limited: 'Authorised, limited',
  investigational_clinical: 'Investigational, in clinical study',
  preclinical: 'Preclinical',
  discontinued: 'Discontinued',
  withdrawn: 'Withdrawn',
  not_approved: 'Not approved',
  unknown: 'Unknown',
};

export function RegulatoryStatusList({
  statuses,
}: {
  statuses: readonly RegulatoryStatus[];
}) {
  if (statuses.length === 0) {
    return (
      <EmptyState
        headline="Regulatory status review pending."
        detail="Regulatory standing is specific to a jurisdiction and to a date, and it changes. Rather than carry a stale or unsourced status, this index shows none until one has been checked against the responsible authority and recorded with the date it was checked."
      />
    );
  }

  return (
    <div className="space-y-4">
      {statuses.map((status) => (
        <div key={status.id} className="avoid-break rounded-md border border-rule px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="font-serif text-lg text-ink">{status.jurisdiction}</p>
            <p className="text-sm text-slate">Checked {formatDate(status.checkedAt)}</p>
          </div>

          <p className="mt-1.5 text-ink-soft">
            <span className="font-medium">{REGULATORY_LABEL[status.status] ?? status.status}</span>
            {status.indicationContext ? ` — ${status.indicationContext}` : ''}
          </p>

          {status.authority ? (
            <p className="mt-1 text-sm text-slate">Authority: {status.authority}</p>
          ) : null}
          {status.notes ? <p className="mt-2 text-sm text-ink-soft">{status.notes}</p> : null}
          {status.citation ? (
            <div className="mt-2.5 border-t border-rule-soft pt-2.5">
              <CitationLine citation={status.citation} />
            </div>
          ) : null}
        </div>
      ))}

      <p className="text-xs text-slate">
        Regulatory status is time-sensitive. Each entry shows when it was last checked; confirm
        against the responsible authority before relying on it.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/**
 * Names, with the relationship attached to each.
 *
 * A flat list of synonyms would assert that every name refers to one molecule.
 * For several compounds here that is exactly the open question — the TB-500 and
 * Thymosin beta-4 case among them — so the relationship travels with the name
 * and the unresolved ones are called out rather than folded in.
 */
export function AliasList({ aliases }: { aliases: readonly PeptideAlias[] }) {
  if (aliases.length === 0) return null;

  const plain = aliases.filter((a) => a.aliasType !== 'related_but_distinct');
  const distinct = aliases.filter((a) => a.aliasType === 'related_but_distinct');

  return (
    <div className="space-y-3">
      {plain.length > 0 ? (
        <p className="text-sm text-ink-soft">
          <span className="meta-label">Also known as</span>{' '}
          {plain.map((alias) => alias.alias).join(' · ')}
        </p>
      ) : null}

      {distinct.map((alias) => (
        <Callout key={alias.alias} tone="caution" title={`${alias.alias}: not the same record`}>
          <p>
            {alias.notes ??
              `${alias.alias} is discussed alongside this compound in the literature, but the two have not been established as the same molecule. This index keeps them distinct until a primary source settles it.`}
          </p>
        </Callout>
      ))}

      {plain.length > 0 ? (
        <p className="text-xs text-slate">
          Each name above refers to the same compound record.
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disagreements
// ---------------------------------------------------------------------------

const EXPLANATION_LABEL: Readonly<Record<string, string>> = {
  route: 'may come down to a difference in route',
  formulation: 'may come down to a difference in formulation',
  population: 'may come down to a difference in population',
  dose: 'may come down to a difference in amount',
  study_design: 'may come down to a difference in study design',
  terminology: 'may come down to the two sources using a name differently',
  date: 'may come down to the sources being written at different times',
  unresolved: 'has no established explanation',
};

export function DisagreementList({
  disagreements,
  simple,
}: {
  disagreements: readonly Disagreement[];
  simple: boolean;
}) {
  if (disagreements.length === 0) {
    return (
      <EmptyState
        headline="No disagreements between sources have been recorded yet."
        detail="This section exists because sources often conflict, and the conflict is usually the most informative thing on the page. An empty section here means the comparison work has not been done, not that the sources agree."
      />
    );
  }

  return (
    <div className="space-y-6">
      {disagreements.map((disagreement) => (
        <article
          key={disagreement.id}
          className="avoid-break rounded-md border border-rule bg-warm-white px-5 py-4"
        >
          <h3 className="font-serif text-lg text-ink">{disagreement.topic}</h3>
          {simple && disagreement.plainLanguageText ? (
            <p className="mt-1.5 text-ink-soft">{disagreement.plainLanguageText}</p>
          ) : null}

          <p className="mt-2 text-sm text-slate">
            This disagreement {EXPLANATION_LABEL[disagreement.candidateExplanation] ?? 'is open'}.
            {disagreement.explanationNotes ? ` ${disagreement.explanationNotes}` : ''}
          </p>

          <ul className="mt-4 space-y-3">
            {disagreement.positions.map((position) => (
              <li key={position.id} className="border-l-2 border-rule pl-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <EvidenceClassTag evidenceClass={position.evidenceClass} />
                  <span className="text-sm text-deep-tide">{position.evidenceTypeLabel}</span>
                </div>
                {position.positionText === null ? (
                  // Patient mode. The source and its kind are still shown; what
                  // it says is not, because on this record what it says is a dose.
                  <p className="mt-1.5 text-sm text-slate italic">
                    What this source reports is shown in the practitioner view.
                  </p>
                ) : (
                  <p className="mt-1.5 text-ink-soft">{position.positionText}</p>
                )}
                <div className="mt-1.5">
                  <CitationLine citation={position.citation} />
                </div>
              </li>
            ))}
          </ul>

          {disagreement.resolutionRequirement ? (
            <p className="mt-4 border-t border-rule-soft pt-3 text-sm text-slate">
              <span className="meta-label">What would settle it</span>{' '}
              {disagreement.resolutionRequirement}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
