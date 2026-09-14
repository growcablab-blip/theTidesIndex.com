import type { ReactNode } from 'react';

/**
 * The Tides Index illustration system — shared frame and drawing parts.
 *
 * One visual language for every explanatory drawing on the site, so a reader
 * learns it once. The rules, which the figures in this folder hold to:
 *
 *   - **Schematic, never quantitative.** No axis scales, no values, no doses. A
 *     drawing implies precision faster than prose does, so it must not carry
 *     any it has not earned.
 *   - **Drawn from something.** Every figure states its basis: the claim keys it
 *     rests on (a sourced drawing), or this index's own method (a drawing of how
 *     the index works, which needs no scientific source). A figure never shows a
 *     mechanism, effect or number that its basis does not state.
 *   - **Real text and an accessible name.** SVG text, `role="img"`, a title and
 *     a description tied by `aria-labelledby`, so the figure is one object for a
 *     screen reader and survives print and search.
 *   - **Tokens, not hues.** `currentColor` and the palette classes, and never
 *     colour alone: every distinction is also a shape, a dash or a word.
 *   - **Unique ids.** Markers and gradients are namespaced by the figure id, so
 *     two figures on one page never share (and silently swap) a definition.
 */

export const STROKE = {
  hairline: 1,
  line: 1.5,
  emphasis: 2.2,
} as const;

/** The dash used for anything absent, unsourced or not established. */
export const DASH = '5 4';

export type IllustrationBasis =
  | { readonly kind: 'claims'; readonly claimKeys: readonly string[] }
  | { readonly kind: 'method'; readonly note: string };

export function arrowUrl(id: string): string {
  return `url(#${id}-arrow)`;
}

export function softArrowUrl(id: string): string {
  return `url(#${id}-arrow-soft)`;
}

export function Illustration({
  id,
  title,
  description,
  viewBox,
  minWidth = 520,
  caption,
  basis,
  children,
  tone = 'mist',
}: {
  id: string;
  title: string;
  description: string;
  viewBox: string;
  minWidth?: number;
  caption?: ReactNode;
  basis: IllustrationBasis;
  children: ReactNode;
  tone?: 'mist' | 'plain';
}) {
  const titleId = `${id}-title`;
  const descId = `${id}-desc`;
  return (
    <figure className="avoid-break my-6">
      <div
        className={
          tone === 'mist'
            ? 'rounded-xl border border-rule-soft bg-mist px-3 py-5 sm:px-6 sm:py-7'
            : 'px-1 py-2'
        }
      >
        <p className="no-print mb-2 text-xs text-slate sm:hidden" aria-hidden="true">
          Scroll the drawing sideways to see all of it.
        </p>
        <div className="overflow-x-auto">
          <svg
            viewBox={viewBox}
            role="img"
            aria-labelledby={`${titleId} ${descId}`}
            className="mx-auto block h-auto w-full text-ink"
            style={{ minWidth }}
            preserveAspectRatio="xMidYMid meet"
          >
            <title id={titleId}>{title}</title>
            <desc id={descId}>{description}</desc>
            <defs>
              <marker
                id={`${id}-arrow`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-deep-tide" />
              </marker>
              <marker
                id={`${id}-arrow-soft`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" className="fill-slate" />
              </marker>
            </defs>
            {children}
          </svg>
        </div>
      </div>
      <figcaption className="mt-3 max-w-[72ch] text-sm leading-relaxed text-ink-soft">
        {caption !== undefined ? <span className="block">{caption}</span> : null}
        <BasisLine basis={basis} />
      </figcaption>
    </figure>
  );
}

function BasisLine({ basis }: { basis: IllustrationBasis }) {
  if (basis.kind === 'method') {
    return (
      <span className="mt-1.5 block text-xs text-slate">
        <span className="meta-label mr-1.5">How this index works</span>
        {basis.note}
      </span>
    );
  }
  return (
    <span className="mt-1.5 block text-xs text-slate">
      <span className="meta-label mr-1.5">Drawn from</span>
      {basis.claimKeys.length === 1 ? 'claim ' : 'claims '}
      <span className="tabular">{basis.claimKeys.join(', ')}</span>
      <span className="sr-only">
        {' '}
        — each drawing shows only what these sourced claims state, schematically and without values.
      </span>
    </span>
  );
}

type Tone = 'ink' | 'soft' | 'slate' | 'teal' | 'deep' | 'caution' | 'preclinical' | 'reference';

const TONE_FILL: Record<Tone, string> = {
  ink: 'fill-ink',
  soft: 'fill-ink-soft',
  slate: 'fill-slate',
  teal: 'fill-tide-teal',
  deep: 'fill-deep-tide',
  caution: 'fill-[var(--color-caution)]',
  preclinical: 'fill-[var(--color-evidence-preclinical)]',
  reference: 'fill-[var(--color-evidence-reference)]',
};

const SIZE: Record<'xs' | 'sm' | 'md' | 'lg', number> = { xs: 11.5, sm: 13, md: 15, lg: 17 };

/**
 * A label, optionally over several lines. Lines are passed explicitly rather
 * than wrapped by measurement, so layout is deterministic and reviewable.
 */
export function Label({
  x,
  y,
  lines,
  anchor = 'middle',
  tone = 'ink',
  size = 'sm',
  weight = 400,
  serif = false,
  lineHeight = 1.3,
  caps = false,
}: {
  x: number;
  y: number;
  lines: readonly string[];
  anchor?: 'start' | 'middle' | 'end';
  tone?: Tone;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  weight?: 400 | 500 | 600;
  serif?: boolean;
  lineHeight?: number;
  caps?: boolean;
}) {
  const px = SIZE[size];
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      className={`${TONE_FILL[tone]} ${serif ? 'font-serif' : 'font-sans'}`}
      style={{
        fontSize: px,
        fontWeight: weight,
        letterSpacing: caps ? '0.08em' : undefined,
        textTransform: caps ? 'uppercase' : undefined,
      }}
    >
      {lines.map((line, i) => (
        <tspan key={`${line}-${String(i)}`} x={x} dy={i === 0 ? 0 : px * lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

/**
 * A chain of residues, drawn as beads on a line. Used for amino acids, peptides
 * and proteins alike, so the scale change between them reads as one idea.
 */
export function BeadChain({
  points,
  radius = 11,
  className = 'text-tide-teal',
  fill = 'fill-sea-glass',
}: {
  points: readonly (readonly [number, number])[];
  radius?: number;
  className?: string;
  fill?: string;
}) {
  return (
    <g className={className}>
      <polyline
        points={points.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={STROKE.line}
      />
      {points.map(([x, y], i) => (
        <circle
          key={`${String(x)}-${String(y)}-${String(i)}`}
          cx={x}
          cy={y}
          r={radius}
          className={fill}
          stroke="currentColor"
          strokeWidth={STROKE.line}
        />
      ))}
    </g>
  );
}
