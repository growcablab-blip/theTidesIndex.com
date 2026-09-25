import Link from 'next/link';
import { Container } from '@/components/public/primitives';

/**
 * What a reader meets when a page is missing or a request fails.
 *
 * Both cases share a shape, and the shape is the point. A reference that is
 * honest about gaps in its evidence should be honest about gaps in itself: say
 * what happened in one sentence, say what it does *not* mean, and put the ways
 * back within reach rather than leaving a dead end with a back button.
 *
 * Deliberately plain. No apology graphic, no oversized numeral, no joke — a
 * clinician who has just lost their place wants the search box, not a mascot.
 * The tone matches the record pages, because for all the reader knows this is
 * still the same product misbehaving.
 */

export interface FailureRoute {
  readonly href: string;
  readonly label: string;
  readonly note: string;
}

/** The ways back, in the order a lost reader is likely to want them. */
export const FAILURE_ROUTES: readonly FailureRoute[] = [
  { href: '/search', label: 'Search the index', note: 'Compounds, quality topics and sources.' },
  { href: '/peptides', label: 'Compound register', note: 'Every compound in scope, published or not.' },
  { href: '/learn', label: 'Start from a question', note: 'The subject in plain language.' },
  { href: '/sources', label: 'Source register', note: 'Every work this index holds or has registered.' },
];

export function FailurePage({
  label,
  headline,
  children,
  action,
}: {
  /** The small line above the headline: what kind of failure this is. */
  readonly label: string;
  readonly headline: string;
  readonly children: React.ReactNode;
  /** An optional control, such as "try again" on an error boundary. */
  readonly action?: React.ReactNode;
}) {
  return (
    <Container width="page" className="py-16 sm:py-24">
      <div className="max-w-[62ch]">
        <p className="meta-label text-tide-teal">{label}</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">{headline}</h1>
        <div className="depth-body mt-4 space-y-3 text-ink-soft">{children}</div>
        {action === undefined ? null : <div className="mt-6">{action}</div>}
      </div>

      <nav aria-label="Ways back" className="mt-12">
        <p className="meta-label">Where to go instead</p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {FAILURE_ROUTES.map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className="group flex h-full flex-col rounded-xl border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal/60"
              >
                <span className="font-serif text-lg text-ink group-hover:text-deep-tide">
                  {route.label}
                </span>
                <span className="depth-body mt-1 text-sm leading-relaxed text-ink-soft">
                  {route.note}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </Container>
  );
}
