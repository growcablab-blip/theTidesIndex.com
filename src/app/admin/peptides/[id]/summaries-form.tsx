'use client';

import { Form, TextArea, TextInput } from '@/components/admin/forms';
import { updatePeptideSummariesAction } from '../../actions';

interface PeptideSummaries {
  id: string;
  shortDescription: string | null;
  simpleSummary: string | null;
  practitionerSummary: string | null;
  unknownsSummary: string | null;
  sequence: string | null;
  molecularDescription: string | null;
}

export function PeptideSummariesForm({ peptide }: { peptide: PeptideSummaries }) {
  return (
    <Form action={updatePeptideSummariesAction} submitLabel="Save summaries">
      <input type="hidden" name="peptideId" value={peptide.id} />

      <TextInput
        name="shortDescription"
        label="One-sentence orientation"
        defaultValue={peptide.shortDescription}
        hint="What this compound is, in one line. Not a claim about what it does."
      />
      <TextArea
        name="simpleSummary"
        label="Plain-language summary"
        rows={4}
        defaultValue={peptide.simpleSummary}
        hint="For a reader with no clinical background. Explains rather than prescribes."
      />
      <TextArea
        name="practitionerSummary"
        label="Practitioner summary"
        rows={4}
        defaultValue={peptide.practitionerSummary}
      />
      <TextArea
        name="unknownsSummary"
        label="What is not established"
        rows={4}
        defaultValue={peptide.unknownsSummary}
        hint="Required before this compound can be published. If human evidence is absent, say so here — that is the most useful sentence on the page."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput
          name="sequence"
          label="Sequence"
          defaultValue={peptide.sequence}
          hint="Leave empty if not established from a source."
        />
        <TextInput
          name="molecularDescription"
          label="Molecular description"
          defaultValue={peptide.molecularDescription}
        />
      </div>

      <p className="text-xs text-slate">
        Saving advances this record&rsquo;s version, which withdraws any approvals already given. That
        is intended: a reviewer approved the text they read, not the text that replaced it.
      </p>
    </Form>
  );
}
