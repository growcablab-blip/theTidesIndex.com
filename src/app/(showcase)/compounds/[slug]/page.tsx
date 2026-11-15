import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getPeptidePage } from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import { isExposedCompound } from '@/server/public/guide-research';
import { PROTOCOL_GUIDES, guideHref, isGuideReady } from '@/domain/showcase/protocol-guides';
import { CompoundProfile } from '@/components/showcase/research/compound-profile';

/**
 * A compound's research profile on the public surface.
 *
 * Two gates stand in front of this page and both must pass. `isExposedCompound`
 * is the editorial one: the library is migrated a reviewed compound at a time,
 * not by the existence of a route. `getPeptidePage` is the database's: it reads
 * only `public_v_*`, so an unpublished compound cannot be rendered here however
 * the URL is typed.
 */

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isExposedCompound(slug)) return { title: 'Not in the index' };
  const mode = await getReadingMode();
  const peptide = await getPeptidePage(slug, mode);
  if (peptide === null) return { title: 'Not in the index' };
  return {
    title: `${peptide.canonicalName} — research profile`,
    description:
      peptide.shortDescription ??
      `Published research, sources and reported protocols for ${peptide.canonicalName}.`,
  };
}

export default async function CompoundRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isExposedCompound(slug)) notFound();

  const mode = await getReadingMode();
  const peptide = await getPeptidePage(slug, mode);
  if (peptide === null) notFound();

  // The guide a reader most likely arrived from: the first finished guide that
  // names this compound. Derived, so it cannot name a guide that was unpublished.
  const guide =
    PROTOCOL_GUIDES.filter(isGuideReady).find((g) => g.compoundSlugs.includes(slug)) ?? null;

  return (
    <CompoundProfile
      peptide={peptide}
      mode={mode}
      backTo={guide === null ? null : { href: guideHref(guide), label: `Back to ${guide.title}` }}
    />
  );
}
