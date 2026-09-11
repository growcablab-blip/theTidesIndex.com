'use client';

import { Form, TextInput } from '@/components/admin/forms';
import { requestSignInLinkAction } from './actions';

export function SignInForm() {
  return (
    <Form
      action={requestSignInLinkAction}
      submitLabel="Send sign-in link"
      successMessage="If that address has editorial access, a sign-in link is on its way. The link expires shortly."
    >
      <TextInput
        name="email"
        label="Email address"
        required
        placeholder="you@example.org"
        hint="A one-time link is sent to this address. There is no password."
      />
    </Form>
  );
}
