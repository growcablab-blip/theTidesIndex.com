import Image from 'next/image';
import Link from 'next/link';
import {
  guideHref,
  isGuideReady,
  PROTOCOL_GUIDES,
  UPCOMING_GUIDE_SLOTS,
  type ProtocolGuide,
} from '@/domain/showcase/protocol-guides';

/**
 * The Tides Protocol Library.
 *
 * The first registered guide is featured large, artwork first; the rest and
 * the upcoming slots follow as a rail that swipes on a phone and becomes a grid
 * on wider screens. The artwork is the product — every layout decision here is
 * about keeping it big and easy to inspect.
 *
 * Nothing on this surface restates a guide's content. Title, focus, compounds
 * and one sentence come from the register; the rest is the owner's artwork.
 */

const ACCENTS: Record<ProtocolGuide['accent'], string> = {
  cyan: '34 211 238',
  blue: '59 130 246',
  indigo: '99 102 241',
  violet: '139 124 246',
};

export function ProtocolGallery() {
  const [featured, ...rest] = PROTOCOL_GUIDES;

  return (
    <section id="protocols" className="sx-section" aria-labelledby="protocols-title">
      <div
        className="sx-aura"
        aria-hidden="true"
        style={{ width: '50rem', height: '36rem', left: '-18rem', top: '12rem', background: 'radial-gradient(circle, rgb(34 211 238 / 0.18), transparent 65%)' }}
      />
      <div className="sx-wrap relative">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:items-end" data-reveal>
          <div>
            <p className="sx-eyebrow">The Tides Protocol Library</p>
            <h2 id="protocols-title" className="sx-h2 mt-5 max-w-[16ch]">
              Protocol guides you can <span className="sx-glow-text">use today.</span>
            </h2>
          </div>
          <p className="sx-lede !text-base lg:pb-2">
            Visual research protocols, designed to be read at a glance, saved, and shared — each one showing the
            compounds involved and the research context around them.
          </p>
        </div>

        {featured !== undefined ? <FeaturedGuide guide={featured} /> : null}

        <div className="mt-6 sm:mt-8">
          <div className="sx-rail" role="list" aria-label="More protocol guides">
            {rest.map((guide, i) => (
              <div role="listitem" key={guide.slug} data-reveal style={{ '--delay': `${String(i * 0.1)}s` } as React.CSSProperties}>
                <GuideCard guide={guide} />
              </div>
            ))}
            {Array.from({ length: UPCOMING_GUIDE_SLOTS }, (_, i) => (
              <div
                role="listitem"
                key={`upcoming-${String(i)}`}
                data-reveal
                style={{ '--delay': `${String((rest.length + i) * 0.1)}s` } as React.CSSProperties}
              >
                <UpcomingCard index={rest.length + i + 2} />
              </div>
            ))}
          </div>
        </div>

        <p className="mt-10 max-w-[70ch] text-xs leading-relaxed text-[var(--sx-faint)]" data-reveal>
          Protocol guides summarise what published sources and practitioners report, for research and education.
          They are not medical advice.
        </p>
      </div>
    </section>
  );
}

function FeaturedGuide({ guide }: { guide: ProtocolGuide }) {
  const ready = isGuideReady(guide);
  const rgb = ACCENTS[guide.accent];

  return (
    <article
      className="sx-card mt-12 grid gap-0 sm:mt-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
      data-reveal="scale"
      aria-labelledby={`guide-${guide.slug}`}
    >
      <div className="relative p-3 sm:p-5 lg:p-6">
        {ready ? (
          <Link href={guideHref(guide)} className="sx-artwork-frame group block" aria-label={`Open ${guide.title}`}>
            <Image
              src={guide.artwork.src}
              width={guide.artwork.width}
              height={guide.artwork.height}
              alt={guide.artwork.alt}
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="h-auto w-full transition-transform duration-[1.2s] group-hover:scale-[1.015]"
            />
          </Link>
        ) : (
          <ArtworkPlaceholder guide={guide} tall />
        )}
      </div>

      <div className="relative flex flex-col justify-between gap-10 px-6 pb-8 pt-4 sm:px-9 sm:pb-10 lg:py-12 lg:pl-4 lg:pr-12">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="sx-mono rounded-full px-3 py-1 text-[0.65rem] tracking-[0.2em]" style={{ color: `rgb(${rgb})`, background: `rgb(${rgb} / 0.1)`, border: `1px solid rgb(${rgb} / 0.3)` }}>
              FEATURED GUIDE
            </span>
            <span className="sx-mono text-[0.68rem] tracking-[0.18em] text-[var(--sx-faint)]">
              {guide.focus.toUpperCase()}
            </span>
          </div>
          <h3 id={`guide-${guide.slug}`} className="mt-6 text-[clamp(1.9rem,3.6vw,3rem)] font-semibold leading-[1.04] tracking-[-0.03em]">
            {guide.title}
          </h3>
          <p className="sx-lede mt-5 !text-[1.05rem]">{guide.description}</p>

          <p className="sx-eyebrow mt-9 !text-[var(--sx-faint)]">Compounds in this guide</p>
          <ol className="mt-4 border-t border-[var(--sx-line)]">
            {guide.compounds.map((c, i) => (
              <li key={c} className="flex items-center gap-5 border-b border-[var(--sx-line)] py-3.5">
                <span className="sx-mono w-6 text-[0.65rem] tracking-[0.2em] text-[var(--sx-faint)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="flex-1 text-[1.35rem] font-medium tracking-[-0.02em] text-[var(--sx-text)]">{c}</span>
                <span
                  className="sx-fig-node h-2 w-2 rounded-full"
                  style={{ background: `rgb(${rgb})`, boxShadow: `0 0 10px rgb(${rgb})`, animationDelay: `${String(i * 0.5)}s` }}
                  aria-hidden="true"
                />
              </li>
            ))}
          </ol>
        </div>

        {ready ? (
          <Link href={guideHref(guide)} className="sx-btn sx-btn-primary self-start">
            Explore guide <span className="sx-arrow" aria-hidden="true">→</span>
          </Link>
        ) : (
          <p className="sx-mono flex items-center gap-3 text-[0.72rem] tracking-[0.18em] text-[var(--sx-soft)]">
            <span className="sx-hud-dot !mr-0" aria-hidden="true" />
            FINAL ARTWORK IN PRODUCTION
          </p>
        )}
      </div>
    </article>
  );
}

function GuideCard({ guide }: { guide: ProtocolGuide }) {
  const ready = isGuideReady(guide);
  const body = (
    <>
      <div className="p-2.5">
        {ready ? (
          <div className="sx-artwork-frame aspect-[4/5]">
            <Image src={guide.artwork.src} alt={guide.artwork.alt} fill sizes="(min-width: 768px) 30vw, 80vw" className="object-cover object-top" />
          </div>
        ) : (
          <ArtworkPlaceholder guide={guide} />
        )}
      </div>
      <div className="px-5 pb-6 pt-3">
        <p className="sx-mono text-[0.65rem] tracking-[0.18em] text-[var(--sx-faint)]">{guide.focus.toUpperCase()}</p>
        <h3 className="sx-h3 mt-2">{guide.title}</h3>
        <p className="mt-2 text-sm text-[var(--sx-soft)]">{guide.compounds.join(' · ')}</p>
      </div>
    </>
  );
  return ready ? (
    <Link href={guideHref(guide)} className="sx-card sx-lift block h-full">
      {body}
    </Link>
  ) : (
    <div className="sx-card h-full">{body}</div>
  );
}

const UPCOMING_HUES = ['#6366f1', '#8b7cf6', '#3b82f6'] as const;

function UpcomingCard({ index }: { index: number }) {
  const hue = UPCOMING_HUES[index % UPCOMING_HUES.length] ?? '#6366f1';
  return (
    <div className="sx-card flex h-full flex-col">
      <div className="p-2.5">
        <div className="sx-artwork-frame relative aspect-[5/4] !shadow-none">
          <svg viewBox="0 25 200 200" className="absolute inset-0 h-full w-full" aria-hidden="true">
            <g fill="none" stroke="#a5f3fc" strokeOpacity="0.14">
              <rect x="22" y="26" width="156" height="198" rx="10" />
              <line x1="40" y1="54" x2="120" y2="54" strokeOpacity="0.3" strokeWidth="5" strokeLinecap="round" />
              <line x1="40" y1="70" x2="96" y2="70" strokeWidth="3" strokeLinecap="round" />
            </g>
            <g className="sx-spin-slow">
              <circle cx="100" cy="148" r="46" fill="none" stroke={hue} strokeOpacity="0.35" strokeDasharray="2 6" />
              <circle cx="100" cy="102" r="4" fill="#22d3ee" fillOpacity="0.6" />
              <circle cx="146" cy="148" r="3" fill="#8b7cf6" fillOpacity="0.6" />
              <circle cx="60" cy="176" r="3" fill="#6366f1" fillOpacity="0.6" />
            </g>
            <circle cx="100" cy="148" r="18" fill={hue} fillOpacity="0.14" className="sx-fig-pulse" />
          </svg>
          <span className="sx-mono absolute bottom-4 left-4 text-[0.62rem] tracking-[0.2em] text-[var(--sx-faint)]">
            GUIDE {String(index).padStart(2, '0')}
          </span>
        </div>
      </div>
      <div className="px-5 pb-6 pt-3">
        <p className="sx-mono text-[0.65rem] tracking-[0.18em] text-[var(--sx-cyan-soft)]">ENTERING THE LIBRARY</p>
        <p className="sx-h3 mt-2 text-[var(--sx-soft)]">Next protocol guide</p>
        <p className="mt-2 text-sm text-[var(--sx-faint)]">New guides are added as their artwork is finished.</p>
      </div>
    </div>
  );
}

/**
 * Shown where a guide's artwork will go until the owner supplies it. It draws
 * the guide's compounds as beads on a chain — the register's data, nothing
 * more — so the slot looks intentional without pretending to be the guide.
 */
function ArtworkPlaceholder({ guide, tall = false }: { guide: ProtocolGuide; tall?: boolean }) {
  const rgb = ACCENTS[guide.accent];
  const n = guide.compounds.length;
  return (
    <div className={`sx-artwork-frame relative ${tall ? 'aspect-[4/5] sm:aspect-[5/5] lg:aspect-[4/5]' : 'aspect-[4/5]'}`}>
      <div className="sx-grid-bg !opacity-70" aria-hidden="true" />
      <svg viewBox="0 0 400 500" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <defs>
          <radialGradient id={`ph-${guide.slug}`} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity="0.5" />
            <stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="200" cy="250" r="170" fill={`url(#ph-${guide.slug})`} opacity="0.35" className="sx-fig-breathe" />
        <g className="sx-spin-slow">
          <circle cx="200" cy="250" r="150" fill="none" stroke={`rgb(${rgb})`} strokeOpacity="0.25" strokeDasharray="2 8" />
        </g>
        <circle cx="200" cy="250" r="110" fill="none" stroke="#a5f3fc" strokeOpacity="0.1" />
        {guide.compounds.map((c, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          const x = 200 + Math.cos(a) * 110;
          const y = 250 + Math.sin(a) * 110;
          return (
            <g key={c}>
              <line x1="200" y1="250" x2={x} y2={y} stroke={`rgb(${rgb})`} strokeOpacity="0.35" />
              <circle cx={x} cy={y} r="22" fill="#061a26" stroke={`rgb(${rgb})`} strokeOpacity="0.8" />
              <circle cx={x} cy={y} r="5" fill={`rgb(${rgb})`} className="sx-fig-node" style={{ animationDelay: `${String(i * 0.5)}s` }} />
              <text
                x={x}
                y={y + (Math.sin(a) > 0.3 ? 44 : -34)}
                textAnchor="middle"
                fill="#eaf4f7"
                fontSize="14"
                fontFamily="var(--font-sx-mono), monospace"
                letterSpacing="1.5"
              >
                {c}
              </text>
            </g>
          );
        })}
        <circle cx="200" cy="250" r="30" fill="#061a26" stroke="#a5f3fc" strokeOpacity="0.6" />
        <circle cx="200" cy="250" r="8" fill="#ecfeff" className="sx-fig-pulse" />
      </svg>
      <p className="sx-mono absolute inset-x-0 bottom-5 text-center text-[0.62rem] tracking-[0.24em] text-[var(--sx-faint)]">
        GUIDE ARTWORK · IN PRODUCTION
      </p>
    </div>
  );
}
