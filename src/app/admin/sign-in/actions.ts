'use server';

import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/server/auth/supabase';
import { fail, ok, type ActionResult } from '@/server/editorial/mutations';

/**
 * Sign-in for internal editorial staff.
 *
 * A one-time link rather than a password: there are no passwords to store, leak
 * or rotate, and the platform holds no credential of its own.
 *
 * Receiving a link is not access. Authorisation comes from an active row in
 * `profiles`, which only an administrator can create. Someone who signs in
 * without a staff profile reaches an authenticated session with no privileges
 * on anything.
 */

const emailSchema = z.email('Enter the email address your access was granted to.');

export async function requestSignInLinkAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const raw = formData.get('email');
  const parsed = emailSchema.safeParse(typeof raw === 'string' ? raw.trim() : '');

  if (!parsed.success) {
    return fail('Check the email address.', { email: [parsed.error.issues[0]?.message ?? ''] });
  }

  const supabase = await createSupabaseServerClient();
  const headerList = await headers();
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? `https://${headerList.get('host') ?? 'localhost:3000'}`;

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data,
    options: {
      emailRedirectTo: `${origin}/admin/auth/callback`,
      // Staff accounts are created by an administrator, never by signing in.
      shouldCreateUser: false,
    },
  });

  if (error) {
    // The same response either way: whether an address is registered is not
    // something an unauthenticated visitor should be able to probe.
    if (!/not found|signups not allowed/i.test(error.message)) {
      return fail('The sign-in link could not be sent. Try again shortly.');
    }
  }

  return ok();
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect('/admin/sign-in');
}
