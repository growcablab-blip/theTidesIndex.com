import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getPeptideDetail } from '@/server/editorial/queries';
import { PageHeader } from '@/components/admin/primitives';
import { NewClaimForm } from './new-claim-form';

export const metadata: Metadata = { title: 'New claim' };

export default async function NewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ peptideId?: string }>;
}) {
  const { peptideId } = await searchParams;
  const session = await requireStaff();

  const peptide = peptideId ? await getPeptideDetail(session, peptideId) : null;
  if (peptideId && !peptide) notFound();

  return (
    <>
      <PageHeader
        title="New claim"
        description={
          peptide
            ? `A discrete proposition about ${peptide.canonicalName}. Evidence is attached after the claim exists.`
            : 'A discrete proposition. Evidence is attached after the claim exists.'
        }
      />
      <div className="max-w-2xl">
        <NewClaimForm peptideId={peptide?.id ?? null} />
      </div>
    </>
  );
}
