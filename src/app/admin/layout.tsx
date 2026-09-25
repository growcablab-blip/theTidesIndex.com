import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getStaffSession, ROLE_LABELS } from '@/server/auth/session';
import { staffAuthConfigured } from '@/server/auth/supabase';
import { signOutAction } from './sign-in/actions';

export const metadata: Metadata = {
  title: { default: 'Editorial', template: '%s · Editorial · The Tides Index' },
  robots: { index: false, follow: false },
};

const NAV = [
  { href: '/admin', label: 'Overview' },
  { href: '/admin/review', label: 'Review queue' },
  { href: '/admin/sources', label: 'Sources' },
  { href: '/admin/peptides', label: 'Compounds' },
  { href: '/admin/protocols/new', label: 'New protocol' },
  { href: '/admin/quality-topics', label: 'Quality' },
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  /*
   * Before asking who is signed in, ask whether signing in is possible.
   *
   * Without Supabase keys `getStaffSession()` throws, and with no error boundary
   * above it that surfaced as an unstyled 500 on every editorial route — which
   * reads as "the site is broken" rather than "this deployment has no editorial
   * access yet". Public reading is unaffected either way: it never touches
   * Supabase.
   */
  if (!staffAuthConfigured()) {
    return (
      <div className="min-h-screen bg-warm-white">
        <main className="mx-auto max-w-[44rem] px-6 py-20">
          <p className="text-xs tracking-wide text-slate uppercase">The Tides Index · Editorial</p>
          <h1 className="mt-3 font-serif text-3xl text-ink">
            Editorial access is not configured on this deployment.
          </h1>
          <p className="mt-4 text-ink-soft">
            Staff authentication needs a Supabase project, and this deployment has not been given
            one. Nothing is wrong with the public site: it reads from the database directly and does
            not use Supabase.
          </p>
          <p className="mt-3 text-sm text-slate">
            Required: <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>. The full provisioning checklist, including
            the first administrator profile, is in{' '}
            <code>docs/V1_SECTION_3_WEBSITE_COMPLETION_REPORT.md</code>.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-md border border-deep-tide px-5 py-2.5 text-sm font-medium text-deep-tide hover:bg-mist"
          >
            Back to the public site
          </Link>
        </main>
      </div>
    );
  }

  const session = await getStaffSession();

  // The sign-in route renders inside this layout before a session exists.
  if (!session) {
    return <div className="min-h-screen bg-warm-white">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-warm-white">
      {/* Editorial chrome is screen furniture. The one page here that is meant
          to leave the building — the review packet export — must print as a
          document, not as a screenshot of an application with a sign-out link
          in the corner. */}
      <header className="border-b border-rule bg-mist print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2.5 text-ink" aria-label="The Tides Index — editorial">
              <Image src="/brand/tides-index-mark.png" alt="" width={512} height={512} className="h-8 w-8" />
              <span className="font-serif text-lg">The Tides Index</span>
              <span className="text-xs tracking-wide text-slate uppercase">Editorial</span>
            </Link>
            <nav aria-label="Editorial sections">
              <ul className="flex flex-wrap gap-4 text-sm">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="text-deep-tide hover:underline">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate">
              {session.displayName} · {ROLE_LABELS[session.role]}
            </span>
            {session.role === 'admin' ? (
              <Link href="/admin/staff" className="text-deep-tide underline">
                Staff
              </Link>
            ) : null}
            <form action={signOutAction}>
              <button type="submit" className="text-deep-tide underline">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 print:max-w-none print:px-0 print:py-0">
        {children}
      </main>

      <footer className="mx-auto max-w-6xl px-6 pb-10 text-xs text-slate print:hidden">
        <p>
          Nothing here is public until it passes its review gates. Source files are private research
          inputs and are never served from this application.
        </p>
      </footer>
    </div>
  );
}
