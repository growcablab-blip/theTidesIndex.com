import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/server/auth/supabase';

/**
 * Exchanges a one-time sign-in code for a session.
 *
 * Only same-origin destinations are honoured, so a crafted link cannot use this
 * route to bounce a freshly-authenticated staff member somewhere else.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/admin';
  const destination = next.startsWith('/') && !next.startsWith('//') ? next : '/admin';

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/sign-in?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/admin/sign-in?error=invalid_link`);
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
