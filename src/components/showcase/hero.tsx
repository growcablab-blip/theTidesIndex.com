import { getImageProps } from 'next/image';
import { HeroStage } from './hero/hero-stage';

/**
 * The opening: a human research system, entered through a peptide.
 *
 * The hero is a pinned stage inside a taller track (about 1.9 screens), so a
 * short scroll plays the sequence — peptide, receptors, signal, the body
 * responding — and then the page moves on to what is useful.
 *
 * Layers, back to front: the still (a frame rendered from the same 3D scene,
 * and the whole visual for reduced motion or no WebGL), the live WebGL canvas,
 * a legibility scrim, the copy, and the phase indicator. The copy is ordinary
 * DOM throughout and never part of a rendered frame.
 */

const PHASES = [
  { key: 'peptide', label: 'Peptide structure' },
  { key: 'receptor', label: 'Receptor signaling' },
  { key: 'system', label: 'System response' },
] as const;

function HeroStill() {
  const common = { alt: '', sizes: '100vw', quality: 75 } as const;
  const {
    props: { srcSet: desktop },
  } = getImageProps({ ...common, src: '/hero/still-desktop.jpg', width: 2400, height: 1350 });
  const {
    props: { srcSet: mobile, ...rest },
  } = getImageProps({ ...common, src: '/hero/still-mobile.jpg', width: 1170, height: 2532 });
  return (
    <picture className="sx-hero-still">
      <source media="(min-width: 820px)" srcSet={desktop} />
      <source media="(max-width: 819px)" srcSet={mobile} />
      {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative; alt="" comes from getImageProps */}
      <img {...rest} fetchPriority="high" />
    </picture>
  );
}

export function Hero() {
  return (
    <section id="hero" className="sx-hero-track" aria-labelledby="hero-title" data-phase="peptide">
      <div className="sx-hero-stage">
        <HeroStill />
        <HeroStage trackId="hero" />
        <div className="sx-hero-scrim" aria-hidden="true" />

        <div className="sx-wrap sx-hero-copy relative z-[4]">
          <div className="max-w-[54rem]">
            <p className="sx-eyebrow sx-enter flex items-center gap-3" style={{ '--delay': '0.15s' } as React.CSSProperties}>
              <span className="inline-block h-px w-10 bg-[var(--sx-cyan)]" aria-hidden="true" />
              Independent peptide science
            </p>

            <h1 id="hero-title" className="sx-display mt-6 sm:mt-7">
              <span className="sx-enter block" style={{ '--delay': '0.3s' } as React.CSSProperties}>
                Peptide research,
              </span>
              <span className="sx-enter sx-glow-text block pb-2" style={{ '--delay': '0.45s' } as React.CSSProperties}>
                made understandable.
              </span>
            </h1>

            <p className="sx-lede sx-enter mt-5 max-w-[36ch] sm:mt-7" style={{ '--delay': '0.65s' } as React.CSSProperties}>
              Explore the science. Compare reported protocols. Understand what we know
              <span className="text-[var(--sx-text)]"> — and what we don&rsquo;t.</span>
            </p>

            <div className="sx-enter mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:gap-4" style={{ '--delay': '0.85s' } as React.CSSProperties}>
              <a href="#protocols" className="sx-btn sx-btn-primary">
                Explore protocols <span className="sx-arrow" aria-hidden="true">→</span>
              </a>
              <a href="#building" className="sx-btn sx-btn-ghost">
                Discover Tides
              </a>
            </div>
          </div>
        </div>

        <ol className="sx-hero-phases sx-enter" aria-hidden="true" style={{ '--delay': '1.2s' } as React.CSSProperties}>
          {PHASES.map((ph, i) => (
            <li key={ph.key} data-step={ph.key}>
              <span className="sx-mono">{String(i + 1).padStart(2, '0')}</span>
              <span>{ph.label}</span>
            </li>
          ))}
          <li className="sx-hero-progress" aria-hidden="true">
            <span />
          </li>
        </ol>

        <div className="sx-scroll-cue" aria-hidden="true" />
      </div>
    </section>
  );
}
