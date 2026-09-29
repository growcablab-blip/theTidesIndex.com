import Image from 'next/image';
import Link from 'next/link';
import { Container } from './primitives';

/**
 * Site chrome.
 *
 * The header carries the logo, the primary sections, and search — and stops
 * there. The logo is the supplied brand artwork (`public/brand/`); its accessible
 * name is the organisation's name, so screen readers hear "The Tides Index".
 *
 * On a reference, chrome that competes with the content is a cost paid on every
 * page — but chrome that looks provisional is a cost too. The bar is tall
 * enough to hold the wordmark at a confident size, and the only ornament is the
 * movement hairline along its bottom edge. No wave, and nothing beneath it.
 */

/*
 * Ordered by what a reader came to do, not by how the database is shaped.
 *
 * "Learn" leads because the most common arrival is someone who has heard a
 * name and wants to know what it means; the register, the regimens and the
 * research agenda follow in the order a reader moves through them. Methodology
 * left the primary row for the Learn hub and the footer: it explains how the
 * index works, which matters enormously and is not a task anyone arrives with.
 */
const PRIMARY_NAV = [
  { href: '/learn', label: 'Learn' },
  { href: '/peptides', label: 'Peptides' },
  { href: '/protocols', label: 'Protocols' },
  { href: '/research', label: 'Research' },
  { href: '/quality', label: 'Quality' },
  { href: '/sources', label: 'Sources' },
] as const;

const FOOTER_NAV: readonly { heading: string; links: readonly { href: string; label: string }[] }[] =
  [
    {
      heading: 'Reference',
      links: [
        { href: '/peptides', label: 'Compounds' },
        { href: '/protocols', label: 'Source-reported protocols' },
        { href: '/research', label: 'Research questions' },
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
      {/* More presence, same restraint: a taller bar, a larger wordmark, and a
          hairline of the movement spectrum along the bottom edge in place of
          the flat rule. Still chrome — nothing here competes with a record. */}
      <header className="no-print relative sticky top-0 z-40 border-b border-rule bg-warm-white/92 backdrop-blur-md">
        <Container width="wide">
          <div className="flex h-[4.75rem] items-center justify-between gap-6 md:h-[5.25rem]">
            <Link href="/" className="flex shrink-0 items-center" aria-label="The Tides Index — home">
              {/*
                The logo carries its own tagline, so the separate descriptor is
                gone. Height is fixed and width follows the artwork, so the
                search control keeps its room at the tablet breakpoint.
              */}
              <Image
                src="/brand/tides-index-logo.png"
                alt="The Tides Index"
                width={1200}
                height={437}
                loading="eager"
                fetchPriority="high"
                className="h-12 w-auto md:h-[3.25rem]"
              />
            </Link>

            <nav aria-label="Primary" className="hidden md:block">
              <ul className="flex items-center gap-8 text-[0.9375rem]">
                {PRIMARY_NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="relative text-ink-soft transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-tide-teal after:transition-all hover:text-deep-tide hover:after:w-full"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <Link
              href="/search"
              className="flex items-center gap-2 rounded-lg border border-rule bg-mist px-3.5 py-2 text-sm text-slate transition-colors hover:border-tide-teal hover:bg-sea-glass/40 hover:text-deep-tide"
            >
              <SearchGlyph />
              <span className="hidden sm:inline">Search</span>
            </Link>
          </div>
        </Container>
        <span aria-hidden="true" className="tide-rule absolute inset-x-0 bottom-0 block" />
      </header>

      {/* The primary sections stay reachable on small screens without a menu
          button: a reference is navigated constantly, and a hidden menu adds a
          tap to every move. */}
      <nav aria-label="Sections" className="no-print border-b border-rule bg-mist md:hidden">
        <Container width="wide">
          {/*
            Padding on the link, not on the row. The row was padded and the
            anchors were not, so the tappable area was the height of the text —
            17px on a phone, against a 44px guideline.
          */}
          <ul className="scroll-x flex gap-1 text-sm">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href} className="shrink-0">
                <Link href={item.href} className="block px-2.5 py-3 text-ink-soft">
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
            <Image
              src="/brand/tides-index-logo.png"
              alt="The Tides Index"
              width={1200}
              height={437}
              className="h-16 w-auto"
            />
            <p className="mt-3 max-w-[28ch] text-sm text-slate">
              Independent peptide science &amp; clinical reference.
            </p>
          </div>

          {FOOTER_NAV.map((group) => (
            <nav key={group.heading} aria-label={group.heading}>
              <p className="meta-label">{group.heading}</p>
              {/* Padded on a phone, tight on a desktop where the pointer is
                  precise and the footer would otherwise sprawl. */}
              <ul className="mt-1.5 text-sm lg:mt-2.5 lg:space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="inline-block py-2 text-ink-soft hover:text-deep-tide lg:py-0"
                    >
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
