/**
 * Small marks for the twelve quality dimensions.
 *
 * Decorative only: each sits beside its name in words, so the SVG is hidden from
 * assistive technology. Drawn in the same line language as the illustration
 * system (1.6 stroke, currentColor, sea-glass fills) and carrying no values.
 */

export type QualityMarkKind =
  | 'sequence'
  | 'synthesis'
  | 'purification'
  | 'identity'
  | 'content'
  | 'sterility'
  | 'endotoxin'
  | 'fill-finish'
  | 'lyophilisation'
  | 'batch'
  | 'documentation'
  | 'custody';

export function QualityMark({
  kind,
  className = '',
  size = 40,
}: {
  kind: QualityMarkKind;
  className?: string;
  size?: number;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={`shrink-0 text-tide-teal ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'sequence' ? (
        <g>
          {[8, 18, 28].map((x, i) => (
            <rect
              key={x}
              x={x}
              y="19"
              width="9"
              height="9"
              rx="2"
              className={i % 2 === 0 ? 'fill-sea-glass' : ''}
            />
          ))}
          <rect x="38" y="19" width="4" height="9" rx="1.5" strokeDasharray="2 2" />
        </g>
      ) : null}
      {kind === 'synthesis' ? (
        <g>
          <circle cx="13" cy="33" r="7" className="fill-sea-glass" />
          <polyline points="18,28 25,21 32,26 39,17" />
          <circle cx="25" cy="21" r="3" />
          <circle cx="32" cy="26" r="3" />
          <circle cx="39" cy="17" r="3" className="fill-sea-glass" />
        </g>
      ) : null}
      {kind === 'purification' ? (
        <g>
          <rect x="17" y="6" width="14" height="36" rx="4" />
          <rect x="20" y="20" width="8" height="4" rx="1" className="fill-tide-teal" stroke="none" />
          <rect x="20" y="30" width="8" height="3" rx="1" className="fill-sea-glass" stroke="none" />
          <path d="M24 42 v3" />
        </g>
      ) : null}
      {kind === 'identity' ? (
        <g>
          <path d="M8 38 h32" />
          <path d="M14 38 v-9 M21 38 v-19 M28 38 v-23 M35 38 v-13" strokeWidth="3" />
        </g>
      ) : null}
      {kind === 'content' ? (
        <g>
          <path d="M15 10 h18 M17 10 v26 q0 4 4 4 h6 q4 0 4 -4 v-26" />
          <path d="M17 26 h14" />
          <rect x="18.5" y="27" width="11" height="11" rx="2" className="fill-sea-glass" stroke="none" />
        </g>
      ) : null}
      {kind === 'sterility' ? (
        <g>
          <path d="M8 34 q16 -8 32 0" />
          <ellipse cx="24" cy="34" rx="16" ry="5" />
          <circle cx="24" cy="18" r="8" strokeDasharray="3 3" />
        </g>
      ) : null}
      {kind === 'endotoxin' ? (
        <g>
          <path d="M8 16 h32" strokeDasharray="4 3" className="stroke-[var(--color-caution)]" />
          <rect x="16" y="24" width="10" height="16" rx="1.5" className="fill-sea-glass" />
          <path d="M8 40 h32" />
        </g>
      ) : null}
      {kind === 'fill-finish' ? (
        <g>
          <path d="M24 5 v8" />
          <path d="M21 10 l3 4 l3 -4" />
          <rect x="18" y="16" width="12" height="5" rx="1.5" className="fill-deep-tide" stroke="none" />
          <path d="M16 21 h16 v16 q0 5 -5 5 h-6 q-5 0 -5 -5 z" />
        </g>
      ) : null}
      {kind === 'lyophilisation' ? (
        <g>
          <path d="M16 12 h16 v25 q0 5 -5 5 h-6 q-5 0 -5 -5 z" />
          <rect x="18" y="32" width="12" height="7" rx="1.5" className="fill-tide-teal" stroke="none" opacity="0.8" />
          <path d="M21 27 q-2 -4 0 -8 M27 27 q2 -4 0 -8" strokeDasharray="2 2" />
        </g>
      ) : null}
      {kind === 'batch' ? (
        <g>
          <rect x="8" y="14" width="32" height="20" rx="3" />
          <path d="M14 20 v8 M18 20 v8 M21 20 v8 M26 20 v8 M29 20 v8 M34 20 v8" />
        </g>
      ) : null}
      {kind === 'documentation' ? (
        <g>
          <path d="M13 6 h16 l7 7 v29 h-23 z" />
          <path d="M29 6 v7 h7" />
          <path d="M18 22 h13 M18 28 h13 M18 34 h8" />
        </g>
      ) : null}
      {kind === 'custody' ? (
        <g>
          <rect x="4" y="19" width="12" height="10" rx="5" />
          <rect x="18" y="19" width="12" height="10" rx="5" className="fill-sea-glass" />
          <rect x="32" y="19" width="12" height="10" rx="5" strokeDasharray="3 2" />
        </g>
      ) : null}
    </svg>
  );
}
