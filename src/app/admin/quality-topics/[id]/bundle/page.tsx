import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getQualityTopicReviewBundle } from '@/server/editorial/queries';
import { ReviewBundleDocument } from '@/components/admin/review-bundle-document';

/**
 * The external review bundle, inside the editorial surface.
 *
 * Staff-only and read-only. Producing a bundle is not an editorial act and
 * writes nothing — in particular it records no "sent for review" state, because
 * sending somebody a document is not the same as their having agreed to review
 * it.
 *
 * `?to=` names the reviewer on the cover. It is a label on a printed page and
 * nothing more: it creates no reviewer record, and it confers no standing.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review bundle',
  robots: { index: false, follow: false },
};

export default async function ReviewBundlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ to?: string }>;
}) {
  const { id } = await params;
  const { to } = await searchParams;
  const session = await requireStaff();

  const bundle = await getQualityTopicReviewBundle(
    session,
    id,
    to === undefined || to.trim() === '' ? {} : { addressedTo: to.trim() },
  );
  if (bundle === null) notFound();

  return (
    <>
      <p className="mb-4 text-sm print:hidden">
        <Link href={`/admin/quality-topics/${id}`} className="text-deep-tide underline">
          Back to the topic
        </Link>
      </p>
      <ReviewBundleDocument bundle={bundle} />
    </>
  );
}
