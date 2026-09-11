'use client';

import { Checkbox, Form, Select, TextArea } from '@/components/admin/forms';
import { updateClaimAction } from '../../actions';

const IMPORTANCE_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High — stricter gate' },
  { value: 'critical', label: 'Critical — stricter gate' },
];

interface ClaimFormValues {
  id: string;
  peptideId: string | null;
  claimText: string;
  plainLanguageText: string | null;
  importance: string;
  interpretationNotes: string | null;
  uncertaintyText: string | null;
  isEditorialNonEvidentiary: boolean;
}

export function ClaimForm({ claim }: { claim: ClaimFormValues }) {
  return (
    <Form action={updateClaimAction} submitLabel="Save claim">
      <input type="hidden" name="claimId" value={claim.id} />
      <input type="hidden" name="peptideId" value={claim.peptideId ?? ''} />

      <TextArea
        name="claimText"
        label="Claim"
        rows={3}
        required
        defaultValue={claim.claimText}
        hint="One discrete proposition, stated as the platform states it."
      />
      <TextArea
        name="plainLanguageText"
        label="Plain language"
        rows={3}
        defaultValue={claim.plainLanguageText}
        hint="The same proposition for a reader with no clinical background."
      />

      <Select
        name="importance"
        label="Importance"
        options={IMPORTANCE_OPTIONS}
        defaultValue={claim.importance}
        required
        hint="High and critical claims additionally require stated uncertainty and a compliance review."
      />

      <TextArea
        name="interpretationNotes"
        label="How the evidence was read"
        rows={3}
        defaultValue={claim.interpretationNotes}
        hint="Required before publication. Where a source interprets another source, say so here."
      />
      <TextArea
        name="uncertaintyText"
        label="What remains uncertain"
        rows={3}
        defaultValue={claim.uncertaintyText}
        hint="Limitations, gaps, unreplicated findings, populations not studied."
      />

      <Checkbox
        name="isEditorialNonEvidentiary"
        label="Editorial copy, not an evidentiary claim"
        defaultChecked={claim.isEditorialNonEvidentiary}
        hint="For methodology and navigational text that asserts nothing about biology, efficacy, safety or regulation. Exempt from provenance, not from review. Do not use to bypass a missing citation."
      />
    </Form>
  );
}
