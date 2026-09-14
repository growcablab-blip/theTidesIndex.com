import type { PractitionerProtocol } from '@/server/public/queries';

/**
 * Where a compound's regimens come from, seen at once.
 *
 * The comparison table answers "what does each source say". This answers the
 * question a clinician asks first and the table cannot show quickly: is any of
 * this from a trial, or is all of it somebody's practice?
 *
 * Deterministic SVG, drawn from the records rather than illustrated: each
 * regimen is one mark, placed in the lane for the kind of source that
 * published it. Lane order runs from the strongest provenance to the weakest,
 * which is a statement about where a schedule came from and not about whether
 * it suits anyone. There is no scale, no score and no recommended row.
 */

interface Lane {
  readonly key: string;
  readonly label: string;
  readonly note: string;
  readonly tone: string;
}

const LANES: readonly Lane[] = [
  {
    key: 'label',
    label: 'Approved labelling',
    note: 'Authorised by a regulator, for one product and indication',
    tone: 'var(--color-evidence-human)',
  },
  {
    key: 'trial',
    label: 'Human study',
    note: 'The schedule a study in people actually used',
    tone: 'var(--color-evidence-human)',
  },
  {
    key: 'preclinical',
    label: 'Preclinical',
    note: 'An animal or laboratory schedule. Never a human regimen',
    tone: 'var(--color-evidence-preclinical)',
  },
  {
    key: 'practice',
    label: 'Practitioner material',
    note: 'What a clinician or author reports using. No study unless stated',
    tone: 'var(--color-slate)',
  },
];

const TRIAL = /rct|controlled|prospective|observational|case|pk_pd|human/i;
const PRECLINICAL = /animal|vitro|ex_vivo|preclinical/i;

function laneFor(protocol: PractitionerProtocol): string {
  const key = `${protocol.evidenceTypeLabel}`.toLowerCase();
  if (key.includes('approved') || key.includes('label')) return 'label';
  if (PRECLINICAL.test(key)) return 'preclinical';
  if (TRIAL.test(key)) return 'trial';
  return 'practice';
}

export function ProtocolProvenanceFigure({
  protocols,
  compoundName,
}: {
  protocols: readonly PractitionerProtocol[];
  compoundName: string;
}) {
  if (protocols.length === 0) return null;

  const counted = LANES.map((lane) => ({
    ...lane,
    items: protocols.filter((protocol) => laneFor(protocol) === lane.key),
  }));
  const widest = Math.max(...counted.map((lane) => lane.items.length), 1);
  const used = counted.filter((lane) => lane.items.length > 0);
  const fromStudy = counted
    .filter((lane) => lane.key === 'label' || lane.key === 'trial')
    .reduce((total, lane) => total + lane.items.length, 0);

  const rowHeight = 46;
  const height = LANES.length * rowHeight + 8;
  const labelWidth = 168;
  const markSize = 13;
  const gap = 6;

  return (
    <figure className="my-2">
      <figcaption className="mb-3 max-w-[66ch] text-sm text-ink-soft">
        {protocols.length} recorded {protocols.length === 1 ? 'regimen' : 'regimens'} for{' '}
        {compoundName}, by the kind of source that published each.{' '}
        {fromStudy === 0
          ? 'None comes from approved labelling or a study in people.'
          : `${fromStudy} of them ${fromStudy === 1 ? 'comes' : 'come'} from approved labelling or a study in people.`}
      </figcaption>

      <svg
        viewBox={`0 0 560 ${String(height)}`}
        width="100%"
        role="img"
        aria-label={`Regimens for ${compoundName} grouped by kind of source: ${used
          .map((lane) => `${String(lane.items.length)} ${lane.label.toLowerCase()}`)
          .join(', ')}.`}
        className="max-w-[560px]"
      >
        {counted.map((lane, index) => {
          const y = index * rowHeight + 8;
          const empty = lane.items.length === 0;
          return (
            <g key={lane.key} opacity={empty ? 0.38 : 1}>
              <text
                x={0}
                y={y + 13}
                fontSize={11.5}
                fill="var(--color-ink)"
                fontFamily="var(--font-sans, system-ui)"
              >
                {lane.label}
              </text>
              <text
                x={0}
                y={y + 28}
                fontSize={9.5}
                fill="var(--color-slate)"
                fontFamily="var(--font-sans, system-ui)"
              >
                {lane.note}
              </text>

              <line
                x1={labelWidth}
                y1={y + 18}
                x2={556}
                y2={y + 18}
                stroke="var(--color-rule-soft)"
                strokeWidth={1}
                strokeDasharray={empty ? '3 3' : undefined}
              />

              {lane.items.map((protocol, mark) => (
                <rect
                  key={protocol.id}
                  x={labelWidth + 8 + mark * (markSize + gap)}
                  y={y + 18 - markSize / 2}
                  width={markSize}
                  height={markSize}
                  rx={2.5}
                  fill={lane.tone}
                  opacity={lane.key === 'practice' ? 0.55 : 0.9}
                />
              ))}

              {empty ? (
                <text
                  x={labelWidth + 8}
                  y={y + 22}
                  fontSize={10}
                  fill="var(--color-slate)"
                  fontFamily="var(--font-sans, system-ui)"
                >
                  none recorded
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      <p className="mt-2 max-w-[66ch] text-xs text-slate">
        One mark is one recorded regimen. Lanes run from the strongest provenance to the weakest;
        that is a statement about where a schedule came from, not about whether it works or suits
        anyone. Widest lane here holds {widest}.
      </p>
    </figure>
  );
}
