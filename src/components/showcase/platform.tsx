import Image from 'next/image';

/**
 * The second half of the holding experience: how everything connects, the
 * research platform taking shape, quality science, and the library as it grows.
 *
 * These sections describe the product, never a peptide. The imagery is rendered
 * from the hero's own scene (`hero-shots.ts`), so the page keeps one visual
 * language — the same person, the same peptide, the same light — without a
 * second live canvas. Motion falls away as the page moves from wonder to use:
 * a gentle parallax on the images, quiet reveals, nothing looping.
 */

type Style = React.CSSProperties;

/** A rendered scene: large, rounded, drifting a little with the page. */
function Scene({ src, alt, sizes, className = '', position = 'center' }: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
  position?: string;
}) {
  return (
    <div className={`sx-scene ${className}`}>
      <div data-parallax="36">
        <Image src={src} alt={alt} fill sizes={sizes} style={{ objectPosition: position }} />
      </div>
      <span className="sx-scene-edge" aria-hidden="true" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Everything connects
// ---------------------------------------------------------------------------

const LAYERS = [
  { title: 'Evidence', body: 'Human research, preclinical work and practitioner reports — each kept distinct, each traced to its source.' },
  { title: 'Protocols', body: 'How reported approaches compare, side by side — each credited to its source.' },
  { title: 'Quality', body: 'What makes the material in the vial what it claims to be — identity, purity, testing and care.' },
] as const;

export function Building() {
  return (
    <section id="building" className="relative overflow-hidden bg-[var(--sx-bg)] pt-[clamp(5rem,10vw,8.5rem)]" aria-labelledby="building-title">
      <div className="sx-wrap">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end" data-reveal>
          <div>
            <p className="sx-kicker">What Tides is building</p>
            <h2 id="building-title" className="sx-h2 mt-6">
              Everything <span className="sx-glow-text">connects.</span>
            </h2>
          </div>
          <p className="sx-lede max-w-[42ch] lg:pb-3">
            A peptide meets a receptor. A signal moves through a person. Tides follows that whole path — and the
            evidence, protocols and quality science around every step of it.
          </p>
        </div>
      </div>

      {/* Full bleed: the peptide, the receptors, the signal and the person, in one frame. */}
      <div className="relative mt-14 sm:mt-16" data-reveal="scale">
        <div className="sx-scene aspect-[4/5] !rounded-none sm:aspect-[16/9] lg:aspect-[2/1]">
          <div data-parallax="44">
            <Image
              src="/scenes/connect.jpg"
              alt="A peptide, receptor signalling and a translucent human figure lit from within, in one continuous scene."
              fill
              sizes="100vw"
              className="object-[68%_50%] sm:object-center"
            />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,var(--sx-bg)_0%,transparent_14%,transparent_80%,var(--sx-bg)_100%)]" aria-hidden="true" />
          <p className="sx-pin left-[6%] top-[22%] hidden sm:flex"><span>Compound</span></p>
          <p className="sx-pin left-[31%] top-[46%] hidden sm:flex"><span>Mechanism</span></p>
          <p className="sx-pin flex left-[52%] top-[36%] sm:left-[57%] sm:top-[54%]"><span>Human biology</span></p>
        </div>
      </div>

      <div className="sx-wrap pb-[clamp(4rem,8vw,6rem)]">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {LAYERS.map((l, i) => (
            <div key={l.title} className="sx-column" data-reveal style={{ '--delay': `${String(i * 0.08)}s` } as Style}>
              <h3 className="text-2xl font-semibold tracking-[-0.02em]">{l.title}</h3>
              <p className="mt-3 max-w-[34ch] leading-relaxed text-[var(--sx-soft)]">{l.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// The research platform
// ---------------------------------------------------------------------------

const SUPPORTING = [
  {
    title: 'Mechanisms',
    body: 'Receptors, pathways and signalling, shown as the systems they are.',
    src: '/scenes/receptors.jpg',
    alt: 'Receptors held in a cell membrane, rendered as points of light.',
    position: '40% 50%',
  },
  {
    title: 'Evidence',
    body: 'What has been studied in people, kept apart from the lab and the clinic.',
    src: '/scenes/profile.jpg',
    alt: 'A person in profile, rendered as a translucent point cloud with the neural field lit.',
    position: '38% 30%',
  },
] as const;

export function PlatformPreview() {
  return (
    <section id="research" className="relative overflow-hidden bg-[var(--sx-bg)] pb-[clamp(5rem,10vw,8.5rem)] pt-[clamp(3rem,6vw,5rem)]" aria-labelledby="research-title">
      <div className="sx-wrap">
        <div className="max-w-[56rem]" data-reveal>
          <p className="sx-kicker">Research platform</p>
          <h2 id="research-title" className="sx-h2 mt-6">
            A deeper research platform is <span className="sx-glow-text">taking shape.</span>
          </h2>
        </div>

        {/* One large moment: compound intelligence. */}
        <div className="mt-14 grid items-center gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-14">
          <div data-reveal="scale">
            <Scene
              src="/scenes/molecule.jpg"
              alt="A peptide rendered close up: lit atoms and bonds, with a skin of light."
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="aspect-[4/3]"
            />
          </div>
          <div data-reveal style={{ '--delay': '0.1s' } as Style}>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--sx-cyan-soft)]">Compound intelligence</p>
            <h3 className="mt-4 text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.1] tracking-[-0.025em]">
              What a peptide is, and why it is being studied.
            </h3>
            <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-[var(--sx-soft)]">
              Structure, class and research context for each compound — linked to the sources behind every
              statement.
            </p>
          </div>
        </div>

        {/* Three supporting moments. */}
        <div className="mt-16 grid gap-10 md:grid-cols-3 md:gap-6 lg:mt-20">
          {SUPPORTING.map((f, i) => (
            <article key={f.title} data-reveal style={{ '--delay': `${String(i * 0.08)}s` } as Style}>
              <Scene src={f.src} alt={f.alt} sizes="(min-width: 768px) 32vw, 100vw" className="aspect-[4/5]" position={f.position} />
              <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">{f.title}</h3>
              <p className="mt-2 max-w-[34ch] leading-relaxed text-[var(--sx-soft)]">{f.body}</p>
            </article>
          ))}
          <article data-reveal style={{ '--delay': '0.16s' } as Style}>
            <ComparisonScene />
            <h3 className="mt-6 text-2xl font-semibold tracking-[-0.02em]">Protocol comparison</h3>
            <p className="mt-2 max-w-[34ch] leading-relaxed text-[var(--sx-soft)]">
              How reported approaches differ, side by side, each under its own source.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}

/**
 * Reported approaches as parallel lanes of light. Abstract on purpose: there
 * are no amounts, days or names here, only the idea of comparing sources.
 */
function ComparisonScene() {
  const lanes = [
    { offset: 4, blocks: [26, 14, 30], hue: '34 211 238' },
    { offset: 12, blocks: [18, 28, 16], hue: '59 130 246' },
    { offset: 22, blocks: [30, 22], hue: '139 124 246' },
    { offset: 8, blocks: [14, 20, 12, 18], hue: '165 243 252' },
  ];
  return (
    <div className="sx-scene flex aspect-[4/5] flex-col justify-center gap-7 bg-[radial-gradient(120%_80%_at_30%_20%,rgb(34_211_238/0.16),transparent_60%),#04101a] px-[9%]" aria-hidden="true">
      {lanes.map((lane, i) => (
        <div key={i}>
          <div className="mb-2.5 h-px w-full bg-[rgb(165_243_252/0.12)]" />
          <div className="flex gap-[3%]" style={{ paddingLeft: `${String(lane.offset)}%` }}>
            {lane.blocks.map((w, k) => (
              <span
                key={k}
                className="h-3 rounded-full"
                style={{
                  width: `${String(w)}%`,
                  background: `linear-gradient(90deg, rgb(${lane.hue} / 0.95), rgb(${lane.hue} / 0.25))`,
                  boxShadow: `0 0 18px rgb(${lane.hue} / 0.45)`,
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <span className="sx-scene-edge" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quality — the light, precise section
// ---------------------------------------------------------------------------

const QUALITY = [
  ['Identity', 'Is it what the label says it is?'],
  ['Purity', 'What else is in the vial, and how much of it.'],
  ['Testing', 'Which methods answer which questions — and what a certificate cannot tell you.'],
  ['Storage', 'How time, temperature and light change a peptide.'],
  ['Handling', 'How material is prepared and handled, explained plainly.'],
] as const;

export function QualityPreview() {
  return (
    <section id="quality" className="sx-light overflow-hidden" aria-labelledby="quality-title">
      <div className="sx-handback rotate-180" aria-hidden="true" />
      <div className="sx-wrap pb-[clamp(5rem,10vw,8rem)] pt-[clamp(2rem,4vw,3rem)]">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.85fr)] lg:items-end" data-reveal>
          <div>
            <p className="sx-kicker">Quality science</p>
            <h2 id="quality-title" className="sx-h2 mt-6 max-w-[13ch]">
              Quality is part of the science.
            </h2>
          </div>
          <p className="sx-lede max-w-[42ch] lg:pb-3">
            A peptide is only as meaningful as the material in the vial. Tides is building clear, progressive guides to
            how peptides are identified, tested, stored and handled.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-14">
          <figure className="sx-poster self-start p-6 sm:p-10" data-reveal="scale">
            <div className="flex items-start justify-between gap-6">
              <figcaption>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--tides-mineral)]">Purity, read as a trace</p>
                <p className="mt-2 max-w-[34ch] text-[var(--tides-soft)]">
                  One dominant peak, and the small ones beside it that quality testing looks for. Illustrative.
                </p>
              </figcaption>
              <SampleVial />
            </div>
            <Chromatogram />
          </figure>

          <ol className="self-center">
            {QUALITY.map(([title, body], i) => (
              <li
                key={title}
                className="grid grid-cols-[3rem_minmax(0,1fr)] border-t border-[var(--tides-rule)] py-5 last:border-b"
                data-reveal
                style={{ '--delay': `${String(i * 0.06)}s` } as Style}
              >
                <span className="pt-0.5 text-sm font-semibold tabular-nums text-[var(--tides-gold)]">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="block text-xl font-semibold tracking-[-0.015em] text-[var(--tides-deep)]">{title}</span>
                  <span className="mt-1 block leading-relaxed text-[var(--tides-soft)]">{body}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

/** A clean, illustrative chromatogram: drawn once when it comes into view. */
function Chromatogram() {
  const trace =
    'M0 190 L70 190 C88 190 94 185 100 180 C106 185 112 190 130 190 L230 190 C246 190 254 168 262 120' +
    ' C270 60 276 26 284 26 C292 26 298 60 306 120 C314 168 322 190 338 190 L420 190 C432 190 437 183 443 176' +
    ' C449 183 454 190 468 190 L560 190 C569 190 572 186 577 182 C582 186 585 190 594 190 L680 190';
  return (
    <svg viewBox="0 0 680 230" className="mt-8 h-auto w-full" role="img" aria-label="An illustrative chromatography trace with one dominant peak and minor peaks.">
      <defs>
        <linearGradient id="sx-q-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b7a80" stopOpacity="0.18" />
          <stop offset="1" stopColor="#2b7a80" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[40, 80, 120, 160].map((y) => (
        <line key={y} x1="0" x2="680" y1={y} y2={y} stroke="#073f49" strokeOpacity="0.06" />
      ))}
      <line x1="0" x2="680" y1="190" y2="190" stroke="#073f49" strokeOpacity="0.2" />
      <path d={`${trace} L680 230 L0 230Z`} fill="url(#sx-q-fill)" opacity="0.9" />
      <path d={trace} fill="none" stroke="#073f49" strokeWidth="2.2" strokeLinecap="round" className="sx-draw" style={{ '--len': '1100' } as Style} />
      <line x1="284" x2="284" y1="14" y2="190" stroke="#c4a46b" strokeWidth="1" strokeDasharray="3 5" />
      <text x="0" y="222" fill="#56666c" fontSize="12" fontFamily="var(--font-inter), sans-serif">Retention time →</text>
    </svg>
  );
}

/** A sample vial as line art: the object quality is about, not a product. */
function SampleVial() {
  return (
    <svg viewBox="0 0 60 120" className="h-24 w-auto shrink-0 sm:h-28" aria-hidden="true">
      <g fill="none" stroke="#073f49" strokeOpacity="0.55" strokeWidth="1.2">
        <rect x="19" y="4" width="22" height="12" rx="2.5" />
        <path d="M22 16v9c-8 3-12 9-12 17v62c0 7 4 12 11 12h18c7 0 11-5 11-12V42c0-8-4-14-12-17v-9" />
      </g>
      <path d="M10.6 72h38.8v32c0 7-4 11.4-11 11.4H21.6c-7 0-11-4.4-11-11.4Z" fill="#2b7a80" fillOpacity="0.14" />
      <line x1="10.6" y1="72" x2="49.4" y2="72" stroke="#c4a46b" strokeWidth="1" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The library is expanding
// ---------------------------------------------------------------------------

const ARRIVING = ['More protocol guides', 'More compounds', 'Mechanism maps', 'Quality guides'] as const;

export function Expansion() {
  return (
    <section className="relative overflow-hidden bg-[var(--sx-bg)]" aria-labelledby="expanding-title">
      <div className="sx-handback" aria-hidden="true" />
      <div className="sx-wrap grid items-center gap-12 pb-[clamp(5rem,10vw,8rem)] pt-[clamp(2rem,4vw,3rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div data-reveal>
          <p className="sx-kicker">What&rsquo;s next</p>
          <h2 id="expanding-title" className="sx-h2 mt-6">
            The library is <span className="sx-glow-text">expanding.</span>
          </h2>
          <p className="sx-lede mt-6 max-w-[40ch]">
            New research experiences are being added. Return and you will find more of it here.
          </p>
          <ul className="mt-9 space-y-3.5">
            {ARRIVING.map((a) => (
              <li key={a} className="flex items-center gap-3.5 text-lg text-[var(--sx-text)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--sx-cyan)] shadow-[0_0_10px_var(--sx-cyan)]" aria-hidden="true" />
                {a}
              </li>
            ))}
          </ul>
          <a href="#protocols" className="sx-btn sx-btn-primary mt-10">
            Start with the protocol guides <span className="sx-arrow" aria-hidden="true">→</span>
          </a>
        </div>
        <div data-reveal="scale">
          <Scene
            src="/scenes/hand.jpg"
            alt="A hand at rest, rendered as a translucent point cloud, with pathways of light running into it."
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="aspect-[4/3]"
            position="55% 50%"
          />
        </div>
      </div>
    </section>
  );
}
