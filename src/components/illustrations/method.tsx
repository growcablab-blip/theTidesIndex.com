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

type CellState = 'same' | 'differs' | 'none';

function ComparisonCell({ x, y, state }: { x: number; y: number; state: CellState }) {
  if (state === 'none') {
    return (
      <g>
        <rect x={x} y={y} width={84} height={40} rx={8} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
        <Label x={x + 42} y={y + 25} lines={['not reported']} size="xs" tone="slate" />
      </g>
    );
  }
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={84}
        height={40}
        rx={8}
        className={state === 'differs' ? 'fill-caution-bg text-[var(--color-caution)]' : 'fill-sea-glass text-tide-teal'}
        stroke="currentColor"
        strokeWidth={state === 'differs' ? STROKE.emphasis : STROKE.line}
      />
      <Label x={x + 42} y={y + 25} lines={[state === 'differs' ? 'differs' : 'same']} size="xs" tone={state === 'differs' ? 'caution' : 'deep'} weight={600} />
    </g>
  );
}

export function ProtocolComparisonIllustration({ id = 'ill-protocol-comparison' }: { id?: string }) {
  const columns = ['route', 'amount', 'frequency', 'duration'];
  const rows: readonly { label: string; cells: readonly CellState[] }[] = [
    { label: 'Source A', cells: ['same', 'differs', 'same', 'differs'] },
    { label: 'Source B', cells: ['same', 'differs', 'same', 'differs'] },
    { label: 'Source C', cells: ['same', 'none', 'none', 'differs'] },
  ];
  return (
    <Illustration
      id={id}
      title="Protocols compared side by side, and never averaged"
      description="A grid with a row for each source and columns for route, amount, frequency and duration. Each cell says whether the sources report the same thing, report different things, or whether that source does not report the field at all. A field one source leaves out is marked not reported and is never counted as a difference. To the right, a cell labelled average protocol is crossed out: this index never combines sources into one regimen."
      viewBox="0 0 800 250"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'Every regimen is attributed to the source that reported it. A field a source does not report is shown as not reported and never counted as a disagreement. No average, consensus or recommended dose is ever computed.',
      }}
      caption="Where sources differ, the difference is the finding; where a source is silent, the silence is shown as silence. Each row stays attributed, and nothing is blended into a ‘standard’ protocol."
    >
      {columns.map((c, i) => (
        <Label key={c} x={206 + i * 96} y={40} lines={[c]} size="xs" tone="slate" caps />
      ))}
      {rows.map((r, ri) => {
        const y = 62 + ri * 54;
        return (
          <g key={r.label}>
            <Label x={40} y={y + 26} lines={[r.label]} size="sm" weight={600} anchor="start" />
            {r.cells.map((state, ci) => (
              <ComparisonCell key={`${r.label}-${String(ci)}`} x={164 + ci * 96} y={y} state={state} />
            ))}
          </g>
        );
      })}
      <Label x={356} y={236} lines={['same · differs · not reported — silence is never counted as a difference']} size="xs" tone="slate" />

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

// ---------------------------------------------------------------------------
// Source fact, Tides synthesis, source needed
// ---------------------------------------------------------------------------

function DocumentGlyph({ x, y, tone }: { x: number; y: number; tone: 'teal' | 'caution' }) {
  const colourClass = tone === 'teal' ? 'text-tide-teal' : 'text-[var(--color-caution)]';
  return (
    <g>
      <path
        d={`M ${String(x)} ${String(y)} h 40 l 16 16 v 56 h -56 z`}
        className={`fill-warm-white ${colourClass}`}
        stroke="currentColor"
        strokeWidth={STROKE.line}
        strokeDasharray={tone === 'caution' ? DASH : undefined}
      />
      <path d={`M ${String(x + 40)} ${String(y)} v 16 h 16`} fill="none" className={colourClass} stroke="currentColor" strokeWidth={STROKE.hairline} />
      {tone === 'teal' ? (
        [0, 1, 2].map((i) => (
          <line key={i} x1={x + 10} y1={y + 30 + i * 12} x2={x + 46} y2={y + 30 + i * 12} className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.hairline} />
        ))
      ) : (
        <Label x={x + 28} y={y + 50} lines={['?']} size="lg" tone="caution" weight={600} />
      )}
    </g>
  );
}

export function EditorialStatesIllustration({ id = 'ill-editorial-states' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="Source fact, Tides synthesis, source needed"
      description="Three columns. Source fact: a named source document with an arrow to the statement it makes. Tides synthesis: two sourced statements with arrows converging on a conclusion that follows from both, which names every statement it rests on and adds no number or new effect. Source needed: a statement with a dashed line to an empty, dashed document marked with a question mark, because no held source supports it."
      viewBox="0 0 800 220"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'A synthesis is its own record naming the claims it rests on; the database refuses one resting on fewer than two published claims, or containing any numeral. A point no held source supports is recorded as a gap.',
      }}
      caption="Every statement is one of three things, and the page says which: something a named source states, a conclusion drawn openly from several sourced statements, or a point no source held here supports."
    >
      <line x1={270} y1={24} x2={270} y2={204} className="text-rule" stroke="currentColor" />
      <line x1={530} y1={24} x2={530} y2={204} className="text-rule" stroke="currentColor" />

      {/* Source fact */}
      <Label x={30} y={40} lines={['Source fact']} serif size="md" weight={600} anchor="start" />
      <DocumentGlyph x={40} y={70} tone="teal" />
      <line x1={104} y1={106} x2={140} y2={106} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <rect x={148} y={84} width={104} height={44} rx={8} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={200} y={103} lines={['a statement', 'it makes']} size="xs" tone="deep" />
      <Label x={30} y={176} lines={['stated by a named source,', 'at a place you can check']} size="xs" tone="soft" anchor="start" />

      {/* Tides synthesis */}
      <Label x={290} y={40} lines={['Tides synthesis']} serif size="md" weight={600} anchor="start" />
      <rect x={296} y={66} width={92} height={34} rx={8} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={342} y={87} lines={['a statement']} size="xs" tone="deep" />
      <rect x={296} y={120} width={92} height={34} rx={8} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={342} y={141} lines={['a statement']} size="xs" tone="deep" />
      <line x1={392} y1={84} x2={424} y2={102} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <line x1={392} y1={137} x2={424} y2={119} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <rect x={430} y={80} width={90} height={60} rx={10} className="fill-warm-white text-deep-tide" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={475} y={106} lines={['what follows', 'from both']} size="xs" tone="deep" weight={500} />
      <Label x={290} y={176} lines={['names every statement it rests on,', 'and adds no number or new effect']} size="xs" tone="soft" anchor="start" />

      {/* Source needed */}
      <Label x={550} y={40} lines={['Source needed']} serif size="md" weight={600} anchor="start" />
      <rect x={556} y={84} width={104} height={44} rx={8} className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <Label x={608} y={110} lines={['a statement']} size="xs" tone="caution" />
      <line x1={664} y1={106} x2={700} y2={106} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <DocumentGlyph x={708} y={70} tone="caution" />
      <Label x={550} y={176} lines={['no source held here supports it,', 'so the page says so in its place']} size="xs" tone="soft" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// What a study design can answer
// ---------------------------------------------------------------------------

export function DesignGlyph({ cy, kind }: { cy: number; kind: 'trial' | 'uncontrolled' | 'case' | 'exposure' | 'safety' }) {
  const dots = (x0: number, n: number, filled: boolean) =>
    Array.from({ length: n }, (_, i) => (
      <circle
        key={`${String(x0)}-${String(i)}`}
        cx={x0 + 10 + (i % 2) * 12}
        cy={cy - 8 + Math.floor(i / 2) * 14}
        r={4.5}
        className={filled ? 'fill-deep-tide' : 'fill-warm-white text-tide-teal'}
        stroke={filled ? undefined : 'currentColor'}
        strokeWidth={STROKE.hairline}
      />
    ));
  switch (kind) {
    case 'trial':
      return (
        <g>
          <rect x={42} y={cy - 18} width={42} height={36} rx={6} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.hairline} />
          {dots(42, 4, true)}
          <rect x={96} y={cy - 18} width={42} height={36} rx={6} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.hairline} />
          {dots(96, 4, false)}
        </g>
      );
    case 'uncontrolled':
      return (
        <g>
          <rect x={69} y={cy - 18} width={42} height={36} rx={6} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.hairline} />
          {dots(69, 4, true)}
        </g>
      );
    case 'case':
      return <circle cx={90} cy={cy} r={7} className="fill-deep-tide" />;
    case 'exposure':
      return (
        <g>
          <line x1={46} y1={cy + 14} x2={136} y2={cy + 14} className="text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <path d={`M 48 ${String(cy + 14)} C 58 ${String(cy - 22)}, 70 ${String(cy - 20)}, 88 ${String(cy - 2)} S 120 ${String(cy + 12)}, 134 ${String(cy + 12)}`} fill="none" className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
        </g>
      );
    case 'safety':
      return (
        <g>
          <rect x={58} y={cy - 12} width={34} height={24} rx={6} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <circle cx={69} cy={cy} r={4.5} className="fill-deep-tide" />
          <circle cx={81} cy={cy} r={4.5} className="fill-deep-tide" />
          <circle cx={116} cy={cy} r={12} className="fill-warm-white text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray="3 3" />
          <Label x={116} y={cy + 5} lines={['?']} size="sm" tone="caution" weight={600} />
        </g>
      );
  }
}

export function StudyDesignIllustration({ id = 'ill-study-design' }: { id?: string }) {
  const rows = [
    { kind: 'trial', name: ['Randomised trial with', 'a comparison group'], answer: ['can support a statement about effect,', 'in the kind of people studied'] },
    { kind: 'uncontrolled', name: ['Study without a', 'comparison group'], answer: ['describes the people in it; cannot separate', 'the treatment from what would have happened'] },
    { kind: 'case', name: ['A single case'], answer: ['describes one person, and', 'settles nothing on its own'] },
    { kind: 'exposure', name: ['Pharmacokinetic study'], answer: ['answers what the body does to the substance —', 'not whether it helps'] },
    { kind: 'safety', name: ['Small safety study'], answer: ['finding no harm in a small group is', 'not the same as showing it is safe'] },
  ] as const;
  return (
    <Illustration
      id={id}
      title="What a study design can answer"
      description="Five kinds of study, each beside the question it can answer. A randomised trial with a comparison group can support a statement about effect in the kind of people studied. A study without a comparison group describes the people in it but cannot separate the treatment from what would have happened anyway. A single case describes one person. A pharmacokinetic study answers what the body does to a substance, not whether it helps. A small safety study that found no harm has not shown that something is safe."
      viewBox="0 0 800 300"
      minWidth={600}
      basis={{
        kind: 'method',
        note: 'A study’s design is read before its result, because the design decides which question the result can answer. The drawing describes no particular study.',
      }}
      caption="The design decides which question a study can answer. A result belongs to that question — and to the people who were in the study."
    >
      <Label x={180} y={26} lines={['Design']} size="xs" tone="slate" anchor="start" caps />
      <Label x={440} y={26} lines={['What it can answer']} size="xs" tone="slate" anchor="start" caps />
      {rows.map((row, i) => {
        const cy = 62 + i * 52;
        return (
          <g key={row.kind}>
            {i < rows.length - 1 ? (
              <line x1={20} y1={cy + 26} x2={780} y2={cy + 26} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
            ) : null}
            <DesignGlyph cy={cy} kind={row.kind} />
            <Label x={180} y={row.name.length === 1 ? cy + 5 : cy - 3} lines={row.name} size="sm" weight={600} anchor="start" lineHeight={1.2} />
            <Label x={440} y={cy - 3} lines={row.answer} size="xs" tone="soft" anchor="start" />
          </g>
        );
      })}
    </Illustration>
  );
}
