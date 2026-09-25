import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Auth client for server components, route handlers and server
 * actions.
 *
 * Supabase provides identity only. Authorisation lives in Postgres: the user id
 * from the session is handed to `withStaffSession`, which drops the connection
 * to the `authenticated` role and declares who is acting, so the row-level
 * security policies decide what that person can do. Nothing is authorised by
 * checking a role in application code and then querying with full privileges.
 */

/**
 * Whether staff authentication is configured on this deployment at all.
 *
 * Distinct from "nobody is signed in". A deployment with no Supabase keys is not
 * a deployment whose visitor has been signed out — it is one where editorial
 * access has not been provisioned yet, and the admin surface says so rather
 * than throwing an unhandled error into a 500 page or, worse, rendering a
 * sign-in form that can never work.
 *
 * Public reading never consults this: it does not touch Supabase at all.
 */
export function staffAuthConfigured(): boolean {
  return (
    (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '') !== '' &&
    (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '') !== ''
  );
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set. See .env.example.`);
  }
  return value;
}

export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv('NEXT_PUBLIC_SUPABASE_URL'),
    requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server components cannot set cookies. Session refresh happens in
            // middleware, so this is safe to ignore here.
          }
        },
      },
    },
  );
}
