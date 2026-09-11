'use client';

import { useState } from 'react';
import { Field, Form, Select, TextArea, type SelectOption } from '@/components/admin/forms';
import { attachProtocolSourceAction } from '../../actions';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'original', label: 'Original — this source reported the regimen' },
  { value: 'secondary_reference', label: 'Secondary — repeats a regimen from elsewhere' },
  { value: 'commentary', label: 'Commentary — discusses without reporting as practice' },
];

interface LocationOption {
  id: string;
  locatorText: string | null;
}

export function AttachProtocolSourceForm({
  protocolId,
  sources,
}: {
  protocolId: string;
  sources: readonly SelectOption[];
}) {
  const [sourceId, setSourceId] = useState('');
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);

  async function onSourceChange(nextSourceId: string) {
    setSourceId(nextSourceId);
    setLocations([]);
    if (nextSourceId === '') return;

    setLoading(true);
    try {
      const response = await fetch(
        `/admin/api/source-locations?sourceId=${encodeURIComponent(nextSourceId)}`,
      );
      const data = response.ok ? ((await response.json()) as { locations?: LocationOption[] }) : {};
      setLocations(data.locations ?? []);
    } catch {
      setLocations([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form action={attachProtocolSourceAction} submitLabel="Attach source">
      <input type="hidden" name="protocolId" value={protocolId} />

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
        hint="Required before this protocol can be published."
      >
        <select
          id="sourceLocationId"
          name="sourceLocationId"
          disabled={sourceId === '' || loading}
          className="w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
        >
          <option value="">
            {sourceId === ''
              ? 'Choose a source first'
              : loading
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
        name="sourceRole"
        label="Role of this source"
        options={ROLE_OPTIONS}
        defaultValue="original"
        required
        hint="A practitioner quoting a trial is not the trial. Record which this is."
      />

      <TextArea name="notes" label="Notes" rows={2} />
    </Form>
  );
}
