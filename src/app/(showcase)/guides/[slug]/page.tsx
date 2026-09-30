import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { guideBySlug, isGuideReady, PROTOCOL_GUIDES } from '@/domain/showcase/protocol-guides';

/**
 * A single protocol guide — the page a practitioner shares.
 *
 * The owner's artwork is the whole content: shown as large as the screen
 * allows, and linked to the full-resolution file so it can be zoomed on a
 * phone or saved. A guide without finished artwork does not have a page.
 */

export function generateStaticParams(): { slug: string }[] {
  return PROTOCOL_GUIDES.filter(isGuideReady).map((g) => ({ slug: g.slug }));
}

export const dynamicParams = false;

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
    <article className="relative pb-24 pt-28 sm:pt-32">
      <div className="sx-grid-bg" aria-hidden="true" />
      <div className="sx-wrap relative">
        <Link href="/#protocols" className="sx-navlink inline-flex items-center gap-2">
          <span aria-hidden="true">←</span> Protocol library
        </Link>

        <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
          <div className="sx-enter">
            <a
              href={guide.artwork.src}
              target="_blank"
              rel="noopener"
              className="sx-artwork-frame group block"
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
            <p className="sx-mono mt-3 text-[0.65rem] tracking-[0.2em] text-[var(--sx-faint)]">
              TAP THE GUIDE TO OPEN IT AT FULL RESOLUTION
            </p>
          </div>

          <aside className="sx-enter lg:sticky lg:top-28 lg:self-start" style={{ '--delay': '0.15s' } as React.CSSProperties}>
            <p className="sx-eyebrow">{guide.focus}</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
              {guide.title}
            </h1>
            <p className="sx-lede mt-5 !text-[1.05rem]">{guide.description}</p>

            <p className="sx-eyebrow mt-8 !text-[var(--sx-faint)]">Compounds in this guide</p>
            <ul className="mt-4 flex flex-wrap gap-2.5">
              {guide.compounds.map((c) => (
                <li key={c} className="sx-chip">{c}</li>
              ))}
            </ul>

            <div className="sx-card mt-10 px-5 py-5">
              <p className="sx-mono text-[0.62rem] tracking-[0.22em] text-[var(--sx-cyan-soft)]">RESEARCH CONTEXT</p>
              <p className="mt-3 text-sm leading-relaxed text-[var(--sx-soft)]">
                This guide summarises what published sources and practitioners report, for research and
                education. It is not medical advice. Speak with a qualified clinician about any treatment
                decision.
              </p>
            </div>

            <Link href="/" className="sx-btn sx-btn-ghost mt-8">
              Explore The Tides Index
            </Link>
          </aside>
        </div>
      </div>
    </article>
  );
}
