import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * Not found, inside the holding experience.
 *
 * Also what every refused path answers on the public deployment, so it offers
 * only destinations that exist there: the home page and the protocol library.
 */
export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function ShowcaseNotFound() {
  return (
    <section className="relative flex min-h-[80svh] items-center overflow-hidden pt-24">
      <div className="sx-grid-bg" aria-hidden="true" />
      <div className="sx-wrap relative">
        <p className="sx-eyebrow">404 · Not in the index</p>
        <h1 className="sx-h2 mt-5 max-w-[16ch]">
          There is nothing at <span className="sx-glow-text">this address.</span>
        </h1>
        <p className="sx-lede mt-6 max-w-[44ch]">
          The link may be wrong, or this part of the library has not opened yet.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <Link href="/" className="sx-btn sx-btn-primary">
            The Tides Index <span className="sx-arrow" aria-hidden="true">→</span>
          </Link>
          <Link href="/#protocols" className="sx-btn sx-btn-ghost">
            Protocol guides
          </Link>
        </div>
      </div>
    </section>
  );
}
