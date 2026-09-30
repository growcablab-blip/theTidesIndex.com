import type { Metadata } from 'next';
import { getShowcaseTelemetry } from '@/server/public/showcase';
import { Hero } from '@/components/showcase/hero';
import { Telemetry } from '@/components/showcase/telemetry';
import { ProtocolGallery } from '@/components/showcase/protocol-gallery';
import { Building, Expansion, PlatformPreview, QualityPreview } from '@/components/showcase/platform';

/**
 * Home — the public holding experience.
 *
 *   1  hero                  a visual moment, then one promise
 *   2  telemetry             live counts from the published record
 *   3  protocol library      the guides that are useful today
 *   4  what Tides builds     the connected map, in one sentence
 *   5  platform preview      glimpses of the research engine
 *   6  quality               the material behind the science
 *   7  expanding             what arrives next
 *
 * The research application's entry page moved to /reference.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'The Tides Index — Peptide research, made understandable' },
  description:
    'Explore the science. Compare reported protocols. Understand what we know — and what we don’t. Independent, source-linked peptide research.',
};

export default async function HomePage() {
  const telemetry = await getShowcaseTelemetry();

  return (
    <>
      <Hero />
      <Telemetry data={telemetry} />
      <ProtocolGallery />
      <div className="sx-divider" aria-hidden="true" />
      <Building />
      <PlatformPreview />
      <div className="sx-divider" aria-hidden="true" />
      <QualityPreview />
      <Expansion />
    </>
  );
}
