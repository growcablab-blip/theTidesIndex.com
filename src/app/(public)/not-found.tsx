import type { Metadata } from 'next';
import Link from 'next/link';
import { FailurePage } from '@/components/public/failure-page';

/**
 * A public page that does not exist.
 *
 * Reached both by an unmatched URL under the public site and by every
 * `notFound()` in a record route — a compound slug, a quality slug, a learning
 * slug, a source key. It renders inside the public layout, so the reader keeps
 * the header, the search box and the footer rather than being dropped onto a
 * bare page.
 *
 * The wording does one job beyond apologising: it separates "this index has
 * nothing at that address" from "this thing does not exist", because a reader
 * looking up a compound and hitting a 404 will otherwise read the second.
 */
export const metadata: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};

export default function PublicNotFound() {
  return (
    <FailurePage label="Not found" headline="There is nothing at this address.">
      <p>
        The page may have been renamed, or the link may be wrong. Nothing has been withdrawn to hide
        it: when a record is taken down, its page says so rather than disappearing.
      </p>
      <p>
        If you were looking for a compound, it may be in scope without having a published record
        yet — the{' '}
        <Link href="/peptides" className="underline decoration-rule underline-offset-2">
          compound register
        </Link>{' '}
        lists everything either way, and{' '}
        <Link href="/coverage" className="underline decoration-rule underline-offset-2">
          coverage
        </Link>{' '}
        says what this index does and does not hold.
      </p>
    </FailurePage>
  );
}
