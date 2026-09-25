import {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Polygon,
  Polyline,
  Rect,
  Svg,
  Text,
  Text as SvgText,
  View,
} from '@react-pdf/renderer';
import {
  Children,
  createElement,
  Fragment,
  isValidElement,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from 'react';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';
import { Illustration, type IllustrationBasis } from '@/components/illustrations/frame';
import { PATIENT_ILLUSTRATIONS, type PatientIllustrationKey } from '@/components/illustrations/patient';
import { colour, contentWidth, leading, sans, serif, type } from './theme';

/**
 * The web illustration system, drawn for print.
 *
 * One drawing, two renderers. The site's figures are the source of truth: their
 * geometry, labels, captions and stated basis are written and checked once, on
 * the page a reader explores, and will be reviewed there. A publication that redrew them by hand would be a second
 * copy free to drift — a label corrected on the web and left wrong in the book.
 *
 * So this module does not screenshot anything and does not redraw anything. It
 * reads the same React element tree the site renders and emits the equivalent
 * react-pdf vector primitives, resolving what a browser would have resolved:
 *
 *   - design-token classes (`fill-tide-teal`, `text-[var(--color-caution)]`) to
 *     the print palette, and `currentColor` to the element's computed colour;
 *   - inherited presentation attributes through groups, as SVG defines them;
 *   - arrowheads, which react-pdf does not draw from `<marker>` reliably, as
 *     small polygons oriented along the end of each line or curve;
 *   - multi-line labels, as one text run per line at an absolute position;
 *   - the one rotated square (a diamond), as a polygon.
 *
 * Anything it does not recognise throws. A figure that half-converts would
 * print with a missing label, and nobody proofreading a page notices an
 * absence.
 */

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const TOKENS: Readonly<Record<string, string>> = {
  ink: colour.ink,
  'ink-soft': colour.inkSoft,
  'deep-tide': colour.deepTide,
  'tide-teal': colour.tideTeal,
  'sea-glass': colour.seaGlass,
  mist: colour.mist,
  'warm-white': colour.warmWhite,
  slate: colour.slate,
  rule: colour.rule,
  'rule-soft': colour.ruleSoft,
  'surface-sunk': colour.surfaceSunk,
  caution: colour.caution,
  'caution-bg': colour.cautionBg,
  'caution-rule': colour.cautionRule,
  'evidence-human': colour.evidenceHuman,
  'evidence-human-bg': colour.evidenceHumanBg,
  'evidence-preclinical': colour.evidencePreclinical,
  'evidence-preclinical-bg': colour.evidencePreclinicalBg,
  'evidence-reference': colour.evidenceReference,
  'evidence-reference-bg': colour.evidenceReferenceBg,
};

/** `tide-teal` or `[var(--color-caution)]` → a hex value, or null when not a colour. */
function tokenColour(suffix: string): string | null {
  const bracket = /^\[var\(--color-([a-z-]+)\)\]$/.exec(suffix);
  const name = bracket?.[1] ?? suffix;
  return TOKENS[name] ?? null;
}

/** Font-size utilities appear only on HTML around the drawing, never inside it. */
const IGNORED_CLASSES = new Set(['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl']);

// ---------------------------------------------------------------------------
// Inherited presentation state
// ---------------------------------------------------------------------------

interface Inherited {
  readonly color: string;
  readonly fill: string | undefined;
  readonly stroke: string | undefined;
  readonly strokeWidth: number | undefined;
  readonly strokeDasharray: string | undefined;
  readonly strokeLinecap: string | undefined;
  readonly strokeLinejoin: string | undefined;
  readonly markerEnd: string | undefined;
  readonly markerStart: string | undefined;
  readonly font: 'serif' | 'sans';
}

type Props = Readonly<Record<string, unknown>>;

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function num(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value);
  return undefined;
}

function inherit(parent: Inherited, props: Props): Inherited {
  let { color, fill, stroke, font } = parent;
  for (const cls of (str(props.className) ?? '').split(/\s+/).filter(Boolean)) {
    if (IGNORED_CLASSES.has(cls)) continue;
    if (cls === 'font-serif') {
      font = 'serif';
      continue;
    }
    if (cls === 'font-sans') {
      font = 'sans';
      continue;
    }
    const m = /^(text|fill|stroke)-(.+)$/.exec(cls);
    const hex = m === null ? null : tokenColour(m[2] ?? '');
    if (m === null || hex === null) {
      throw new Error(`Illustration print: unrecognised class "${cls}".`);
    }
    if (m[1] === 'text') color = hex;
    else if (m[1] === 'fill') fill = hex;
    else stroke = hex;
  }
  return {
    color,
    fill: str(props.fill) ?? fill,
    stroke: str(props.stroke) ?? stroke,
    strokeWidth: num(props.strokeWidth) ?? parent.strokeWidth,
    strokeDasharray: str(props.strokeDasharray) ?? parent.strokeDasharray,
    strokeLinecap: str(props.strokeLinecap) ?? parent.strokeLinecap,
    strokeLinejoin: str(props.strokeLinejoin) ?? parent.strokeLinejoin,
    markerEnd: str(props.markerEnd) ?? parent.markerEnd,
    markerStart: str(props.markerStart) ?? parent.markerStart,
    font,
  };
}

/** `currentColor` resolves against the element's own computed colour. */
function paint(value: string | undefined, state: Inherited, fallback: string): string {
  if (value === undefined) return fallback;
  return value === 'currentColor' ? state.color : value;
}

function paintProps(state: Inherited, props: Props, shape: 'closed' | 'open'): Record<string, unknown> {
  const out: Record<string, unknown> = {
    // SVG's initial fill is black; lines and open paths are drawn as strokes.
    fill: paint(state.fill, state, shape === 'closed' ? colour.ink : 'none'),
    stroke: paint(state.stroke, state, 'none'),
  };
  if (out.stroke !== 'none') out.strokeWidth = state.strokeWidth ?? 1;
  // pdfkit rejects an empty dash array, so "no dash" is the absence of the prop.
  if (state.strokeDasharray !== undefined) out.strokeDasharray = state.strokeDasharray;
  if (state.strokeLinecap !== undefined) out.strokeLinecap = state.strokeLinecap;
  if (state.strokeLinejoin !== undefined) out.strokeLinejoin = state.strokeLinejoin;
  const opacity = num(props.opacity);
  if (opacity !== undefined) out.opacity = opacity;
  return out;
}

// ---------------------------------------------------------------------------
// Geometry for arrowheads
// ---------------------------------------------------------------------------

type Point = readonly [number, number];

/** The last point of a path and the point its final segment leaves from. */
function pathEnd(d: string): { end: Point; from: Point } {
  const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let cur: Point = [0, 0];
  let start: Point = [0, 0];
  let from: Point = [0, 0];
  const take = (): number => Number(tokens[i++]);
  while (i < tokens.length) {
    const token = tokens[i] ?? '';
    if (/[A-Za-z]/.test(token)) {
      cmd = token;
      i += 1;
      if (cmd === 'Z' || cmd === 'z') {
        from = cur;
        cur = start;
        continue;
      }
    }
    const rel = cmd === cmd.toLowerCase();
    const ox = rel ? cur[0] : 0;
    const oy = rel ? cur[1] : 0;
    switch (cmd.toUpperCase()) {
      case 'M': {
        cur = [ox + take(), oy + take()];
        start = cur;
        from = cur;
        cmd = rel ? 'l' : 'L';
        break;
      }
      case 'L':
      case 'T': {
        from = cur;
        cur = [ox + take(), oy + take()];
        break;
      }
      case 'H': {
        from = cur;
        cur = [(rel ? cur[0] : 0) + take(), cur[1]];
        break;
      }
      case 'V': {
        from = cur;
        cur = [cur[0], (rel ? cur[1] : 0) + take()];
        break;
      }
      case 'C': {
        take();
        take();
        from = [ox + take(), oy + take()];
        cur = [ox + take(), oy + take()];
        break;
      }
      case 'S':
      case 'Q': {
        from = [ox + take(), oy + take()];
        cur = [ox + take(), oy + take()];
        break;
      }
      case 'A': {
        take();
        take();
        take();
        take();
        take();
        from = cur;
        cur = [ox + take(), oy + take()];
        break;
      }
      default:
        throw new Error(`Illustration print: unsupported path command "${cmd}".`);
    }
  }
  return { end: cur, from };
}

/**
 * The frame's marker: a triangle `M0 0 L10 5 L0 10 z` in a ten-unit box with its
 * reference point at (9, 5), six stroke-widths across.
 */
function arrowhead(tip: Point, from: Point, strokeWidth: number, marker: string): ReactElement {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const s = 0.6 * strokeWidth;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = (
    [
      [0, 0],
      [10, 5],
      [0, 10],
    ] as const
  )
    .map(([px, py]) => {
      const lx = (px - 9) * s;
      const ly = (py - 5) * s;
      return `${(tip[0] + lx * cos - ly * sin).toFixed(2)},${(tip[1] + lx * sin + ly * cos).toFixed(2)}`;
    })
    .join(' ');
  const fill = marker.includes('-arrow-soft') ? colour.slate : colour.deepTide;
  return <Polygon points={points} fill={fill} />;
}

function withMarkers(
  shape: ReactElement,
  state: Inherited,
  endTangent: { end: Point; from: Point } | null,
  startTangent: { start: Point; next: Point } | null,
): ReactElement {
  const width = state.strokeWidth ?? 1;
  const heads: ReactElement[] = [];
  if (state.markerEnd !== undefined && endTangent !== null) {
    heads.push(arrowhead(endTangent.end, endTangent.from, width, state.markerEnd));
  }
  // `orient="auto-start-reverse"`: the start marker points back along the line.
  if (state.markerStart !== undefined && startTangent !== null) {
    heads.push(arrowhead(startTangent.start, startTangent.next, width, state.markerStart));
  }
  if (heads.length === 0) return shape;
  return (
    <G>
      {shape}
      {heads.map((h, index) => (
        <Fragment key={index}>{h}</Fragment>
      ))}
    </G>
  );
}

// ---------------------------------------------------------------------------
// Tree walking
// ---------------------------------------------------------------------------

const SKIPPED = new Set(['title', 'desc', 'defs', 'marker']);

type Component = ComponentType<Record<string, unknown>>;

function asElement(node: ReactNode): ReactElement<Props> | null {
  return isValidElement(node) ? (node as ReactElement<Props>) : null;
}

/** Calls through plain function components until an intrinsic element is reached. */
function expand(node: ReactNode): ReactNode {
  const el = asElement(node);
  if (el === null || typeof el.type !== 'function') return node;
  const render = el.type as (props: Props) => ReactNode;
  return expand(render(el.props));
}

function textRuns(el: ReactElement<Props>, state: Inherited, key: string): ReactElement[] {
  const style = (el.props.style ?? {}) as Readonly<Record<string, unknown>>;
  const fontSize = num(style.fontSize) ?? 13;
  const weight = num(style.fontWeight) ?? 400;
  const upper = style.textTransform === 'uppercase';
  const x = num(el.props.x) ?? 0;
  let y = num(el.props.y) ?? 0;
  const anchor = str(el.props.textAnchor) ?? 'start';
  const fill = paint(state.fill, state, colour.ink);
  const family = state.font === 'serif' ? serif : sans;
  // Registered weights: Inter 400/500/600, Source Serif 4 400/600/700.
  const fontWeight = state.font === 'serif' ? (weight >= 600 ? 600 : 400) : weight;

  const runs: ReactElement[] = [];
  const children = Children.toArray(el.props.children as ReactNode);
  const lines: { text: string; x: number; dy: number }[] = [];
  for (const child of children) {
    if (typeof child === 'string' || typeof child === 'number') {
      lines.push({ text: String(child), x, dy: 0 });
      continue;
    }
    const span = asElement(child);
    if (span?.type !== 'tspan') throw new Error('Illustration print: unexpected child inside <text>.');
    const content = Children.toArray(span.props.children as ReactNode)
      .map((part) => (typeof part === 'string' || typeof part === 'number' ? String(part) : ''))
      .join('');
    lines.push({ text: content, x: num(span.props.x) ?? x, dy: num(span.props.dy) ?? 0 });
  }
  lines.forEach((line, index) => {
    y += line.dy;
    runs.push(
      <SvgText
        key={`${key}-${String(index)}`}
        x={line.x}
        y={y}
        fill={fill}
        textAnchor={anchor as 'start' | 'middle' | 'end'}
        style={{ fontFamily: family, fontSize, fontWeight }}
      >
        {upper ? line.text.toUpperCase() : line.text}
      </SvgText>,
    );
  });
  return runs;
}

function convert(node: ReactNode, parent: Inherited, key: string): ReactNode {
  const expanded = expand(node);
  if (expanded === null || expanded === undefined || typeof expanded === 'boolean') return null;
  if (Array.isArray(expanded)) {
    return expanded.map((child, index) => convert(child as ReactNode, parent, `${key}.${String(index)}`));
  }
  const el = asElement(expanded);
  if (el === null) {
    const text = typeof expanded === 'string' || typeof expanded === 'number' ? String(expanded) : typeof expanded;
    throw new Error(`Illustration print: unexpected text node "${text}".`);
  }
  const kind = el.type;
  const props = el.props;

  if (kind === Fragment) {
    return Children.toArray(props.children as ReactNode).map((child, index) =>
      convert(child, parent, `${key}.${String(index)}`),
    );
  }
  if (typeof kind !== 'string') throw new Error('Illustration print: unexpected element type.');
  if (SKIPPED.has(kind)) return null;

  const state = inherit(parent, props);
  const n = (name: string): number => num(props[name]) ?? 0;

  switch (kind) {
    case 'g':
      return (
        <G key={key}>
          {Children.toArray(props.children as ReactNode).map((child, index) =>
            convert(child, state, `${key}.${String(index)}`),
          )}
        </G>
      );
    case 'line': {
      const shape = (
        <Line x1={n('x1')} y1={n('y1')} x2={n('x2')} y2={n('y2')} {...paintProps(state, props, 'open')} />
      );
      return (
        <Fragment key={key}>
          {withMarkers(
            shape,
            state,
            { end: [n('x2'), n('y2')], from: [n('x1'), n('y1')] },
            { start: [n('x1'), n('y1')], next: [n('x2'), n('y2')] },
          )}
        </Fragment>
      );
    }
    case 'rect': {
      const transform = str(props.transform);
      if (transform !== undefined) {
        const m = /^rotate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/.exec(transform);
        if (m === null) throw new Error(`Illustration print: unsupported transform "${transform}".`);
        const [a, cx, cy] = [Number(m[1]), Number(m[2]), Number(m[3])];
        const rad = (a * Math.PI) / 180;
        const corners: Point[] = [
          [n('x'), n('y')],
          [n('x') + n('width'), n('y')],
          [n('x') + n('width'), n('y') + n('height')],
          [n('x'), n('y') + n('height')],
        ];
        const points = corners
          .map(([px, py]) => {
            const dx = px - cx;
            const dy = py - cy;
            return `${(cx + dx * Math.cos(rad) - dy * Math.sin(rad)).toFixed(2)},${(cy + dx * Math.sin(rad) + dy * Math.cos(rad)).toFixed(2)}`;
          })
          .join(' ');
        return <Polygon key={key} points={points} {...paintProps(state, props, 'closed')} />;
      }
      const rx = num(props.rx);
      const ry = num(props.ry);
      return (
        <Rect
          key={key}
          x={n('x')}
          y={n('y')}
          width={n('width')}
          height={n('height')}
          {...(rx === undefined ? {} : { rx })}
          {...(ry === undefined ? {} : { ry })}
          {...paintProps(state, props, 'closed')}
        />
      );
    }
    case 'circle':
      return <Circle key={key} cx={n('cx')} cy={n('cy')} r={n('r')} {...paintProps(state, props, 'closed')} />;
    case 'ellipse':
      return (
        <Ellipse key={key} cx={n('cx')} cy={n('cy')} rx={n('rx')} ry={n('ry')} {...paintProps(state, props, 'closed')} />
      );
    case 'path': {
      const d = str(props.d) ?? '';
      const shape = <Path d={d} {...paintProps(state, props, 'closed')} />;
      return (
        <Fragment key={key}>
          {withMarkers(shape, state, state.markerEnd === undefined ? null : pathEnd(d), null)}
        </Fragment>
      );
    }
    case 'polyline': {
      const points = str(props.points) ?? '';
      const pairs = points
        .trim()
        .split(/\s+/)
        .map((p) => p.split(',').map(Number) as unknown as Point);
      const shape = <Polyline points={points} {...paintProps(state, props, 'closed')} />;
      const last = pairs[pairs.length - 1];
      const before = pairs[pairs.length - 2];
      return (
        <Fragment key={key}>
          {withMarkers(shape, state, last !== undefined && before !== undefined ? { end: last, from: before } : null, null)}
        </Fragment>
      );
    }
    case 'text':
      return <Fragment key={key}>{textRuns(el, state, key)}</Fragment>;
    default:
      throw new Error(`Illustration print: unsupported element <${kind}>.`);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface PrintableIllustration {
  readonly title: string;
  readonly description: string;
  readonly caption: string | null;
  readonly basis: IllustrationBasis;
  readonly viewWidth: number;
  readonly viewHeight: number;
  /** The drawing at a given width in points; height follows the viewBox. */
  readonly drawing: (width: number) => ReactElement;
}

/** Reads a web illustration element (e.g. `<RoutesIllustration />`) into its printable form. */
export function toPrintable(element: ReactElement): PrintableIllustration {
  let node: ReactElement<Props> | null = element as ReactElement<Props>;
  while (node !== null && node.type !== Illustration) {
    if (typeof node.type !== 'function') throw new Error('Illustration print: element is not an illustration.');
    node = asElement((node.type as (p: Props) => ReactNode)(node.props));
  }
  if (node === null) throw new Error('Illustration print: element is not an illustration.');
  const props = node.props;
  const viewBox = (str(props.viewBox) ?? '').split(/\s+/).map(Number);
  const [vx, vy, vw, vh] = viewBox;
  if (vx !== 0 || vy !== 0 || vw === undefined || vh === undefined) {
    throw new Error('Illustration print: expected a viewBox anchored at the origin.');
  }
  const caption = props.caption;
  if (caption !== undefined && typeof caption !== 'string') {
    throw new Error('Illustration print: captions must be plain text to print.');
  }
  const root: Inherited = {
    color: colour.ink,
    fill: undefined,
    stroke: undefined,
    strokeWidth: undefined,
    strokeDasharray: undefined,
    strokeLinecap: undefined,
    strokeLinejoin: undefined,
    markerEnd: undefined,
    markerStart: undefined,
    font: 'sans',
  };
  // Convert once, eagerly, so an unsupported construct fails at build time.
  const body = convert(<>{props.children as ReactNode}</>, root, 'f');
  return {
    title: str(props.title) ?? '',
    description: str(props.description) ?? '',
    caption: caption ?? null,
    basis: props.basis as IllustrationBasis,
    viewWidth: vw,
    viewHeight: vh,
    drawing: (width: number) => (
      <Svg width={width} height={(width * vh) / vw} viewBox={`0 0 ${String(vw)} ${String(vh)}`}>
        {body}
      </Svg>
    ),
  };
}

const printableCache = new Map<IllustrationKey, PrintableIllustration>();

const patientCache = new Map<PatientIllustrationKey, PrintableIllustration>();

/**
 * The patient version of a drawing, by key: drawn on a narrower canvas so its
 * labels print near nine to ten points. See `components/illustrations/patient`.
 */
export function patientIllustration(key: PatientIllustrationKey): PrintableIllustration {
  const cached = patientCache.get(key);
  if (cached !== undefined) return cached;
  const component = PATIENT_ILLUSTRATIONS[key] as unknown as Component;
  const printable = toPrintable(createElement(component, { id: `print-patient-${key}` }));
  patientCache.set(key, printable);
  return printable;
}

/** A registered web illustration, by the key pages already use. */
export function printableIllustration(key: IllustrationKey): PrintableIllustration {
  const cached = printableCache.get(key);
  if (cached !== undefined) return cached;
  const component = ILLUSTRATIONS[key] as unknown as Component;
  const printable = toPrintable(createElement(component, { id: `print-${key}` }));
  printableCache.set(key, printable);
  return printable;
}

export function basisLine(basis: IllustrationBasis): string {
  if (basis.kind === 'method') return `How this index works · ${basis.note}`;
  return `Drawn from ${basis.claimKeys.length === 1 ? 'claim' : 'claims'} ${basis.claimKeys.join(', ')}`;
}

/**
 * A numbered figure: the drawing on a mist ground, its caption, and what it was
 * drawn from. Never split across a page, so the caption always travels with
 * the drawing it explains.
 */
export function IllustrationPlate({
  illustration,
  number,
  caption,
  width = contentWidth,
}: {
  illustration: IllustrationKey | PrintableIllustration;
  number?: string;
  /** Replaces the web caption where a publication needs its own wording. */
  caption?: string;
  width?: number;
}) {
  const figure = typeof illustration === 'string' ? printableIllustration(illustration) : illustration;
  const text = caption ?? figure.caption;
  return (
    <View style={{ marginTop: 8, marginBottom: 12, width }} wrap={false}>
      <View style={{ backgroundColor: colour.mist, borderRadius: 4, paddingVertical: 10, paddingHorizontal: 12 }}>
        {figure.drawing(width - 24)}
      </View>
      {text === null ? null : (
        <View style={{ flexDirection: 'row', marginTop: 7 }}>
          {number === undefined ? null : (
            <Text style={{ fontFamily: sans, fontSize: type.caption, color: colour.tideTeal, marginRight: 6 }}>
              {number}
            </Text>
          )}
          <Text
            style={{ flex: 1, fontFamily: serif, fontSize: type.small, lineHeight: leading.tight, color: colour.inkSoft }}
          >
            {text}
          </Text>
        </View>
      )}
      <Text style={{ fontFamily: sans, fontSize: 6.4, lineHeight: leading.tight, color: colour.slate, marginTop: 4 }}>
        {basisLine(figure.basis)}
      </Text>
    </View>
  );
}

/**
 * A concept in one picture: a question, a drawing, one short explanation.
 *
 * The teaching unit of the patient volume. A reader who stops after the
 * explanation has the idea; the chapter underneath is for the one who does not.
 * The explanation is the drawing's own caption unless a publication passes its
 * own, which must then rest on the same claims as the drawing.
 */
export function ConceptPlate({
  eyebrow,
  headline,
  illustration,
  explanation,
  more,
}: {
  eyebrow?: string;
  headline: string;
  illustration: IllustrationKey | PrintableIllustration;
  explanation?: string;
  /** Where the fuller account is, e.g. "Chapter four". */
  more?: string;
}) {
  const figure = typeof illustration === 'string' ? printableIllustration(illustration) : illustration;
  const text = explanation ?? figure.caption;
  return (
    <View style={{ marginBottom: 12 }} wrap={false}>
      {eyebrow === undefined ? null : (
        <Text
          style={{
            fontFamily: sans,
            fontSize: type.micro,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            color: colour.tideTeal,
            marginBottom: 3,
          }}
        >
          {eyebrow}
        </Text>
      )}
      <Text style={{ fontFamily: serif, fontSize: type.title - 8, lineHeight: leading.title, color: colour.ink, marginBottom: 6 }}>
        {headline}
      </Text>
      <View style={{ backgroundColor: colour.mist, borderRadius: 4, paddingVertical: 8, paddingHorizontal: 12 }}>
        {figure.drawing(contentWidth - 24)}
      </View>
      {text === null ? null : (
        <Text
          style={{ fontFamily: serif, fontSize: type.body + 1, lineHeight: leading.tight, color: colour.ink, marginTop: 6 }}
        >
          {text}
        </Text>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
        <Text style={{ flex: 1, fontFamily: sans, fontSize: 6.4, lineHeight: leading.tight, color: colour.slate }}>
          {basisLine(figure.basis)}
        </Text>
        {more === undefined ? null : (
          <Text style={{ fontFamily: sans, fontSize: type.micro, color: colour.deepTide, marginLeft: 12 }}>{more}</Text>
        )}
      </View>
    </View>
  );
}
