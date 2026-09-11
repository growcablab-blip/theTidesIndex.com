import Link from 'next/link';
import type { Metadata } from 'next';
import { listPeptides, listRegisteredPeptides } from '@/server/public/queries';
import { Container, EmptyState, EvidenceClassTag } from '@/components/public/primitives';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Compounds',
  description:
    'Every compound with a reviewed record in The Tides Index, with the kind of evidence recorded for each.',
};

/**
 * The compound index.
 *
 * Each row states what kind of evidence stands behind that compound before a
 * reader opens it. Sorting alphabetically rather than by "strength" is
 * deliberate: any ranking would be a judgement the underlying records do not
 * support, and readers arrive looking for a specific compound anyway.
 */
export default async function PeptidesIndexPage() {
  const [peptides, registered] = await Promise.all([listPeptides(), listRegisteredPeptides()]);
  const inPreparation = registered.filter((r) => !r.hasPublishedRecord);

  return (
    <Container className="py-10 sm:py-14">
      <header className="max-w-[60ch]">
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Compounds</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Every compound with a reviewed record. Each shows the kind of evidence recorded for it, so
          you can see before opening a page whether anything here rests on human studies.
        </p>
      </header>

      <div className="mt-10">
        {peptides.length === 0 ? (
          <EmptyState
            headline="No compound records have been published yet."
            detail="A compound record is published only once it has a plain-language summary, a statement of what is not established about it, and both scientific and compliance review. Every compound in scope is listed below."
          >
            <p>
              The register of sources being worked through is{' '}
              <Link href="/sources" className="underline decoration-rule underline-offset-2">
                published in full
              </Link>
              , including which copies are unusable.
            </p>
          </EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {peptides.map((peptide) => (
              <li key={peptide.id}>
                <Link
                  href={`/peptides/${peptide.slug}`}
                  className="group flex h-full flex-col rounded-md border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal"
                >
                  <p className="font-serif text-lg text-ink group-hover:text-deep-tide">
                    {peptide.canonicalName}
                  </p>

                  {peptide.aliases.length > 0 ? (
                    <p className="mt-0.5 text-xs text-slate">{peptide.aliases.join(' · ')}</p>
                  ) : null}

                  <p className="mt-2 flex-1 text-sm text-ink-soft">
                    {peptide.shortDescription ?? (
                      <span className="text-slate italic">
                        Orientation line not yet written.
                      </span>
                    )}
                  </p>

                  <div className="mt-3.5 flex flex-wrap items-center gap-1.5 border-t border-rule-soft pt-3">
                    {peptide.humanEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="human"
                        label={`Human ${String(peptide.humanEvidenceCount)}`}
                      />
                    ) : null}
                    {peptide.preclinicalEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="preclinical"
                        label={`Preclinical ${String(peptide.preclinicalEvidenceCount)}`}
                      />
                    ) : null}
                    {peptide.referenceEvidenceCount > 0 ? (
                      <EvidenceClassTag
                        evidenceClass="reference_opinion"
                        label={`Reference ${String(peptide.referenceEvidenceCount)}`}
                      />
                    ) : null}
                    {peptide.humanEvidenceCount === 0 &&
                    peptide.preclinicalEvidenceCount === 0 &&
                    peptide.referenceEvidenceCount === 0 ? (
                      <span className="text-xs text-slate">No evidence records yet</span>
                    ) : null}
                    {!peptide.isPeptide ? (
                      <span className="rounded-sm border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-1.5 py-0.5 text-2xs text-[var(--color-caution)]">
                        not a peptide
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {inPreparation.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-serif text-2xl text-ink">In scope, record in preparation</h2>
          <p className="mt-1.5 max-w-[62ch] text-sm text-slate">
            These compounds are being worked on. Nothing about them is published until their
            statements have been traced to a source and reviewed, so their pages say only that —
            which is different from the compound being out of scope.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inPreparation.map((peptide) => (
              <li key={peptide.id}>
                <Link
                  href={`/peptides/${peptide.slug}`}
                  className="group flex h-full flex-col rounded-md border border-dashed border-rule bg-mist/50 px-4 py-3 transition-colors hover:border-tide-teal"
                >
                  <p className="font-serif text-base text-ink-soft group-hover:text-deep-tide">
                    {peptide.canonicalName}
                  </p>
                  <p className="mt-1 text-xs text-slate">
                    {peptide.draftClaimCount > 0 || peptide.draftProtocolCount > 0
                      ? 'Extraction under way'
                      : 'Extraction not started'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Container>
  );
}
