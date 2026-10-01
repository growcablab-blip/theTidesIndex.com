import Image from 'next/image';
import Link from 'next/link';

/**
 * Chrome for the public holding experience.
 *
 * Four destinations, all within the experience itself. The research
 * application's routes are intact and reachable directly, but they are not the
 * public journey yet, so the header does not lead there.
 *
 * The phone menu is a native <details> disclosure: it works before hydration,
 * needs no script, and has no hover dependency.
 */

export const SHOWCASE_NAV = [
  { href: '/#protocols', label: 'Protocols' },
  { href: '/#research', label: 'Research' },
  { href: '/#quality', label: 'Quality' },
  { href: '/#about', label: 'About' },
] as const;

function Wordmark() {
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label="The Tides Index — home">
      <Image
        src="/brand/tides-index-mark.png"
        alt=""
        width={512}
        height={512}
        priority
        className="h-9 w-9 transition-transform duration-700 group-hover:rotate-[20deg] sm:h-10 sm:w-10"
      />
      <span className="flex flex-col leading-none">
        <span className="sx-mono text-[0.58rem] tracking-[0.42em] text-[var(--sx-cyan-soft)]">THE</span>
        <span className="mt-1 text-[1.05rem] font-semibold tracking-[0.2em] text-[var(--sx-text)] sm:text-[1.15rem]">
          TIDES INDEX
        </span>
      </span>
    </Link>
  );
}

export function ShowcaseHeader() {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-[var(--sx-cyan)] focus:px-4 focus:py-2 focus:text-[#03141c]"
      >
        Skip to content
      </a>
      <header className="sx-header">
        <div className="sx-wrap flex h-[4.5rem] items-center justify-between md:h-20">
          <Wordmark />

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-10">
              {SHOWCASE_NAV.map((item, i) => (
                <li key={item.href}>
                  {/* Protocols is the one thing to do today; it is marked, not boxed. */}
                  <a href={item.href} className="sx-navlink" data-primary={i === 0 ? '' : undefined}>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>


          <details className="sx-menu relative md:hidden">
            <summary
              aria-label="Menu"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-[var(--sx-line-strong)] bg-[rgb(6_20_30/0.6)]"
            >
              <svg className="sx-menu-icon-open" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M2 5h14M2 9h14M2 13h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <svg className="sx-menu-icon-close" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              aria-label="Primary"
              className="absolute right-0 top-[calc(100%+0.75rem)] w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl border border-[var(--sx-line-strong)] bg-[rgb(4_16_25/0.96)] p-2 shadow-2xl backdrop-blur-xl"
            >
              <ul>
                {SHOWCASE_NAV.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="flex items-center justify-between rounded-xl px-4 py-3.5 text-[0.95rem] text-[var(--sx-text)] hover:bg-[rgb(34_211_238/0.08)]"
                    >
                      {item.label}
                      <span aria-hidden="true" className="text-[var(--sx-cyan)]">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
        </div>
      </header>
    </>
  );
}

const POSITIONING = [
  ['Independent', 'Editorially independent, with nothing to sell.'],
  ['Source-linked', 'Every statement traces back to a named source.'],
  ['Research-focused', 'Human, preclinical and practitioner evidence kept apart.'],
  ['Vendor-neutral', 'No products, rankings or affiliate links.'],
] as const;

export function ShowcaseFooter() {
  return (
    <footer id="about" className="relative border-t border-[var(--sx-line)] bg-[var(--sx-bg)]">
      <div className="sx-wrap py-16 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-20">
          <div data-reveal>
            <Wordmark />
            <p className="sx-lede mt-6 max-w-[34ch] !text-base">
              Independent peptide science, made understandable — for practitioners and for the people they
              care for.
            </p>
          </div>

          <div data-reveal style={{ '--delay': '0.1s' } as React.CSSProperties}>
            <p className="sx-kicker">About The Tides Index</p>
            <dl className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2">
              {POSITIONING.map(([title, body]) => (
                <div key={title} className="border-l border-[var(--sx-line-strong)] pl-4">
                  <dt className="font-medium text-[var(--sx-text)]">{title}</dt>
                  <dd className="mt-1 text-sm leading-relaxed text-[var(--sx-soft)]">{body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="sx-divider mt-16" />

        <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <p className="max-w-[78ch] text-xs leading-relaxed text-[var(--sx-faint)]">
            The Tides Index is an independent educational research reference. Protocol guides describe what
            published sources and practitioners report; they are not medical advice or a recommendation to use
            any compound. Speak with a qualified clinician about any treatment decision.
          </p>
          <p className="sx-mono shrink-0 text-[0.68rem] tracking-[0.18em] text-[var(--sx-faint)]">
            THETIDESINDEX.COM · © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </footer>
  );
}
