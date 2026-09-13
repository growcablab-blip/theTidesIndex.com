import type {
  CompoundForm,
  CompoundProduct,
  LiteratureScreen,
  PeptidePage,
  PkObservation,
} from '@/server/public/queries';
import { CitationLine } from '@/components/public/citation';

/**
 * Visual modules for a compound record.
 *
 * Every figure here draws from the record. None of them contains a medical
 * statement written into the markup, which is not a stylistic preference: a
 * diagram that says something the database does not is a second, unreviewable
 * source of medical content, and it will drift the first time the record is
 * corrected and the SVG is not.
 *
 * The consequence is that the figures are shaped by what the data can support.
 * There is no mechanism diagram, because a pathway drawing would be exactly the
 * hard-coded medical content the rule forbids; there is a pharmacokinetics
 * figure, because the record now carries every condition each measurement was
 * made under and the figure is just those conditions laid out so a reader can
 * see at a glance why four numbers differ.
 */

// --- Pharmacokinetics --------------------------------------------------------

/**
 * One parameter, every reported value, with the conditions side by side.
 *
 * This is the Part A finding made visible. Four elimination half-lives sit on
 * the tesamorelin record: 8, 11, 26 and 38 minutes. Printed as a list they look
 * like a contradiction and invite a reader to decide which source is wrong.
 * Printed with the product, the population and whether the measurement followed
 * one administration or fourteen days of them, they stop looking like a
 * contradiction, because they are not one.
 *
 * The bar is proportional within a parameter only, and carries no axis. It is
 * there to make four values comparable at a glance, not to be measured off.
 */
export function PharmacokineticsFigure({
  observations,
  simple,
}: {
  observations: readonly PkObservation[];
  simple: boolean;
}) {
  if (observations.length === 0) return null;

  const byParameter = new Map<string, PkObservation[]>();
  for (const observation of observations) {
    const list = byParameter.get(observation.parameter) ?? [];
    list.push(observation);
    byParameter.set(observation.parameter, list);
  }

  return (
    <div className="space-y-8">
      {[...byParameter.entries()].map(([parameter, group]) => (
        <ParameterGroup key={parameter} parameter={parameter} group={group} simple={simple} />
      ))}
    </div>
  );
}

function ParameterGroup({
  parameter,
  group,
  simple,
}: {
  parameter: string;
  group: readonly PkObservation[];
  simple: boolean;
}) {
  // Proportion is taken from the leading number in the reported text, and only
  // when every value in the group yields one. A value like "less than 4%" or a
  // range has no single magnitude, and drawing a bar for it would invent
  // precision the source did not give.
  const magnitudes = group.map((o) => {
    const match = /(\d+(?:\.\d+)?)/.exec(o.valueText);
    return match ? Number(match[1]) : null;
  });
  const comparable = magnitudes.every((m) => m !== null) && group.length > 1;
  const largest = comparable ? Math.max(...magnitudes.map((m) => m ?? 0)) : 0;

  return (
    <div>
      <h3 className="font-serif text-base text-deep-tide">{parameter}</h3>
      {group.length > 1 ? (
        <p className="mt-1 text-xs text-slate">
          {group.length} reported values. They differ because the conditions differ — this is not a
          disagreement between sources.
        </p>
      ) : null}

      <ul className="mt-3 space-y-3">
        {group.map((observation, index) => (
          <li key={observation.id} className="rounded-md border border-rule-soft bg-mist px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="font-serif text-lg text-ink">{observation.valueText}</span>
              <span className="text-xs tracking-wide text-slate uppercase">
                {observation.evidenceTypeLabel}
              </span>
            </div>

            {comparable ? (
              <div
                className="mt-2 h-1.5 rounded-full bg-rule-soft"
                role="presentation"
                aria-hidden="true"
              >
                <div
                  className="h-1.5 rounded-full bg-deep-tide/60"
                  style={{
                    width: `${String(Math.max(4, ((magnitudes[index] ?? 0) / largest) * 100))}%`,
                  }}
                />
              </div>
            ) : null}

            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Condition label="Product">{observation.productName ?? 'Not named by the source'}</Condition>
              <Condition label="In">{observation.population}</Condition>
              <Condition label="Administration">{administrationLabel(observation.administration)}</Condition>
              {observation.routeName ? (
                <Condition label="Route">{observation.routeName}</Condition>
              ) : null}
              {observation.studyCondition ? (
                <Condition label="Conditions">{observation.studyCondition}</Condition>
              ) : null}
              {/* Null in patient mode, where a dose is a dose however it arrives. */}
              {observation.doseContext ? (
                <Condition label="At">{observation.doseContext}</Condition>
              ) : null}
            </dl>

            {observation.notes ? (
              <p className="mt-3 border-t border-rule-soft pt-2 text-sm text-ink-soft">
                {observation.notes}
              </p>
            ) : null}
            {observation.citation ? (
              <div className="mt-2">
                <CitationLine citation={observation.citation} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {simple && group.some((o) => o.doseContext === null) ? (
        <p className="mt-2 text-xs text-slate">
          The dose each measurement was made at is shown in the practitioner view.
        </p>
      ) : null}
    </div>
  );
}

function administrationLabel(value: string): string {
  if (value === 'single_dose') return 'A single administration';
  if (value === 'repeat_dose') return 'Repeated administration';
  return 'Not stated by the source';
}

function Condition({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-slate uppercase">{label}</dt>
      <dd className="mt-0.5 text-ink-soft">{children}</dd>
    </div>
  );
}

// --- Products ----------------------------------------------------------------

/**
 * The products of one molecule, side by side.
 *
 * The distinction a clinic most needs and is least often given. Three products
 * share an application number and an active substance and differ in everything
 * a person administering one would need to know — and the labelling says in
 * terms that they are not substitutable.
 */
export function ProductDistinction({
  products,
  simple,
}: {
  products: readonly CompoundProduct[];
  simple: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <div>
      {products.length > 1 ? (
        <p className="text-sm text-ink-soft">
          {products.length} products of the same molecule. A figure quoted for one of them is not a
          figure for another.
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <article
            key={product.id}
            className="flex flex-col rounded-lg border border-rule bg-warm-white px-4 py-4"
          >
            <h3 className="font-serif text-lg text-deep-tide">{product.productName}</h3>
            {product.applicationNumber ? (
              <p className="mt-0.5 text-xs text-slate">
                {product.authority ?? ''} {product.applicationNumber}
              </p>
            ) : null}

            <dl className="mt-3 space-y-2 text-sm">
              {product.presentation ? (
                <Condition label="Presentation">{product.presentation}</Condition>
              ) : null}
              {product.strengthText ? (
                <Condition label="Strength">{product.strengthText}</Condition>
              ) : null}
              {product.labelledDoseText ? (
                <Condition label="Labelled dose">{product.labelledDoseText}</Condition>
              ) : null}
              {product.reconstitutionText ? (
                <Condition label="Reconstitution">{product.reconstitutionText}</Condition>
              ) : null}
              {product.marketingStatus ? (
                <Condition label="Status">{product.marketingStatus}</Condition>
              ) : null}
            </dl>

            {product.notes ? <p className="mt-3 text-sm text-ink-soft">{product.notes}</p> : null}

            <div className="mt-auto pt-3">
              {product.citation ? <CitationLine citation={product.citation} /> : null}
            </div>
          </article>
        ))}
      </div>

      {simple ? (
        <p className="mt-3 text-xs text-slate">
          Strengths, doses and reconstitution are shown in the practitioner view, with the labelling
          that governs them.
        </p>
      ) : null}
    </div>
  );
}

/**
 * Chemical forms and their molecular weights.
 *
 * Small, and it exists because of a specific failure: two weights for
 * tesamorelin were recorded as a disagreement between a regulator and a
 * handbook when they are the free base and the monoacetate. `weightBasis` is
 * required by a database constraint wherever a weight is given, and this figure
 * is where that requirement becomes visible.
 */
export function ChemicalForms({ forms }: { forms: readonly CompoundForm[] }) {
  if (forms.length === 0) return null;

  return (
    <div>
      {forms.length > 1 ? (
        <p className="text-sm text-ink-soft">
          {forms.length} chemical forms are on record, with different molecular weights. They are
          different forms of the same substance, not different answers to one question.
        </p>
      ) : null}

      <ul className="mt-3 space-y-3">
        {forms.map((form) => (
          <li key={form.id} className="rounded-md border border-rule-soft px-4 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4">
              <span className="text-sm font-medium text-deep-tide">{form.chemicalForm}</span>
              {form.molecularWeight ? (
                // `numeric(14,4)` comes back as "5195.9080". The trailing zeros
                // are storage precision, not reported precision, and printing
                // them claims four decimals where the source gave three.
                <span className="font-serif text-lg text-ink">
                  {form.molecularWeight.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')}
                </span>
              ) : null}
            </div>
            {form.weightBasis ? (
              <p className="mt-1 text-sm text-ink-soft">{form.weightBasis}</p>
            ) : null}
            {form.molecularFormula ? (
              <p className="mt-1 font-mono text-xs text-slate">{form.molecularFormula}</p>
            ) : null}
            {!form.formStatedBySource ? (
              <p className="mt-2 text-xs text-[var(--color-caution)]">
                The source gives this value without naming the chemical form it applies to.
              </p>
            ) : null}
            {form.notes ? <p className="mt-2 text-sm text-ink-soft">{form.notes}</p> : null}
            {form.citation ? (
              <div className="mt-2">
                <CitationLine citation={form.citation} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- The literature screen ---------------------------------------------------

const TYPE_LABELS: Record<string, string> = {
  human_interventional: 'Human, given the compound',
  human_observational: 'Human, records reviewed',
  case_report: 'Case report',
  human_pk_safety: 'Human sample, analytical',
  animal_in_vivo: 'Animal',
  ex_vivo: 'Isolated tissue',
  in_vitro: 'Cells or materials',
  review: 'Review',
  commentary_editorial: 'Commentary or reply',
  other_peripheral: 'Mentions the compound',
  withdrawn: 'Withdrawn',
};

const HUMAN_TYPES = new Set([
  'human_interventional',
  'human_observational',
  'case_report',
  'human_pk_safety',
]);
const PRECLINICAL_TYPES = new Set(['animal_in_vivo', 'ex_vivo', 'in_vitro']);

/**
 * What a literature search actually returned.
 *
 * The figure exists to break one specific inference. A large number next to a
 * compound's name reads as weight of evidence, and it is not: it is the size of
 * a list. The bars are drawn from the classified ledger, and the two numbers a
 * reader takes away are deliberately far apart — the records the query returned,
 * and the primary human studies inside them.
 */
export function EvidenceLandscape({ screen }: { screen: LiteratureScreen }) {
  const largest = Math.max(...screen.typeCounts.map((t) => t.count), 1);
  const human = screen.typeCounts
    .filter((t) => HUMAN_TYPES.has(t.studyType))
    .reduce((n, t) => n + t.count, 0);
  const preclinical = screen.typeCounts
    .filter((t) => PRECLINICAL_TYPES.has(t.studyType))
    .reduce((n, t) => n + t.count, 0);
  const notEvidence = screen.resultCount - human - preclinical;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Headline
          value={String(screen.resultCount)}
          label="records returned"
          note="The size of the search result. Not a count of studies, and not a measure of evidence."
          tone="neutral"
        />
        <Headline
          value={String(screen.humanPrimaryCount)}
          label="records in people"
          note="Records in which the compound was given to people and an outcome in those people was reported. A substudy or follow-up analysis of one trial is its own record, so this is not a count of separate trials. Human samples analysed in a laboratory are not counted here."
          tone={screen.humanPrimaryCount === 0 ? 'absent' : 'present'}
        />
        <Headline
          value={String(preclinical)}
          label="preclinical studies"
          note="Animal, isolated tissue, and cell or materials work. Not evidence about people."
          tone="neutral"
        />
      </div>

      {/* The human / preclinical / not-evidence split, as one bar. */}
      <div className="mt-6">
        <p className="meta-label">What the {screen.resultCount} records are</p>
        <div className="mt-2 flex h-3 overflow-hidden rounded-full" role="presentation">
          <Segment width={(human / screen.resultCount) * 100} className="bg-deep-tide" />
          <Segment width={(preclinical / screen.resultCount) * 100} className="bg-deep-tide/40" />
          <Segment width={(notEvidence / screen.resultCount) * 100} className="bg-rule" />
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate">
          <Key
            className="bg-deep-tide"
            label={`Human records — ${String(human)}, of which ${String(screen.humanPrimaryCount)} gave the compound to people`}
          />
          <Key className="bg-deep-tide/40" label={`Preclinical — ${String(preclinical)}`} />
          <Key
            className="bg-rule"
            label={`Reviews, commentary and passing mentions — ${String(notEvidence)}`}
          />
        </ul>
      </div>

      <ul className="mt-6 space-y-2">
        {screen.typeCounts.map((entry) => (
          <li key={entry.studyType} className="grid grid-cols-[minmax(0,11rem)_1fr_2.5rem] items-center gap-3">
            <span className="text-sm text-ink-soft">
              {TYPE_LABELS[entry.studyType] ?? entry.studyType}
            </span>
            <span className="h-2 rounded-full bg-rule-soft" role="presentation">
              <span
                className={`block h-2 rounded-full ${
                  HUMAN_TYPES.has(entry.studyType)
                    ? 'bg-deep-tide'
                    : PRECLINICAL_TYPES.has(entry.studyType)
                      ? 'bg-deep-tide/40'
                      : 'bg-rule'
                }`}
                style={{ width: `${String(Math.max(2, (entry.count / largest) * 100))}%` }}
              />
            </span>
            <span className="text-right font-serif text-sm text-ink tabular-nums">
              {entry.count}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The search itself, stated so that anyone can run it again. */
export function ScreenMethod({ screen }: { screen: LiteratureScreen }) {
  return (
    <dl className="space-y-3 text-sm">
      <Condition label="Database">{screen.databaseName}</Condition>
      <Condition label="Search date">{screen.searchDate}</Condition>
      <div>
        <dt className="text-xs tracking-wide text-slate uppercase">Query</dt>
        <dd className="mt-0.5 overflow-x-auto">
          <code className="font-mono text-xs break-words text-ink-soft">{screen.queryText}</code>
        </dd>
      </div>
      <Condition label="What was counted as evidence">{screen.inclusionCriteria}</Condition>
      <Condition label="What was counted as human evidence">{screen.humanPrimaryCriteria}</Condition>
      <Condition label="Duplicates">{screen.deduplicationNotes}</Condition>
    </dl>
  );
}

/** Every human record the screen identified, with why it was or was not counted. */
export function HumanRecords({ screen }: { screen: LiteratureScreen }) {
  if (screen.humanRecords.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        The screen identified no record in which the compound was given to people.
      </p>
    );
  }

  return (
    <ul className="space-y-4">
      {screen.humanRecords.map((record) => (
        <li key={record.externalId} className="rounded-md border border-rule-soft px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-xs tracking-wide text-slate uppercase">
              {TYPE_LABELS[record.studyType] ?? record.studyType}
            </span>
            <span className="text-xs text-slate">
              {record.externalIdType.toUpperCase()} {record.externalId}
            </span>
          </div>
          <p className="mt-1 font-serif text-base text-ink">{record.title}</p>
          <p className="mt-0.5 text-xs text-slate">
            {record.journal}
            {record.publicationYear === null ? '' : `, ${String(record.publicationYear)}`}
          </p>
          {record.country === null && record.researchGroup === null ? null : (
            <p className="mt-0.5 text-xs text-slate">
              {[record.researchGroup, record.country].filter(Boolean).join(' · ')}
            </p>
          )}
          {record.reason === null ? (
            <p className="mt-2 text-xs text-slate">
              What each study gave, and why it was counted, is in the practitioner view.
            </p>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">{record.reason}</p>
          )}
        </li>
      ))}
    </ul>
  );
}

// --- Route map ---------------------------------------------------------------

/**
 * Which routes a source has reported, and on what kind of evidence.
 *
 * Deliberately not a diagram of a body. The useful distinction is not where a
 * thing is injected but what class of evidence stands behind each route having
 * been used at all, which for most compounds here is "a practitioner source
 * said so".
 */
export function RouteMap({ peptide }: { peptide: PeptidePage }) {
  if (peptide.routes.length === 0) return null;

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {peptide.routes.map((route) => (
        <li key={route.id} className="rounded-md border border-rule-soft px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3">
            <span className="font-serif text-base text-deep-tide">
              {route.routeName ?? route.routeKey}
            </span>
            <span className="text-xs tracking-wide text-slate uppercase">
              {route.evidenceTypeLabel}
            </span>
          </div>
          {route.populationModel ? (
            <p className="mt-1 text-sm text-ink-soft">In: {route.populationModel}</p>
          ) : null}
          {route.limitationsNotes ? (
            <p className="mt-2 text-sm text-ink-soft">{route.limitationsNotes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

// --- Shared ------------------------------------------------------------------

function Headline({
  value,
  label,
  note,
  tone,
}: {
  value: string;
  label: string;
  note: string;
  tone: 'present' | 'absent' | 'neutral';
}) {
  const valueTone =
    tone === 'present'
      ? 'text-deep-tide'
      : tone === 'absent'
        ? 'text-[var(--color-caution)]'
        : 'text-ink';
  return (
    <div className="rounded-md border border-rule-soft bg-mist px-4 py-3">
      <p className={`font-serif text-3xl leading-none ${valueTone}`}>{value}</p>
      <p className="mt-1 text-sm text-ink">{label}</p>
      <p className="mt-1 text-xs leading-snug text-slate">{note}</p>
    </div>
  );
}

function Segment({ width, className }: { width: number; className: string }) {
  if (width <= 0) return null;
  return <span className={className} style={{ width: `${String(width)}%` }} />;
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={`inline-block h-2 w-4 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </li>
  );
}
