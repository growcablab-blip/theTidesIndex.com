import { amountAsReported, type ReportedAmount } from './amount';
import { classifyField, type FieldClassification, type FieldState } from './field-comparison';

/**
 * The protocol fields a comparison reads, and the adapter from records to the
 * field classifier.
 *
 * Shared by the web comparison matrix, the compound chooser and the Protocol
 * Quick Reference PDF so the three can never classify one field two ways. The
 * record shape is structural: anything carrying these fields compares, which
 * keeps this module free of server and React imports.
 */

export interface ComparableProtocol extends ReportedAmount {
  readonly id: string;
  readonly objectiveContext: string;
  readonly populationModel: string | null;
  readonly routeName: string | null;
  readonly formulation: string | null;
  readonly frequencyText: string | null;
  readonly timingText: string | null;
  readonly durationText: string | null;
  readonly titrationText: string | null;
  readonly cycleText: string | null;
  readonly combinationsText: string | null;
  readonly monitoringText: string | null;
  readonly contraindicationsText: string | null;
  readonly regulatoryContext: string | null;
  readonly sources: readonly { readonly sourceKey: string }[];
}

export type ComparisonGroup = 'context' | 'regimen' | 'safety';

export interface ComparisonField {
  readonly key: string;
  readonly label: string;
  readonly group: ComparisonGroup;
  readonly get: (p: ComparableProtocol) => string | null;
}

/** The rows, in a fixed order so records can be read across. */
export const COMPARISON_FIELDS: readonly ComparisonField[] = [
  { key: 'objective', label: 'Context / objective', group: 'context', get: (p) => p.objectiveContext },
  { key: 'population', label: 'Population or model', group: 'context', get: (p) => p.populationModel },
  { key: 'route', label: 'Route', group: 'regimen', get: (p) => p.routeName },
  { key: 'formulation', label: 'Formulation', group: 'regimen', get: (p) => p.formulation },
  // The source's own wording, which already carries its unit. `amountUnit` is a
  // normalisation hint for filtering; appending it printed "500 mcg mcg".
  { key: 'amount', label: 'Amount as reported', group: 'regimen', get: (p) => amountAsReported(p) },
  { key: 'frequency', label: 'Frequency', group: 'regimen', get: (p) => p.frequencyText },
  { key: 'timing', label: 'Timing', group: 'regimen', get: (p) => p.timingText },
  { key: 'duration', label: 'Duration', group: 'regimen', get: (p) => p.durationText },
  { key: 'titration', label: 'Titration', group: 'regimen', get: (p) => p.titrationText },
  { key: 'cycle', label: 'Cycle / off period', group: 'regimen', get: (p) => p.cycleText },
  { key: 'combinations', label: 'Combinations', group: 'regimen', get: (p) => p.combinationsText },
  { key: 'monitoring', label: 'Monitoring', group: 'safety', get: (p) => p.monitoringText },
  { key: 'cautions', label: 'Cautions', group: 'safety', get: (p) => p.contraindicationsText },
  { key: 'regulatory', label: 'Regulatory context', group: 'safety', get: (p) => p.regulatoryContext },
];

/** The fields a clinic compares first, used where there is room for only a few. */
export const KEY_COMPARISON_FIELDS: readonly string[] = [
  'route',
  'population',
  'amount',
  'frequency',
  'duration',
  'monitoring',
];

export interface ProtocolFieldComparison extends FieldClassification {
  readonly field: ComparisonField;
}

export function compareProtocolField(
  protocols: readonly ComparableProtocol[],
  field: ComparisonField,
): ProtocolFieldComparison {
  return {
    field,
    ...classifyField(
      protocols.map((p) => ({ value: field.get(p), sourceKey: p.sources[0]?.sourceKey ?? null })),
    ),
  };
}

export function compareProtocolFields(
  protocols: readonly ComparableProtocol[],
  fields: readonly ComparisonField[] = COMPARISON_FIELDS,
): ProtocolFieldComparison[] {
  return fields.map((field) => compareProtocolField(protocols, field));
}

export interface StateCounts {
  readonly agreement: readonly ProtocolFieldComparison[];
  readonly difference: readonly ProtocolFieldComparison[];
  readonly single: readonly ProtocolFieldComparison[];
  readonly none: readonly ProtocolFieldComparison[];
}

export function groupByState(comparisons: readonly ProtocolFieldComparison[]): StateCounts {
  const of = (state: FieldState) => comparisons.filter((c) => c.state === state);
  return {
    agreement: of('agreement'),
    difference: of('difference'),
    single: of('single'),
    none: of('none'),
  };
}
