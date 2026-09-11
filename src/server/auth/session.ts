import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { profiles } from '@db/schema';
import { getStaffDb } from '../db/client';
import { createSupabaseServerClient } from './supabase';
import type { StaffRole } from './roles';

/**
 * The acting staff member, resolved once per request.
 *
 * The role returned here decides what the interface *offers*. It never decides
 * what the database *permits* — that is settled by the row-level security
 * policies, under the user's own identity. A bug here can show someone a button
 * they should not see; it cannot let them perform the action behind it.
 */

export interface StaffSession {
  readonly userId: string;
  readonly email: string | null;
  readonly displayName: string;
  readonly role: StaffRole;
}

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const supabase = await createSupabaseServerClient();

  // getUser revalidates the token with Supabase. getSession only reads the
  // cookie, which a client could have forged.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const db = getStaffDb();
  const [profile] = await db
    .select({
      userId: profiles.userId,
      displayName: profiles.displayName,
      email: profiles.email,
      role: profiles.role,
      isActive: profiles.isActive,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .limit(1);

  // An authenticated account with no active staff profile is not staff. Access
  // is granted by an admin creating the profile, never by signing up.
  if (!profile || !profile.isActive) return null;

  return {
    userId: profile.userId,
    email: profile.email ?? user.email ?? null,
    displayName: profile.displayName,
    role: profile.role,
  };
});

/** Redirects to sign-in unless an active staff profile is present. */
export async function requireStaff(): Promise<StaffSession> {
  const session = await getStaffSession();
  if (!session) redirect('/admin/sign-in');
  return session;
}

/** Redirects unless the acting user holds one of the given roles. */
export async function requireRole(...roles: readonly StaffRole[]): Promise<StaffSession> {
  const session = await requireStaff();
  if (!roles.includes(session.role)) redirect('/admin?denied=1');
  return session;
}

export {
  canEditContent,
  reviewTypesForRole,
  ROLE_LABELS,
  type ReviewType,
  type StaffRole,
} from './roles';
