'use client';

import {
  Checkbox,
  Form,
  Select,
  TextArea,
  TextInput,
  type SelectOption,
} from '@/components/admin/forms';
import { createProtocolAction, updateProtocolAction } from '../actions';

export interface ProtocolFormValues {
  id: string;
  combinationName: string | null;
  objectiveContext: string;
  populationModel: string | null;
  routeKey: string | null;
  formulation: string | null;
  regulatoryContext: string | null;
  evidenceTypeKey: string;
  amountReported: string | null;
  amountUnit: string | null;
  frequencyText: string | null;
  timingText: string | null;
  durationText: string | null;
  cycleText: string | null;
  titrationText: string | null;
  monitoringText: string | null;
  contraindicationsText: string | null;
  safetyNotes: string | null;
  adverseEventsText: string | null;
  outcomeContext: string | null;
  patientVisibility: boolean;
}

export function ProtocolForm({
  mode,
  protocol,
  peptides,
  evidenceTypes,
  routes,
  defaultPeptideId,
}: {
  mode: 'create' | 'edit';
  protocol?: ProtocolFormValues;
  peptides?: readonly SelectOption[];
  evidenceTypes: readonly SelectOption[];
  routes: readonly SelectOption[];
  defaultPeptideId?: string | null;
}) {
  const isCreate = mode === 'create';

  return (
    <Form
      action={isCreate ? createProtocolAction : updateProtocolAction}
      submitLabel={isCreate ? 'Create protocol' : 'Save protocol'}
      successMessage={isCreate ? 'Protocol created.' : 'Saved.'}
    >
      {isCreate ? (
        <>
          <TextInput
            name="protocolKey"
            label="Protocol key"
            required
            placeholder="BPC157-PR-SEEDS-001"
            hint="Include the source in the key. Two sources describing the same compound produce two records, and the keys should make that obvious."
          />
          {peptides ? (
            <Select
              name="peptideId"
              label="Compound"
              options={peptides}
              defaultValue={defaultPeptideId ?? ''}
              includeBlank="Combination only — no single compound"
            />
          ) : null}
        </>
      ) : (
        <input type="hidden" name="protocolId" value={protocol?.id ?? ''} />
      )}

      <TextInput
        name="combinationName"
        label="Combination name"
        defaultValue={protocol?.combinationName}
        hint="Only where the source reports several compounds as one regimen."
      />

      <TextArea
        name="objectiveContext"
        label="Why the source reports this"
        rows={3}
        required
        defaultValue={protocol?.objectiveContext}
        hint="Indication, goal, or study endpoint, in the source's own framing."
      />

      <TextInput
        name="populationModel"
        label="Population or model"
        defaultValue={protocol?.populationModel}
        hint="Required before publication. Without it, a rodent schedule can read as a human instruction."
      />

      <TextArea
        name="regulatoryContext"
        label="Regulatory framing"
        rows={2}
        defaultValue={protocol?.regulatoryContext}
        hint="Required before publication. Approved labelling, a study regimen, or practitioner practice — these must never look equivalent."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="routeKey"
          label="Route"
          options={routes}
          defaultValue={protocol?.routeKey ?? ''}
          includeBlank="Choose…"
          hint="Required before publication."
        />
        <Select
          name="evidenceTypeKey"
          label="Evidence type"
          options={evidenceTypes}
          defaultValue={protocol?.evidenceTypeKey ?? ''}
          required
          includeBlank="Choose…"
        />
      </div>

      <TextInput name="formulation" label="Formulation" defaultValue={protocol?.formulation} />

      <fieldset className="rounded border border-rule p-4">
        <legend className="px-1 text-sm font-medium text-deep-tide">As reported</legend>
        <p className="mb-3 text-xs text-slate">
          Record the source&rsquo;s own wording. Do not convert units, normalise ranges or tidy up
          the phrasing — what the source said is the record. These fields never reach patient mode.
        </p>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              name="amountReported"
              label="Amount"
              defaultValue={protocol?.amountReported}
              placeholder="250–500 mcg"
            />
            <TextInput name="amountUnit" label="Unit" defaultValue={protocol?.amountUnit} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput
              name="frequencyText"
              label="Frequency"
              defaultValue={protocol?.frequencyText}
            />
            <TextInput name="timingText" label="Timing" defaultValue={protocol?.timingText} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="durationText" label="Duration" defaultValue={protocol?.durationText} />
            <TextInput name="cycleText" label="Cycle" defaultValue={protocol?.cycleText} />
          </div>
          <TextArea
            name="titrationText"
            label="Titration or escalation"
            rows={2}
            defaultValue={protocol?.titrationText}
          />
        </div>
      </fieldset>

      <TextArea
        name="monitoringText"
        label="Monitoring and labs"
        rows={3}
        defaultValue={protocol?.monitoringText}
      />
      <TextArea
        name="contraindicationsText"
        label="Contraindications and cautions"
        rows={3}
        defaultValue={protocol?.contraindicationsText}
      />
      <TextArea
        name="safetyNotes"
        label="Safety notes"
        rows={3}
        defaultValue={protocol?.safetyNotes}
      />
      <TextArea
        name="adverseEventsText"
        label="Adverse events reported"
        rows={2}
        defaultValue={protocol?.adverseEventsText}
      />
      <TextArea
        name="outcomeContext"
        label="Outcome as reported"
        rows={2}
        defaultValue={protocol?.outcomeContext}
      />

      <Checkbox
        name="patientVisibility"
        label="May be referenced in patient-facing context"
        defaultChecked={protocol?.patientVisibility ?? false}
        hint="Patient mode still receives no amount, frequency, timing, duration, cycle or titration — those columns do not exist in the patient-facing view. This controls only whether the record's existence and context are shown at all."
      />
    </Form>
  );
}
