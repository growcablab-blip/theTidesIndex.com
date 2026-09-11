import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { getFormVocabularies } from '@/server/editorial/queries';
import { PageHeader } from '@/components/admin/primitives';
import { NewSourceForm } from './new-source-form';

export const metadata: Metadata = { title: 'Register a source' };

export default async function NewSourcePage() {
  const session = await requireStaff();
  const { sourceTypes } = await getFormVocabularies(session);

  return (
    <>
      <PageHeader
        title="Register a source"
        description="Record what the source is before recording anything it says. Source type is a statement about the kind of document, not about how much weight it carries — that is decided per claim, by evidence type."
      />
      <div className="max-w-2xl">
        <NewSourceForm sourceTypes={sourceTypes} />
      </div>
    </>
  );
}
