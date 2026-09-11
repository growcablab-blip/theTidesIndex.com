/**
 * Reading mode.
 *
 * `Simple | Practitioner` changes presentation, never the underlying record
 * (MASTER_BUILD_SPEC.md §5). For most content that means wording and density.
 * For protocols it means something stronger: the patient-facing shape has no
 * dose in it.
 *
 * There are three layers of that guarantee, and all three are deliberate:
 *
 *   1. The database view `public_v_protocol_simple` has no dosing columns, so
 *      the data never arrives.
 *   2. `SimpleProtocolView` below has no dosing properties, so a component
 *      cannot render one without a type error.
 *   3. `assertPatientSafe` re-checks at runtime, because data assembled from
 *      several places can acquire keys the type system stopped watching.
 */

export type ReadingMode = 'simple' | 'practitioner';

/**
 * Field names that must never appear in patient-facing output, in either
 * camelCase or snake_case. Kept in one place so the list is auditable.
 */
export const DOSING_FIELD_NAMES: readonly string[] = [
  'amountReported',
  'amount_reported',
  'amountUnit',
  'amount_unit',
  'amountMinNumeric',
  'amount_min_numeric',
  'amountMaxNumeric',
  'amount_max_numeric',
  'frequencyText',
  'frequency_text',
  'timingText',
  'timing_text',
  'durationText',
  'duration_text',
  'cycleText',
  'cycle_text',
  'titrationText',
  'titration_text',
  'monitoringText',
  'monitoring_text',
  'contraindicationsText',
  'contraindications_text',
  'safetyNotes',
  'safety_notes',
];

/**
 * What a patient sees of a source-reported protocol: that named sources
 * describe regimens, what those regimens were aiming at, in whom, and by which
 * route — enough to support a conversation with a clinician, and nothing that
 * functions as an instruction.
 */
export interface SimpleProtocolView {
  readonly id: string;
  readonly protocolKey: string;
  readonly peptideId: string | null;
  readonly combinationName: string | null;
  readonly objectiveContext: string;
  readonly populationModel: string | null;
  readonly routeKey: string | null;
  readonly regulatoryContext: string | null;
  readonly evidenceTypeKey: string;
  readonly hasMonitoringGuidance: boolean;
  readonly hasSafetyGuidance: boolean;
}

/** The full record as the named source reported it. */
export interface PractitionerProtocolView extends SimpleProtocolView {
  readonly formulation: string | null;
  readonly amountReported: string | null;
  readonly amountUnit: string | null;
  readonly frequencyText: string | null;
  readonly timingText: string | null;
  readonly durationText: string | null;
  readonly cycleText: string | null;
  readonly titrationText: string | null;
  readonly combinationsText: string | null;
  readonly monitoringText: string | null;
  readonly contraindicationsText: string | null;
  readonly safetyNotes: string | null;
  readonly adverseEventsText: string | null;
  readonly outcomeContext: string | null;
}

export class PatientSafetyViolationError extends Error {
  readonly offendingFields: readonly string[];

  constructor(offendingFields: readonly string[]) {
    super(
      `Patient-facing output contained fields that must never reach simple mode: ${offendingFields.join(', ')}. ` +
        'This is a data-path error, not a display error: read patient content from public_v_protocol_simple.',
    );
    this.name = 'PatientSafetyViolationError';
    this.offendingFields = offendingFields;
  }
}

/**
 * Runtime guarantee that a payload bound for patient output carries no dosing
 * or clinical-instruction field. Checks nested objects and arrays, because the
 * risk is a joined or spread record rather than a hand-written one.
 *
 * Throws rather than filtering. Silently stripping a dose would hide the bug
 * that produced it.
 */
export function assertPatientSafe<T>(payload: T, path = 'payload'): T {
  const offending: string[] = [];
  collectOffendingFields(payload, path, offending, new WeakSet());
  if (offending.length > 0) {
    throw new PatientSafetyViolationError(offending);
  }
  return payload;
}

function collectOffendingFields(
  value: unknown,
  path: string,
  offending: string[],
  seen: WeakSet<object>,
): void {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      collectOffendingFields(item, `${path}[${index}]`, offending, seen);
    });
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (DOSING_FIELD_NAMES.includes(key)) {
      offending.push(`${path}.${key}`);
    }
    collectOffendingFields(child, `${path}.${key}`, offending, seen);
  }
}

/**
 * Narrows a practitioner record to the patient-facing shape.
 *
 * Provided for the rare case where both depths are rendered from one query.
 * The patient path should normally read `public_v_protocol_simple` directly, so
 * that the dosing values are never loaded into the process at all.
 */
export function toSimpleProtocolView(record: PractitionerProtocolView): SimpleProtocolView {
  return assertPatientSafe<SimpleProtocolView>({
    id: record.id,
    protocolKey: record.protocolKey,
    peptideId: record.peptideId,
    combinationName: record.combinationName,
    objectiveContext: record.objectiveContext,
    populationModel: record.populationModel,
    routeKey: record.routeKey,
    regulatoryContext: record.regulatoryContext,
    evidenceTypeKey: record.evidenceTypeKey,
    hasMonitoringGuidance: record.monitoringText !== null,
    hasSafetyGuidance: record.contraindicationsText !== null || record.safetyNotes !== null,
  });
}
