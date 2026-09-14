import type { JourneyIllustrationKey } from '@/domain/learn/journey';

/**
 * Small marks for the learning journey. Decorative — each sits beside its
 * question in words — so they are hidden from assistive technology.
 */
export function JourneyIcon({ kind, className = '' }: { kind: JourneyIllustrationKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      aria-hidden="true"
      className={`text-tide-teal ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'chain-scale' ? (
        <g>
          <polyline points="8,30 17,22 26,30 35,22 42,28" />
          {[
            [8, 30],
            [17, 22],
            [26, 30],
            [35, 22],
          ].map(([x, y]) => (
            <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r="4" className="fill-sea-glass" />
          ))}
        </g>
      ) : null}
      {kind === 'message-receiver' ? (
        <g>
          <circle cx="12" cy="24" r="7" />
          <circle cx="23" cy="24" r="2" className="fill-deep-tide" stroke="none" />
          <circle cx="29" cy="24" r="2" className="fill-deep-tide" stroke="none" />
          <path d="M36 17 h4 v14 h-4" />
          <path d="M33 20 h3 M33 28 h3" />
        </g>
      ) : null}
      {kind === 'circulation' ? (
        <g>
          <path d="M14 14 C 4 22, 8 36, 24 36 C 40 36, 44 22, 34 14" />
          <path d="M34 14 C 30 10, 18 10, 14 14" strokeDasharray="3 3" />
          <path d="M31 11 l 3 3 -3 3" />
          <circle cx="24" cy="36" r="3" className="fill-sea-glass" />
        </g>
      ) : null}
      {kind === 'sequence-to-vial' ? (
        <g>
          <rect x="18" y="8" width="12" height="5" rx="1.5" className="fill-deep-tide" stroke="none" />
          <path d="M16 13 h16 v22 q0 5 -5 5 h-6 q-5 0 -5 -5 z" />
          <path d="M16 28 h16" />
          <rect x="17.5" y="29" width="13" height="9" rx="2" className="fill-sea-glass" stroke="none" />
        </g>
      ) : null}
      {kind === 'mass-identity' ? (
        <g>
          <path d="M8 38 h32" />
          <path d="M14 38 v-10 M21 38 v-20 M28 38 v-24 M35 38 v-14" strokeWidth="3" />
        </g>
      ) : null}
      {kind === 'evidence-lanes' ? (
        <g>
          <rect x="6" y="9" width="36" height="8" rx="3" />
          <rect x="6" y="20" width="36" height="8" rx="3" />
          <rect x="6" y="31" width="36" height="8" rx="3" strokeDasharray="3 2" />
          <circle cx="14" cy="13" r="2" className="fill-tide-teal" stroke="none" />
          <rect x="12" y="22" width="4" height="4" className="fill-[var(--color-evidence-preclinical)]" stroke="none" />
        </g>
      ) : null}
      {kind === 'protocol-comparison' ? (
        <g>
          {[10, 21, 32].map((y) => (
            <g key={y}>
              <rect x="8" y={y} width="9" height="7" rx="1.5" />
              <rect x="19.5" y={y} width="9" height="7" rx="1.5" />
              <rect x="31" y={y} width="9" height="7" rx="1.5" />
            </g>
          ))}
          <rect x="19.5" y="21" width="9" height="7" rx="1.5" className="stroke-[var(--color-caution)]" strokeWidth="2.2" />
        </g>
      ) : null}
    </svg>
  );
}
