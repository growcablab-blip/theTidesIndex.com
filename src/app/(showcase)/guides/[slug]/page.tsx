import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guideBySlug, isGuideReady, PROTOCOL_GUIDES } from '@/domain/showcase/protocol-guides';

/**
 * A single protocol guide — the page a practitioner shares.
 *
 * Set in the Protocol Library's light register: warm ivory, the guide's artwork
 * as large as the screen allows, linked to the full-resolution file so it can
 * be zoomed on a phone or saved. A guide without finished artwork has no page.
 */

export function generateStaticParams(): { slug: string }[] {
  return PROTOCOL_GUIDES.filter(isGuideReady).map((g) => ({ slug: g.slug }));
}

/*
 * Unknown slugs are left to render on demand rather than refused with
 * `dynamicParams = false`: that refusal is answered by the root not-found page,
 * which belongs to the research application and links to search. Rendering
 * lets `notFound()` below reach the holding experience's own not-found page.
 */

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (guide === null || !isGuideReady(guide)) return { title: 'Guide not found' };
  return {
    title: guide.title,
    description: guide.description,
    openGraph: { images: [{ url: guide.artwork.src, width: guide.artwork.width, height: guide.artwork.height }] },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = guideBySlug(slug);
  if (guide === null || !isGuideReady(guide)) notFound();

  return (
    <article className="sx-light min-h-screen pb-24 pt-28 sm:pt-32">
      <div className="sx-wrap">
        <Link href="/#protocols" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--tides-mineral)]">
          <span aria-hidden="true">←</span> Protocol library
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
          <div className="sx-enter">
            <a
              href={guide.artwork.src}
              target="_blank"
              rel="noopener"
              className="sx-poster block"
              aria-label={`Open ${guide.title} at full resolution`}
            >
              <Image
                src={guide.artwork.src}
                width={guide.artwork.width}
                height={guide.artwork.height}
                alt={guide.artwork.alt}
                priority
                sizes="(min-width: 1024px) 64vw, 100vw"
                className="h-auto w-full"
              />
            </a>
            <p className="mt-3 text-sm text-[var(--tides-soft)]">Tap the guide to open it at full resolution.</p>
          </div>

          <aside className="sx-enter lg:sticky lg:top-28 lg:self-start" style={{ '--delay': '0.15s' } as React.CSSProperties}>
            <p className="sx-kicker">{guide.focus}</p>
            <h1 className="mt-5 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em] text-[var(--tides-deep)]">
              {guide.title}
            </h1>
            <span className="sx-gold-rule mt-6" aria-hidden="true" />
            <p className="mt-6 text-[1.05rem] leading-relaxed text-[var(--tides-graphite)]">{guide.description}</p>

            <ul className="mt-8 flex flex-wrap gap-2.5" aria-label="Compounds in this guide">
              {guide.compounds.map((c) => (
                <li key={c} className="sx-chip-light">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--tides-mineral)]" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>

            <p className="mt-10 border-t border-[var(--tides-rule)] pt-6 text-sm leading-relaxed text-[var(--tides-soft)]">
              This guide summarises what published sources and practitioners report, for research and education. It is
              not medical advice.
            </p>

            <Link href="/" className="sx-btn sx-btn-deep mt-8">
              Explore The Tides Index
            </Link>
          </aside>
        </div>
      </div>
    </article>
  );
}
