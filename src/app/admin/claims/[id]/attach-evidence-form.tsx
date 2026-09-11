'use client';

import { useState } from 'react';
import {
  Checkbox,
  Field,
  Form,
  Select,
  TextArea,
  TextInput,
  type SelectOption,
} from '@/components/admin/forms';
import { attachClaimEvidenceAction } from '../../actions';

const RELATIONSHIP_OPTIONS: SelectOption[] = [
  { value: 'supports', label: 'Supports the claim' },
  { value: 'contradicts', label: 'Contradicts the claim' },
  { value: 'contextualizes', label: 'Provides context' },
  { value: 'cites', label: 'Cites another source' },
];

interface LocationOption {
  id: string;
  locatorText: string | null;
}

export function AttachEvidenceForm({
  claimId,
  sources,
  evidenceTypes,
  routes,
}: {
  claimId: string;
  sources: readonly SelectOption[];
  evidenceTypes: readonly SelectOption[];
  routes: readonly SelectOption[];
}) {
  const [sourceId, setSourceId] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  // Fetched from the change handler rather than an effect: the request is a
  // response to the editor choosing a source, not a synchronisation of state.
  async function onSourceChange(nextSourceId: string) {
    setSourceId(nextSourceId);
    setLocations([]);

    if (nextSourceId === '') return;

    setLoadingLocations(true);
    try {
      const response = await fetch(
        `/admin/api/source-locations?sourceId=${encodeURIComponent(nextSourceId)}`,
      );
      const data = response.ok ? ((await response.json()) as { locations?: LocationOption[] }) : {};
      setLocations(data.locations ?? []);
    } catch {
      setLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }

  return (
    <Form action={attachClaimEvidenceAction} submitLabel="Attach evidence">
      <input type="hidden" name="claimId" value={claimId} />

      <Field label="Source" name="sourceId" required>
        <select
          id="sourceId"
          name="sourceId"
          required
          value={sourceId}
          onChange={(event) => {
            void onSourceChange(event.target.value);
          }}
          className="w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
        >
          <option value="">Choose a source…</option>
          {sources.map((source) => (
            <option key={source.value} value={source.value}>
              {source.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Exact location"
        name="sourceLocationId"
        required
        hint="Required before this claim can be published. If the location you need is not listed, add it on the source page first."
      >
        <select
          id="sourceLocationId"
          name="sourceLocationId"
          className="w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
          disabled={sourceId === '' || loadingLocations}
        >
          <option value="">
            {sourceId === ''
              ? 'Choose a source first'
              : loadingLocations
                ? 'Loading…'
                : locations.length === 0
                  ? 'No locations recorded for this source'
                  : 'Choose a location…'}
          </option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.locatorText ?? location.id}
            </option>
          ))}
        </select>
      </Field>

      <Select
        name="evidenceTypeKey"
        label="Evidence type"
        options={evidenceTypes}
        required
        includeBlank="Choose…"
        hint="What kind of evidence this passage is. A textbook can report a trial; a trial report is not a practitioner opinion."
      />

      <Select
        name="relationship"
        label="Relationship"
        options={RELATIONSHIP_OPTIONS}
        defaultValue="supports"
        required
      />

      <TextInput
        name="populationModel"
        label="Population or model"
        hint="Species, model, or the human population studied. A rat is not a patient."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="routeKey"
          label="Route"
          options={routes}
          includeBlank="Not applicable"
          hint="Only where the passage is route-specific."
        />
        <TextInput name="formulation" label="Formulation" />
      </div>

      <TextArea
        name="interpretation"
        label="What this passage says"
        rows={3}
        hint="Paraphrase. Note where the source overstates what it cites."
      />

      <TextArea
        name="extractedTextPrivate"
        label="Extract (private)"
        rows={3}
        hint="Verbatim text, retained only so a reviewer can confirm the reading. Never published, never served, and excluded from every public view."
      />

      <Checkbox
        name="primarySourceVerified"
        label="Primary source checked"
        hint="Tick only if you opened the original study this source cites, rather than trusting its characterisation."
      />
    </Form>
  );
}
