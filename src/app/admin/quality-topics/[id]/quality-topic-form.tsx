'use client';

import { Form, TextArea, TextInput } from '@/components/admin/forms';
import { updateQualityTopicAction } from '../../actions';

interface QualityTopicFormValues {
  id: string;
  shortDescription: string | null;
  simpleSummary: string | null;
  practitionerSummary: string | null;
  whatItProves: string | null;
  whatItDoesNotProve: string | null;
  commonMisinterpretations: string | null;
}

export function QualityTopicForm({ topic }: { topic: QualityTopicFormValues }) {
  return (
    <Form action={updateQualityTopicAction} submitLabel="Save topic">
      <input type="hidden" name="qualityTopicId" value={topic.id} />

      <TextInput
        name="shortDescription"
        label="One-sentence orientation"
        defaultValue={topic.shortDescription}
      />
      <TextArea
        name="simpleSummary"
        label="Plain-language summary"
        rows={4}
        defaultValue={topic.simpleSummary}
      />
      <TextArea
        name="practitionerSummary"
        label="Practitioner summary"
        rows={4}
        defaultValue={topic.practitionerSummary}
      />

      <TextArea
        name="whatItProves"
        label="What a result of this kind can establish"
        rows={4}
        defaultValue={topic.whatItProves}
        hint="Required before publication. Be precise about the scope: usually the sample analysed, not the vial in front of the clinician."
      />
      <TextArea
        name="whatItDoesNotProve"
        label="What it cannot establish"
        rows={4}
        defaultValue={topic.whatItDoesNotProve}
        hint="Required before publication. This is the half the section exists for. Purity, identity, content, sterility and endotoxin are four separate questions and one result rarely answers more than one."
      />
      <TextArea
        name="commonMisinterpretations"
        label="Common misreadings"
        rows={3}
        defaultValue={topic.commonMisinterpretations}
        hint="What clinics and buyers actually get wrong about this, stated plainly."
      />
    </Form>
  );
}
