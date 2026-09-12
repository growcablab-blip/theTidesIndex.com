import Link from 'next/link';
import type { Metadata } from 'next';
import { getStaffSession, ROLE_LABELS } from '@/server/auth/session';
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
          <div className="flex items-baseline gap-6">
            <Link href="/admin" className="font-serif text-lg text-ink">
              The Tides Index
              <span className="ml-2 text-xs tracking-wide text-slate uppercase">Editorial</span>
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
