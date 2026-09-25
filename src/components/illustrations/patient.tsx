import { arrowUrl, BeadChain, DASH, Illustration, Label, softArrowUrl, STROKE } from './frame';
import { MiniChain } from './biology';
import { DesignGlyph } from './method';
import { JourneyGlyph, QuestionGlyph, type QuestionKey } from './quality';

/**
 * Patient versions of the most-used drawings, and two drawings in body context.
 *
 * The site's figures are drawn on an 800-unit canvas, which prints at the text
 * measure of an A4 page with labels near six and a half points — readable for a
 * practitioner, too small for a patient booklet. These versions are drawn on a
 * 560-unit canvas, so the same label sizes print at roughly nine to ten points,
 * and they carry fewer labels rather than smaller ones. Each rests on the same
 * claims (or method) as its technical counterpart, and says less, never more.
 *
 * The technical versions stay in the main registry for the website and the
 * practitioner volumes. These live in their own registry so the website's
 * figure library is not doubled, and so a publication has to ask for a patient
 * version by name.
 */

// ---------------------------------------------------------------------------
// Amino acid → peptide → protein
// ---------------------------------------------------------------------------

export function PatientChainScaleIllustration({ id = 'ill-patient-chain-scale' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="From an amino acid to a peptide to a protein"
      description="Three panels: one amino acid, a short chain of amino acids called a peptide, and a long folded chain called a protein. A dashed line between peptide and protein marks that where one ends and the other begins is a line scientists choose."
      viewBox="0 0 560 230"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['FND-01', 'FND-02', 'FND-03', 'FND-05', 'FND-09', 'FND-13'] }}
      caption="Peptides and proteins are made of the same building blocks. The difference the sources describe is size — and where a peptide becomes a protein is a line scientists choose."
    >
      <Label x={80} y={34} lines={['Amino acid']} serif size="md" weight={600} />
      <g className="text-tide-teal">
        <line x1={80} y1={94} x2={80} y2={76} stroke="currentColor" strokeWidth={STROKE.line} />
        <rect x={66} y={60} width={28} height={16} rx={5} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
        <circle cx={80} cy={112} r={18} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      </g>
      <Label x={80} y={160} lines={['one building', 'block']} size="xs" tone="soft" />

      <line x1={116} y1={112} x2={196} y2={112} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      <Label x={280} y={34} lines={['Peptide']} serif size="md" weight={600} />
      <BeadChain
        points={[
          [220, 112],
          [250, 100],
          [280, 112],
          [310, 100],
          [340, 112],
        ]}
        radius={11}
      />
      <Label x={280} y={160} lines={['a short chain']} size="xs" tone="soft" />

      <line x1={388} y1={50} x2={388} y2={196} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <line x1={356} y1={112} x2={392} y2={112} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      <Label x={476} y={34} lines={['Protein']} serif size="md" weight={600} />
      <path
        d="M 411 130 C 397 84, 455 58, 477 90 S 543 72, 533 116 S 477 166, 455 140 S 415 148, 435 110 S 511 102, 503 138"
        fill="none"
        stroke="currentColor"
        className="text-tide-teal"
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray="0.1 11"
      />
      <Label x={476} y={186} lines={['a long chain that', 'folds into a shape']} size="xs" tone="soft" />

      <Label x={280} y={222} lines={['Where a peptide ends and a protein begins is a line scientists choose.']} size="xs" tone="slate" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Sequence → vial
// ---------------------------------------------------------------------------

export function PatientSequenceToVialIllustration({ id = 'ill-patient-sequence-to-vial' }: { id?: string }) {
  const steps = [
    { title: 'Sequence', note: ['the intended', 'order'], glyph: 'sequence' },
    { title: 'Synthesis', note: ['built on', 'tiny beads'], glyph: 'beads' },
    { title: 'Purification', note: ['wrong chains', 'removed'], glyph: 'column' },
    { title: 'Testing', note: ['several', 'different tests'], glyph: 'check' },
    { title: 'Final vial', note: ['filled and', 'sealed'], glyph: 'vial' },
  ] as const;
  const xs = [56, 168, 280, 392, 504];
  return (
    <Illustration
      id={id}
      title="How a peptide is made"
      description="Five stages joined by arrows: the intended sequence; synthesis, built on tiny beads; purification, where wrong chains are removed; testing by several different tests; and the final vial, filled and sealed."
      viewBox="0 0 560 200"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['SPPS-001', 'SPPS-002', 'PUR-001', 'ID-007', 'STER-008', 'STER-009'] }}
      caption="A peptide starts as a sequence on paper. It is built one amino acid at a time on tiny beads, cleaned of wrong and shorter chains, checked by several different tests, and filled into sealed vials."
    >
      {steps.map((s, i) => {
        const x = xs[i] ?? 0;
        return (
          <g key={s.title}>
            <circle cx={x} cy={64} r={34} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={i === steps.length - 1 ? STROKE.emphasis : STROKE.line} />
            <JourneyGlyph cx={x} cy={64} glyph={s.glyph} />
            <Label x={x} y={124} lines={[s.title]} size="sm" weight={600} />
            <Label x={x} y={144} lines={s.note} size="xs" tone="soft" />
            {i < steps.length - 1 ? (
              <line x1={x + 38} y1={64} x2={x + 72} y2={64} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// A message and a receiver
// ---------------------------------------------------------------------------

export function PatientMessageReceiverIllustration({ id = 'ill-patient-message-receiver' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="A message and a receiver"
      description="A cell releases a messenger that is carried in the blood. One distant cell has the receptor for it and responds; another has no receptor and does not respond."
      viewBox="0 0 560 280"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['SIG-01', 'SIG-02', 'SIG-03', 'SIG-04'] }}
      caption="A messenger acts only on cells that carry its receptor, and the change happens inside the receiving cell — so the same message can matter to one cell and not to its neighbour."
    >
      <ellipse cx={70} cy={140} rx={54} ry={42} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={70} y={136} lines={['releases a', 'messenger']} size="xs" tone="soft" />

      <rect x={128} y={122} width={230} height={36} rx={18} className="fill-sea-glass" />
      <Label x={243} y={110} lines={['carried in the blood']} size="xs" tone="slate" />
      {[152, 190, 228, 266, 304, 336].map((x) => (
        <circle key={x} cx={x} cy={140} r={5} className="fill-deep-tide" />
      ))}

      <line x1={364} y1={130} x2={418} y2={78} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <line x1={364} y1={150} x2={418} y2={196} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />

      <ellipse cx={476} cy={62} rx={46} ry={32} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <path d="M 424 52 L 432 52 L 432 66 L 424 66" fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.emphasis} />
      <circle cx={476} cy={62} r={8} className="fill-tide-teal" opacity={0.25} />
      <circle cx={476} cy={62} r={4} className="fill-tide-teal" />
      <Label x={476} y={116} lines={['has the receptor:', 'it responds']} size="xs" tone="teal" weight={500} />

      <ellipse cx={476} cy={206} rx={46} ry={32} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <Label x={476} y={258} lines={['no receptor:', 'no response']} size="xs" tone="slate" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// The body's own peptides
// ---------------------------------------------------------------------------

export function PatientLifecycleIllustration({ id = 'ill-patient-lifecycle' }: { id?: string }) {
  const stages = [
    { title: ['Made long,', 'then cut'] },
    { title: ['Stored'] },
    { title: ['Released when', 'signalled'] },
    { title: ['Broken down', 'by enzymes'] },
  ];
  const xs = [16, 152, 288, 424];
  const cy = 69;
  return (
    <Illustration
      id={id}
      title="How the body handles its own peptides"
      description="Four stages: some of the body's peptides are made as longer chains and cut to their working form; they are stored; they are released when the cell is signalled; and enzymes break them down. Beneath, what one then does depends on which receptors are present, how much there is, and where it acts."
      viewBox="0 0 560 250"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['END-03', 'END-04', 'END-05', 'END-07', 'END-09', 'END-10', 'END-11', 'END-12'] }}
      caption="Some of the body's peptides are made as longer chains and cut to their working form. Cells store them and release them when signalled, and enzymes break them down. What one then does depends on where it acts, how much is there, and which receptors are present."
    >
      {stages.map((s, i) => {
        const x = xs[i] ?? 0;
        return (
          <g key={s.title.join(' ')}>
            <rect x={x} y={24} width={118} height={90} rx={14} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={x + 59} y={140} lines={s.title} size="sm" weight={600} lineHeight={1.2} />
            {i < stages.length - 1 ? (
              <line x1={x + 120} y1={cy} x2={x + 134} y2={cy} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}

      {/* Made long, then cut */}
      <MiniChain x={31} y={cy + 4} n={2} cls="fill-rule-soft text-slate" />
      <line x1={63} y1={cy - 16} x2={63} y2={cy + 14} stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.line} strokeDasharray="3 3" />
      <MiniChain x={73} y={cy + 4} n={4} />

      {/* Stored */}
      <circle cx={211} cy={cy} r={30} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <MiniChain x={194} y={cy - 4} n={3} cls="fill-warm-white text-deep-tide" />
      <MiniChain x={198} y={cy + 18} n={3} cls="fill-warm-white text-deep-tide" />

      {/* Released when signalled */}
      <path d={`M 329 ${String(cy - 26)} A 28 28 0 1 0 329 ${String(cy + 26)}`} fill="none" className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      {(
        [
          [345, cy - 12],
          [360, cy + 2],
          [345, cy + 16],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-deep-tide" />
      ))}
      <line x1={370} y1={cy + 2} x2={392} y2={cy + 2} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.hairline} markerEnd={arrowUrl(id)} />

      {/* Broken down by enzymes */}
      {(
        [
          [454, cy - 8],
          [470, cy + 14],
          [494, cy - 10],
          [512, cy + 12],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} strokeDasharray="2 2" />
      ))}
      <path d={`M 476 ${String(cy - 22)} l 14 8 l -14 8 a 9 9 0 1 1 0 -16 z`} className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.hairline} />

      <rect x={16} y={184} width={526} height={54} rx={12} className="fill-warm-white text-rule" stroke="currentColor" />
      <Label x={32} y={204} lines={['What it then does depends on']} size="xs" tone="slate" anchor="start" caps />
      <Label x={32} y={225} lines={['which receptors are present  ·  how much there is  ·  where it acts']} size="xs" tone="soft" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// What a study design can answer
// ---------------------------------------------------------------------------

export function PatientStudyDesignIllustration({ id = 'ill-patient-study-design' }: { id?: string }) {
  const rows = [
    { kind: 'trial', name: ['Randomised trial with', 'a comparison group'], answer: ['can support a statement', 'about effect, in those studied'] },
    { kind: 'uncontrolled', name: ['Study without a', 'comparison group'], answer: ['cannot separate the treatment', 'from what would have happened'] },
    { kind: 'case', name: ['A single case'], answer: ['describes one person'] },
    { kind: 'exposure', name: ['Pharmacokinetic', 'study'], answer: ['what the body does to it —', 'not whether it helps'] },
    { kind: 'safety', name: ['Small safety study'], answer: ['no harm found is not', 'the same as shown to be safe'] },
  ] as const;
  return (
    <Illustration
      id={id}
      title="What a study design can answer"
      description="Five kinds of study beside what each can answer. A randomised trial with a comparison group can support a statement about effect in those studied. A study without a comparison group cannot separate the treatment from what would have happened. A single case describes one person. A pharmacokinetic study shows what the body does to a substance, not whether it helps. A small safety study that found no harm has not shown that something is safe."
      viewBox="0 0 560 330"
      minWidth={420}
      basis={{
        kind: 'method',
        note: 'A study’s design is read before its result, because the design decides which question the result can answer. The drawing describes no particular study.',
      }}
      caption="The design decides which question a study can answer. A result belongs to that question — and to the people who were in the study."
    >
      <Label x={150} y={24} lines={['Design']} size="xs" tone="slate" anchor="start" caps />
      <Label x={342} y={24} lines={['What it can answer']} size="xs" tone="slate" anchor="start" caps />
      {rows.map((row, i) => {
        const cy = 62 + i * 56;
        return (
          <g key={row.kind}>
            {i < rows.length - 1 ? (
              <line x1={16} y1={cy + 28} x2={544} y2={cy + 28} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
            ) : null}
            <DesignGlyph cy={cy} kind={row.kind} />
            <Label x={150} y={row.name.length === 1 ? cy + 5 : cy - 4} lines={row.name} size="sm" weight={600} anchor="start" lineHeight={1.2} />
            <Label x={342} y={row.answer.length === 1 ? cy + 5 : cy - 4} lines={row.answer} size="xs" tone="soft" anchor="start" />
          </g>
        );
      })}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Five questions a vial raises
// ---------------------------------------------------------------------------

export function PatientSeparateQuestionsIllustration({ id = 'ill-patient-separate-questions' }: { id?: string }) {
  const rows: readonly { key: QuestionKey; title: string; asks: readonly string[]; not: readonly string[] }[] = [
    { key: 'purity', title: 'Purity', asks: ['how mixed is', 'the sample?'], not: ['what the substance is'] },
    { key: 'identity', title: 'Identity', asks: ['is it the intended', 'molecule?'], not: ['how much of it', 'there is'] },
    { key: 'content', title: 'Content', asks: ['how much peptide', 'is there?'], not: ['how pure', 'the sample is'] },
    { key: 'sterility', title: 'Sterility', asks: ['did anything grow in', 'what was tested?'], not: ['that every container', 'is sterile'] },
    { key: 'endotoxin', title: 'Endotoxin', asks: ['is it within the', 'product’s own limit?'], not: ['anything, without', 'that limit beside it'] },
  ];
  return (
    <Illustration
      id={id}
      title="Five questions, five different tests"
      description="Five rows separated by not-equal signs. Purity asks how mixed the sample is, and does not show what the substance is. Identity asks whether it is the intended molecule, and does not show how much there is. Content asks how much peptide is there, and does not show how pure the sample is. Sterility asks whether anything grew in what was tested, and does not show that every container is sterile. Endotoxin asks whether the result is within the product's own limit, and means nothing without that limit beside it."
      viewBox="0 0 560 380"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['HPLC-001', 'HPLC-002', 'HPLC-005', 'HPLC-006', 'HPLC-007', 'ID-002', 'STER-003', 'ENDO-003'] }}
      caption="Purity, identity, content, sterility and endotoxin are separate questions, each answered by its own kind of test. A good answer to one is not an answer to any other."
    >
      <Label x={216} y={24} lines={['Asks']} size="xs" tone="slate" anchor="start" caps />
      <Label x={392} y={24} lines={['Does not show']} size="xs" tone="caution" anchor="start" caps />
      {rows.map((row, i) => {
        const cy = 64 + i * 64;
        return (
          <g key={row.key}>
            {i > 0 ? (
              <g>
                <line x1={70} y1={cy - 32} x2={544} y2={cy - 32} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
                <Label x={44} y={cy - 26} lines={['≠']} size="md" tone="slate" weight={600} />
              </g>
            ) : null}
            <QuestionGlyph cx={44} cy={cy} kind={row.key} />
            <Label x={98} y={cy + 5} lines={[row.title]} serif size="md" weight={600} anchor="start" />
            <Label x={216} y={row.asks.length === 1 ? cy + 5 : cy - 3} lines={row.asks} size="xs" tone="deep" weight={500} anchor="start" />
            <Label x={392} y={row.not.length === 1 ? cy + 5 : cy - 3} lines={row.not} size="xs" tone="soft" anchor="start" />
          </g>
        );
      })}
      <Label x={280} y={368} lines={['Each test answers its own question. None answers another.']} size="xs" tone="slate" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function PatientRoutesIllustration({ id = 'ill-patient-routes' }: { id?: string }) {
  const others = [
    { y: 74, title: 'Swallowed', note: ['passes the gut, then the', 'liver, before the body'] },
    { y: 160, title: 'Into the nose', note: ['large molecules', 'pass poorly'] },
    { y: 240, title: 'Through the skin', note: ['the outer layer holds', 'back large molecules'] },
  ];
  return (
    <Illustration
      id={id}
      title="Routes, and what each has to get past"
      description="On the left, a cross-section beneath the skin with three injected routes: into a vein, under the skin, and into a muscle; injecting avoids the gut and liver. On the right, three other routes and the barrier each meets: swallowed, through the gut and then the liver; into the nose, where large molecules pass poorly; and through the skin, whose outer layer holds back large molecules."
      viewBox="0 0 560 330"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['RTE-02', 'RTE-03', 'RTE-04', 'RTE-14', 'RTE-20', 'RTE-21', 'RTE-23', 'PKG-14'] }}
      caption="This describes routes; it is not a guide to giving anything. A route decides what a substance has to get past on the way in."
    >
      <rect x={20} y={70} width={250} height={22} rx={4} className="fill-warm-white text-rule" stroke="currentColor" />
      <rect x={20} y={92} width={250} height={80} className="fill-sea-glass" opacity={0.55} />
      <rect x={20} y={172} width={250} height={78} className="fill-rule-soft" />
      {[192, 212, 232].map((y) => (
        <line key={y} x1={24} y1={y} x2={266} y2={y + 5} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
      ))}
      <Label x={28} y={86} lines={['skin']} size="xs" tone="slate" anchor="start" />
      <Label x={28} y={244} lines={['muscle']} size="xs" tone="slate" anchor="start" />
      <ellipse cx={80} cy={150} rx={24} ry={11} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={80} y={154} lines={['vein']} size="xs" tone="teal" />

      <g stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.emphasis}>
        <line x1={80} y1={50} x2={80} y2={136} markerEnd={arrowUrl(id)} />
        <line x1={150} y1={50} x2={150} y2={132} markerEnd={arrowUrl(id)} />
        <line x1={222} y1={50} x2={222} y2={222} markerEnd={arrowUrl(id)} />
      </g>
      <Label x={80} y={22} lines={['into', 'a vein']} size="xs" tone="deep" weight={500} />
      <Label x={150} y={22} lines={['under', 'the skin']} size="xs" tone="deep" weight={500} />
      <Label x={222} y={22} lines={['into a', 'muscle']} size="xs" tone="deep" weight={500} />
      <Label x={145} y={284} lines={['Injected']} serif size="md" weight={600} />
      <Label x={145} y={304} lines={['avoids the gut and liver']} size="xs" tone="soft" />

      <line x1={296} y1={30} x2={296} y2={306} className="text-rule" stroke="currentColor" />
      {others.map((o) => (
        <g key={o.title}>
          <circle cx={322} cy={o.y - 5} r={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
          <Label x={340} y={o.y} lines={[o.title]} size="sm" weight={600} anchor="start" />
          <Label x={340} y={o.y + 19} lines={o.note} size="xs" tone="soft" anchor="start" />
        </g>
      ))}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Circulation
// ---------------------------------------------------------------------------

function PatientNode({
  x,
  y,
  w,
  h,
  lines,
  tone = 'plain',
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  lines: readonly string[];
  tone?: 'plain' | 'blood' | 'out';
}) {
  const cls =
    tone === 'blood' ? 'fill-sea-glass text-tide-teal' : tone === 'out' ? 'fill-warm-white text-slate' : 'fill-warm-white text-tide-teal';
  const size = tone === 'blood' ? 'sm' : 'xs';
  const step = tone === 'blood' ? 16.9 : 15;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={h / 2.4}
        className={cls}
        stroke="currentColor"
        strokeWidth={tone === 'blood' ? STROKE.emphasis : STROKE.line}
        strokeDasharray={tone === 'out' ? DASH : undefined}
      />
      <Label
        x={x + w / 2}
        y={y + h / 2 + 4 - ((lines.length - 1) * step) / 2}
        lines={lines}
        size={size}
        tone={tone === 'blood' ? 'deep' : 'soft'}
        weight={tone === 'blood' ? 600 : 400}
      />
    </g>
  );
}

export function PatientCirculationIllustration({ id = 'ill-patient-circulation' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="Where a substance goes once it is in"
      description="A flow diagram. Given into a vein, a substance enters the bloodstream directly. Given under the skin or into a muscle, it reaches the bloodstream through small vessels. Swallowed, it passes the gut and then the liver first. From the bloodstream, most peptides are broken down by enzymes, and small ones can be filtered by the kidneys, and they leave the body."
      viewBox="0 0 560 320"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['PKG-01', 'PKG-13', 'PKG-14', 'PKG-17', 'PKG-18', 'RTE-13'] }}
      caption="How a substance reaches the blood depends on how it gets in. From the blood, most peptides are broken down by enzymes, and the kidneys can filter small ones out."
    >
      <Label x={16} y={24} lines={['How it gets in']} size="xs" tone="slate" anchor="start" caps />
      <PatientNode x={16} y={40} w={150} h={44} lines={['into a vein']} />
      <PatientNode x={16} y={110} w={150} h={54} lines={['under the skin', 'or into a muscle']} />
      <PatientNode x={16} y={236} w={150} h={44} lines={['swallowed']} />

      <PatientNode x={206} y={116} w={150} h={64} lines={['bloodstream']} tone="blood" />
      <PatientNode x={206} y={236} w={150} h={44} lines={['gut, then liver']} />

      <Label x={544} y={24} lines={['How it leaves']} size="xs" tone="slate" anchor="end" caps />
      <PatientNode x={396} y={40} w={150} h={54} lines={['broken down', 'by enzymes']} />
      <PatientNode x={396} y={136} w={150} h={54} lines={['filtered by', 'the kidneys']} />
      <PatientNode x={410} y={250} w={122} h={40} lines={['leaves the body']} tone="out" />

      <g stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} fill="none">
        <path d="M 166 62 C 190 62, 184 126, 202 136" markerEnd={arrowUrl(id)} />
        <path d="M 166 137 C 184 137, 186 150, 202 150" markerEnd={arrowUrl(id)} />
        <line x1={166} y1={258} x2={202} y2={258} markerEnd={arrowUrl(id)} />
        <line x1={281} y1={236} x2={281} y2={184} markerEnd={arrowUrl(id)} />
        <path d="M 356 136 C 374 128, 376 70, 392 67" markerEnd={arrowUrl(id)} />
        <path d="M 356 158 C 372 160, 378 163, 392 163" markerEnd={arrowUrl(id)} />
      </g>
      <line x1={471} y1={190} x2={471} y2={246} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Evidence lanes
// ---------------------------------------------------------------------------

export function PatientEvidenceLanesIllustration({ id = 'ill-patient-evidence-lanes' }: { id?: string }) {
  const lanes = [
    { y: 52, label: 'In people', sub: 'human studies', cls: 'text-[var(--color-evidence-human)]', bg: 'fill-[var(--color-evidence-human-bg)]', shape: 'circle' },
    { y: 124, label: 'In animals or cells', sub: 'preclinical studies', cls: 'text-[var(--color-evidence-preclinical)]', bg: 'fill-[var(--color-evidence-preclinical-bg)]', shape: 'square' },
    { y: 196, label: 'Reported, not studied', sub: 'practice and reference', cls: 'text-[var(--color-evidence-reference)]', bg: 'fill-[var(--color-evidence-reference-bg)]', shape: 'diamond' },
  ] as const;
  const marks = [256, 292, 328, 364];
  return (
    <Illustration
      id={id}
      title="Three kinds of evidence, kept apart"
      description="Three lanes: evidence from studies in people, marked with circles; from animals or cells, marked with squares; and what practice or reference works report without a study, marked with diamonds. An arrow from the animal lane towards the human lane is crossed out: animal results do not become human results."
      viewBox="0 0 560 250"
      minWidth={420}
      basis={{
        kind: 'method',
        note: 'Every piece of evidence carries one of these three classes, and the database will not let a preclinical record be labelled as human evidence.',
      }}
      caption="The first question to ask of any statement is which lane it came from. A finding stays where it was made."
    >
      {lanes.map((lane) => (
        <g key={lane.label}>
          <rect x={16} y={lane.y - 28} width={378} height={56} rx={12} className={lane.bg} />
          <Label x={32} y={lane.y - 4} lines={[lane.label]} size="sm" weight={600} anchor="start" />
          <Label x={32} y={lane.y + 15} lines={[lane.sub]} size="xs" tone="slate" anchor="start" />
          <g className={lane.cls}>
            {marks.map((mx) =>
              lane.shape === 'circle' ? (
                <circle key={mx} cx={mx} cy={lane.y} r={9} fill="currentColor" />
              ) : lane.shape === 'square' ? (
                <rect key={mx} x={mx - 8} y={lane.y - 8} width={16} height={16} rx={2} fill="currentColor" />
              ) : (
                <rect key={mx} x={mx - 7} y={lane.y - 7} width={14} height={14} fill="currentColor" transform={`rotate(45 ${String(mx)} ${String(lane.y)})`} />
              ),
            )}
          </g>
        </g>
      ))}
      <path d="M 392 116 C 424 104, 432 84, 420 64" fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <g stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.emphasis} strokeLinecap="round">
        <line x1={416} y1={80} x2={432} y2={96} />
        <line x1={432} y1={80} x2={416} y2={96} />
      </g>
      <Label x={446} y={84} lines={['animal results', 'do not become', 'human results']} size="xs" tone="caution" anchor="start" weight={500} />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Human context: signals near and far
// ---------------------------------------------------------------------------

function Silhouette({ cx, top }: { cx: number; top: number }) {
  // A plain outline, not anatomy: a head and a torso, to set a signal in a body.
  return (
    <g className="text-rule">
      <circle cx={cx} cy={top + 26} r={24} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
      <path
        d={`M ${String(cx - 46)} ${String(top + 64)} Q ${String(cx)} ${String(top + 52)} ${String(cx + 46)} ${String(top + 64)} L ${String(cx + 58)} ${String(top + 232)} Q ${String(cx)} ${String(top + 246)} ${String(cx - 58)} ${String(top + 232)} Z`}
        className="fill-warm-white"
        stroke="currentColor"
        strokeWidth={STROKE.line}
      />
    </g>
  );
}

export function PatientSignalsNearFarIllustration({ id = 'ill-patient-signals-near-far' }: { id?: string }) {
  const cells: readonly (readonly [number, number, 'source' | 'receptor' | 'plain'])[] = [
    [372, 112, 'plain'],
    [424, 100, 'plain'],
    [476, 112, 'receptor'],
    [350, 164, 'plain'],
    [424, 156, 'source'],
    [498, 164, 'plain'],
    [386, 214, 'receptor'],
    [460, 214, 'plain'],
  ];
  return (
    <Illustration
      id={id}
      title="Signals near and far"
      description="On the left, an outline of a body: a messenger released in the head is carried in the blood to cells far away. On the right, a close view of tissue: a cell releases a signal that acts on nearby cells. In both, only cells with the matching receptor respond."
      viewBox="0 0 560 300"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['SIG-01', 'SIG-02', 'SIG-04', 'END-12'] }}
      caption="Some messages travel far, carried in the blood to distant cells; others act locally, on nearby cells — and the same molecule can do either. Either way, only cells with the matching receptor respond."
    >
      <Label x={96} y={24} lines={['Far']} serif size="md" weight={600} />
      <Silhouette cx={96} top={36} />
      <circle cx={96} cy={62} r={6} className="fill-deep-tide" />
      <path d="M 96 72 C 128 112, 70 158, 104 208" fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      {(
        [
          [110, 104],
          [92, 142],
          [96, 176],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={4} className="fill-deep-tide" />
      ))}
      <ellipse cx={110} cy={226} rx={18} ry={12} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={170} y={70} lines={['released into', 'the blood']} size="xs" tone="soft" anchor="start" />
      <Label x={170} y={222} lines={['acts on cells', 'far away']} size="xs" tone="teal" weight={500} anchor="start" />

      <line x1={288} y1={30} x2={288} y2={276} className="text-rule" stroke="currentColor" />

      <Label x={424} y={40} lines={['Near']} serif size="md" weight={600} />
      {cells.map(([x, y, kind]) => (
        <circle
          key={`${String(x)}-${String(y)}`}
          cx={x}
          cy={y}
          r={24}
          className={kind === 'source' ? 'fill-sea-glass text-tide-teal' : kind === 'receptor' ? 'fill-warm-white text-tide-teal' : 'fill-warm-white text-rule'}
          stroke="currentColor"
          strokeWidth={kind === 'plain' ? STROKE.line : STROKE.emphasis}
        />
      ))}
      {(
        [
          [446, 138],
          [458, 128],
          [404, 176],
          [398, 190],
        ] as const
      ).map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={3.5} className="fill-deep-tide" />
      ))}
      <Label x={424} y={262} lines={['a signal can also act', 'on nearby cells']} size="xs" tone="soft" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Human context: where a swallowed substance goes
// ---------------------------------------------------------------------------

export function PatientBodyMapIllustration({ id = 'ill-patient-body-map' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="Where a substance goes in the body"
      description="An outline of a body. A swallowed substance passes through the gut and then the liver before reaching the rest of the body; an injected one skips that path. A loop marks the blood. From the blood, most peptides are broken down by enzymes, and the kidneys can filter small ones out."
      viewBox="0 0 560 330"
      minWidth={420}
      basis={{ kind: 'claims', claimKeys: ['PKG-14', 'PKG-17', 'PKG-18', 'RTE-14'] }}
      caption="A swallowed substance passes through the gut and then the liver before it reaches the rest of the body; an injected one skips that path. From the blood, most peptides are broken down by enzymes, and the kidneys can filter small ones out."
    >
      <Silhouette cx={136} top={20} />
      {/* The blood, as a loop kept inside the body outline */}
      <path d="M 136 116 C 192 122, 192 252, 136 258 C 80 252, 80 122, 136 116 Z" fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} opacity={0.8} />
      {/* Liver, upper left */}
      <ellipse cx={116} cy={152} rx={24} ry={13} className="fill-rule-soft text-slate" stroke="currentColor" strokeWidth={STROKE.line} />
      {/* Gut, lower centre */}
      <rect x={112} y={196} width={50} height={42} rx={16} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} />
      <path d="M 120 208 q 11 -6 17 4 q 6 10 17 4 M 120 224 q 11 -6 17 4 q 6 10 17 4" fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} />
      {/* Kidneys */}
      <ellipse cx={98} cy={206} rx={6} ry={10} className="fill-rule-soft text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />
      <ellipse cx={176} cy={206} rx={6} ry={10} className="fill-rule-soft text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} />

      {/* Swallowed path: mouth → gut (beside the liver) → liver → blood */}
      <path d="M 140 60 C 160 100, 160 160, 150 192" fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <line x1={124} y1={196} x2={118} y2={170} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <line x1={100} y1={146} x2={88} y2={140} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      <g stroke="currentColor" className="text-rule" strokeWidth={STROKE.hairline}>
        <line x1={152} y1={62} x2={262} y2={56} />
        <line x1={140} y1={150} x2={262} y2={138} />
        <line x1={190} y1={176} x2={262} y2={210} />
        <line x1={182} y1={210} x2={262} y2={270} />
      </g>
      <Label x={270} y={52} lines={['Swallowed: through', 'the gut first']} size="xs" tone="soft" anchor="start" />
      <Label x={270} y={134} lines={['then the liver, before the', 'rest of the body']} size="xs" tone="soft" anchor="start" />
      <Label x={270} y={206} lines={['from the blood, most peptides', 'are broken down by enzymes']} size="xs" tone="teal" anchor="start" weight={500} />
      <Label x={270} y={266} lines={['the kidneys can filter', 'small ones out']} size="xs" tone="soft" anchor="start" />
      <Label x={270} y={314} lines={['Injected routes skip the gut and liver.']} size="xs" tone="slate" anchor="start" />
    </Illustration>
  );
}

export const PATIENT_ILLUSTRATIONS = {
  'chain-scale': PatientChainScaleIllustration,
  'sequence-to-vial': PatientSequenceToVialIllustration,
  'message-receiver': PatientMessageReceiverIllustration,
  'peptide-lifecycle': PatientLifecycleIllustration,
  'study-design': PatientStudyDesignIllustration,
  'separate-questions': PatientSeparateQuestionsIllustration,
  routes: PatientRoutesIllustration,
  circulation: PatientCirculationIllustration,
  'evidence-lanes': PatientEvidenceLanesIllustration,
  'signals-near-far': PatientSignalsNearFarIllustration,
  'body-map': PatientBodyMapIllustration,
} as const;

export type PatientIllustrationKey = keyof typeof PATIENT_ILLUSTRATIONS;
