import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { sql } from 'drizzle-orm';
import { previewEnabled } from '@/server/public/preview';
import { getStaffDb } from '@/server/db/client';
import { buildPacketExport } from '@/server/editorial/packet-export';
import { PacketExportDocument } from '@/components/admin/packet-export-document';

/**
 * The export document, in the development harness.
 *
 * Same reason as the harness itself: the admin surface needs Supabase auth,
 * which is not provisioned, so without this the one document that is meant to
 * leave the building would ship having never been looked at. Closed by the same
 * two independent conditions — not a production build, and preview explicitly
 * enabled — and 404s when either fails.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review packet document (development harness)',
  robots: { index: false, follow: false },
};

export default async function PacketExportHarness({
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

  const doc = await buildPacketExport(db, topic.id);
  if (doc === null) notFound();

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
          The exportable review document, rendered outside the authenticated editorial surface so
          its print layout can be examined before Supabase exists. Read-only.
        </p>
      </div>
      <PacketExportDocument doc={doc} />
    </div>
  );
}
