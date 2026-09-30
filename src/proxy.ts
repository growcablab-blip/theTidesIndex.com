import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { currentSurface, isPublicSurfacePath } from '@/domain/publishing/surface';

/*
 * Nothing on the public surface is served that is not on its allowlist.
 * Refused paths are rewritten to a route that always calls notFound(), so the
 * holding experience's own not-found page answers, with a 404 status. It must
 * be a real, dynamic route: a rewrite to a path with no route, or to an unknown
 * slug on a statically generated route, hangs in the standalone server.
 */
const PUBLIC_SURFACE_NOT_FOUND = '/not-in-index';

/**
 * Refreshes the Supabase session cookie and keeps unauthenticated visitors out
 * of the editorial surfaces.
 *
 * Next 16 renamed the middleware convention to `proxy`; this is that file.
 *
 * This is a convenience gate, not the security boundary. The boundary is
 * row-level security in Postgres: a request that somehow reached an admin route
 * without a session would still carry no staff identity, and every policy would
 * refuse it.
 */
export default async function proxy(request: NextRequest) {
  // The public deployment serves the holding experience and nothing else —
  // no research pages, no search, no admin. Decided before any session work.
  if (currentSurface() === 'public') {
    if (isPublicSurfacePath(request.nextUrl.pathname)) return NextResponse.next({ request });
    return NextResponse.rewrite(new URL(PUBLIC_SURFACE_NOT_FOUND, request.url));
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Without Supabase configured there is no session to refresh. The admin
  // surfaces will still refuse to render.
  if (!supabaseUrl || !supabaseKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname.startsWith('/admin');
  const isSignIn = pathname.startsWith('/admin/sign-in');

  if (isAdminRoute && !isSignIn && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/sign-in';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  if (isSignIn && user) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except static assets and image optimisation.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
};
