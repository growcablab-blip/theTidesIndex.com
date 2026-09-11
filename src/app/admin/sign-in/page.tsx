import type { Metadata } from 'next';
import { SignInForm } from './sign-in-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-2xl text-ink">The Tides Index</h1>
      <p className="mt-1 text-sm text-slate">Editorial access for internal staff.</p>

      <div className="mt-8 rounded border border-rule bg-mist p-6">
        <SignInForm />
      </div>

      <p className="mt-6 text-xs text-slate">
        Accounts are created by an administrator. Signing in does not by itself grant access to any
        record.
      </p>
    </div>
  );
}
