import { MolecularField } from './molecular-field';
import { ResearchFigure } from './research-figure';

/**
 * The opening: a visual moment first, a sentence second.
 *
 * Layers, back to front: measurement grid and auras, the molecular field
 * (canvas), the research figure (SVG), a legibility scrim, then the headline
 * and the floating readouts. The figure and the readouts sit on parallax
 * layers of different depth, so the scene has volume under the pointer.
 */

const HUD = [
  { label: 'Neural', detail: 'Signaling field', className: 'right-[31%] top-[16%] xl:right-[33%]', depth: '14px' },
  { label: 'Vascular', detail: 'Circulation map', className: 'right-[4%] top-[42%] xl:right-[7%]', depth: '22px' },
  { label: 'Cellular', detail: 'Tissue lattice', className: 'right-[37%] top-[60%] xl:right-[39%]', depth: '10px' },
] as const;

export function Hero() {
  return (
    <section className="sx-hero" aria-labelledby="hero-title">
      <div className="sx-grid-bg" aria-hidden="true" />
      <div
        className="sx-aura"
        aria-hidden="true"
        style={{ width: '46rem', height: '46rem', right: '-10rem', top: '-8rem', background: 'radial-gradient(circle, rgb(34 211 238 / 0.35), transparent 65%)' }}
      />
      <div
        className="sx-aura"
        aria-hidden="true"
        style={{ width: '40rem', height: '40rem', right: '14rem', bottom: '-18rem', background: 'radial-gradient(circle, rgb(99 102 241 / 0.4), transparent 65%)' }}
      />

      <MolecularField className="sx-hero-canvas" />

      <div className="sx-figure-wrap">
        <div className="sx-parallax h-full w-full" style={{ '--depth': '-12px' } as React.CSSProperties}>
          <ResearchFigure className="h-full w-full" />
        </div>
      </div>

      <div className="sx-hero-scrim" aria-hidden="true" />

      {HUD.map((h, i) => (
        <div key={h.label} className={`sx-hud ${h.className}`} aria-hidden="true">
          <div className="sx-parallax sx-enter" style={{ '--depth': h.depth, '--delay': `${String(1.1 + i * 0.25)}s` } as React.CSSProperties}>
            <p>
              <span className="sx-hud-dot" style={{ animationDelay: `${String(i * 0.6)}s` }} />
              {h.label}
            </p>
            <p className="mt-1.5 text-[var(--sx-faint)]">
              {h.detail} · <span data-scan>00</span>
            </p>
          </div>
        </div>
      ))}

      <div className="sx-wrap relative z-[4] pb-24 pt-32 sm:pt-36">
        <div className="max-w-[54rem]">
          <p className="sx-eyebrow sx-enter flex items-center gap-3" style={{ '--delay': '0.15s' } as React.CSSProperties}>
            <span className="inline-block h-px w-10 bg-[var(--sx-cyan)]" aria-hidden="true" />
            Independent peptide science
          </p>

          <h1 id="hero-title" className="sx-display mt-7">
            <span className="sx-enter block" style={{ '--delay': '0.3s' } as React.CSSProperties}>
              Peptide research,
            </span>
            <span className="sx-enter sx-glow-text block pb-2" style={{ '--delay': '0.45s' } as React.CSSProperties}>
              made understandable.
            </span>
          </h1>

          <p className="sx-lede sx-enter mt-7 max-w-[36ch]" style={{ '--delay': '0.65s' } as React.CSSProperties}>
            Explore the science. Compare reported protocols. Understand what we know
            <span className="text-[var(--sx-text)]"> — and what we don&rsquo;t.</span>
          </p>

          <div className="sx-enter mt-10 flex flex-col gap-3 sm:flex-row sm:gap-4" style={{ '--delay': '0.85s' } as React.CSSProperties}>
            <a href="#protocols" className="sx-btn sx-btn-primary">
              Explore protocols <span className="sx-arrow" aria-hidden="true">→</span>
            </a>
            <a href="#building" className="sx-btn sx-btn-ghost">
              Discover Tides
            </a>
          </div>
        </div>
      </div>

      <div className="sx-scroll-cue" aria-hidden="true" />
    </section>
  );
}
