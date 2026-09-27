'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { FailurePage } from '@/components/public/failure-page';

/**
 * A public page that failed to render.
 *
 * This boundary knows that rendering failed and nothing else. It does not know
 * why, and it must not guess: an earlier version told the reader that nothing
 * they were reading had been changed or withdrawn, and that the cause was
 * probably a database the index could not reach. Neither is knowable here. The
 * first would be a false reassurance if a record really had just been
 * withdrawn, and the second sent a reader away to wait for a fault that might
 * be permanent — which is what happened in production, where every
 * database-backed page failed for a reason no amount of waiting would fix.
 *
 * So it says what it knows, offers the two things that might actually help, and
 * stops. "Try again" stays because a retry is cheap and a transient failure is
 * one real possibility among several.
 *
 * What is deliberately absent: the error message, the digest, and any stack.
 * A reader cannot act on them, and an error string from a database can carry
 * table names, connection details or fragments of a query. The digest is logged
 * server-side, which is where it is useful.
 */
export default function PublicError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  useEffect(() => {
    // Recorded once, where an operator can correlate it with the server log.
    console.error('Public page failed to render', error.digest ?? error.message);
  }, [error]);

  return (
    <FailurePage
      label="Something went wrong"
      headline="We couldn&rsquo;t load this page."
      action={
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-deep-tide px-6 py-3 font-medium text-warm-white transition-colors hover:bg-ink"
        >
          Try again
        </button>
      }
    >
      <p>The fault is at our end, not with the address you asked for.</p>
      <p>
        Try again, or return to another section of The Tides Index. If it keeps happening, the{' '}
        <Link href="/corrections" className="underline decoration-rule underline-offset-2">
          corrections page
        </Link>{' '}
        explains how to tell us.
      </p>
    </FailurePage>
  );
}
