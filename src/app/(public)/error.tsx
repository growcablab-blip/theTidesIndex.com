'use client';

import { useEffect } from 'react';
import { FailurePage } from '@/components/public/failure-page';

/**
 * A public page that failed to render.
 *
 * Every page here reads from the database on each request, so the realistic
 * failure is a database that is briefly unreachable rather than a bug in the
 * page. That makes "try again" a genuinely useful control rather than a
 * decoration, and it is offered first.
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
      headline="This page could not be loaded."
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
      <p>
        The fault is at our end, not with the address you asked for. Nothing you were reading has
        been changed or withdrawn.
      </p>
      <p>
        If it keeps happening, the index is probably having trouble reaching its database. Trying
        again in a minute is usually enough.
      </p>
    </FailurePage>
  );
}
