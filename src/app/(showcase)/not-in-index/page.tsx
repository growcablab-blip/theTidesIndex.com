import { notFound } from 'next/navigation';

/**
 * Where the public deployment sends every path it does not serve.
 *
 * The proxy rewrites refused paths here, and this route always answers with
 * the holding experience's not-found page and a 404 status. It exists because
 * a rewrite needs a real, dynamically rendered route to land on: a path with
 * no route, or an unknown slug on a statically generated route, leaves the
 * standalone server with no fallback and the request hangs.
 */
export const dynamic = 'force-dynamic';

export default function NotInIndex(): never {
  notFound();
}
