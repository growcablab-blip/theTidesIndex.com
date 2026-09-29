import type { ReactNode } from 'react';

/**
 * The research-surface visual system, for the two transformed prototypes.
 *
 * Everything here is drawn, not photographed. A reference that shows a stock
 * image of a scientist has told the reader something false before they read a
 * word; every visual below is generated from geometry, so it can be honest
 * about being an illustration and still carry the weight the page needs.
 *
 * Three rules hold across the file:
 *
 *  - **Nothing decorative carries meaning alone.** Colour, glow and motion are
 *    always paired with a word. Turn the CSS off and no fact is lost.
 *  - **Geometry is deterministic.** No `Math.random` at render, so the server
 *    and the client agree and nothing shifts on hydration.
 *  - **Motion is optional.** Every animated class stops under
 *    `prefers-reduced-motion`, and no state is conveyed by movement.
 */

// ---------------------------------------------------------------------------
// Surfaces
// ---------------------------------------------------------------------------

export type BandTone = 'deep' | 'light' | 'soft' | 'ivory';

const BAND_SURFACE: Record<BandTone, string> = {
  deep: 'surface-deep',
  light: 'bg-warm-white',
  soft: 'surface-soft-tech',
  ivory: 'surface-ivory',
};

/**
 * A full-bleed horizontal band.
 *
 * The page's rhythm is built from these. A reference read entirely on white
 * reads as a white paper however good the words are, and one read entirely on
 * black reads as a brochure; alternating is what makes it feel composed.
 */
export function Band({
  id,
  tone,
  grid = false,
  className = '',
  children,
}: {
  readonly id?: string;
  readonly tone: BandTone;
  /** Faint instrument grid. Deep bands only — it disappears on light ones. */
  readonly grid?: boolean;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      {...(id === undefined ? {} : { id })}
      className={`relative isolate overflow-hidden ${BAND_SURFACE[tone]} ${
        grid && tone === 'deep' ? 'grid-accent' : ''
      } ${className}`}
    >
      <div className="relative z-10 mx-auto w-full max-w-[78rem] px-5 md:px-10">{children}</div>
    </section>
  );
}

/**
 * A section's opening: eyebrow, title, lede.
 *
 * `tone` only chooses text colours. It never changes what is said.
 */
export function BandHeading({
  eyebrow,
  title,
  lede,
  tone = 'light',
  align = 'left',
}: {
  readonly eyebrow: string;
  readonly title: ReactNode;
  readonly lede?: ReactNode;
  readonly tone?: BandTone;
  readonly align?: 'left' | 'center';
}) {
  const deep = tone === 'deep';
  return (
    <header className={align === 'center' ? 'text-center' : ''}>
      <p
        className={`label-micro ${deep ? 'text-cyan' : 'text-tide-teal'}`}
      >
        {eyebrow}
      </p>
      <h2
        className={`mt-3 font-serif text-3xl leading-[1.1] tracking-[-0.01em] md:text-[2.75rem] ${
          deep ? 'text-on-deep' : 'text-ink'
        }`}
      >
        {title}
      </h2>
      {lede === undefined ? null : (
        <p
          className={`mt-4 max-w-[64ch] text-base leading-relaxed md:text-lg ${
            align === 'center' ? 'mx-auto' : ''
          } ${deep ? 'text-on-deep-soft' : 'text-ink-soft'}`}
        >
          {lede}
        </p>
      )}
    </header>
  );
}

// ---------------------------------------------------------------------------
// The hero field
// ---------------------------------------------------------------------------

/** A peptide backbone as a projected coil. Deterministic, so SSR matches. */
function coil(turns: number, residues: number, cx: number, cy: number, rx: number, pitch: number) {
  const points: { x: number; y: number; z: number }[] = [];
  for (let i = 0; i < residues; i += 1) {
    const t = (i / (residues - 1)) * turns * Math.PI * 2;
    points.push({
      x: cx + Math.cos(t) * rx,
      y: cy - (i / (residues - 1)) * pitch + Math.sin(t) * (rx * 0.22),
      // Depth, used only to size and fade a residue so the coil reads as 3-D.
      z: (Math.sin(t) + 1) / 2,
    });
  }
  return points;
}

const HELIX = coil(3.1, 46, 300, 430, 96, 330);

/** Branching lines that read as vasculature without pretending to be an image. */
function branches() {
  const out: string[] = [];
  const seeds: [number, number, number][] = [
    [120, 540, -58],
    [300, 575, -20],
    [470, 545, 24],
  ];
  for (const [x, y, lean] of seeds) {
    out.push(`M${x} ${y} C ${x + lean} ${y - 80}, ${x + lean * 1.6} ${y - 150}, ${x + lean * 2} ${y - 230}`);
    out.push(`M${x + lean * 1.2} ${y - 120} C ${x + lean * 2.2} ${y - 150}, ${x + lean * 2.6} ${y - 185}, ${x + lean * 3.1} ${y - 205}`);
    out.push(`M${x + lean * 1.5} ${y - 165} C ${x + lean * 0.7} ${y - 205}, ${x + lean * 0.4} ${y - 240}, ${x + lean * 0.2} ${y - 275}`);
  }
  return out;
}

const BRANCHES = branches();

/** Tick marks around the outer ring: instrument furniture, not data. */
const TICKS = Array.from({ length: 48 }, (_, i) => i * 7.5);

/**
 * The compound hero visual.
 *
 * Layered: illumination, an instrument ring, suggested vasculature, then the
 * peptide coil in front. It is explicitly an illustration — `role="img"` with
 * a label that says so, because a reader should never wonder whether they are
 * looking at data.
 */
export function MolecularField({ className = '' }: { readonly className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Illustration: a peptide chain drawn as a coil over suggested tissue structure. Decorative, not a depiction of measured data."
      viewBox="0 0 600 640"
      className={`h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <radialGradient id="mf-core" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.40" />
          <stop offset="45%" stopColor="#2563eb" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="mf-halo" cx="72%" cy="22%" r="58%">
          <stop offset="0%" stopColor="#7c6ce0" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#05161f" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="mf-chain" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
          <stop offset="42%" stopColor="#a5f3fc" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7c6ce0" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="mf-vessel" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </linearGradient>
        <filter id="mf-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      {/* 1 · illumination */}
      <g className="anim-drift-slow">
        <circle cx="300" cy="300" r="290" fill="url(#mf-core)" />
        <circle cx="420" cy="160" r="240" fill="url(#mf-halo)" />
      </g>

      {/* 2 · instrument rings */}
      <g opacity="0.5">
        <circle cx="300" cy="300" r="232" fill="none" stroke="#a5f3fc" strokeOpacity="0.18" strokeWidth="1" />
        <circle cx="300" cy="300" r="186" fill="none" stroke="#a5f3fc" strokeOpacity="0.12" strokeWidth="1" strokeDasharray="3 9" />
        <circle cx="300" cy="300" r="268" fill="none" stroke="#7c6ce0" strokeOpacity="0.14" strokeWidth="1" />
        <g className="anim-drift">
          {TICKS.map((deg) => {
            const r = (deg * Math.PI) / 180;
            const inner = deg % 30 === 0 ? 214 : 224;
            return (
              <line
                key={deg}
                x1={300 + Math.cos(r) * inner}
                y1={300 + Math.sin(r) * inner}
                x2={300 + Math.cos(r) * 232}
                y2={300 + Math.sin(r) * 232}
                stroke="#a5f3fc"
                strokeOpacity={deg % 30 === 0 ? 0.42 : 0.18}
                strokeWidth="1"
              />
            );
          })}
        </g>
      </g>

      {/* 3 · suggested tissue */}
      <g opacity="0.55">
        {BRANCHES.map((d, i) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="url(#mf-vessel)"
            strokeWidth={i % 3 === 0 ? 2.2 : 1.1}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* 4 · the peptide chain */}
      <g>
        <path
          d={HELIX.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke="url(#mf-chain)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.20"
          filter="url(#mf-soft)"
        />
        <path
          d={HELIX.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')}
          fill="none"
          stroke="url(#mf-chain)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {HELIX.map((p, i) =>
          i % 2 === 0 ? (
            <circle
              key={`${p.x.toFixed(1)}-${p.y.toFixed(1)}`}
              cx={p.x}
              cy={p.y}
              r={2.2 + p.z * 3.4}
              fill="#a5f3fc"
              opacity={0.28 + p.z * 0.55}
            />
          ) : null,
        )}
      </g>

      {/* 5 · a single highlighted node, for depth rather than for meaning */}
      <circle cx="300" cy="300" r="7" fill="#22d3ee" opacity="0.8" className="anim-pulse" />
      <circle cx="300" cy="300" r="26" fill="none" stroke="#22d3ee" strokeOpacity="0.28" strokeWidth="1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Compound identity mark
// ---------------------------------------------------------------------------

/** A stable hash, so a compound always draws the same mark. */
function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * A small generated mark for a compound.
 *
 * Derived from the slug, so it is stable and distinct per compound — and
 * deliberately abstract. It is an identifier, never a depiction of structure:
 * an invented "molecule" that looked like a real one would be a lie told in
 * pictures.
 */
export function CompoundMark({
  slug,
  size = 56,
  className = '',
}: {
  readonly slug: string;
  readonly size?: number;
  readonly className?: string;
}) {
  const h = hash(slug);
  const nodes = 5 + (h % 3);
  const spin = (h >> 3) % 360;
  const points = Array.from({ length: nodes }, (_, i) => {
    const a = ((i / nodes) * 360 + spin) * (Math.PI / 180);
    const r = 16 + ((h >> (i + 2)) % 9);
    return { x: 32 + Math.cos(a) * r, y: 32 + Math.sin(a) * r };
  });
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      className={className}
    >
      {points.map((p, i) => {
        const q = points[(i + 1) % points.length]!;
        return (
          <line
            key={`e${String(i)}`}
            x1={p.x}
            y1={p.y}
            x2={q.x}
            y2={q.y}
            stroke="currentColor"
            strokeOpacity="0.34"
            strokeWidth="1"
          />
        );
      })}
      {points.map((p, i) => (
        <circle
          key={`n${String(i)}`}
          cx={p.x}
          cy={p.y}
          r={i === 0 ? 4 : 2.6}
          fill="currentColor"
          opacity={i === 0 ? 0.95 : 0.6}
        />
      ))}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Telemetry
// ---------------------------------------------------------------------------

export interface Reading {
  readonly value: string;
  readonly label: string;
  readonly detail?: string | undefined;
  /** Marks the reading as an absence rather than a measurement. */
  readonly muted?: boolean;
}

/**
 * The hero's data panels.
 *
 * Figures at display size with the unit underneath, on translucent panels. The
 * point of the treatment is that these read as instrument output rather than
 * as administrative counts — they are the first thing on the page that says
 * what this record is made of.
 */
export function TelemetryRow({ readings }: { readonly readings: readonly Reading[] }) {
  return (
    <dl className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {readings.map((r) => (
        <div key={r.label} className="glass px-4 py-4 md:px-5 md:py-5">
          <dt className="label-micro text-on-deep-faint">{r.label}</dt>
          <dd>
            <span
              className={`numeric mt-2 block font-serif leading-none ${
                r.muted ? 'text-2xl text-on-deep-soft md:text-[1.7rem]' : 'text-4xl text-on-deep md:text-[2.6rem]'
              }`}
            >
              {r.value}
            </span>
            {r.detail === undefined ? null : (
              <span className="mt-2 block text-xs leading-snug text-on-deep-faint">{r.detail}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A research-interest tag, for use on a deep surface. */
export function Tag({ children }: { readonly children: ReactNode }) {
  return (
    <li className="rounded-full border border-cyan-soft/25 bg-cyan-soft/[0.07] px-3.5 py-1.5 text-xs text-on-deep-soft">
      {children}
    </li>
  );
}
