/**
 * Deterministic figures for the quality section.
 *
 * Rules these hold to, because a diagram is read faster than prose and is
 * trusted more than it earns:
 *
 *   - Every label is drawn from what the reviewed records actually say. Nothing
 *     in a figure asserts something the evidence layer does not.
 *   - No numbers. A chromatogram drawn with an axis scale would imply a
 *     precision no source here supports, so the trace is unlabelled and
 *     obviously schematic.
 *   - Real SVG text, never outlined or rasterised, so it scales, prints, and can
 *     be read by a screen reader or found by a browser's search.
 *   - `role="img"` with a title and a description, both referenced by
 *     `aria-labelledby`, so the figure is one comprehensible object rather than
 *     a scatter of unattached words.
 *   - `currentColor` and theme tokens throughout, so the figures survive print,
 *     forced-colours mode, and a change of palette.
 */

/** Ties the accessible name and description to the graphic for every figure. */
function useIds(id: string) {
  return { titleId: `${id}-title`, descId: `${id}-desc` };
}

/**
 * A figure wide enough to stay legible, in a container that scrolls.
 *
 * The page itself must never scroll sideways, so the overflow is confined here.
 * Below the figure's natural width that means the reader scrolls within it —
 * shrinking to fit would take the labels below a readable size, which is a worse
 * failure than a scroll. The hint is shown only where scrolling is actually
 * needed, and hidden from print, where the figure is scaled to the page instead.
 */
function FigureScroller({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="no-print mb-1 text-xs text-slate sm:hidden" aria-hidden="true">
        Scroll the figure sideways to see all of it.
      </p>
      <div className="overflow-x-auto">{children}</div>
    </>
  );
}

export function ChromatographyFlowFigure({ id = 'fig-hplc-flow' }: { id?: string }) {
  const { titleId, descId } = useIds(id);

  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox="0 24 720 162"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[520px] text-ink"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>How a chromatographic separation produces a chromatogram</title>
          <desc id={descId}>
            A sample is injected into a stream of solvent and carried through a packed column.
            Substances in the sample interact with the column material to different degrees, so
            they travel at different speeds and leave the column at different times. A detector
            records what leaves the column, and the record of those signals over time is the
            chromatogram: each peak marks something that was detected, and the position of a peak
            is the time it took to pass through.
          </desc>

          <g fill="none" stroke="currentColor" strokeWidth="1.5">
            {/* 1. Sample */}
            <rect x="8" y="74" width="104" height="54" rx="4" className="text-rule" />
            {/* 3. Column */}
            <rect x="196" y="62" width="120" height="78" rx="4" className="text-rule" />
            {/* 4. Detector */}
            <rect x="400" y="74" width="104" height="54" rx="4" className="text-rule" />
            {/* 5. Chromatogram plot area */}
            <rect x="560" y="52" width="148" height="100" rx="4" className="text-rule" />
          </g>

          {/* Flow arrows */}
          <g stroke="currentColor" strokeWidth="1.5" markerEnd="url(#tide-arrow)">
            <line x1="112" y1="101" x2="188" y2="101" />
            <line x1="316" y1="101" x2="392" y2="101" />
            <line x1="504" y1="101" x2="552" y2="101" />
          </g>
          <defs>
            <marker
              id="tide-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
            </marker>
          </defs>

          {/* Column packing, drawn as a gradient of particles rather than a texture */}
          <g fill="currentColor" opacity="0.28">
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
                <circle
                  key={`${String(row)}-${String(col)}`}
                  cx={208 + col * 14 + (row % 2) * 7}
                  cy={74 + row * 11}
                  r="2.6"
                />
              )),
            )}
          </g>

          {/*
            Two bands inside the column, at different points along it — the
            mechanism the whole figure exists to show. Drawn within the packing
            rather than beneath it, because the separation happens in the column.
          */}
          <g>
            <ellipse cx="230" cy="124" rx="13" ry="5" fill="currentColor" opacity="0.8" />
            <ellipse cx="288" cy="124" rx="13" ry="5" fill="currentColor" opacity="0.45" />
          </g>

          {/* Schematic trace: two resolved peaks, deliberately unscaled */}
          <path
            d="M 572 138 L 600 138 Q 608 138 612 118 Q 616 78 622 78 Q 628 78 632 118 Q 636 138 644 138 L 652 138 Q 658 138 662 126 Q 666 100 671 100 Q 676 100 680 126 Q 684 138 690 138 L 700 138"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <line
            x1="572"
            y1="138"
            x2="700"
            y2="138"
            stroke="currentColor"
            strokeWidth="1"
            opacity="0.45"
          />

          <g fill="currentColor" fontSize="13" textAnchor="middle">
            <text x="60" y="96">Sample</text>
            <text x="60" y="114" fontSize="11" opacity="0.75">
              injected
            </text>
            <text x="256" y="46">Column</text>
            <text x="256" y="158" fontSize="11" opacity="0.75">
              components separate
            </text>
            <text x="452" y="96">Detector</text>
            <text x="452" y="114" fontSize="11" opacity="0.75">
              records what leaves
            </text>
            <text x="634" y="40">Chromatogram</text>
            <text x="634" y="170" fontSize="11" opacity="0.75">
              a peak for each thing detected
            </text>
          </g>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        Substances travel through the column at different speeds and so arrive at the detector at
        different times. The height and position of a peak are not drawn to any scale here — this
        shows the mechanism, not a result.
      </figcaption>
    </figure>
  );
}

/**
 * The second figure exists to make one point: these are different questions.
 *
 * Deliberately not a checklist, a scorecard, or a sequence. Nothing here says
 * every batch requires every test, because no source in this index establishes
 * what any product is required to be tested for — that is a regulatory question
 * and the register holds no regulatory source. Boxes sit side by side, each
 * carrying its own question, with no ticks, no ordering and no totals.
 */
const QUALITY_QUESTIONS: readonly { key: string; label: string; question: string }[] = [
  { key: 'identity', label: 'Identity', question: 'What is it?' },
  { key: 'purity', label: 'Purity', question: 'How mixed is it?' },
  { key: 'content', label: 'Content', question: 'How much is there?' },
  { key: 'sterility', label: 'Sterility', question: 'Is it free of viable organisms?' },
  { key: 'endotoxin', label: 'Endotoxin', question: 'Are bacterial toxins present?' },
  { key: 'other', label: 'Other attributes', question: 'Solvents, water, pH, metals…' },
];

export function QualityDimensionsFigure({ id = 'fig-quality-dimensions' }: { id?: string }) {
  const { titleId, descId } = useIds(id);
  const boxWidth = 214;
  const boxHeight = 74;
  const gapX = 22;
  const gapY = 20;

  return (
    <figure className="my-2">
      <FigureScroller>
        <svg
          viewBox="0 0 720 210"
          role="img"
          aria-labelledby={`${titleId} ${descId}`}
          className="h-auto w-full min-w-[520px] text-ink"
          preserveAspectRatio="xMidYMid meet"
        >
          <title id={titleId}>Quality attributes are separate questions</title>
          <desc id={descId}>
            Six separate questions shown side by side, none connected to the others: identity, what
            is it; purity, how mixed is it; content, how much is there; sterility, is it free of
            viable organisms; endotoxin, are bacterial toxins present; and other attributes such as
            residual solvents, water content, pH and elemental impurities. Each is answered by its
            own testing. A result for one is not an answer to another. This is not a list of tests
            any particular product is required to undergo.
          </desc>

          {QUALITY_QUESTIONS.map((item, i) => {
            const column = i % 3;
            const row = Math.floor(i / 3);
            const x = 8 + column * (boxWidth + gapX);
            const y = 34 + row * (boxHeight + gapY);
            const emphasised = item.key === 'purity';
            return (
              <g key={item.key}>
                <rect
                  x={x}
                  y={y}
                  width={boxWidth}
                  height={boxHeight}
                  rx="4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={emphasised ? 2 : 1.25}
                  className={emphasised ? 'text-tide-teal' : 'text-rule'}
                />
                <text x={x + 16} y={y + 30} fill="currentColor" fontSize="14">
                  {item.label}
                  {emphasised ? ' — this page' : ''}
                </text>
                <text x={x + 16} y={y + 52} fill="currentColor" fontSize="12" opacity="0.75">
                  {item.question}
                </text>
              </g>
            );
          })}

          <text x="8" y="18" fill="currentColor" fontSize="12" opacity="0.75">
            Separate questions, separate answers — not a checklist
          </text>
        </svg>
      </FigureScroller>
      <figcaption className="mt-3 max-w-[62ch] text-sm text-slate">
        Each box is a different question with its own testing. An answer to one is not an answer to
        another. This is not a statement that any particular product is required to be tested for
        all of them — that is a regulatory question, and this index holds no regulatory source.
      </figcaption>
    </figure>
  );
}
