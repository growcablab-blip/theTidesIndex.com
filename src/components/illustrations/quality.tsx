import { arrowUrl, DASH, Illustration, Label, softArrowUrl, STROKE } from './frame';

/**
 * Explanatory drawings for manufacturing and quality: the journey from a
 * sequence to a vial, and what identity, sterility, endotoxin and freeze-drying
 * checks actually establish. Each rests on quality-topic claims extracted from
 * held sources, and describes expectations and methods — never how any product
 * was made or tested.
 */

// ---------------------------------------------------------------------------
// Sequence → synthesis → purification → testing → vial
// ---------------------------------------------------------------------------

type JourneyStep = {
  key: string;
  title: string;
  note: readonly string[];
  glyph: 'sequence' | 'beads' | 'column' | 'check' | 'vial';
};

const JOURNEY: readonly JourneyStep[] = [
  { key: 'sequence', title: 'Sequence', note: ['the order of amino', 'acids, on paper'], glyph: 'sequence' },
  { key: 'synthesis', title: 'Synthesis', note: ['built one amino acid', 'at a time on beads'], glyph: 'beads' },
  { key: 'purification', title: 'Purification', note: ['wrong and shorter', 'chains removed'], glyph: 'column' },
  { key: 'testing', title: 'Testing', note: ['several different tests,', 'read together'], glyph: 'check' },
  { key: 'vial', title: 'Final vial', note: ['filled, sealed, sometimes', 'freeze-dried, released'], glyph: 'vial' },
];

function JourneyGlyph({ cx, cy, glyph }: { cx: number; cy: number; glyph: JourneyStep['glyph'] }) {
  switch (glyph) {
    case 'sequence':
      return (
        <g>
          {[-24, -8, 8, 24].map((dx, i) => (
            <rect key={dx} x={cx + dx - 7} y={cy - 7} width={14} height={14} rx={3} className={i % 2 === 0 ? 'fill-tide-teal' : 'fill-sea-glass text-tide-teal'} stroke="currentColor" strokeWidth={STROKE.hairline} />
          ))}
        </g>
      );
    case 'beads':
      return (
        <g className="text-tide-teal">
          <circle cx={cx - 16} cy={cy + 10} r={11} className="fill-rule-soft" stroke="currentColor" strokeWidth={STROKE.line} />
          <polyline points={`${String(cx - 8)},${String(cy + 2)} ${String(cx + 4)},${String(cy - 10)} ${String(cx + 16)},${String(cy - 2)} ${String(cx + 26)},${String(cy - 14)}`} fill="none" stroke="currentColor" strokeWidth={STROKE.line} />
          {[
            [cx + 4, cy - 10],
            [cx + 16, cy - 2],
            [cx + 26, cy - 14],
          ].map(([x, y]) => (
            <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.hairline} />
          ))}
        </g>
      );
    case 'column':
      return (
        <g className="text-tide-teal">
          <rect x={cx - 12} y={cy - 24} width={24} height={48} rx={5} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
          <rect x={cx - 8} y={cy - 4} width={16} height={6} rx={2} className="fill-tide-teal" />
          <rect x={cx - 8} y={cy + 10} width={16} height={5} rx={2} className="fill-tide-teal" opacity={0.35} />
        </g>
      );
    case 'check':
      return (
        <g>
          {[-16, 0, 16].map((dx) => (
            <circle key={dx} cx={cx + dx} cy={cy} r={10} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
          ))}
          <path d={`M ${String(cx - 21)} ${String(cy)} l 4 4 l 7 -8`} fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} />
          <path d={`M ${String(cx - 5)} ${String(cy)} l 4 4 l 7 -8`} fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} />
          <path d={`M ${String(cx + 11)} ${String(cy)} l 4 4 l 7 -8`} fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} />
        </g>
      );
    case 'vial':
      return (
        <g className="text-tide-teal">
          <rect x={cx - 9} y={cy - 26} width={18} height={9} rx={2} className="fill-deep-tide" />
          <path d={`M ${String(cx - 12)} ${String(cy - 17)} h 24 v 38 q 0 7 -7 7 h -10 q -7 0 -7 -7 z`} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
          <rect x={cx - 9} y={cy + 6} width={18} height={14} rx={3} className="fill-sea-glass" />
        </g>
      );
  }
}

export function SequenceToVialJourneyIllustration({ id = 'ill-sequence-to-vial' }: { id?: string }) {
  const xs = JOURNEY.map((_, i) => 84 + i * 158);
  return (
    <Illustration
      id={id}
      title="From a sequence on paper to material in a vial"
      description="Five stages joined by arrows. Sequence: the intended order of amino acids. Synthesis: the chain is built one amino acid at a time on insoluble beads and cut free. Purification: wrong and shorter chains made during synthesis are removed. Testing: several different kinds of test, read together. Final vial: filled, sealed, sometimes freeze-dried, and released."
      viewBox="0 0 800 220"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['SPPS-001', 'SPPS-002', 'PUR-001', 'PUR-005', 'ID-007', 'STER-008', 'LYO-001', 'TRACE-005'] }}
      caption="Each stage answers a different question, and each test speaks to a different stage. A result from one stage says nothing about the others."
    >
      {JOURNEY.map((s, i) => {
        const x = xs[i] ?? 0;
        return (
          <g key={s.key}>
            <circle cx={x} cy={84} r={44} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={i === JOURNEY.length - 1 ? STROKE.emphasis : STROKE.line} />
            <JourneyGlyph cx={x} cy={84} glyph={s.glyph} />
            <Label x={x} y={156} lines={[s.title]} serif size="md" weight={600} />
            <Label x={x} y={176} lines={s.note} size="xs" tone="soft" />
            {i < JOURNEY.length - 1 ? (
              <line x1={x + 50} y1={84} x2={x + 104} y2={84} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Identity: mass measured, compared with what was expected
// ---------------------------------------------------------------------------

export function MassIdentityIllustration({ id = 'ill-mass-identity' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="What a mass measurement establishes about identity"
      description="A sample goes into a mass spectrometer, which measures the mass of the molecules in it. The measured mass is set beside the mass expected for the intended molecule: close agreement supports identity; a different mass can reveal an unintended change. One common method shows several peaks for one substance because the molecule carries different numbers of charges. A separate test is needed to show how pure the sample is or how much is present."
      viewBox="0 0 800 250"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['ID-001', 'ID-002', 'ID-003', 'ID-004', 'ID-005', 'HPLC-006'] }}
      caption="Identity is a comparison: a measured mass against an expected one, close rather than identical. It says what the substance is — not how pure it is or how much of it there is."
    >
      <rect x={24} y={86} width={120} height={60} rx={10} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={84} y={112} lines={['sample']} size="sm" tone="soft" />
      {[64, 84, 104].map((x) => (
        <circle key={x} cx={x} cy={128} r={4} className="fill-deep-tide" />
      ))}
      <line x1={148} y1={116} x2={196} y2={116} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      <rect x={204} y={70} width={170} height={92} rx={12} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={289} y={108} lines={['mass', 'spectrometer']} size="sm" tone="deep" weight={600} />
      <line x1={378} y1={116} x2={426} y2={116} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Spectrum: several charge states of one substance */}
      <line x1={440} y1={170} x2={640} y2={170} stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} />
      {[
        [466, 40],
        [510, 78],
        [556, 96],
        [600, 58],
      ].map(([x, h]) => (
        <line key={x} x1={x} y1={170} x2={x} y2={170 - (h ?? 0)} stroke="currentColor" className="text-tide-teal" strokeWidth={4} strokeLinecap="round" />
      ))}
      <Label x={540} y={194} lines={['one substance can appear as', 'several peaks (different charges)']} size="xs" tone="slate" />

      {/* Comparison */}
      <line x1={648} y1={116} x2={676} y2={116} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <rect x={684} y={60} width={100} height={46} rx={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={734} y={80} lines={['measured', 'mass']} size="xs" tone="soft" />
      <Label x={734} y={126} lines={['≈']} size="lg" tone="teal" weight={600} />
      <rect x={684} y={138} width={100} height={46} rx={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <Label x={734} y={158} lines={['expected', 'mass']} size="xs" tone="soft" />
      <Label x={734} y={214} lines={['close, not identical']} size="xs" tone="teal" weight={500} />

      <Label x={24} y={232} lines={['Not shown by this test: how pure the sample is, or how much of it there is.']} size="xs" tone="caution" anchor="start" weight={500} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Sterility: the last check in a chain, not proof on its own
// ---------------------------------------------------------------------------

export function SterilityIllustration({ id = 'ill-sterility' }: { id?: string }) {
  const chain = ['sterilising filter', 'filled under sterile conditions', 'sealed, integrity checked', 'monitoring, read together'];
  return (
    <Illustration
      id={id}
      title="What a sterility test does and does not show"
      description="A chain of controls leads to a finished batch: a sterilising filter, filling under sterile conditions, sealing with container integrity checked, and monitoring read together. At the end, a sample of containers goes to the sterility test. A pass means nothing grew from the containers tested; it does not show every container in the batch is sterile. The test only counts if the lab showed germs could still grow in the presence of that product."
      viewBox="0 0 800 260"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['STER-001', 'STER-002', 'STER-003', 'STER-004', 'STER-008', 'STER-009', 'STER-011'] }}
      caption="European rules for sterile medicines say sterility cannot be tested into a product. The finished-product test is the last link in a chain of controls, and a pass describes only the containers sampled."
    >
      {chain.map((c, i) => {
        const x = 20 + i * 150;
        return (
          <g key={c}>
            <rect x={x} y={60} width={132} height={58} rx={10} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={x + 66} y={i === 1 ? 84 : 92} lines={c.split(', ').length > 1 ? c.split(', ') : c.length > 20 ? [c.slice(0, c.indexOf(' ', 10)), c.slice(c.indexOf(' ', 10) + 1)] : [c]} size="xs" tone="soft" />
            {i < chain.length - 1 ? (
              <line x1={x + 134} y1={89} x2={x + 146} y2={89} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
      <Label x={20} y={40} lines={['Controls during manufacture']} size="xs" tone="slate" anchor="start" caps />

      <line x1={620} y1={89} x2={652} y2={89} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      {/* The sampled containers */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i} className={i < 2 ? 'text-tide-teal' : 'text-slate'}>
          <path
            d={`M ${String(664 + i * 21)} 74 h 14 v 30 q 0 5 -5 5 h -4 q -5 0 -5 -5 z`}
            className={i < 2 ? 'fill-sea-glass' : 'fill-warm-white'}
            stroke="currentColor"
            strokeWidth={STROKE.line}
            strokeDasharray={i < 2 ? undefined : DASH}
          />
        </g>
      ))}
      <Label x={726} y={132} lines={['a sample of', 'containers is tested']} size="xs" tone="soft" />

      <rect x={450} y={176} width={330} height={62} rx={12} className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={466} y={200} lines={['A pass means nothing grew from the containers', 'tested — only if the lab first showed germs could', 'still grow in the presence of that product.']} size="xs" tone="caution" anchor="start" />
      <line x1={700} y1={148} x2={660} y2={172} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Endotoxin: a result means something only against a product's own limit
// ---------------------------------------------------------------------------

export function EndotoxinIllustration({ id = 'ill-endotoxin' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="Why an endotoxin result needs a limit beside it"
      description="Endotoxin comes from the outer wall of certain bacteria and can remain when no living organism does. A sample is tested with a reagent from horseshoe crab blood cells. The result is compared with a limit set for that product according to how much of it is given. Beside the test, the lab must show the product does not interfere with it. And if samples from several vials are pooled, one contaminated vial can be diluted enough to go unnoticed."
      viewBox="0 0 800 260"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['ENDO-001', 'ENDO-002', 'ENDO-003', 'ENDO-004', 'ENDO-005'] }}
      caption="A number on its own says little. An endotoxin result means something only next to the product's own limit, from a test the product was shown not to interfere with."
    >
      {/* Bacterium and its fragments */}
      <ellipse cx={80} cy={90} rx={50} ry={30} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      {[
        [48, 64],
        [118, 70],
        [132, 106],
        [36, 116],
      ].map(([x, y]) => (
        <path key={`${String(x)}-${String(y)}`} d={`M ${String(x)} ${String(y)} l 6 -4 l 5 5 l -6 4 z`} className="fill-[var(--color-caution)]" />
      ))}
      <Label x={80} y={148} lines={['fragments of bacterial', 'cell wall can remain', 'when no germ does']} size="xs" tone="soft" />

      <line x1={146} y1={90} x2={206} y2={90} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <rect x={214} y={58} width={170} height={64} rx={12} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={299} y={86} lines={['endotoxin test', '(horseshoe crab reagent)']} size="xs" tone="deep" weight={500} />

      <line x1={388} y1={90} x2={444} y2={90} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Result against a limit */}
      <line x1={460} y1={40} x2={460} y2={140} stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} />
      <line x1={460} y1={140} x2={620} y2={140} stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} />
      <line x1={460} y1={70} x2={620} y2={70} stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.emphasis} strokeDasharray={DASH} />
      <Label x={626} y={66} lines={["this product's", 'own limit']} size="xs" tone="caution" anchor="start" weight={500} />
      <rect x={520} y={104} width={36} height={36} rx={3} className="fill-tide-teal" opacity={0.75} />
      <Label x={538} y={160} lines={['result']} size="xs" tone="soft" />
      <Label x={540} y={32} lines={['set by how much of the product is given']} size="xs" tone="slate" />

      {/* Interference and pooling */}
      <rect x={20} y={196} width={360} height={48} rx={10} className="fill-warm-white text-rule" stroke="currentColor" />
      <Label x={36} y={216} lines={['The lab must show the product does not', 'interfere with the test.']} size="xs" tone="soft" anchor="start" />
      <rect x={420} y={196} width={360} height={48} rx={10} className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" />
      <Label x={436} y={216} lines={['Pooling several vials can dilute one', 'contaminated vial below detection.']} size="xs" tone="caution" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Freeze-drying
// ---------------------------------------------------------------------------

export function LyophilisationIllustration({ id = 'ill-lyophilisation' }: { id?: string }) {
  const stages = [
    { title: 'Freeze', note: ['the solution is', 'frozen solid'] },
    { title: 'Primary drying', note: ['under low pressure, water', 'leaves as vapour'] },
    { title: 'Secondary drying', note: ['remaining bound', 'water is removed'] },
  ];
  return (
    <Illustration
      id={id}
      title="Freeze-drying, and the separate qualities of a dried product"
      description="Three stages: the solution is frozen; in primary drying, under low pressure, water leaves as vapour without passing back through a liquid; in secondary drying remaining water is removed, leaving a dried cake. How well the process is controlled affects the product. The dried cake has many separate qualities, each needing its own check: how it looks, moisture left, how it dissolves, strength, impurities and sterility."
      viewBox="0 0 800 270"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['LYO-001', 'LYO-002', 'LYO-003', 'LYO-004', 'LYO-005'] }}
      caption="‘Freeze-dried’ describes a process, not a quality. Poorly controlled drying can damage a product, and for sterile medicines the whole cycle is part of keeping it sterile."
    >
      {stages.map((s, i) => {
        const x = 30 + i * 180;
        return (
          <g key={s.title}>
            {/* Vial */}
            <path d={`M ${String(x + 42)} 50 h 36 v 12 h 6 v 86 q 0 10 -10 10 h -34 q -10 0 -10 -10 v -86 h 6 z`} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            {i === 0 ? <rect x={x + 42} y={98} width={36} height={52} rx={4} className="fill-sea-glass" /> : null}
            {i === 0
              ? [0, 1, 2].map((k) => <path key={k} d={`M ${String(x + 48 + k * 11)} 116 l 4 -6 l 4 6 l -4 6 z`} className="fill-tide-teal" opacity={0.6} />)
              : null}
            {i === 1 ? (
              <g>
                <rect x={x + 42} y={120} width={36} height={30} rx={4} className="fill-sea-glass" />
                {[0, 1, 2].map((k) => (
                  <path key={k} d={`M ${String(x + 52 + k * 8)} 112 q -4 -10 0 -20 q 4 -10 0 -20`} fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray="3 3" />
                ))}
              </g>
            ) : null}
            {i === 2 ? <rect x={x + 44} y={128} width={32} height={22} rx={3} className="fill-tide-teal" opacity={0.85} /> : null}
            <Label x={x + 60} y={186} lines={[s.title]} serif size="md" weight={600} />
            <Label x={x + 60} y={206} lines={s.note} size="xs" tone="soft" />
            {i < stages.length - 1 ? (
              <line x1={x + 118} y1={104} x2={x + 162} y2={104} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
      <Label x={330} y={36} lines={['low pressure']} size="xs" tone="slate" />

      <line x1={552} y1={40} x2={552} y2={240} className="text-rule" stroke="currentColor" />
      <Label x={574} y={50} lines={['Separate qualities of the', 'dried cake, each its own check']} size="xs" tone="slate" anchor="start" caps />
      {['how it looks', 'moisture left', 'how it dissolves', 'strength', 'impurities', 'sterility'].map((q, i) => (
        <g key={q}>
          <rect x={574} y={82 + i * 28} width={12} height={12} rx={2} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
          <Label x={596} y={93 + i * 28} lines={[q]} size="xs" tone="soft" anchor="start" />
        </g>
      ))}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Chain of custody: from maker to vial, and where a result stops applying
// ---------------------------------------------------------------------------

export function ChainOfCustodyIllustration({ id = 'ill-chain-of-custody' }: { id?: string }) {
  const links = [
    { title: 'Manufacturer', note: ['makes and records', 'each batch'] },
    { title: 'Release', note: ['batch formally', 'released'] },
    { title: 'Supplier or reseller', note: ['should name the maker', 'and the batch'] },
    { title: 'Repacking', note: ['a chance of mix-up', 'or contamination'] },
    { title: 'Shipping and storage', note: ['conditions defined', 'and followed'] },
  ];
  return (
    <Illustration
      id={id}
      title="Chain of custody, and where a test result stops applying"
      description="Five links from maker to recipient: the manufacturer makes and records each batch; the batch is formally released; a supplier or reseller should name the original maker and the batch; each repacking brings a chance of mix-up or contamination; shipping and storage conditions should be defined and followed. A test result describes material at the point it was tested, not after later links."
      viewBox="0 0 800 230"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['TRACE-002', 'TRACE-005', 'TRACE-006', 'TRANS-001', 'TRANS-002', 'TRANS-003', 'STAB-003'] }}
      caption="A certificate is a snapshot of one batch at one moment. Every later link in the chain is a place where that snapshot can stop describing what is in your hand."
    >
      {links.map((l, i) => {
        const x = 20 + i * 156;
        return (
          <g key={l.title}>
            <rect x={x} y={56} width={136} height={62} rx={31} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={x + 68} y={i === 2 || i === 4 ? 82 : 92} lines={l.title.includes(' or ') ? ['Supplier or', 'reseller'] : l.title.includes(' and ') ? ['Shipping and', 'storage'] : [l.title]} size="sm" weight={600} />
            <Label x={x + 68} y={142} lines={l.note} size="xs" tone="soft" />
            {i < links.length - 1 ? (
              <line x1={x + 138} y1={87} x2={x + 152} y2={87} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
      {/* The tested snapshot */}
      <path d="M 88 184 h 220" fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.emphasis} />
      <path d="M 308 184 h 460" fill="none" stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <circle cx={234} cy={184} r={6} className="fill-tide-teal" />
      <Label x={234} y={210} lines={['tested here']} size="xs" tone="teal" weight={600} />
      <Label x={560} y={210} lines={['after this point, the result describes the material as it was then']} size="xs" tone="caution" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Purity ≠ identity ≠ content ≠ sterility ≠ endotoxin
// ---------------------------------------------------------------------------

type QuestionKey = 'purity' | 'identity' | 'content' | 'sterility' | 'endotoxin';

function QuestionGlyph({ cx, cy, kind }: { cx: number; cy: number; kind: QuestionKey }) {
  switch (kind) {
    case 'purity':
      return (
        <g className="text-tide-teal">
          <line x1={cx - 40} y1={cy + 14} x2={cx + 40} y2={cy + 14} className="text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <path d={`M ${String(cx - 38)} ${String(cy + 14)} L ${String(cx - 16)} ${String(cy + 14)} C ${String(cx - 8)} ${String(cy + 14)}, ${String(cx - 7)} ${String(cy - 16)}, ${String(cx)} ${String(cy - 16)} C ${String(cx + 7)} ${String(cy - 16)}, ${String(cx + 8)} ${String(cy + 14)}, ${String(cx + 16)} ${String(cy + 14)} L ${String(cx + 38)} ${String(cy + 14)}`} fill="none" stroke="currentColor" strokeWidth={STROKE.line} />
        </g>
      );
    case 'identity':
      return (
        <g>
          <circle cx={cx - 20} cy={cy} r={8} className="fill-deep-tide" />
          <Label x={cx} y={cy + 6} lines={['≈']} size="md" tone="teal" weight={600} />
          <circle cx={cx + 20} cy={cy} r={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray="3 2" />
        </g>
      );
    case 'content':
      return (
        <g className="text-tide-teal">
          <line x1={cx - 22} y1={cy + 14} x2={cx + 22} y2={cy + 14} className="text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <rect x={cx - 14} y={cy - 2} width={10} height={16} rx={2} className="fill-tide-teal" />
          <rect x={cx + 4} y={cy - 14} width={10} height={28} rx={2} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.hairline} />
        </g>
      );
    case 'sterility':
      return (
        <g>
          {[-16, 0, 16].map((dx, i) => (
            <path
              key={dx}
              d={`M ${String(cx + dx - 6)} ${String(cy - 14)} h 12 v 22 q 0 5 -5 5 h -2 q -5 0 -5 -5 z`}
              className={i === 0 ? 'fill-sea-glass text-tide-teal' : 'fill-warm-white text-slate'}
              stroke="currentColor"
              strokeWidth={STROKE.hairline}
              strokeDasharray={i === 0 ? undefined : '3 2'}
            />
          ))}
        </g>
      );
    case 'endotoxin':
      return (
        <g>
          <line x1={cx - 24} y1={cy + 14} x2={cx + 24} y2={cy + 14} className="text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <line x1={cx - 24} y1={cy - 10} x2={cx + 24} y2={cy - 10} className="text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray="4 3" />
          <rect x={cx - 6} y={cy} width={12} height={14} rx={2} className="fill-tide-teal" />
        </g>
      );
  }
}

export function SeparateQuestionsIllustration({ id = 'ill-separate-questions' }: { id?: string }) {
  const questions: readonly { key: QuestionKey; title: string; asks: readonly string[]; not: readonly string[] }[] = [
    { key: 'purity', title: 'Purity', asks: ['how mixed is', 'the sample?'], not: ['what the', 'substance is'] },
    { key: 'identity', title: 'Identity', asks: ['is it the', 'intended molecule?'], not: ['how much of it', 'there is'] },
    { key: 'content', title: 'Content', asks: ['how much peptide', 'is present?'], not: ['how pure', 'the sample is'] },
    { key: 'sterility', title: 'Sterility', asks: ['did anything grow', 'in what was tested?'], not: ['that every', 'container is sterile'] },
    { key: 'endotoxin', title: 'Endotoxin', asks: ['is it within the', 'product’s own limit?'], not: ['anything, without', 'that limit beside it'] },
  ];
  return (
    <Illustration
      id={id}
      title="Five questions a vial raises, and five different tests"
      description="Five tiles separated by not-equal signs. Purity asks how mixed the sample is, and does not show what the substance is. Identity asks whether it is the intended molecule, and does not show how much of it there is. Content asks how much peptide is present, and does not show how pure the sample is. Sterility asks whether anything grew in what was tested, and does not show that every container is sterile. Endotoxin asks whether the result is within the product's own limit, and means nothing without that limit beside it."
      viewBox="0 0 800 290"
      minWidth={640}
      basis={{ kind: 'claims', claimKeys: ['HPLC-001', 'HPLC-002', 'HPLC-005', 'HPLC-006', 'HPLC-007', 'ID-002', 'STER-003', 'ENDO-003'] }}
      caption="Purity, identity, content, sterility and endotoxin are separate questions, each answered by its own kind of test. A good answer to one is not an answer to any other, and each answers less than its name suggests."
    >
      {questions.map((q, i) => {
        const x = 20 + i * 156;
        const cx = x + 68;
        return (
          <g key={q.key}>
            <rect x={x} y={30} width={136} height={220} rx={14} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={cx} y={60} lines={[q.title]} serif size="md" weight={600} />
            <QuestionGlyph cx={cx} cy={94} kind={q.key} />
            <Label x={cx} y={132} lines={['asks']} size="xs" tone="slate" caps />
            <Label x={cx} y={150} lines={q.asks} size="xs" tone="deep" weight={500} />
            <line x1={x + 16} y1={184} x2={x + 120} y2={184} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
            <Label x={cx} y={204} lines={['does not show']} size="xs" tone="caution" caps />
            <Label x={cx} y={222} lines={q.not} size="xs" tone="soft" />
            {i < questions.length - 1 ? <Label x={x + 146} y={146} lines={['≠']} size="lg" tone="slate" weight={600} /> : null}
          </g>
        );
      })}
      <Label x={400} y={276} lines={['Each test answers its own question. None of them answers another.']} size="xs" tone="slate" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// A chromatogram: one peak is not one substance
// ---------------------------------------------------------------------------

function peakPath(mu: number, sigma: number, height: number, base: number): string {
  const pts: string[] = [];
  for (let x = mu - 4 * sigma; x <= mu + 4 * sigma; x += 3) {
    const y = base - height * Math.exp(-((x - mu) ** 2) / (2 * sigma * sigma));
    pts.push(`${pts.length === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return pts.join(' ');
}

export function ChromatogramIllustration({ id = 'ill-chromatogram' }: { id?: string }) {
  const base = 180;
  return (
    <Illustration
      id={id}
      title="One symmetrical peak is not one substance"
      description="Two chromatograms side by side, with no values. On the left, a single symmetrical peak that looks like one substance. On the right, the same sample under conditions that separate it: two overlapping peaks, the second a different species that had been hidden inside the first. Whether the two separate depends on the method and on the condition of the column."
      viewBox="0 0 800 250"
      minWidth={600}
      basis={{ kind: 'claims', claimKeys: ['HPLC-002', 'HPLC-003', 'HPLC-004'] }}
      caption="A purity test separates what is in a sample; it does not say what anything is. Peptides that differ by a single amino acid can come out as one clean peak, and a worn column can hide a difference a good one would show."
    >
      {[
        { x0: 60, title: 'One symmetrical peak' },
        { x0: 440, title: 'The same sample, separated' },
      ].map((panel) => (
        <g key={panel.x0}>
          <Label x={panel.x0 + 150} y={36} lines={[panel.title]} serif size="md" weight={600} />
          <line x1={panel.x0} y1={base} x2={panel.x0 + 300} y2={base} className="text-slate" stroke="currentColor" strokeWidth={STROKE.line} markerEnd={softArrowUrl(id)} />
          <line x1={panel.x0} y1={base} x2={panel.x0} y2={56} className="text-slate" stroke="currentColor" strokeWidth={STROKE.line} />
          <Label x={panel.x0 + 300} y={base + 22} lines={['time on the column']} size="xs" tone="slate" anchor="end" />
        </g>
      ))}
      <path d={peakPath(210, 22, 110, base)} fill="none" className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={244} y={80} lines={['looks like one substance']} size="xs" tone="teal" anchor="start" weight={500} />

      <path d={peakPath(572, 19, 104, base)} fill="none" className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <path d={peakPath(618, 19, 78, base)} fill="none" className="text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.emphasis} strokeDasharray="6 3" />
      <Label x={646} y={102} lines={['a second species,', 'hidden in the first']} size="xs" tone="caution" anchor="start" weight={500} />

      <Label x={400} y={238} lines={['Whether two species separate depends on the method and the column, not on the material.']} size="xs" tone="slate" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// The quality spine: sequence to final vial, with every check in its place
// ---------------------------------------------------------------------------

export type SpineStageKey =
  | 'sequence'
  | 'synthesis'
  | 'purification'
  | 'identity'
  | 'content'
  | 'sterility'
  | 'fill'
  | 'freeze-drying'
  | 'batch'
  | 'vial';

/** The stages of the spine, shared with the print volume's chapter rail. */
export const QUALITY_SPINE_STAGES: readonly { key: SpineStageKey; title: readonly string[]; note: string }[] = [
  { key: 'sequence', title: ['Sequence'], note: 'the intended order' },
  { key: 'synthesis', title: ['Synthesis'], note: 'built on beads' },
  { key: 'purification', title: ['Purification'], note: 'purity checked' },
  { key: 'identity', title: ['Identity'], note: 'mass compared' },
  { key: 'content', title: ['Content'], note: 'amount measured' },
  { key: 'sterility', title: ['Sterility and', 'endotoxin'], note: 'controlled, then tested' },
  { key: 'fill', title: ['Fill and finish'], note: 'filled and sealed' },
  { key: 'freeze-drying', title: ['Freeze-drying'], note: 'where it is used' },
  { key: 'batch', title: ['Batch record'], note: 'documented, released' },
  { key: 'vial', title: ['Final vial'], note: 'then stored and shipped' },
];

function SpineGlyph({ cx, cy, kind }: { cx: number; cy: number; kind: SpineStageKey }) {
  switch (kind) {
    case 'sequence':
      return <JourneyGlyph cx={cx} cy={cy} glyph="sequence" />;
    case 'synthesis':
      return <JourneyGlyph cx={cx - 4} cy={cy + 2} glyph="beads" />;
    case 'purification':
      return <JourneyGlyph cx={cx} cy={cy} glyph="column" />;
    case 'identity':
      return (
        <g>
          <circle cx={cx - 13} cy={cy} r={6} className="fill-deep-tide" />
          <Label x={cx} y={cy + 5} lines={['≈']} size="sm" tone="teal" weight={600} />
          <circle cx={cx + 13} cy={cy} r={6} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray="3 2" />
        </g>
      );
    case 'content':
      return (
        <g className="text-tide-teal">
          <line x1={cx - 16} y1={cy + 13} x2={cx + 16} y2={cy + 13} className="text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
          <rect x={cx - 11} y={cy - 1} width={8} height={14} rx={2} className="fill-tide-teal" />
          <rect x={cx + 3} y={cy - 13} width={8} height={26} rx={2} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.hairline} />
        </g>
      );
    case 'sterility':
      return (
        <g>
          <path d={`M ${String(cx - 8)} ${String(cy - 14)} h 16 v 22 q 0 6 -6 6 h -4 q -6 0 -6 -6 z`} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
          <circle cx={cx} cy={cy} r={20} fill="none" className="text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.hairline} strokeDasharray="3 3" />
        </g>
      );
    case 'fill':
      return (
        <g className="text-tide-teal">
          <rect x={cx - 3} y={cy - 24} width={6} height={10} rx={1} className="fill-deep-tide" />
          <circle cx={cx} cy={cy - 9} r={2} className="fill-tide-teal" />
          <path d={`M ${String(cx - 10)} ${String(cy - 4)} h 20 v 20 q 0 6 -6 6 h -8 q -6 0 -6 -6 z`} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
          <rect x={cx - 7} y={cy + 8} width={14} height={9} rx={2} className="fill-sea-glass" />
        </g>
      );
    case 'freeze-drying':
      return (
        <g>
          {[-11, 0, 11].map((dx) => (
            <path key={dx} d={`M ${String(cx + dx)} ${String(cy - 7)} l 5 7 l -5 7 l -5 -7 z`} className="fill-tide-teal" opacity={0.7} />
          ))}
        </g>
      );
    case 'batch':
      return (
        <g className="text-tide-teal">
          <rect x={cx - 12} y={cy - 16} width={24} height={32} rx={2} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
          {[0, 1, 2].map((i) => (
            <line key={i} x1={cx - 7} y1={cy - 8 + i * 8} x2={cx + 7} y2={cy - 8 + i * 8} stroke="currentColor" strokeWidth={STROKE.hairline} />
          ))}
        </g>
      );
    case 'vial':
      return <JourneyGlyph cx={cx} cy={cy + 2} glyph="vial" />;
  }
}

export function QualitySpineIllustration({
  id = 'ill-quality-spine',
  highlight = [],
}: {
  id?: string;
  /** Stages to emphasise; the rest are drawn quietly. Empty draws every stage alike. */
  highlight?: readonly SpineStageKey[];
}) {
  const xs = [80, 240, 400, 560, 720];
  const isOn = (key: SpineStageKey) => highlight.length === 0 || highlight.includes(key);
  const isMarked = (key: SpineStageKey) => highlight.includes(key);
  return (
    <Illustration
      id={id}
      title="From sequence to final vial, with each check in its place"
      description="Ten stages in reading order across two rows. Sequence, the intended order of amino acids. Synthesis, built on beads. Purification, where purity is checked. Identity, where a measured mass is compared with the expected one. Content, where the amount is measured. Sterility and endotoxin, controlled along the way and tested on the finished product. Fill and finish, filled and sealed. Freeze-drying, where it is used. Batch record, documented and released. Final vial, then stored and shipped."
      viewBox="0 0 800 290"
      minWidth={640}
      basis={{ kind: 'claims', claimKeys: ['SPPS-001', 'PUR-001', 'HPLC-002', 'ID-002', 'HPLC-005', 'STER-002', 'STER-008', 'STER-009', 'ENDO-003', 'LYO-001', 'TRACE-002', 'TRACE-005', 'TRANS-001'] }}
      caption="The path from a sequence to a vial. Each check sits at a particular point along it, and a result describes the material at that point — not before it, and not after."
    >
      {QUALITY_SPINE_STAGES.map((stage, i) => {
        const row = i < 5 ? 0 : 1;
        const cx = xs[i % 5] ?? 0;
        const cy = row === 0 ? 64 : 196;
        const on = isOn(stage.key);
        const marked = isMarked(stage.key);
        return (
          <g key={stage.key}>
            <circle
              cx={cx}
              cy={cy}
              r={34}
              className={marked ? 'fill-sea-glass text-deep-tide' : on ? 'fill-warm-white text-tide-teal' : 'fill-warm-white text-rule'}
              stroke="currentColor"
              strokeWidth={marked || stage.key === 'vial' ? STROKE.emphasis : STROKE.line}
            />
            {on ? <SpineGlyph cx={cx} cy={cy} kind={stage.key} /> : <circle cx={cx} cy={cy} r={4} className="fill-rule" />}
            <Label x={cx} y={cy + 50} lines={stage.title} size="sm" weight={600} tone={on ? 'ink' : 'slate'} lineHeight={1.2} />
            <Label x={cx} y={cy + 50 + stage.title.length * 16} lines={[stage.note]} size="xs" tone={on ? 'soft' : 'slate'} />
            {i % 5 < 4 ? (
              <line x1={cx + 38} y1={cy} x2={cx + 120} y2={cy} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
      <path d="M 756 64 C 792 64, 792 150, 752 150 L 112 150 Q 80 150 80 158" fill="none" stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Formulation: what else is in the vial, and why
// ---------------------------------------------------------------------------

export function FormulationIllustration({ id = 'ill-formulation' }: { id?: string }) {
  const stresses = [
    ['oxidation'],
    ['breakdown by water,', 'strongly tied to acidity'],
    ['clumping, from freezing,', 'heat or shaking'],
    ['sticking to surfaces'],
  ];
  const answers = [
    ['buffers, against', 'acidity-driven breakdown'],
    ['antioxidants and', 'metal-binding agents'],
    ['sugars, as stabilisers', 'against oxidation'],
    ['surfactants, against', 'clumping from shaking'],
  ];
  return (
    <Illustration
      id={id}
      title="What else is in a peptide product, and why"
      description="A vial holding a peptide chain and several added ingredients. On the left, ways a peptide in solution can change: oxidation, breakdown by water that depends strongly on acidity, clumping from freezing, heat or shaking, and sticking to surfaces. On the right, ingredients formulations add against them: buffers, antioxidants and metal-binding agents, sugars, and surfactants. Beneath, a caution: some added ingredients can cause damage themselves, so each formulation has to be tested against the stresses it will meet."
      viewBox="0 0 800 330"
      minWidth={640}
      basis={{ kind: 'claims', claimKeys: ['FORM-01', 'FORM-02', 'FORM-03', 'FORM-08', 'FORM-09', 'FORM-10', 'FORM-11', 'FORM-13', 'FORM-14', 'FORM-15', 'FORM-23'] }}
      caption="Everything in a product besides the active substance is an excipient. Each is there against a way peptides change — and some can do harm of their own, so every formulation has to be tested against the stresses it will meet."
    >
      <Label x={24} y={36} lines={['How a peptide can change']} size="xs" tone="slate" anchor="start" caps />
      <Label x={776} y={36} lines={['What formulations add']} size="xs" tone="slate" anchor="end" caps />

      {/* The vial */}
      <path d="M 364 58 h 72 v 14 h 8 v 158 q 0 14 -14 14 h -60 q -14 0 -14 -14 v -158 h 8 z" className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <rect x={364} y={52} width={72} height={10} rx={3} className="fill-deep-tide" />
      <rect x={362} y={126} width={76} height={110} rx={10} className="fill-sea-glass" />
      <BeadChainLite points={[[378, 168], [396, 158], [414, 168], [432, 158]]} />
      {(
        [
          [382, 206],
          [412, 198],
          [424, 222],
        ] as const
      ).map(([x, y]) => (
        <path key={`${String(x)}-${String(y)}`} d={`M ${String(x)} ${String(y - 6)} l 6 10 h -12 z`} className="fill-deep-tide" opacity={0.6} />
      ))}
      <rect x={394} y={214} width={9} height={9} rx={1} className="fill-slate" opacity={0.6} />
      <Label x={400} y={262} lines={['peptide, and excipients:']} size="xs" tone="deep" weight={500} />
      <Label x={400} y={276} lines={['everything else in the product']} size="xs" tone="deep" weight={500} />

      {stresses.map((lines, i) => {
        const y = 80 + i * 46;
        return (
          <g key={lines[0]}>
            <circle cx={30} cy={y - 4} r={5} className="fill-warm-white text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={44} y={y} lines={lines} size="xs" tone="soft" anchor="start" />
            <line x1={224} y1={y - 4} x2={350} y2={y - 4} className="text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
          </g>
        );
      })}
      {answers.map((lines, i) => {
        const y = 80 + i * 46;
        return (
          <g key={lines[0]}>
            <line x1={590} y1={y - 4} x2={454} y2={y - 4} className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            <rect x={598} y={y - 10} width={12} height={12} rx={2} className="fill-tide-teal" />
            <Label x={620} y={y} lines={lines} size="xs" tone="soft" anchor="start" />
          </g>
        );
      })}

      <rect x={96} y={292} width={608} height={30} rx={10} className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.hairline} />
      <Label x={400} y={311} lines={['Some added ingredients can do harm themselves, so each formulation is tested against its own stresses.']} size="xs" tone="caution" />
    </Illustration>
  );
}

function BeadChainLite({ points }: { points: readonly (readonly [number, number])[] }) {
  return (
    <g className="text-deep-tide">
      <polyline points={points.map(([x, y]) => `${String(x)},${String(y)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={STROKE.line} />
      {points.map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={6} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
      ))}
    </g>
  );
}
