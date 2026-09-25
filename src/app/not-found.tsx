import type { Metadata } from 'next';
import Link from 'next/link';

/**
 * The root 404, for URLs outside the public site.
 *
 * The public site has its own not-found inside its layout, so a reader who
 * mistypes a record slug keeps the header, the search box and the footer. This
 * one catches everything else — a stray path, a link to a route group that no
 * longer exists — and cannot use that chrome, because it renders directly
 * inside the root layout.
 *
 * So it is deliberately small: say what happened, and offer the front door.
 */
export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function RootNotFound() {
  return (
    <main className="flex min-h-screen items-center bg-warm-white">
      <div className="mx-auto w-full max-w-[42rem] px-6 py-16">
        <p className="meta-label text-tide-teal">Not found</p>
        <h1 className="mt-3 font-serif text-3xl leading-tight text-ink sm:text-4xl">
          There is nothing at this address.
        </h1>
        <p className="depth-body mt-4 text-ink-soft">
          The link may be wrong, or the page may have been renamed.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-md bg-deep-tide px-6 py-3 font-medium text-warm-white transition-colors hover:bg-ink"
          >
            The Tides Index
          </Link>
          <Link
            href="/search"
            className="rounded-md border border-deep-tide px-6 py-3 font-medium text-deep-tide transition-colors hover:bg-mist"
          >
            Search the index
          </Link>
        </div>
      </div>
    </main>
  );
}
