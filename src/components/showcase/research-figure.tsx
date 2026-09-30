/**
 * The research figure — a translucent human form read as an instrument would
 * read it: contour slices, a neural field, the spine, circulation and the
 * signals moving through them.
 *
 * Pure SVG, rendered on the server. Every moving part is a CSS animation on
 * transform, opacity or stroke-dashoffset, so it costs almost nothing on a
 * phone and stands perfectly still under reduced motion.
 *
 * It is an illustration of "human systems", not an anatomical diagram: nothing
 * is labelled as an organ and nothing claims what a compound does to it.
 */

const SILHOUETTE =
  'M274 206C274 222 272 234 262 244C236 258 190 266 160 280C128 294 112 322 108 360' +
  'C104 410 104 470 108 530C110 600 112 680 118 760L122 900L168 900' +
  'C166 820 164 740 166 670C168 600 172 520 176 440C180 410 186 392 192 384' +
  'C194 450 204 520 216 590C222 640 216 700 206 760C198 820 196 860 196 900L404 900' +
  'C404 860 402 820 394 760C384 700 378 640 384 590C396 520 406 450 408 384' +
  'C414 392 420 410 424 440C428 520 432 600 434 670C436 740 434 820 432 900L478 900' +
  'L482 760C488 680 490 600 492 530C496 470 496 410 492 360C488 322 472 294 440 280' +
  'C410 266 364 258 338 244C328 234 326 222 326 206Z';

const HEAD =
  'M300 40C346 40 374 76 374 124C374 150 370 170 362 186C352 206 328 226 300 228' +
  'C272 226 248 206 238 186C230 170 226 150 226 124C226 76 254 40 300 40Z';

/* Neural field inside the head: fixed points, so server and client agree. */
const NEURAL_NODES: readonly [number, number][] = [
  [262, 92], [300, 70], [338, 92], [250, 128], [286, 110], [316, 116], [350, 130],
  [270, 152], [300, 142], [332, 158], [284, 186], [318, 188], [300, 206],
];
const NEURAL_EDGES: readonly [number, number][] = [
  [0, 1], [1, 2], [0, 3], [0, 4], [1, 4], [1, 5], [2, 5], [2, 6], [3, 4], [3, 7],
  [4, 8], [5, 8], [5, 6], [6, 9], [7, 8], [8, 9], [7, 10], [8, 10], [8, 11], [9, 11],
  [10, 12], [11, 12],
];

/* Circulation and nerve paths. Each is also traced by a moving signal. */
const VESSELS = [
  // aortic arch and descending
  'M318 392C330 360 312 336 300 336C286 336 278 352 282 376L286 520C288 600 292 660 300 720',
  // to the left arm
  'M296 340C260 330 214 318 180 330C150 342 140 380 138 440C136 540 140 660 146 820',
  // to the right arm
  'M304 340C340 330 386 318 420 330C450 342 460 380 462 440C464 540 460 660 454 820',
  // lower branches
  'M300 720C282 760 260 800 246 880',
  'M300 720C318 760 340 800 354 880',
  // carotids into the head
  'M292 338C290 290 286 250 280 214',
  'M308 338C310 290 314 250 320 214',
] as const;

/* Heart-level dendrites spreading across the chest. */
const CAPILLARIES = [
  'M318 400C340 404 356 420 368 440',
  'M318 404C336 424 342 452 340 484',
  'M312 408C300 432 280 444 256 452',
  'M312 404C286 404 262 396 240 382',
] as const;

/* Contour slices: horizontal lines, clipped to the body, read as a scan. */
const SLICES = Array.from({ length: 44 }, (_, i) => 40 + i * 20);

/* Vertebrae along the spine. */
const VERTEBRAE = Array.from({ length: 24 }, (_, i) => 250 + i * 24);

export function ResearchFigure({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 900"
      className={className}
      role="img"
      aria-label="A translucent human figure, rendered as a research scan of neural, vascular and cellular systems."
      preserveAspectRatio="xMidYMin meet"
    >
      <defs>
        <clipPath id="sx-body">
          <path d={SILHOUETTE} />
          <path d={HEAD} />
        </clipPath>

        <linearGradient id="sx-body-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.2" />
          <stop offset="0.45" stopColor="#3b82f6" stopOpacity="0.12" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.02" />
        </linearGradient>

        <radialGradient id="sx-core" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#a5f3fc" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#22d3ee" stopOpacity="0.55" />
          <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="sx-mind" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#8b7cf6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="sx-scanline" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0" />
          <stop offset="0.85" stopColor="#22d3ee" stopOpacity="0.22" />
          <stop offset="1" stopColor="#e0fdff" stopOpacity="0.9" />
        </linearGradient>

        <pattern id="sx-cells" width="18" height="15.6" patternUnits="userSpaceOnUse">
          <path d="M9 0L18 5.2V10.4L9 15.6L0 10.4V5.2Z" fill="none" stroke="#22d3ee" strokeOpacity="0.09" strokeWidth="0.7" />
        </pattern>

        <filter id="sx-soft-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Orbit behind the figure: the observatory ring. */}
      <g opacity="0.8">
        <ellipse cx="300" cy="430" rx="286" ry="70" fill="none" stroke="#22d3ee" strokeOpacity="0.14" />
        <ellipse
          cx="300" cy="430" rx="286" ry="70" fill="none" stroke="#a5f3fc" strokeOpacity="0.55"
          strokeWidth="1.4" className="sx-fig-orbit"
        />
        <ellipse cx="300" cy="170" rx="150" ry="30" fill="none" stroke="#8b7cf6" strokeOpacity="0.18" />
      </g>

      {/* Halo: a blurred copy of the outline, drawn once. */}
      <g filter="url(#sx-soft-glow)" opacity="0.7">
        <path d={SILHOUETTE} fill="none" stroke="#22d3ee" strokeWidth="5" strokeOpacity="0.45" />
        <path d={HEAD} fill="none" stroke="#22d3ee" strokeWidth="5" strokeOpacity="0.45" />
      </g>

      {/* Body volume. */}
      <g className="sx-fig-breathe">
        <path d={SILHOUETTE} fill="url(#sx-body-fill)" />
        <path d={HEAD} fill="url(#sx-body-fill)" />
      </g>

      <g clipPath="url(#sx-body)">
        {/* Cellular lattice. */}
        <rect x="0" y="0" width="600" height="900" fill="url(#sx-cells)" />

        {/* Contour slices. */}
        <g stroke="#a5f3fc" strokeOpacity="0.1" strokeWidth="0.8">
          {SLICES.map((y) => (
            <line key={y} x1="80" x2="520" y1={y} y2={y} />
          ))}
        </g>

        {/* Mind. */}
        <circle cx="300" cy="135" r="92" fill="url(#sx-mind)" className="sx-fig-pulse" style={{ animationDuration: '5.5s' }} />
        <g stroke="#c4b5fd" strokeOpacity="0.5" strokeWidth="0.9">
          {NEURAL_EDGES.map(([a, b]) => {
            const [x1, y1] = NEURAL_NODES[a] ?? [0, 0];
            const [x2, y2] = NEURAL_NODES[b] ?? [0, 0];
            return <line key={`${String(a)}-${String(b)}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <g fill="#e0e7ff">
          {NEURAL_NODES.map(([x, y], i) => (
            <circle
              key={`${String(x)}-${String(y)}`}
              cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 1.8}
              className="sx-fig-node"
              style={{ animationDelay: `${String((i * 0.37) % 3)}s` }}
            />
          ))}
        </g>

        {/* Lungs: two soft volumes either side of the spine. */}
        <g fill="none" stroke="#38bdf8" strokeOpacity="0.28" strokeWidth="1">
          <path d="M282 306C250 300 222 330 214 380C206 440 212 500 232 520C252 534 276 520 282 490Z" />
          <path d="M318 306C350 300 378 330 386 380C394 440 388 500 368 520C348 534 324 520 318 490Z" />
          <path d="M270 330C250 360 240 410 244 470" strokeOpacity="0.16" />
          <path d="M330 330C350 360 360 410 356 470" strokeOpacity="0.16" />
        </g>

        {/* Spine. */}
        <line x1="300" y1="228" x2="300" y2="820" stroke="#a5f3fc" strokeOpacity="0.35" strokeWidth="1" />
        <g fill="#a5f3fc" fillOpacity="0.5">
          {VERTEBRAE.map((y, i) => (
            <rect key={y} x={i < 6 ? 294 : 292} y={y} width={i < 6 ? 12 : 16} height="3" rx="1.5" />
          ))}
        </g>

        {/* Circulation. */}
        <g fill="none" stroke="#22d3ee" strokeOpacity="0.32" strokeWidth="1.3" strokeLinecap="round">
          {VESSELS.map((d) => (
            <path key={d} d={d} />
          ))}
          {CAPILLARIES.map((d) => (
            <path key={d} d={d} strokeOpacity="0.22" strokeWidth="0.9" />
          ))}
        </g>

        {/* Signals travelling along the vessels. */}
        <g fill="none" stroke="#e0fdff" strokeWidth="2.2" strokeLinecap="round">
          {VESSELS.map((d, i) => (
            <path
              key={d}
              d={d}
              className="sx-fig-signal"
              style={{ animationDelay: `${String(i * -0.8)}s`, animationDuration: `${String(4.5 + (i % 3))}s` }}
            />
          ))}
        </g>

        {/* Heart: the brightest point, pulsing. */}
        <circle cx="316" cy="396" r="46" fill="url(#sx-core)" className="sx-fig-pulse" />
        <circle cx="316" cy="396" r="5" fill="#ecfeff" />

        {/* Scan band, sweeping head to hip. */}
        <rect x="60" y="0" width="480" height="140" fill="url(#sx-scanline)" className="sx-fig-scan" />
      </g>

      {/* Crisp outline on top. */}
      <path d={SILHOUETTE} fill="none" stroke="#a5f3fc" strokeOpacity="0.7" strokeWidth="1.2" />
      <path d={HEAD} fill="none" stroke="#a5f3fc" strokeOpacity="0.7" strokeWidth="1.2" />

      {/* Front arc of the orbit, passing in front of the body. */}
      <path
        d="M14 430A286 70 0 0 0 586 430"
        fill="none" stroke="#22d3ee" strokeOpacity="0.4" strokeWidth="1"
      />
      <circle cx="586" cy="430" r="3.5" fill="#a5f3fc" className="sx-fig-node" />
      <circle cx="14" cy="430" r="2.5" fill="#8b7cf6" className="sx-fig-node" style={{ animationDelay: '1.4s' }} />

      {/* System markers: where the HUD callouts attach. */}
      <g fill="none" stroke="#a5f3fc" strokeOpacity="0.8">
        <circle cx="338" cy="92" r="7" />
        <circle cx="316" cy="396" r="11" />
        <circle cx="138" cy="520" r="7" />
      </g>
    </svg>
  );
}
