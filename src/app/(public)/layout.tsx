import { PrintExpander } from '@/components/public/print-expander';
import { SiteFooter, SiteHeader } from '@/components/public/site-chrome';
import { getReadingMode } from '@/server/public/reading-mode';

/**
 * Every public page carries the reader's chosen depth on its outermost element.
 *
 * Simple and Practitioner should feel different everywhere, not only on the two
 * pages that change their content. The attribute lets the stylesheet give simple
 * mode more air, larger body text and fewer dense metadata lines site-wide.
 * It is presentation only: what a simple reader may *receive* is still decided
 * in the queries, from views with no dosing columns.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const mode = await getReadingMode();
  return (
    <div className="flex min-h-screen flex-col" data-reading-mode={mode}>
      {/* Print: every collapsed disclosure is opened for paper, then restored. */}
      <PrintExpander />
      <SiteHeader />
      {/*
        Paper-only masthead. The screen header is dropped in print, but a page
        detached from the site still has to say where it came from and which
        reading depth it is. Record pages carry their own fuller PrintHeader,
        and the stylesheet hides this one when that is present.
      */}
      <div className="print-only print-site-masthead mb-6 border-b border-rule pb-3">
        <p className="text-sm font-medium">The Tides Index · thetidesindex.com</p>
        <p className="mt-1 text-xs">
          {mode === 'simple'
            ? 'Simple reading: plain language. Amounts, frequency and duration are not shown in this version.'
            : 'Practitioner reading: full evidence. Source-reported regimens are reproduced as each named source stated them, and are not recommendations.'}
        </p>
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
