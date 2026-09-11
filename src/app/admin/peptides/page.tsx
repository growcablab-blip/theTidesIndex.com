import Link from 'next/link';
import type { Metadata } from 'next';
import { requireStaff } from '@/server/auth/session';
import { listPeptides } from '@/server/editorial/queries';
import { Cell, Empty, PageHeader, Row, StatusBadge, Table } from '@/components/admin/primitives';

export const metadata: Metadata = { title: 'Compounds' };

export default async function PeptidesPage() {
  const session = await requireStaff();
  const peptides = await listPeptides(session);

  return (
    <>
      <PageHeader
        title="Compounds"
        description="The first cohort. Records are created empty and stay that way until extraction and review fill them — a sparse page is an honest one."
      />

      {peptides.length === 0 ? (
        <Empty>No compounds seeded.</Empty>
      ) : (
        <Table head={['Compound', 'Status', 'Summaries', 'Aliases', 'Claims', 'Protocols']}>
          {peptides.map((peptide) => (
            <Row key={peptide.id}>
              <Cell>
                <Link href={`/admin/peptides/${peptide.id}`} className="text-deep-tide underline">
                  {peptide.canonicalName}
                </Link>
                <p className="font-mono text-xs text-slate">{peptide.peptideKey}</p>
              </Cell>
              <Cell>
                <StatusBadge status={peptide.editorialState} />
                <p className="mt-1 text-xs text-slate">v{peptide.version}</p>
              </Cell>
              <Cell className="text-sm">
                {peptide.hasSummaries ? (
                  'Written'
                ) : (
                  <span className="text-slate">Not written</span>
                )}
              </Cell>
              <Cell>{peptide.aliasCount}</Cell>
              <Cell>{peptide.claimCount}</Cell>
              <Cell>{peptide.protocolCount}</Cell>
            </Row>
          ))}
        </Table>
      )}
    </>
  );
}
