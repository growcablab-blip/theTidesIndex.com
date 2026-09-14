import { arrowUrl, DASH, Illustration, Label, softArrowUrl, STROKE } from './frame';

/**
 * Drawings of how this index works: the evidence classes it keeps apart, how it
 * records what is not known, and why protocols are compared and never merged.
 * Their basis is the method the database enforces, not a scientific claim.
 */

// ---------------------------------------------------------------------------
// Human vs preclinical vs reference: three lanes that never merge
// ---------------------------------------------------------------------------

export function EvidenceLanesIllustration({ id = 'ill-evidence-lanes' }: { id?: string }) {
  const lanes = [
    { y: 58, label: 'In people', sub: 'human studies', cls: 'text-[var(--color-evidence-human)]', bg: 'fill-[var(--color-evidence-human-bg)]', shape: 'circle' },
    { y: 132, label: 'In animals, cells or tissue', sub: 'preclinical studies', cls: 'text-[var(--color-evidence-preclinical)]', bg: 'fill-[var(--color-evidence-preclinical-bg)]', shape: 'square' },
    { y: 206, label: 'Reported, not studied', sub: 'practitioner and reference material', cls: 'text-[var(--color-evidence-reference)]', bg: 'fill-[var(--color-evidence-reference-bg)]', shape: 'diamond' },
  ] as const;
  const marks = [300, 360, 420, 500];

  return (
    <Illustration
      id={id}
      title="Three kinds of evidence, kept in separate lanes"
      description="Three horizontal lanes. The first holds evidence from studies in people, marked with circles. The second holds evidence from animals, cells or tissue, marked with squares. The third holds what practitioners or reference works report without a study, marked with diamonds. An arrow from the animal lane towards the human lane is crossed out: a result in animals does not become a result in people."
      viewBox="0 0 800 270"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'Every piece of evidence carries one of these three classes, and the database will not let a preclinical record be labelled as human evidence.',
      }}
      caption="The first question to ask of any statement is which lane it came from. A finding stays where it was made."
    >
      {lanes.map((lane) => (
        <g key={lane.label}>
          <rect x={20} y={lane.y - 30} width={560} height={58} rx={12} className={lane.bg} />
          <Label x={40} y={lane.y - 4} lines={[lane.label]} size="sm" weight={600} anchor="start" />
          <Label x={40} y={lane.y + 14} lines={[lane.sub]} size="xs" tone="slate" anchor="start" />
          <g className={lane.cls}>
            {marks.map((mx) =>
              lane.shape === 'circle' ? (
                <circle key={mx} cx={mx} cy={lane.y} r={10} fill="currentColor" />
              ) : lane.shape === 'square' ? (
                <rect key={mx} x={mx - 9} y={lane.y - 9} width={18} height={18} rx={2} fill="currentColor" />
              ) : (
                <rect key={mx} x={mx - 8} y={lane.y - 8} width={16} height={16} fill="currentColor" transform={`rotate(45 ${String(mx)} ${String(lane.y)})`} />
              ),
            )}
          </g>
        </g>
      ))}

      {/* A preclinical result does not climb into the human lane */}
      <path d="M 548 124 C 590 110, 604 84, 590 66" fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <g stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.emphasis} strokeLinecap="round">
        <line x1={590} y1={86} x2={610} y2={106} />
        <line x1={610} y1={86} x2={590} y2={106} />
      </g>
      <Label x={626} y={92} lines={['a result in animals', 'does not become', 'a result in people']} size="xs" tone="caution" anchor="start" weight={500} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Known → not known → what would settle it
// ---------------------------------------------------------------------------

export function KnownUnknownIllustration({ id = 'ill-known-unknown' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="What is known, what is not, and what would settle it"
      description="Three columns joined by arrows. What is known is drawn as solid marks resting on sources. What is not known is drawn as hollow dashed marks with no source beneath them. What would settle it is drawn as an outlined study that would turn a hollow mark into a solid one."
      viewBox="0 0 800 230"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'Every open research question records what is not established, why, and the kind of evidence that would resolve it.',
      }}
      caption="An absence of evidence is recorded as an absence, with its reason — never turned into a claim that something does not work."
    >
      {[
        { x: 40, title: 'What is known', sub: ['stated by a source,', 'at a location you can check'] },
        { x: 300, title: 'What is not known', sub: ['recorded as a gap,', 'with the reason why'] },
        { x: 560, title: 'What would settle it', sub: ['the kind of study', 'that would answer it'] },
      ].map((c) => (
        <g key={c.title}>
          <Label x={c.x} y={36} lines={[c.title]} serif size="md" weight={600} anchor="start" />
          <Label x={c.x} y={186} lines={c.sub} size="xs" tone="slate" anchor="start" />
        </g>
      ))}

      {/* Known: solid marks on a source base */}
      {[70, 110, 150].map((x) => (
        <g key={x}>
          <circle cx={x} cy={104} r={13} className="fill-tide-teal" />
          <line x1={x} y1={117} x2={x} y2={138} stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} />
        </g>
      ))}
      <rect x={52} y={138} width={118} height={12} rx={3} className="fill-deep-tide" />

      <line x1={206} y1={110} x2={278} y2={110} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Not known: hollow dashed marks, no base */}
      {[330, 370, 410].map((x) => (
        <circle key={x} cx={x} cy={104} r={13} className="fill-warm-white text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      ))}
      <Label x={370} y={148} lines={['?']} size="lg" tone="caution" weight={600} />

      <line x1={466} y1={110} x2={538} y2={110} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* What would settle it */}
      <rect x={570} y={76} width={160} height={66} rx={10} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={650} y={104} lines={['a study designed', 'to answer it']} size="xs" tone="deep" weight={500} />
      <circle cx={752} cy={109} r={11} className="fill-tide-teal" opacity={0.35} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Protocols: compared side by side, never averaged
// ---------------------------------------------------------------------------

export function ProtocolComparisonIllustration({ id = 'ill-protocol-comparison' }: { id?: string }) {
  const columns = ['route', 'amount', 'frequency', 'duration'];
  const rows = [
    { label: 'Source A', diff: [false, false, true, false] },
    { label: 'Source B', diff: [false, true, false, true] },
    { label: 'Source C', diff: [true, false, false, false] },
  ];
  return (
    <Illustration
      id={id}
      title="Protocols compared side by side, and never averaged"
      description="A grid with a row for each source and columns for route, amount, frequency and duration. Cells where one source differs from the others are outlined. To the right, a cell labelled average is crossed out: this index never combines sources into one regimen."
      viewBox="0 0 800 250"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'Every regimen is attributed to the source that reported it. No average, consensus or recommended dose is ever computed.',
      }}
      caption="Where sources disagree, the disagreement is the finding. Each row stays attributed; nothing is blended into a ‘standard’ protocol."
    >
      {columns.map((c, i) => (
        <Label key={c} x={206 + i * 96} y={40} lines={[c]} size="xs" tone="slate" caps />
      ))}
      {rows.map((r, ri) => {
        const y = 62 + ri * 54;
        return (
          <g key={r.label}>
            <Label x={40} y={y + 26} lines={[r.label]} size="sm" weight={600} anchor="start" />
            {r.diff.map((d, ci) => (
              <rect
                key={`${r.label}-${String(ci)}`}
                x={164 + ci * 96}
                y={y}
                width={84}
                height={40}
                rx={8}
                className={d ? 'fill-caution-bg text-[var(--color-caution)]' : 'fill-warm-white text-rule'}
                stroke="currentColor"
                strokeWidth={d ? STROKE.emphasis : STROKE.line}
              />
            ))}
          </g>
        );
      })}
      <Label x={356} y={236} lines={['outlined: where one source differs from the others']} size="xs" tone="caution" />

      {/* Never averaged */}
      <rect x={594} y={98} width={150} height={60} rx={10} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <Label x={669} y={132} lines={['“average protocol”']} size="xs" tone="slate" />
      <g stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.emphasis} strokeLinecap="round">
        <line x1={604} y1={106} x2={734} y2={150} />
      </g>
      <line x1={548} y1={128} x2={588} y2={128} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <Label x={669} y={186} lines={['never computed']} size="xs" tone="caution" weight={600} />
    </Illustration>
  );
}
