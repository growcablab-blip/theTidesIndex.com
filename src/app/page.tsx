/**
 * Placeholder index.
 *
 * The public reference experience is Phase B and the visual system is Phase D/E.
 * This page exists only so the application builds; it deliberately contains no
 * medical content, no marketing copy, and no evidence claims.
 */
export default function HomePage() {
  return (
    <main className="mx-auto max-w-[var(--container-measure)] px-6 py-24">
      <h1 className="font-serif text-3xl text-ink">The Tides Index</h1>
      <p className="mt-2 text-slate">Independent peptide science &amp; clinical reference.</p>
      <p className="mt-8 text-sm text-slate">
        The evidence system is under construction. Public reference pages are built from reviewed,
        source-linked records and are not yet available.
      </p>
    </main>
  );
}
