import type { Metadata } from 'next';
import { getShowcaseTelemetry } from '@/server/public/showcase';
import { Hero } from '@/components/showcase/hero';
import { Telemetry } from '@/components/showcase/telemetry';
import { ProtocolGallery } from '@/components/showcase/protocol-gallery';
import { Building, Expansion, PlatformPreview, QualityPreview } from '@/components/showcase/platform';

/**
 * Home — the public holding experience.
 *
 *   dark      hero                  a person, a peptide, a signal — then one promise
 *   teal      telemetry             live counts, handing over into the light
 *   ivory     protocol library      the guides that are useful today
 *   dark      everything connects   the whole path, in one rendered scene
 *   dark      research platform     the engine taking shape, in large images
 *   light     quality               the material behind the science
 *   dark      expanding · footer    what arrives next; the page comes to rest
 *
 * Dark is exploration; light is clarity and use. Motion falls away down the
 * page, from the live hero to an almost still footer.
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
      <Building />
      <PlatformPreview />
      <QualityPreview />
      <Expansion />
    </>
  );
}
