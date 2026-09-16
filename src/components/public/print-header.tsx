import type { ReadingMode } from '@/domain/presentation/reading-mode';

/**
 * A masthead that appears only on paper.
 *
 * Reference pages get printed and carried into consultations, at which point
 * they are detached from the site that produced them. A printout that does not
 * say where it came from, when it was taken, or which reading depth it
 * represents is a liability: a patient-mode page and a practitioner-mode page
 * of the same record look similar on paper and mean different things.
 *
 * The patient-safety guarantee survives printing for the same reason it holds
 * on screen — the dose was never fetched, so there is nothing on the page to
 * print.
 */
export function PrintHeader({
  title,
  mode,
  path,
  version,
  lastReviewed,
}: {
  title: string;
  mode: ReadingMode;
  path: string;
  version: number;
  lastReviewed: string;
}) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thetidesindex.com';

  return (
    <div className="print-only print-record-header mb-6 border-b border-rule pb-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- paper only; a plain image prints reliably */}
      <img src="/brand/tides-index-logo.png" alt="The Tides Index" className="mb-2 h-10 w-auto" />
      <p className="text-sm font-medium">The Tides Index — {title}</p>
      <p className="mt-1 text-xs">
        {mode === 'simple'
          ? 'Patient reading. Amounts, frequency and duration are deliberately absent from this version.'
          : 'Practitioner reading. Source-reported regimens are reproduced as each named source stated them, and are not recommendations.'}
      </p>
      <p className="mt-1 text-xs">
        {origin}
        {path} · version {version} · last reviewed {lastReviewed}
      </p>
    </div>
  );
}
