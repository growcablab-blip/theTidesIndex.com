import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from 'drizzle-orm';
import { previewEnabled } from '@/server/public/preview';
import { getStaffDb } from '@/server/db/client';
import { buildReviewBundle } from '@/server/editorial/review-bundle';
import { ReviewBundleDocument } from '@/components/admin/review-bundle-document';

/**
 * The external review bundle, in the development harness.
 *
 * Closed by the same two independent conditions as everything else under
 * `/dev`: not a production build, and preview explicitly enabled. 404s when
 * either fails.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review bundle (development harness)',
  robots: { index: false, follow: false },
};

export default async function ReviewBundleHarness({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!previewEnabled()) notFound();

  const { slug } = await params;
  const db = getStaffDb();

  const result = await db.execute(sql`select id from quality_topics where slug = ${slug}`);
  const rows = Array.isArray(result) ? result : (result as { rows: unknown[] }).rows;
  const topic = rows[0] as { id: string } | undefined;
  if (topic === undefined) notFound();

  const bundle = await buildReviewBundle(db, topic.id);
  if (bundle === null) notFound();

  return (
    <div className="min-h-screen bg-mist py-8 print:bg-white print:py-0">
      <div
        data-screen-only
        className="mx-auto mb-6 max-w-[46rem] rounded-md border-2 border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4 print:hidden"
      >
        <p className="text-sm font-semibold tracking-wide text-[var(--color-caution)] uppercase">
          Development harness — not the editorial interface
        </p>
        <p className="mt-1.5 text-sm text-ink-soft">
          The external review bundle: cover, guide, packet and response form. Read-only, and
          addressed to nobody until a reviewer is selected.
        </p>
      </div>
      <ReviewBundleDocument bundle={bundle} />
    </div>
  );
}
