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
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
