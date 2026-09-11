import Link from 'next/link';
import { Container } from './primitives';

/**
 * Site chrome.
 *
 * The header carries a wordmark, the primary sections, and search — and stops
 * there. On a reference, chrome that competes with the content is a cost paid on
 * every page. The tide motif appears once, as a rule beneath the header, and
 * nowhere else.
 */

const PRIMARY_NAV = [
  { href: '/peptides', label: 'Peptides' },
  { href: '/quality', label: 'Quality' },
  { href: '/sources', label: 'Sources' },
  { href: '/methodology', label: 'Methodology' },
] as const;

const FOOTER_NAV: readonly { heading: string; links: readonly { href: string; label: string }[] }[] =
  [
    {
      heading: 'Reference',
      links: [
        { href: '/peptides', label: 'Compounds' },
        { href: '/quality', label: 'Quality and testing' },
        { href: '/routes', label: 'Administration routes' },
        { href: '/search', label: 'Search' },
      ],
    },
    {
      heading: 'How this works',
      links: [
        { href: '/methodology', label: 'Methodology' },
        { href: '/evidence', label: 'How evidence is classified' },
        { href: '/editorial-policy', label: 'Editorial policy' },
        { href: '/sources', label: 'Source register' },
      ],
    },
    {
      heading: 'Transparency',
      links: [
        { href: '/corrections', label: 'Corrections' },
        { href: '/coverage', label: 'What is and is not here' },
      ],
    },
  ];

export function SiteHeader() {
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="no-print sticky top-0 z-40 border-b border-rule bg-warm-white/95 backdrop-blur-sm">
        <Container width="wide">
          <div className="flex h-16 items-center justify-between gap-6">
            <Link href="/" className="group flex shrink-0 items-baseline gap-2.5">
              <span className="font-serif text-lg tracking-tight text-ink">The Tides Index</span>
              {/*
                Held back until there is room for it. At the tablet breakpoint the
                primary nav appears while the brand is still shrink-0, and the
                descriptor pushed the search control past the viewport edge —
                found by measuring at 768px rather than by looking, because 24px
                of overflow reads as a scrollbar and nothing else.
              */}
              <span className="hidden text-2xs tracking-[0.14em] text-slate uppercase lg:inline">
                Peptide reference
              </span>
            </Link>

            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-7 text-sm">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-ink-soft transition-colors hover:text-deep-tide"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Link
              href="/search"
              className="flex items-center gap-2 rounded-md border border-rule bg-mist px-3 py-1.5 text-sm text-slate transition-colors hover:border-tide-teal hover:text-deep-tide"
            >
              <SearchGlyph />
              <span className="hidden sm:inline">Search</span>
            </Link>
          </div>
        </Container>
        <hr className="tide-rule border-0" aria-hidden="true" />
      </header>

      {/* The primary sections stay reachable on small screens without a menu
          button: a reference is navigated constantly, and a hidden menu adds a
          tap to every move. */}
      <nav aria-label="Sections" className="no-print border-b border-rule bg-mist md:hidden">
        <Container width="wide">
          <ul className="scroll-x flex gap-5 py-2.5 text-sm">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link href={item.href} className="text-ink-soft">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>
    </>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-[calc(var(--rhythm)*4)] border-t border-rule bg-mist">
      <Container width="wide">
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-serif text-base text-ink">The Tides Index</p>
            <p className="mt-1.5 max-w-[28ch] text-sm text-slate">
              Independent peptide science &amp; clinical reference.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="meta-label">{group.heading}</p>
              <ul className="mt-2.5 space-y-1.5 text-sm">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-ink-soft hover:text-deep-tide">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="border-t border-rule py-6">
          <p className="max-w-[70ch] text-xs leading-relaxed text-slate">
            The Tides Index is an educational and reference resource. It is not medical advice, it
            does not recommend treatment, and it does not sell anything. Nothing here should be used
            to start, stop or change any treatment. Speak with a qualified clinician who knows your
            history.
          </p>
          <p className="mt-3 text-xs text-slate">
            Source materials are private research inputs and are not redistributed. Bibliographic
            metadata is published so that every statement can be traced.
          </p>
        </div>
      </Container>
    </footer>
  );
}
