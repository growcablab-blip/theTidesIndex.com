'use client';

import { Form, Select, TextInput } from '@/components/admin/forms';
import { createStaffProfileAction } from '../actions';

const ROLE_OPTIONS = [
  { value: 'editor', label: 'Editor — creates and edits records' },
  { value: 'scientific_reviewer', label: 'Scientific reviewer' },
  { value: 'clinical_reviewer', label: 'Clinical reviewer' },
  { value: 'compliance_reviewer', label: 'Compliance reviewer' },
  { value: 'admin', label: 'Administrator — full access' },
];

export function NewStaffForm() {
  return (
    <Form
      action={createStaffProfileAction}
      submitLabel="Grant access"
      successMessage="Access granted."
    >
      <TextInput
        name="userId"
        label="Supabase user id"
        required
        placeholder="00000000-0000-0000-0000-000000000000"
        hint="From Authentication → Users in the Supabase dashboard, after inviting the person."
      />
      <TextInput
        name="displayName"
        label="Name"
        required
        hint="Reviews are attributed to this name, permanently."
      />
      <TextInput name="email" label="Email" />
      <Select
        name="role"
        label="Role"
        options={ROLE_OPTIONS}
        defaultValue="editor"
        required
        hint="A role can be changed later, but reviews already recorded keep the name of the person who gave them."
      />
    </Form>
  );
}
