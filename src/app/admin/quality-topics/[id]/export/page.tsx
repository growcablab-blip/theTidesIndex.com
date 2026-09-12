import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getQualityTopicPacketExport } from '@/server/editorial/queries';
import { PacketExportDocument } from '@/components/admin/packet-export-document';

/**
 * The review packet as a document, inside the editorial surface.
 *
 * Staff-only and read-only. Producing the document is not an editorial act and
 * writes nothing: no "sent to reviewer" state is set here, because sending a
 * document to somebody is not the same as their having agreed to review it, and
 * a status that says otherwise would be the first lie in the chain.
 */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Review packet document',
  robots: { index: false, follow: false },
};

export default async function PacketExportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireStaff();

  const doc = await getQualityTopicPacketExport(session, id);
  if (doc === null) notFound();

  return (
    <>
      <p className="mb-4 text-sm print:hidden">
        <Link href={`/admin/quality-topics/${id}`} className="text-deep-tide underline">
          Back to the topic
        </Link>
      </p>
      <PacketExportDocument doc={doc} />
    </>
  );
}
