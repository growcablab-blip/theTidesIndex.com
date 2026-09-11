'use client';

import { Checkbox, Form, Select, TextArea, TextInput } from '@/components/admin/forms';
import { createClaimAction } from '../../actions';

const IMPORTANCE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High — stricter gate' },
  { value: 'critical', label: 'Critical — stricter gate' },
];

export function NewClaimForm({ peptideId }: { peptideId: string | null }) {
  return (
    <Form action={createClaimAction} submitLabel="Create claim" successMessage="Claim created.">
      <input type="hidden" name="peptideId" value={peptideId ?? ''} />

      <TextInput
        name="claimKey"
        label="Claim key"
        required
        placeholder="BPC157-C-001"
        hint="Stable identifier. It does not change once the claim is referenced."
      />
      <TextArea
        name="claimText"
        label="Claim"
        rows={3}
        required
        hint="One proposition. If you find yourself writing 'and', it is probably two claims."
      />
      <TextArea name="plainLanguageText" label="Plain language" rows={3} />

      <Select
        name="importance"
        label="Importance"
        options={IMPORTANCE_OPTIONS}
        defaultValue="medium"
        required
      />

      <TextArea name="interpretationNotes" label="How the evidence was read" rows={3} />
      <TextArea name="uncertaintyText" label="What remains uncertain" rows={3} />

      <Checkbox
        name="isEditorialNonEvidentiary"
        label="Editorial copy, not an evidentiary claim"
        hint="Only for text that asserts nothing about biology, efficacy, safety or regulation."
      />
    </Form>
  );
}
