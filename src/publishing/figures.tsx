import { Svg, Path, Rect, Line, Circle, G, Text as SvgText, Polygon } from '@react-pdf/renderer';
import { colour } from './theme';

/**
 * Deterministic diagrams.
 *
 * Drawn rather than photographed, and drawn from the same distinctions the
 * evidence architecture makes rather than illustrated around them. A photograph
 * of a vial would say "product"; a stock image of a scientist would say
 * "marketing". A diagram that gets the structure of the subject right says what
 * this publication is for.
 *
 * All vector, all sized in points, no rasterisation at any scale.
 */

const FONT = 'Inter';

// ---------------------------------------------------------------------------
// The three analytical questions
// ---------------------------------------------------------------------------

/**
 * Purity, identity and content as three separate questions.
 *
 * A triangle rather than a list, because the point is that no one of them
 * implies another — and a list read top to bottom invites the reader to think
 * the first one is the important one.
 */
export function ThreeQuestionsFigure({ width = 420 }: { width?: number }) {
  const height = width * 0.52;
  const cx = width / 2;
  const nodes = [
    { x: cx, y: height * 0.17, label: 'PURITY', question: 'How mixed is it?' },
    { x: width * 0.17, y: height * 0.78, label: 'IDENTITY', question: 'What is it?' },
    { x: width * 0.83, y: height * 0.78, label: 'CONTENT', question: 'How much is there?' },
  ];

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {nodes.map((from, index) => {
        const to = nodes[(index + 1) % nodes.length]!;
        return (
          <Line
            key={from.label}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={colour.rule}
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        );
      })}

      {nodes.map((node) => (
        <G key={node.label}>
          <Circle cx={node.x} cy={node.y} r={34} fill={colour.white} stroke={colour.tideTeal} strokeWidth={1.2} />
          <SvgText
            x={node.x}
            y={node.y - 2}
            fill={colour.deepTide}
            style={{ fontFamily: FONT, fontSize: 8.5 }}
            textAnchor="middle"
          >
            {node.label}
          </SvgText>
          <SvgText
            x={node.x}
            y={node.y + 9}
            fill={colour.slate}
            style={{ fontFamily: FONT, fontSize: 6.4 }}
            textAnchor="middle"
          >
            {node.question}
          </SvgText>
        </G>
      ))}

      <SvgText
        x={cx}
        y={height * 0.52}
        fill={colour.slate}
        style={{ fontFamily: FONT, fontSize: 7 }}
        textAnchor="middle"
      >
        no answer implies another
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// A chromatogram, and what a single peak does not establish
// ---------------------------------------------------------------------------

/**
 * One symmetrical peak, and the same peak resolved into two species.
 *
 * The single most useful illustration in the publication, because the claim it
 * carries — a symmetrical peak does not establish one substance — is the one
 * readers most often get wrong.
 */
export function ChromatogramFigure({ width = 420 }: { width?: number }) {
  const height = 132;
  const panel = (width - 18) / 2;
  const baseY = height - 34;

  const peak = (x0: number, apex: number, spread: number, h: number): string =>
    `M ${String(x0)} ${String(baseY)} ` +
    `C ${String(apex - spread)} ${String(baseY)}, ${String(apex - spread * 0.45)} ${String(baseY - h)}, ${String(apex)} ${String(baseY - h)} ` +
    `C ${String(apex + spread * 0.45)} ${String(baseY - h)}, ${String(apex + spread)} ${String(baseY)}, ${String(x0 + spread * 4)} ${String(baseY)}`;

  const axes = (ox: number) => (
    <G>
      <Line x1={ox + 8} y1={baseY} x2={ox + panel - 6} y2={baseY} stroke={colour.slate} strokeWidth={0.8} />
      <Line x1={ox + 8} y1={baseY} x2={ox + 8} y2={22} stroke={colour.slate} strokeWidth={0.8} />
      <SvgText x={ox + panel / 2} y={baseY + 13} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.2 }} textAnchor="middle">
        retention time
      </SvgText>
    </G>
  );

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {/* Left: one peak. */}
      {axes(0)}
      <Path d={peak(14, panel / 2, panel * 0.16, 74)} stroke={colour.tideTeal} strokeWidth={1.4} fill="none" />
      <SvgText x={panel / 2} y={16} fill={colour.deepTide} style={{ fontFamily: FONT, fontSize: 7.4 }} textAnchor="middle">
        ONE SYMMETRICAL PEAK
      </SvgText>

      {/* Right: the same sample, resolved. */}
      {axes(panel + 18)}
      <Path
        d={peak(panel + 32, panel + 18 + panel * 0.44, panel * 0.13, 66)}
        stroke={colour.tideTeal}
        strokeWidth={1.4}
        fill="none"
      />
      <Path
        d={peak(panel + 46, panel + 18 + panel * 0.60, panel * 0.13, 52)}
        stroke={colour.caution}
        strokeWidth={1.4}
        fill="none"
      />
      <SvgText
        x={panel + 18 + panel / 2}
        y={16}
        fill={colour.deepTide}
        style={{ fontFamily: FONT, fontSize: 7.4 }}
        textAnchor="middle"
      >
        THE SAME SAMPLE, RESOLVED
      </SvgText>

      <SvgText x={width / 2} y={height - 6} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
        two species can co-elute; resolution depends on the method and the column
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Identity versus purity
// ---------------------------------------------------------------------------

/** Two questions, two instruments, no overlap. */
export function IdentityVersusPurityFigure({ width = 420 }: { width?: number }) {
  const height = 128;
  const boxW = (width - 40) / 2;

  const block = (x: number, heading: string, asks: string, answers: string, accent: string) => (
    <G>
      <Rect x={x} y={18} width={boxW} height={80} fill={colour.white} stroke={accent} strokeWidth={1} rx={3} />
      <Rect x={x} y={18} width={boxW} height={3} fill={accent} />
      <SvgText x={x + 12} y={40} fill={accent} style={{ fontFamily: FONT, fontSize: 8 }} >
        {heading}
      </SvgText>
      <SvgText x={x + 12} y={58} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }}>
        ASKS
      </SvgText>
      <SvgText x={x + 12} y={70} fill={colour.ink} style={{ fontFamily: FONT, fontSize: 7.2 }}>
        {asks}
      </SvgText>
      <SvgText x={x + 12} y={84} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }}>
        CANNOT ANSWER
      </SvgText>
      <SvgText x={x + 12} y={94} fill={colour.caution} style={{ fontFamily: FONT, fontSize: 7.2 }}>
        {answers}
      </SvgText>
    </G>
  );

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {block(0, 'SEPARATION', 'How many species?', 'Which species?', colour.tideTeal)}
      {block(boxW + 40, 'MASS', 'Which species?', 'How much?', colour.deepTide)}
      <Line
        x1={boxW + 8}
        y1={58}
        x2={boxW + 32}
        y2={58}
        stroke={colour.rule}
        strokeWidth={1}
        strokeDasharray="2 2"
      />
      <SvgText x={boxW + 20} y={52} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6 }} textAnchor="middle">
        and
      </SvgText>
      <SvgText x={width / 2} y={height - 6} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
        a complete characterisation needs both, and neither substitutes for the other
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Content is a separate measurement
// ---------------------------------------------------------------------------

/** Two vials, identical purity, different content. */
export function ContentFigure({ width = 420 }: { width?: number }) {
  const height = 134;
  const vial = (x: number, fill: number, label: string, sub: string) => {
    const bodyTop = 34;
    const bodyH = 72;
    const w = 40;
    const filledH = bodyH * fill;
    return (
      <G>
        <Rect x={x} y={bodyTop - 8} width={w} height={8} fill={colour.rule} rx={1.5} />
        <Rect
          x={x}
          y={bodyTop}
          width={w}
          height={bodyH}
          fill={colour.white}
          stroke={colour.slate}
          strokeWidth={0.9}
          rx={2}
        />
        <Rect
          x={x + 1}
          y={bodyTop + bodyH - filledH}
          width={w - 2}
          height={filledH}
          fill={colour.seaGlass}
        />
        <SvgText x={x + w / 2} y={bodyTop + bodyH + 15} fill={colour.ink} style={{ fontFamily: FONT, fontSize: 7.6 }} textAnchor="middle">
          {label}
        </SvgText>
        <SvgText x={x + w / 2} y={bodyTop + bodyH + 26} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
          {sub}
        </SvgText>
      </G>
    );
  };

  const left = width * 0.26;
  const right = width * 0.62;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      <SvgText x={width / 2} y={16} fill={colour.deepTide} style={{ fontFamily: FONT, fontSize: 7.8 }} textAnchor="middle">
        SAME PURITY FIGURE · DIFFERENT AMOUNT OF PEPTIDE
      </SvgText>
      {vial(left, 0.85, '99% pure', 'more peptide')}
      {vial(right, 0.42, '99% pure', 'less peptide')}
      <SvgText x={width / 2} y={height - 6} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
        purity is a proportion; content is a quantity, and a proportion carries no quantity
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// A certificate is not one test
// ---------------------------------------------------------------------------

/** The anatomy of a certificate: several independent tests under one heading. */
export function CertificateAnatomyFigure({ width = 420 }: { width?: number }) {
  const rowsData = [
    'Appearance',
    'Identity',
    'Purity (HPLC)',
    'Content / assay',
    'Water content',
    'Sterility',
    'Endotoxin',
  ];
  const rowH = 13.5;
  const height = 42 + rowsData.length * rowH;
  const docW = width * 0.56;
  const x0 = (width - docW) / 2;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      <Rect x={x0} y={10} width={docW} height={height - 22} fill={colour.white} stroke={colour.rule} strokeWidth={1} />
      <Rect x={x0} y={10} width={docW} height={20} fill={colour.deepTide} />
      <SvgText x={x0 + 10} y={24} fill={colour.white} style={{ fontFamily: FONT, fontSize: 7.6 }}>
        CERTIFICATE OF ANALYSIS
      </SvgText>

      {rowsData.map((row, index) => {
        const y = 38 + index * rowH;
        return (
          <G key={row}>
            <Line
              x1={x0 + 10}
              y1={y + 5}
              x2={x0 + docW - 10}
              y2={y + 5}
              stroke={colour.ruleSoft}
              strokeWidth={0.5}
            />
            <Circle cx={x0 + 16} cy={y} r={2.4} fill={colour.tideTeal} />
            <SvgText x={x0 + 25} y={y + 2.5} fill={colour.ink} style={{ fontFamily: FONT, fontSize: 7 }}>
              {row}
            </SvgText>
            <SvgText
              x={x0 + docW - 10}
              y={y + 2.5}
              fill={colour.slate}
              style={{ fontFamily: FONT, fontSize: 6.4 }}
              textAnchor="end"
            >
              separate test
            </SvgText>
          </G>
        );
      })}

      <SvgText x={width / 2} y={height - 3} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
        one document, several independent measurements — and any of them may be absent
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Traceability
// ---------------------------------------------------------------------------

/** Product → lot → sample → laboratory → report → result. */
export function TraceabilityFigure({ width = 440 }: { width?: number }) {
  const steps = ['PRODUCT', 'LOT', 'SAMPLE', 'LABORATORY', 'REPORT', 'RESULT'];
  const height = 98;
  const boxW = (width - 5 * 8) / steps.length;
  const y = 34;
  const boxH = 30;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      <SvgText x={0} y={14} fill={colour.deepTide} style={{ fontFamily: FONT, fontSize: 7.6 }}>
        WHICH BATCH WAS ACTUALLY TESTED?
      </SvgText>

      {steps.map((step, index) => {
        const x = index * (boxW + 8);
        return (
          <G key={step}>
            <Rect
              x={x}
              y={y}
              width={boxW}
              height={boxH}
              fill={index === 0 || index === steps.length - 1 ? colour.seaGlass : colour.white}
              stroke={colour.tideTeal}
              strokeWidth={0.9}
              rx={2}
            />
            <SvgText
              x={x + boxW / 2}
              y={y + boxH / 2 + 2.5}
              fill={colour.deepTide}
              style={{ fontFamily: FONT, fontSize: 6.2 }}
              textAnchor="middle"
            >
              {step}
            </SvgText>
            {index < steps.length - 1 ? (
              <Polygon
                points={`${String(x + boxW + 1)},${String(y + boxH / 2 - 3)} ${String(x + boxW + 6.5)},${String(y + boxH / 2)} ${String(x + boxW + 1)},${String(y + boxH / 2 + 3)}`}
                fill={colour.tideTeal}
              />
            ) : null}
          </G>
        );
      })}

      <Line x1={0} y1={y + boxH + 14} x2={width} y2={y + boxH + 14} stroke={colour.cautionRule} strokeWidth={0.8} strokeDasharray="3 2" />
      <SvgText x={0} y={y + boxH + 27} fill={colour.caution} style={{ fontFamily: FONT, fontSize: 6.4 }}>
        A break anywhere in this chain means the result describes a different material from the one in your hand.
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Quality is multi-dimensional
// ---------------------------------------------------------------------------

export interface DimensionState {
  readonly label: string;
  readonly written: boolean;
}

/**
 * The dimensions of quality, with their state shown rather than implied.
 *
 * Dimensions this index has not written are drawn in outline and labelled.
 * Drawing them solid would claim coverage the register does not have; leaving
 * them out would suggest the subject does not exist.
 */
export function QualityDimensionsFigure({
  width = 440,
  dimensions,
}: {
  width?: number;
  dimensions: readonly DimensionState[];
}) {
  const cols = 4;
  const rows = Math.ceil(dimensions.length / cols);
  const boxW = (width - (cols - 1) * 10) / cols;
  const boxH = 38;
  const height = rows * (boxH + 8) + 14;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {dimensions.map((dimension, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (boxW + 10);
        const y = row * (boxH + 8);
        return (
          <G key={dimension.label}>
            {/*
              Two rects rather than one with a conditional dash: pdfkit refuses
              a dash array of zero length, so "no dash" has to be the absence of
              the prop rather than a falsy value for it.
            */}
            {dimension.written ? (
              <Rect
                x={x}
                y={y}
                width={boxW}
                height={boxH}
                fill={colour.seaGlass}
                stroke={colour.tideTeal}
                strokeWidth={1}
                rx={2}
              />
            ) : (
              <Rect
                x={x}
                y={y}
                width={boxW}
                height={boxH}
                fill={colour.white}
                stroke={colour.cautionRule}
                strokeWidth={0.8}
                strokeDasharray="3 2"
                rx={2}
              />
            )}
            <SvgText
              x={x + boxW / 2}
              y={y + 18}
              fill={dimension.written ? colour.deepTide : colour.slate}
              style={{ fontFamily: FONT, fontSize: 7 }}
              textAnchor="middle"
            >
              {dimension.label}
            </SvgText>
            <SvgText
              x={x + boxW / 2}
              y={y + 30}
              fill={dimension.written ? colour.tideTeal : colour.caution}
              style={{ fontFamily: FONT, fontSize: 5.6 }}
              textAnchor="middle"
            >
              {dimension.written ? 'written' : 'in progress'}
            </SvgText>
          </G>
        );
      })}
      <SvgText x={0} y={height - 3} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.2 }}>
        Solid: a reference page exists. Outlined: recognised, and not yet written.
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// Provenance chain
// ---------------------------------------------------------------------------

/** Source → locator → claim → review → publication. The method, as a figure. */
export function ProvenanceChainFigure({ width = 440 }: { width?: number }) {
  const steps = [
    { label: 'SOURCE', sub: 'a named work' },
    { label: 'LOCATOR', sub: 'an exact page' },
    { label: 'CLAIM', sub: 'one proposition' },
    { label: 'REVIEW', sub: 'a named person' },
    { label: 'PUBLICATION', sub: 'bound to a version' },
  ];
  const height = 92;
  const boxW = (width - 4 * 9) / steps.length;
  const y = 16;
  const boxH = 40;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {steps.map((step, index) => {
        const x = index * (boxW + 9);
        return (
          <G key={step.label}>
            <Rect x={x} y={y} width={boxW} height={boxH} fill={colour.white} stroke={colour.tideTeal} strokeWidth={0.9} rx={2} />
            <SvgText x={x + boxW / 2} y={y + 17} fill={colour.deepTide} style={{ fontFamily: FONT, fontSize: 6.4 }} textAnchor="middle">
              {step.label}
            </SvgText>
            <SvgText x={x + boxW / 2} y={y + 29} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 5.6 }} textAnchor="middle">
              {step.sub}
            </SvgText>
            {index < steps.length - 1 ? (
              <Polygon
                points={`${String(x + boxW + 1.5)},${String(y + boxH / 2 - 3)} ${String(x + boxW + 7)},${String(y + boxH / 2)} ${String(x + boxW + 1.5)},${String(y + boxH / 2 + 3)}`}
                fill={colour.tideTeal}
              />
            ) : null}
          </G>
        );
      })}
      <SvgText x={0} y={height - 12} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.2 }}>
        No step may be skipped. A statement with no locator is not published, and an approval is bound
      </SvgText>
      <SvgText x={0} y={height - 3} fill={colour.slate} style={{ fontFamily: FONT, fontSize: 6.2 }}>
        to the exact version a reviewer read — editing a record strands it.
      </SvgText>
    </Svg>
  );
}

// ---------------------------------------------------------------------------
// The cover mark
// ---------------------------------------------------------------------------

/** Layered curves. The only ornament in the system. */
export function TideMark({ width = 300 }: { width?: number }) {
  const height = width * 0.42;
  const curve = (offset: number) =>
    `M0 ${String(height * 0.55 + offset)} C ${String(width * 0.27)} ${String(height * 0.2 + offset)}, ${String(width * 0.58)} ${String(height * 0.85 + offset)}, ${String(width)} ${String(height * 0.42 + offset)}`;

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${String(width)} ${String(height)}`}>
      {[0, 12, 24, 36].map((offset, index) => (
        <Path
          key={offset}
          d={curve(offset)}
          stroke={index === 0 ? colour.seaGlass : colour.tideTeal}
          strokeWidth={index === 0 ? 1.6 : 1}
          strokeOpacity={1 - index * 0.22}
          fill="none"
        />
      ))}
    </Svg>
  );
}
