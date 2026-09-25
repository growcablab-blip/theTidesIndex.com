import { Container } from '@/components/public/primitives';

/**
 * The only loading state on the public site, and the only one that earns its place.
 *
 * Search is the one surface where the reader has just acted and is waiting on a
 * query they asked for. Everywhere else a reader arrives by following a link and
 * a skeleton would flash for a moment and say nothing — so there is no
 * `loading.tsx` on the record pages, deliberately.
 *
 * It renders the shape of a result list rather than a spinner, so the page does
 * not jump when the results land, and it claims no number: a placeholder that
 * said "12 results" before the query returned would be inventing one.
 */
export default function SearchLoading() {
  return (
    <Container width="page" className="py-10 sm:py-14">
      <p className="meta-label text-tide-teal">Search</p>
      <p className="mt-3 font-serif text-2xl text-ink">Looking through the index…</p>

      <div className="mt-8 space-y-4" aria-hidden="true">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="rounded-md border border-rule bg-warm-white px-5 py-4">
            <div className="h-3 w-24 rounded-sm bg-mist" />
            <div className="mt-3 h-4 w-3/4 rounded-sm bg-mist" />
            <div className="mt-2 h-3 w-1/2 rounded-sm bg-mist" />
          </div>
        ))}
      </div>

      <p className="sr-only" role="status">
        Searching the index.
      </p>
    </Container>
  );
}
