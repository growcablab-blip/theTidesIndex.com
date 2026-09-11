'use client';

import { Form, Select, TextArea, TextInput, type SelectOption } from '@/components/admin/forms';
import { createSourceAction } from '../../actions';

const QC_OPTIONS: SelectOption[] = [
  { value: 'usable', label: 'Usable — complete copy held' },
  { value: 'incomplete', label: 'Incomplete — partial copy' },
  { value: 'replace', label: 'Replace — corrupted or unusable, not citable' },
  { value: 'pending', label: 'Pending — identity or completeness unresolved' },
  { value: 'exclude', label: 'Exclude — not part of the archive' },
];

export function NewSourceForm({ sourceTypes }: { sourceTypes: readonly SelectOption[] }) {
  return (
    <Form action={createSourceAction} submitLabel="Register source" successMessage="Source registered.">
      <TextInput
        name="sourceKey"
        label="Source key"
        required
        placeholder="SRC-017"
        hint="Stable identifier used in citations and in the registry. It does not change."
      />
      <TextInput name="title" label="Title" required />
      <TextInput
        name="authors"
        label="Authors or editors"
        hint="Separate several with a semicolon, in the order they appear on the work."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          name="sourceTypeKey"
          label="Source type"
          options={sourceTypes}
          required
          includeBlank="Choose…"
          hint="What kind of document, body or person produced it."
        />
        <TextInput name="year" label="Year" placeholder="2022" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="publisher" label="Publisher or channel" />
        <TextInput name="doi" label="DOI" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="pmid" label="PMID" />
        <TextInput name="canonicalUrl" label="Canonical URL" />
      </div>

      <Select
        name="qcStatus"
        label="Quality-control status"
        options={QC_OPTIONS}
        defaultValue="pending"
        required
        hint="A source marked replace or exclude cannot be provenance for published content."
      />

      <TextArea
        name="primaryRole"
        label="What this source can support"
        rows={3}
        hint="The topics it is a legitimate authority on."
      />
      <TextArea
        name="limitationsNotes"
        label="What it cannot support"
        rows={3}
        hint="Known gaps, age, scope, or the kinds of claim it should never be cited for."
      />
      <TextArea
        name="authorityNotes"
        label="Authority notes"
        rows={3}
        hint="Anything a reviewer needs to know before treating this as an authority — unresolved attribution, conflicts of interest, edition uncertainty."
      />
    </Form>
  );
}
