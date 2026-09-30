/**
 * The second half of the holding experience: what Tides is building, a preview
 * of the research platform, quality science, and the library as it expands.
 *
 * These sections describe the product, never a peptide. There is no medical
 * statement anywhere in this file, and none of it links into the unfinished
 * research application — it is a preview, and it reads as one.
 */

type Style = React.CSSProperties;

// ---------------------------------------------------------------------------
// What Tides is building
// ---------------------------------------------------------------------------

const LAYERS = [
  { label: 'Compounds', hue: '#22d3ee' },
  { label: 'Mechanisms', hue: '#38bdf8' },
  { label: 'Human research', hue: '#3b82f6' },
  { label: 'Preclinical evidence', hue: '#6366f1' },
  { label: 'Practitioner protocols', hue: '#8b7cf6' },
  { label: 'Quality science', hue: '#a5f3fc' },
] as const;

export function Building() {
  return (
    <section id="building" className="sx-section overflow-hidden" aria-labelledby="building-title">
      <div className="sx-wrap relative">
        <div className="mx-auto max-w-[60rem] lg:text-center" data-reveal>
          <p className="sx-eyebrow">What Tides is building</p>
          <h2 id="building-title" className="sx-h2 mt-5">
            One connected map of <span className="sx-glow-text">peptide science.</span>
          </h2>
          <p className="sx-lede mt-7 max-w-[52ch] lg:mx-auto">
            A source-linked research library that connects compounds, mechanisms, human research, preclinical
            evidence, practitioner protocols and quality science — so you can see how each piece relates, and
            where it came from.
          </p>
        </div>

        {/* Desktop: a constellation joined by a travelling light. */}
        <div className="relative mt-16 hidden lg:block" data-reveal>
          <svg viewBox="0 0 1200 220" className="w-full" aria-hidden="true">
            <defs>
              <linearGradient id="sx-link" x1="0" x2="1">
                <stop offset="0" stopColor="#22d3ee" />
                <stop offset="0.5" stopColor="#6366f1" />
                <stop offset="1" stopColor="#a5f3fc" />
              </linearGradient>
            </defs>
            <path
              d="M100 110Q200 20 300 110T500 110T700 110T900 110T1100 110"
              fill="none" stroke="url(#sx-link)" strokeOpacity="0.35" strokeWidth="1.2"
            />
            <path
              d="M100 110Q200 20 300 110T500 110T700 110T900 110T1100 110"
              fill="none" stroke="#ecfeff" strokeWidth="2.4" strokeLinecap="round"
              className="sx-fig-signal" style={{ strokeDasharray: '60 1400', animationDuration: '6s' }}
            />
            {LAYERS.map((l, i) => {
              const x = 100 + i * 200;
              return (
                <g key={l.label}>
                  <circle cx={x} cy="110" r="34" fill="#061a26" stroke={l.hue} strokeOpacity="0.5" />
                  <circle cx={x} cy="110" r="46" fill="none" stroke={l.hue} strokeOpacity="0.15" strokeDasharray="2 6" className="sx-spin-slow" />
                  <circle cx={x} cy="110" r="7" fill={l.hue} className="sx-fig-pulse" style={{ animationDelay: `${String(i * 0.4)}s` }} />
                </g>
              );
            })}
          </svg>
          <ol className="-mt-2 grid grid-cols-6 text-center">
            {LAYERS.map((l, i) => (
              <li key={l.label}>
                <span className="sx-mono block text-[0.62rem] tracking-[0.2em] text-[var(--sx-faint)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="mt-1.5 block text-[0.95rem] text-[var(--sx-text)]">{l.label}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Phone and tablet: the same chain, vertical. */}
        <ol className="relative mt-12 space-y-1 lg:hidden">
          <span className="absolute bottom-6 left-[1.1rem] top-6 w-px bg-gradient-to-b from-[#22d3ee] via-[#6366f1] to-[#a5f3fc] opacity-40" aria-hidden="true" />
          {LAYERS.map((l, i) => (
            <li key={l.label} className="relative flex items-center gap-5 py-3" data-reveal style={{ '--delay': `${String(i * 0.06)}s` } as Style}>
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-[#061a26]" style={{ borderColor: `${l.hue}80` }}>
                <span className="h-2 w-2 rounded-full sx-fig-pulse" style={{ background: l.hue, animationDelay: `${String(i * 0.4)}s` }} />
              </span>
              <span className="text-lg text-[var(--sx-text)]">{l.label}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Research platform preview
// ---------------------------------------------------------------------------

const MODULES = [
  {
    key: 'compound',
    title: 'Compound intelligence',
    body: 'Understand what a peptide is, where it comes from, and why it is being studied.',
    visual: <CompoundVisual />,
    span: 'lg:col-span-7 lg:row-span-2',
  },
  {
    key: 'mechanisms',
    title: 'Mechanisms',
    body: 'See pathways and biological systems visually, not as walls of text.',
    visual: <MechanismVisual />,
    span: 'lg:col-span-5',
  },
  {
    key: 'evidence',
    title: 'Evidence',
    body: 'Human, preclinical and practitioner information — always kept separate.',
    visual: <EvidenceVisual />,
    span: 'lg:col-span-5',
  },
  {
    key: 'comparison',
    title: 'Protocol comparison',
    body: 'See how reported approaches differ, side by side, each under its own source.',
    visual: <ComparisonVisual />,
    span: 'lg:col-span-6',
  },
  {
    key: 'quality',
    title: 'Quality',
    body: 'Understand identity, purity, testing, storage and handling.',
    visual: <QualityModuleVisual />,
    span: 'lg:col-span-6',
  },
] as const;

export function PlatformPreview() {
  return (
    <section id="research" className="sx-section" aria-labelledby="research-title">
      <div className="sx-grid-bg" aria-hidden="true" />
      <div
        className="sx-aura"
        aria-hidden="true"
        style={{ width: '48rem', height: '48rem', right: '-16rem', top: '4rem', background: 'radial-gradient(circle, rgb(99 102 241 / 0.25), transparent 65%)' }}
      />
      <div className="sx-wrap relative">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end" data-reveal>
          <div>
            <p className="sx-eyebrow">Research platform · Preview</p>
            <h2 id="research-title" className="sx-h2 mt-5 max-w-[18ch]">
              A deeper research platform is <span className="sx-glow-text">taking shape.</span>
            </h2>
          </div>
          <p className="sx-lede !text-base lg:pb-2">
            Underneath the guides is a growing research engine. Here is a glimpse of what it will let you do.
          </p>
        </div>

        <div className="mt-14 grid gap-4 sm:gap-5 lg:auto-rows-[minmax(17rem,auto)] lg:grid-cols-12">
          {MODULES.map((m, i) => (
            <article
              key={m.key}
              className={`sx-card sx-lift flex flex-col ${m.span}`}
              data-reveal
              style={{ '--delay': `${String(i * 0.08)}s` } as Style}
            >
              <div className={`relative flex-1 ${i === 0 ? 'min-h-[16rem] lg:min-h-[22rem]' : 'min-h-[11rem]'}`}>{m.visual}</div>
              <div className="relative px-6 pb-7 pt-2 sm:px-7">
                <p className="sx-mono text-[0.62rem] tracking-[0.22em] text-[var(--sx-faint)]">
                  MODULE {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="sx-h3 mt-2">{m.title}</h3>
                <p className="mt-2 max-w-[44ch] text-[0.95rem] leading-relaxed text-[var(--sx-soft)]">{m.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* A rotating molecular structure with an orbit of residues. */
function CompoundVisual() {
  return (
    <>
      <CompoundStructure />
      <p className="sx-mono absolute left-6 top-6 text-[0.62rem] tracking-[0.22em] text-[var(--sx-faint)] sm:left-7">
        STRUCTURE · SEQUENCE · CLASS
      </p>
    </>
  );
}

function CompoundStructure() {
  const ring = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return [300 + Math.cos(a) * 120, 180 + Math.sin(a) * 120] as const;
  });
  return (
    <svg viewBox="0 0 600 360" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <radialGradient id="sx-cv" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="300" cy="180" r="170" fill="url(#sx-cv)" className="sx-fig-breathe" />
      <g className="sx-spin-slow" style={{ animationDuration: '80s' }}>
        <circle cx="300" cy="180" r="120" fill="none" stroke="#a5f3fc" strokeOpacity="0.14" />
        {ring.map(([x, y], i) => {
          const next = ring[(i + 1) % ring.length] ?? ring[0];
          return (
            <g key={i}>
              <line x1={x} y1={y} x2={next?.[0]} y2={next?.[1]} stroke="#22d3ee" strokeOpacity="0.45" />
              <line x1={x} y1={y} x2={300 + (x - 300) * 1.28} y2={180 + (y - 180) * 1.28} stroke="#8b7cf6" strokeOpacity="0.35" />
              <circle cx={300 + (x - 300) * 1.28} cy={180 + (y - 180) * 1.28} r="4" fill="#8b7cf6" fillOpacity="0.8" />
              <circle cx={x} cy={y} r={i % 3 === 0 ? 9 : 6.5} fill="#061a26" stroke="#22d3ee" strokeWidth="1.5" />
            </g>
          );
        })}
      </g>
      <g className="sx-spin-slow" style={{ animationDuration: '40s', animationDirection: 'reverse' }}>
        <polygon points="300,130 343,155 343,205 300,230 257,205 257,155" fill="none" stroke="#a5f3fc" strokeOpacity="0.6" />
        <polygon points="300,150 326,165 326,195 300,210 274,195 274,165" fill="rgb(34 211 238 / 0.08)" stroke="#22d3ee" strokeOpacity="0.4" />
      </g>
      <circle cx="300" cy="180" r="6" fill="#ecfeff" className="sx-fig-pulse" />
    </svg>
  );
}

/* A pathway: nodes lighting in sequence along branching edges. */
function MechanismVisual() {
  const nodes = [
    [60, 100], [160, 60], [160, 140], [270, 40], [270, 100], [270, 160], [380, 80], [380, 140], [470, 110],
  ] as const;
  const edges = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 6], [4, 6], [4, 7], [5, 7], [6, 8], [7, 8]] as const;
  return (
    <svg viewBox="0 0 530 200" className="absolute inset-x-0 top-4 h-[85%] w-full" aria-hidden="true">
      {edges.map(([a, b], i) => {
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        return (
          <g key={i}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38bdf8" strokeOpacity="0.2" />
            <line
              x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a5f3fc" strokeWidth="1.6" strokeLinecap="round"
              className="sx-draw-loop" style={{ '--len': '140', '--delay': `${String(i * 0.35)}s` } as Style}
            />
          </g>
        );
      })}
      {nodes.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="11" fill="#061a26" stroke="#38bdf8" strokeOpacity="0.6" />
          <circle cx={x} cy={y} r="3.5" fill="#a5f3fc" className="sx-fig-node" style={{ animationDelay: `${String(i * 0.3)}s` }} />
        </g>
      ))}
    </svg>
  );
}

/* Three lanes that never merge: human, preclinical, practitioner. */
function EvidenceVisual() {
  const lanes = [
    { label: 'HUMAN', color: '#22d3ee' },
    { label: 'PRECLINICAL', color: '#6366f1' },
    { label: 'PRACTITIONER', color: '#8b7cf6' },
  ] as const;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-5 px-7 pt-6" aria-hidden="true">
      {lanes.map((l, i) => (
        <div key={l.label}>
          <div className="flex items-center justify-between">
            <span className="sx-mono text-[0.6rem] tracking-[0.22em]" style={{ color: l.color }}>{l.label}</span>
            <span className="sx-mono text-[0.6rem] tracking-[0.2em] text-[var(--sx-faint)]">LANE {i + 1}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(140_220_240/0.08)]">
            <div
              className="sx-bar h-full rounded-full"
              style={{ width: `${String(90 - i * 18)}%`, background: `linear-gradient(90deg, ${l.color}, transparent)`, '--delay': `${String(i * 0.7)}s` } as Style}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Parallel timelines, offset — reported approaches side by side. */
function ComparisonVisual() {
  const rows = [
    { offset: 0, blocks: [3, 2, 4], color: '#22d3ee' },
    { offset: 1, blocks: [2, 4, 2], color: '#3b82f6' },
    { offset: 2, blocks: [4, 3], color: '#8b7cf6' },
  ] as const;
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-4 px-7 pt-6" aria-hidden="true">
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} className="h-1 rounded-full bg-[rgb(140_220_240/0.12)]" />
        ))}
      </div>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-4">
          <span className="sx-mono w-14 shrink-0 text-[0.6rem] tracking-[0.2em] text-[var(--sx-faint)]">SRC {String.fromCharCode(65 + i)}</span>
          <div className="grid flex-1 grid-cols-12 gap-1">
            <span style={{ gridColumn: `span ${String(r.offset)} / span ${String(r.offset)}` }} className={r.offset === 0 ? 'hidden' : ''} />
            {r.blocks.map((b, k) => (
              <span
                key={k}
                className="sx-float h-5 rounded-md"
                style={{
                  gridColumn: `span ${String(b)} / span ${String(b)}`,
                  background: `linear-gradient(90deg, ${r.color}55, ${r.color}18)`,
                  border: `1px solid ${r.color}66`,
                  animationDelay: `${String(i * 0.8 + k * 0.4)}s`,
                  animationDuration: '6s',
                }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* A chromatogram trace: one dominant peak, drawn and redrawn. */
function PurityVisual() {
  const trace =
    'M0 170 L60 170 C80 170 85 166 92 162 C98 166 104 170 120 170 L190 170 C205 170 212 150 218 110' +
    ' C224 50 230 20 236 20 C242 20 248 50 254 110 C260 150 266 170 282 170 L340 170 C350 170 354 164 360 158' +
    ' C366 164 372 170 384 170 L460 170 C468 170 471 167 475 164 C479 167 482 170 490 170 L560 170';
  return (
    <svg
      viewBox="0 0 560 200"
      className="h-auto w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sx-peak" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.45" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" x2="560" y1={y} y2={y} stroke="#a5f3fc" strokeOpacity="0.06" />
      ))}
      <path d={`${trace} L560 200 L0 200Z`} fill="url(#sx-peak)" opacity="0.7" />
      <path d={trace} fill="none" stroke="#22d3ee" strokeOpacity="0.25" strokeWidth="1.5" />
      <path
        d={trace} fill="none" stroke="#e0fdff" strokeWidth="2" strokeLinecap="round"
        className="sx-draw-loop" style={{ '--len': '900' } as Style}
      />
      <line x1="236" x2="236" y1="10" y2="180" stroke="#a5f3fc" strokeOpacity="0.35" strokeDasharray="3 5" />
    </svg>
  );
}

/* Three checks running against a vial — identity, purity, stability. */
function QualityModuleVisual() {
  const checks = ['IDENTITY', 'PURITY', 'STABILITY'] as const;
  return (
    <div className="absolute inset-0 flex items-center gap-6 px-7 pt-6" aria-hidden="true">
      <svg viewBox="0 0 120 220" className="h-[80%] w-auto shrink-0">
        <g fill="none" stroke="#a5f3fc" strokeOpacity="0.55">
          <rect x="38" y="10" width="44" height="22" rx="4" />
          <path d="M44 32v16c-14 6-22 16-22 32v110c0 12 8 20 20 20h36c12 0 20-8 20-20V80c0-16-8-26-22-32V32" />
        </g>
        <path d="M24 120h72v68c0 12-8 20-20 20H44c-12 0-20-8-20-20Z" fill="rgb(34 211 238 / 0.16)" />
        <line x1="24" y1="120" x2="96" y2="120" stroke="#22d3ee" strokeOpacity="0.8" />
        <rect x="18" y="0" width="84" height="3" fill="#e0fdff" opacity="0.7" className="sx-scan-short" />
      </svg>
      <div className="flex-1 space-y-4">
        {checks.map((c, i) => (
          <div key={c}>
            <div className="flex items-center justify-between">
              <span className="sx-mono text-[0.6rem] tracking-[0.22em] text-[var(--sx-cyan-soft)]">{c}</span>
              <span className="sx-mono text-[0.6rem] tracking-[0.2em] text-[var(--sx-faint)]">
                CHECK {String(i + 1).padStart(2, '0')}
              </span>
            </div>
            <span className="sx-meter mt-2 block" style={{ '--delay': `${String(i * 0.8)}s` } as Style} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality
// ---------------------------------------------------------------------------

const QUALITY = [
  ['Identity', 'Is it what the label says it is?'],
  ['Purity', 'What else is in the vial, and how much?'],
  ['Testing', 'Which methods answer which questions — and what a certificate does not tell you.'],
  ['Storage', 'How time, temperature and light change a peptide.'],
  ['Handling', 'How material is prepared and handled, explained plainly.'],
] as const;

export function QualityPreview() {
  return (
    <section id="quality" className="sx-section overflow-hidden" aria-labelledby="quality-title">
      <div className="sx-wrap relative grid items-center gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-20">
        <div data-reveal>
          <p className="sx-eyebrow">Quality science</p>
          <h2 id="quality-title" className="sx-h2 mt-5 max-w-[14ch]">
            Quality is part of <span className="sx-glow-text">the science.</span>
          </h2>
          <p className="sx-lede mt-7 max-w-[46ch]">
            A peptide is only as meaningful as the material in the vial. Tides is building clear guides to how
            peptides are identified, tested, stored and handled.
          </p>
          <ol className="mt-10 border-t border-[var(--sx-line)]">
            {QUALITY.map(([title, body], i) => (
              <li key={title} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2 border-b border-[var(--sx-line)] py-4">
                <span className="sx-mono pt-1 text-[0.68rem] tracking-[0.2em] text-[var(--sx-cyan-soft)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>
                  <span className="block font-medium text-[var(--sx-text)]">{title}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-[var(--sx-soft)]">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative isolate" data-reveal="scale">
          <div className="sx-card relative z-[1] p-5 sm:p-8">
            <div className="flex items-center justify-between">
              <p className="sx-mono text-[0.62rem] tracking-[0.22em] text-[var(--sx-cyan-soft)]">PURITY PROFILE · ILLUSTRATIVE</p>
              <p className="sx-mono text-[0.62rem] tracking-[0.2em] text-[var(--sx-faint)]">
                SCAN <span data-scan>00</span>
              </p>
            </div>
            <div className="mt-6">
              <PurityVisual />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {['IDENTITY', 'PURITY', 'STABILITY'].map((label, i) => (
                <div key={label} className="rounded-xl border border-[var(--sx-line)] bg-[rgb(6_20_30/0.6)] px-3 py-3">
                  <p className="sx-mono text-[0.58rem] tracking-[0.2em] text-[var(--sx-faint)]">{label}</p>
                  <span className="sx-meter mt-3 block" style={{ '--delay': `${String(i * 0.8)}s` } as Style} />
                </div>
              ))}
            </div>
          </div>
          {/* A vial in section, drawn as line-art: the object quality is about. */}
          <svg
            viewBox="0 0 120 220"
            className="sx-float absolute -right-4 -top-32 z-0 hidden w-24 opacity-70 sm:block lg:-right-8"
            aria-hidden="true"
          >
            <g fill="none" stroke="#a5f3fc" strokeOpacity="0.55">
              <rect x="38" y="10" width="44" height="22" rx="4" />
              <path d="M44 32v16c-14 6-22 16-22 32v110c0 12 8 20 20 20h36c12 0 20-8 20-20V80c0-16-8-26-22-32V32" />
            </g>
            <path d="M24 120h72v68c0 12-8 20-20 20H44c-12 0-20-8-20-20Z" fill="rgb(34 211 238 / 0.14)" />
            <line x1="24" y1="120" x2="96" y2="120" stroke="#22d3ee" strokeOpacity="0.8" />
          </svg>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The library is expanding
// ---------------------------------------------------------------------------

const ARRIVING = [
  ['More protocol guides', 'Finished visual guides join the library one by one.'],
  ['More compounds', 'Further compound records coming into the index.'],
  ['Mechanism maps', 'Visual pathways for how peptides are studied to act.'],
  ['Quality guides', 'Identity, purity, testing, storage and handling.'],
] as const;

const TICKER = ['Compounds', 'Mechanisms', 'Human research', 'Preclinical evidence', 'Protocols', 'Quality', 'Sources'];

export function Expansion() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--sx-line)] bg-[var(--sx-bg-2)]" aria-labelledby="expanding-title">
      <div className="overflow-hidden border-b border-[var(--sx-line)] py-5" aria-hidden="true">
        <div className="sx-ticker flex w-max gap-10 whitespace-nowrap">
          {[...TICKER, ...TICKER, ...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="sx-mono flex items-center gap-10 text-[0.72rem] tracking-[0.24em] text-[var(--sx-faint)]">
              {t.toUpperCase()}
              <span className="h-1 w-1 rounded-full bg-[var(--sx-cyan)]" />
            </span>
          ))}
        </div>
      </div>

      <div className="sx-wrap relative py-[clamp(5rem,10vw,8.5rem)]">
        <div
          className="sx-aura"
          aria-hidden="true"
          style={{ width: '40rem', height: '30rem', left: '30%', top: '10%', background: 'radial-gradient(circle, rgb(34 211 238 / 0.14), transparent 65%)' }}
        />
        <div className="relative grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-20">
          <div data-reveal>
            <p className="sx-eyebrow">What&rsquo;s next</p>
            <h2 id="expanding-title" className="sx-h2 mt-5">
              The library is <span className="sx-glow-text">expanding.</span>
            </h2>
            <p className="sx-lede mt-7 max-w-[42ch]">
              New research experiences are being added. More compounds, protocols and quality guides are coming
              into the index — return and you will find more of it here.
            </p>
            <a href="#protocols" className="sx-btn sx-btn-primary mt-10">
              Start with the protocol guides <span className="sx-arrow" aria-hidden="true">→</span>
            </a>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2">
            {ARRIVING.map(([title, body], i) => (
              <li
                key={title}
                className="sx-card px-6 py-6"
                data-reveal
                style={{ '--delay': `${String(i * 0.08)}s` } as Style}
              >
                <p className="sx-mono flex items-center gap-2.5 text-[0.62rem] tracking-[0.22em] text-[var(--sx-cyan-soft)]">
                  <span className="sx-hud-dot !mr-0" style={{ animationDelay: `${String(i * 0.5)}s` }} aria-hidden="true" />
                  ENTERING THE INDEX
                </p>
                <p className="sx-h3 mt-4">{title}</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--sx-soft)]">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
