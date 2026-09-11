'use client';

import { Form, TextArea, TextInput } from '@/components/admin/forms';
import { createSourceLocationAction } from '../../actions';

export function NewSourceLocationForm({ sourceId }: { sourceId: string }) {
  return (
    <Form
      action={createSourceLocationAction}
      submitLabel="Add location"
      successMessage="Location added."
    >
      <input type="hidden" name="sourceId" value={sourceId} />
      <TextInput
        name="locatorText"
        label="Locator"
        required
        placeholder="pp. 19–24"
        hint="How this should read in a citation."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="pageStart" label="First page" />
        <TextInput name="pageEnd" label="Last page" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput name="chapter" label="Chapter" />
        <TextInput name="section" label="Section" />
      </div>
      <TextArea name="notes" label="Notes" rows={2} />
    </Form>
  );
}
