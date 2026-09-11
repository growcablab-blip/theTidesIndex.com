import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getFormVocabularies, listPeptideOptions } from '@/server/editorial/queries';
import { PageHeader } from '@/components/admin/primitives';
import { ProtocolForm } from '../protocol-form';

export const metadata: Metadata = { title: 'New protocol' };

export default async function NewProtocolPage({
  searchParams,
}: {
  searchParams: Promise<{ peptideId?: string }>;
}) {
  const { peptideId } = await searchParams;
  const session = await requireStaff();
  const [vocabularies, peptides] = await Promise.all([
    getFormVocabularies(session),
    listPeptideOptions(session),
  ]);

  return (
    <>
      <PageHeader
        title="New protocol"
        description="One record for one source's regimen, exactly as that source reported it. If a second source describes something different, it becomes a second record — regimens are never merged, averaged or reconciled."
      />
      <div className="max-w-2xl">
        <ProtocolForm
          mode="create"
          peptides={peptides}
          evidenceTypes={vocabularies.evidenceTypes}
          routes={vocabularies.routes}
          defaultPeptideId={peptideId ?? null}
        />
      </div>
    </>
  );
}
