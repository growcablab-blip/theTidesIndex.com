import { arrowUrl, BeadChain, DASH, Illustration, Label, softArrowUrl, STROKE } from './frame';

/**
 * Explanatory drawings for the foundations: what a peptide is, how it signals,
 * how a substance moves through the body and the routes it can take.
 *
 * Each rests on claims extracted from permissively licensed sources (learning
 * topics 'What a peptide is', 'Amino acids, peptides, proteins', 'How peptide
 * signalling works', 'Receptors (English sources)', 'Pharmacokinetic concepts'
 * and 'Routes of administration'), and labels only what those claims state.
 * None of them describes any particular peptide or product.
 */

// ---------------------------------------------------------------------------
// Amino acid → peptide → protein
// ---------------------------------------------------------------------------

export function ChainScaleIllustration({
  id = 'ill-chain-scale',
  minWidth = 560,
}: {
  id?: string;
  minWidth?: number;
}) {
  const peptide: [number, number][] = [
    [274, 112],
    [310, 100],
    [346, 112],
    [382, 100],
    [418, 112],
  ];
  return (
    <Illustration
      id={id}
      title="From an amino acid to a peptide to a protein"
      description="Three panels. A single amino acid: one building block with a shared backbone and a side chain that differs from one amino acid to another. A peptide: a short chain of amino acids joined by peptide bonds. A protein: a long chain that folds into a defined shape. A dashed line between peptide and protein marks that where one ends and the other begins is a convention that sources set differently."
      viewBox="0 0 740 250"
      minWidth={minWidth}
      basis={{ kind: 'claims', claimKeys: ['FND-01', 'FND-02', 'FND-03', 'FND-05', 'FND-09', 'FND-13'] }}
      caption="Peptides and proteins are made of the same building blocks. The difference the sources describe is size — and where a peptide becomes a protein is a line scientists choose."
    >
      {/* Amino acid */}
      <Label x={110} y={34} lines={['Amino acid']} serif size="md" weight={600} />
      <g className="text-tide-teal">
        <line x1={110} y1={92} x2={110} y2={66} stroke="currentColor" strokeWidth={STROKE.line} />
        <rect x={94} y={50} width={32} height={18} rx={6} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
        <circle cx={110} cy={112} r={20} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      </g>
      <Label x={110} y={166} lines={['one building block:', 'a shared core, and a', 'side chain that differs']} tone="soft" size="xs" />

      <line x1={176} y1={112} x2={236} y2={112} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Peptide */}
      <Label x={346} y={34} lines={['Peptide']} serif size="md" weight={600} />
      <BeadChain points={peptide} radius={12} />
      {peptide.map(([x, y], i) => (
        <line
          key={`stub-${String(i)}`}
          x1={x}
          y1={i % 2 === 0 ? y + 12 : y - 12}
          x2={x}
          y2={i % 2 === 0 ? y + 24 : y - 24}
          stroke="currentColor"
          className="text-tide-teal"
          strokeWidth={STROKE.hairline}
        />
      ))}
      <Label x={346} y={166} lines={['a short chain: amino acids', 'joined by peptide bonds']} tone="soft" size="xs" />

      {/* The boundary is a convention */}
      <line x1={486} y1={48} x2={486} y2={196} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <line x1={450} y1={112} x2={528} y2={112} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Protein */}
      <Label x={630} y={34} lines={['Protein']} serif size="md" weight={600} />
      <path
        d="M 560 132 C 546 86, 604 60, 626 92 S 700 74, 690 118 S 626 168, 604 142 S 564 150, 584 112 S 660 104, 652 140"
        fill="none"
        stroke="currentColor"
        className="text-tide-teal"
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray="0.1 12"
      />
      <path
        d="M 560 132 C 546 86, 604 60, 626 92 S 700 74, 690 118 S 626 168, 604 142 S 564 150, 584 112 S 660 104, 652 140"
        fill="none"
        stroke="currentColor"
        className="text-tide-teal"
        strokeWidth={STROKE.hairline}
        opacity={0.6}
      />
      <Label x={630} y={186} lines={['a long chain that folds', 'into a defined shape']} tone="soft" size="xs" />

      <Label x={486} y={228} lines={['The line between a peptide and a protein is a convention: sources set it differently.']} tone="slate" size="xs" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// The peptide bond
// ---------------------------------------------------------------------------

function AminoAcidUnit({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <g>
      <rect x={x} y={y} width={150} height={38} rx={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <line x1={x + 52} y1={y} x2={x + 52} y2={y + 38} className="text-rule" stroke="currentColor" />
      <line x1={x + 98} y1={y} x2={x + 98} y2={y + 38} className="text-rule" stroke="currentColor" />
      <Label x={x + 26} y={y + 24} lines={['amino']} size="xs" tone="soft" />
      <Label x={x + 75} y={y + 24} lines={['carbon']} size="xs" tone="soft" />
      <Label x={x + 124} y={y + 24} lines={['acid']} size="xs" tone="soft" />
      <line x1={x + 75} y1={y} x2={x + 75} y2={y - 18} className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <rect x={x + 44} y={y - 42} width={62} height={24} rx={7} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={x + 75} y={y - 26} lines={['side chain']} size="xs" tone="deep" />
      <desc>{`Part of ${id}: an amino acid unit.`}</desc>
    </g>
  );
}

export function PeptideBondIllustration({ id = 'ill-peptide-bond' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="How a peptide bond forms"
      description="Two amino acids, each drawn as an amino group, a central carbon carrying a side chain, and an acid group. The acid group of the first joins the amino group of the second, forming a peptide bond, and a molecule of water is released."
      viewBox="0 0 800 220"
      minWidth={580}
      basis={{ kind: 'claims', claimKeys: ['FND-06', 'FND-07', 'FND-09'] }}
      caption="The acid group of one amino acid joins the amino group of the next. The link is the peptide bond, and water is given off as it forms."
    >
      <AminoAcidUnit x={20} y={100} id={id} />
      <Label x={196} y={126} lines={['+']} size="lg" tone="slate" />
      <AminoAcidUnit x={216} y={100} id={id} />

      <line x1={384} y1={119} x2={432} y2={119} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Joined */}
      <g className="text-tide-teal">
        <rect x={446} y={100} width={100} height={38} rx={8} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
        <rect x={546} y={108} width={62} height={22} className="fill-tide-teal" />
        <rect x={608} y={100} width={100} height={38} rx={8} className="fill-warm-white" stroke="currentColor" strokeWidth={STROKE.line} />
      </g>
      <line x1={498} y1={100} x2={498} y2={138} className="text-rule" stroke="currentColor" />
      <line x1={656} y1={100} x2={656} y2={138} className="text-rule" stroke="currentColor" />
      <Label x={472} y={124} lines={['amino']} size="xs" tone="soft" />
      <Label x={522} y={124} lines={['carbon']} size="xs" tone="soft" />
      <Label x={632} y={124} lines={['carbon']} size="xs" tone="soft" />
      <Label x={682} y={124} lines={['acid']} size="xs" tone="soft" />
      <Label x={577} y={160} lines={['peptide bond']} size="sm" tone="teal" weight={600} />
      {[522, 632].map((cx) => (
        <g key={cx} className="text-tide-teal">
          <line x1={cx} y1={100} x2={cx} y2={82} stroke="currentColor" strokeWidth={STROKE.line} />
          <rect x={cx - 28} y={58} width={56} height={24} rx={7} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.line} />
        </g>
      ))}
      <Label x={522} y={74} lines={['side']} size="xs" tone="deep" />
      <Label x={632} y={74} lines={['side']} size="xs" tone="deep" />

      {/* Water released */}
      <line x1={600} y1={134} x2={650} y2={180} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <circle cx={668} cy={192} r={13} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={668} y={196} lines={['H₂O']} size="xs" tone="slate" />
      <Label x={690} y={196} lines={['water released']} size="xs" tone="slate" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Signalling as a message and a receiver
// ---------------------------------------------------------------------------

export function MessageReceiverIllustration({ id = 'ill-message-receiver' }: { id?: string }) {
  const messengers = [196, 252, 308, 364, 420, 476];
  return (
    <Illustration
      id={id}
      title="Signalling as a message and a receiver"
      description="A cell releases messenger molecules that are carried in the blood. Two distant cells receive them. One carries the matching receptor on its surface, and a change starts inside that cell. The other has no receptor for the messenger and does not respond."
      viewBox="0 0 800 250"
      minWidth={600}
      basis={{ kind: 'claims', claimKeys: ['SIG-01', 'SIG-02', 'SIG-03', 'SIG-04'] }}
      caption="A messenger acts only on cells that carry its receptor. The change happens inside the receiving cell — which is why the same message can matter to one cell and not to its neighbour."
    >
      {/* Releasing cell */}
      <ellipse cx={86} cy={122} rx={58} ry={44} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={86} y={118} lines={['cell that', 'releases it']} size="xs" tone="soft" />

      {/* Blood */}
      <rect x={150} y={100} width={380} height={44} rx={22} className="fill-sea-glass" />
      <Label x={340} y={88} lines={['carried in the blood']} size="xs" tone="slate" />
      {messengers.map((x) => (
        <circle key={x} cx={x} cy={122} r={6} className="fill-deep-tide" />
      ))}
      <line x1={500} y1={122} x2={548} y2={122} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />

      {/* Target cell with receptors */}
      <line x1={560} y1={112} x2={586} y2={80} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <ellipse cx={640} cy={66} rx={50} ry={36} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      {(
        [
          [594, 54],
          [592, 76],
        ] as const
      ).map(([x, y]) => (
        <path
          key={`${String(x)}-${String(y)}`}
          d={`M ${String(x - 8)} ${String(y - 7)} L ${String(x)} ${String(y - 7)} L ${String(x)} ${String(y + 7)} L ${String(x - 8)} ${String(y + 7)}`}
          fill="none"
          stroke="currentColor"
          className="text-tide-teal"
          strokeWidth={STROKE.emphasis}
        />
      ))}
      <circle cx={640} cy={66} r={9} className="fill-tide-teal" opacity={0.25} />
      <circle cx={640} cy={66} r={4} className="fill-tide-teal" />
      <Label x={700} y={52} lines={['has the receptor:', 'a change starts', 'inside the cell']} size="xs" tone="teal" anchor="start" weight={500} />

      {/* Non-target cell */}
      <line x1={560} y1={132} x2={586} y2={168} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <ellipse cx={640} cy={184} rx={50} ry={36} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.line} strokeDasharray={DASH} />
      <Label x={700} y={178} lines={['no receptor for', 'it: no response']} size="xs" tone="slate" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// The body's own peptides: made, cut, stored, released, broken down
// ---------------------------------------------------------------------------

function MiniChain({ x, y, n, cls = 'fill-sea-glass text-tide-teal' }: { x: number; y: number; n: number; cls?: string }) {
  const pts = Array.from({ length: n }, (_, i) => [x + i * 13, y + (i % 2 === 0 ? 0 : -7)] as const);
  return (
    <g className={cls.includes('text-') ? cls.split(' ').filter((c) => c.startsWith('text-')).join(' ') : 'text-tide-teal'}>
      <polyline points={pts.map(([px, py]) => `${String(px)},${String(py)}`).join(' ')} fill="none" stroke="currentColor" strokeWidth={STROKE.hairline} />
      {pts.map(([px, py]) => (
        <circle key={`${String(px)}-${String(py)}`} cx={px} cy={py} r={5} className={cls.split(' ').filter((c) => c.startsWith('fill-')).join(' ')} stroke="currentColor" strokeWidth={STROKE.hairline} />
      ))}
    </g>
  );
}

export function PeptideLifecycleIllustration({ id = 'ill-peptide-lifecycle' }: { id?: string }) {
  const stages = [
    { title: ['Made as a', 'longer chain'] },
    { title: ['Cut to its', 'working form'] },
    { title: ['Stored'] },
    { title: ['Released when', 'signalled'] },
    { title: ['Broken down', 'by enzymes'] },
  ];
  const xs = [84, 242, 400, 558, 716];
  return (
    <Illustration
      id={id}
      title="How the body handles its own peptides"
      description="Five stages. Some of the body's peptides, such as neuropeptides and defence peptides, are made first as longer chains and cut by enzymes into their working form. Hormone-making and nerve cells store them and release them when signalled. Enzymes break them down. Beneath, what one of them then does depends on context: which receptors are present, where and when; how much of it there is; and whether it acts nearby or far away."
      viewBox="0 0 800 270"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['END-03', 'END-04', 'END-05', 'END-07', 'END-09', 'END-10', 'END-11', 'END-12'] }}
      caption="Some of the body's peptides — neuropeptides and defence peptides among them — are made as longer chains and cut to their working form. Cells store them and release them when signalled, and enzymes break them down. What one then does depends on where it acts, how much is there, and which receptors are present."
    >
      {stages.map((s, i) => {
        const cx = xs[i] ?? 0;
        return (
          <g key={s.title.join(' ')}>
            <rect x={cx - 68} y={30} width={136} height={96} rx={14} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
            <Label x={cx} y={150} lines={s.title} size="sm" weight={600} lineHeight={1.2} />
            {i < stages.length - 1 ? (
              <line x1={cx + 70} y1={78} x2={cx + 88} y2={78} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
            ) : null}
          </g>
        );
      })}

      {/* Made as a longer chain */}
      <MiniChain x={45} y={84} n={7} />

      {/* Cut to its working form */}
      <MiniChain x={196} y={84} n={2} cls="fill-rule-soft text-slate" />
      <line x1={230} y1={62} x2={230} y2={96} stroke="currentColor" className="text-[var(--color-caution)]" strokeWidth={STROKE.line} strokeDasharray="3 3" />
      <MiniChain x={242} y={84} n={4} />

      {/* Stored */}
      <circle cx={400} cy={78} r={32} className="fill-sea-glass text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <MiniChain x={382} y={70} n={3} cls="fill-warm-white text-deep-tide" />
      <MiniChain x={386} y={94} n={3} cls="fill-warm-white text-deep-tide" />

      {/* Released when signalled */}
      <path d="M 540 52 A 28 28 0 1 0 540 104" fill="none" className="text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      {[
        [556, 64],
        [572, 80],
        [556, 94],
      ].map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-deep-tide" />
      ))}
      <line x1={582} y1={80} x2={604} y2={80} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.hairline} markerEnd={arrowUrl(id)} />

      {/* Broken down by enzymes */}
      {[
        [684, 70],
        [704, 92],
        [724, 66],
        [744, 90],
      ].map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-warm-white text-slate" stroke="currentColor" strokeWidth={STROKE.hairline} strokeDasharray="2 2" />
      ))}
      <path d="M 706 56 l 14 8 l -14 8 a 9 9 0 1 1 0 -16 z" className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.hairline} />

      {/* Context */}
      <rect x={20} y={196} width={760} height={62} rx={12} className="fill-warm-white text-rule" stroke="currentColor" />
      <Label x={40} y={220} lines={['What it then does depends on context']} size="xs" tone="slate" anchor="start" caps />
      <Label x={40} y={242} lines={['which receptors are present, where and when  ·  how much of it there is  ·  whether it acts nearby or far away']} size="xs" tone="soft" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Receptor binding: binding is not activation
// ---------------------------------------------------------------------------

function ReceptorPocket({ cx, active }: { cx: number; active: 'full' | 'partial' | 'none' }) {
  const d = `M ${String(cx - 44)} 158 L ${String(cx - 44)} 104 Q ${String(cx - 44)} 92 ${String(cx - 32)} 92 L ${String(cx - 20)} 92 L ${String(cx - 20)} 112 Q ${String(cx)} 130 ${String(cx + 20)} 112 L ${String(cx + 20)} 92 L ${String(cx + 32)} 92 Q ${String(cx + 44)} 92 ${String(cx + 44)} 104 L ${String(cx + 44)} 158`;
  return (
    <path
      d={d}
      className={active === 'none' ? 'fill-warm-white text-slate' : 'fill-sea-glass text-tide-teal'}
      stroke="currentColor"
      strokeWidth={active === 'full' ? STROKE.emphasis : STROKE.line}
    />
  );
}

function Response({ cx, strength }: { cx: number; strength: number }) {
  const rays = [-26, -9, 9, 26];
  return (
    <g className="text-tide-teal">
      {rays.map((dx, i) => (
        <line
          key={dx}
          x1={cx + dx * 0.4}
          y1={182}
          x2={cx + dx}
          y2={182 + 22 * strength}
          stroke="currentColor"
          strokeWidth={STROKE.emphasis}
          strokeLinecap="round"
          opacity={i < Math.round(rays.length * strength) ? 1 : 0.18}
        />
      ))}
    </g>
  );
}

export function ReceptorBindingIllustration({ id = 'ill-receptor-binding' }: { id?: string }) {
  const panels = [
    { cx: 130, title: 'Agonist', sub: ['attaches and', 'switches it on'] },
    { cx: 390, title: 'Partial agonist', sub: ['attaches, and switches', 'it only partly on'] },
    { cx: 650, title: 'Antagonist', sub: ['attaches without', 'switching it on — and', 'keeps activators out'] },
  ] as const;
  return (
    <Illustration
      id={id}
      title="Attaching to a receptor is not the same as switching it on"
      description="Three receptors sit in a cell membrane. An agonist attaches and switches its receptor fully on, drawn as a full response beneath the membrane. A partial agonist attaches and switches its receptor only partly on, drawn as a weaker response. An antagonist attaches without switching its receptor on, drawn with no response, and blocks an activating molecule waiting outside."
      viewBox="0 0 780 290"
      minWidth={600}
      basis={{ kind: 'claims', claimKeys: ['REC-02', 'REC-03', 'REC-04', 'REC-05'] }}
      caption="Binding — having affinity — is what every action starts with. Switching a receptor on is a separate property, efficacy, and molecules differ in how much of it they have."
    >
      {panels.map((p) => (
        <g key={p.cx}>
          <Label x={p.cx} y={34} lines={[p.title]} serif size="md" weight={600} />
          <rect x={p.cx - 110} y={158} width={220} height={24} className="fill-rule-soft" />
          <line x1={p.cx - 110} y1={158} x2={p.cx + 110} y2={158} className="text-rule" stroke="currentColor" />
          <line x1={p.cx - 110} y1={182} x2={p.cx + 110} y2={182} className="text-rule" stroke="currentColor" />
          <Label x={p.cx} y={246} lines={p.sub} size="xs" tone="soft" />
        </g>
      ))}

      <ReceptorPocket cx={130} active="full" />
      <circle cx={130} cy={104} r={15} className="fill-deep-tide" />
      <Response cx={130} strength={1} />

      <ReceptorPocket cx={390} active="partial" />
      <circle cx={390} cy={104} r={15} className="fill-tide-teal" opacity={0.7} />
      <Response cx={390} strength={0.5} />

      <ReceptorPocket cx={650} active="none" />
      <rect x={636} y={92} width={28} height={26} rx={4} className="fill-slate" />
      <circle cx={704} cy={62} r={13} className="fill-deep-tide" opacity={0.5} />
      <line x1={694} y1={72} x2={672} y2={88} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <Label x={650} y={214} lines={['no response']} size="xs" tone="slate" />

      <Label x={756} y={175} lines={['cell membrane']} size="xs" tone="slate" anchor="end" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Inside the cell: a G-protein-coupled receptor, and switching it off
// ---------------------------------------------------------------------------

export function CellSignallingIllustration({ id = 'ill-cell-signalling' }: { id?: string }) {
  const helices = [0, 1, 2, 3, 4, 5, 6];
  return (
    <Illustration
      id={id}
      title="What happens inside the receiving cell"
      description="A messenger binds a receptor that crosses the cell membrane seven times. The receptor changes shape and switches on a G protein inside the cell. That leads to second-messenger signals, and the cell changes what it is doing. Separately, proteins called arrestins can bind the active receptor, shut down that route of signalling and draw the receptor into the cell."
      viewBox="0 0 800 300"
      minWidth={620}
      basis={{ kind: 'claims', claimKeys: ['SIG-02', 'SIG-07', 'SIG-09', 'SIG-12', 'SIG-13'] }}
      caption="The messenger does not enter. It changes the shape of its receptor, and the cell's own relay systems carry the signal on — until arrestins switch that route off."
    >
      <Label x={24} y={36} lines={['Outside the cell']} size="xs" tone="slate" anchor="start" caps />
      <Label x={776} y={286} lines={['Inside the cell']} size="xs" tone="slate" anchor="end" caps />

      {/* Membrane */}
      <rect x={20} y={100} width={760} height={34} className="fill-rule-soft" />
      <line x1={20} y1={100} x2={780} y2={100} className="text-rule" stroke="currentColor" />
      <line x1={20} y1={134} x2={780} y2={134} className="text-rule" stroke="currentColor" />

      {/* Receptor: seven passes */}
      {helices.map((i) => (
        <rect key={i} x={150 + i * 12} y={90} width={9} height={54} rx={4} className="fill-tide-teal" />
      ))}
      <circle cx={190} cy={66} r={13} className="fill-deep-tide" />
      <line x1={190} y1={46} x2={190} y2={30} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} />
      <Label x={214} y={62} lines={['the messenger binds, and', 'the receptor changes shape']} size="xs" tone="soft" anchor="start" />

      {/* G protein */}
      <line x1={220} y1={152} x2={292} y2={178} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <g className="text-tide-teal">
        <ellipse cx={322} cy={188} rx={24} ry={16} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.line} />
        <ellipse cx={352} cy={196} rx={16} ry={12} className="fill-sea-glass" stroke="currentColor" strokeWidth={STROKE.line} />
      </g>
      <Label x={336} y={228} lines={['a G protein', 'is switched on']} size="xs" tone="soft" />

      {/* Second messengers */}
      <line x1={378} y1={190} x2={446} y2={190} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      {[
        [470, 176],
        [488, 196],
        [506, 180],
        [478, 208],
        [500, 214],
      ].map(([x, y]) => (
        <circle key={`${String(x)}-${String(y)}`} cx={x} cy={y} r={5} className="fill-deep-tide" opacity={0.75} />
      ))}
      <Label x={488} y={244} lines={['second-messenger', 'pathways relay it']} size="xs" tone="soft" />

      {/* Response */}
      <line x1={528} y1={196} x2={586} y2={196} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} markerEnd={arrowUrl(id)} />
      <rect x={596} y={170} width={170} height={52} rx={10} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.emphasis} />
      <Label x={681} y={192} lines={['the cell changes', 'what it is doing']} size="xs" tone="deep" weight={500} />

      {/* Switching off */}
      <path d="M 96 198 q 14 -26 40 -30" fill="none" stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <path d="M 62 214 a 24 24 0 1 0 44 -16 a 16 16 0 1 1 -44 16 z" className="fill-caution-bg text-[var(--color-caution)]" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={24} y={256} lines={['switching off: arrestins bind the active', 'receptor, shut this route down, and help', 'draw the receptor into the cell']} size="xs" tone="caution" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Moving through the body
// ---------------------------------------------------------------------------

function Node({
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
    tone === 'blood'
      ? 'fill-sea-glass text-tide-teal'
      : tone === 'out'
        ? 'fill-warm-white text-slate'
        : 'fill-warm-white text-tide-teal';
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2.4} className={cls} stroke="currentColor" strokeWidth={tone === 'blood' ? STROKE.emphasis : STROKE.line} strokeDasharray={tone === 'out' ? DASH : undefined} />
      <Label x={x + w / 2} y={y + h / 2 + 4 - ((lines.length - 1) * 7.5)} lines={lines} size="xs" tone={tone === 'blood' ? 'deep' : 'soft'} weight={tone === 'blood' ? 600 : 400} />
    </g>
  );
}

export function CirculationIllustration({ id = 'ill-circulation' }: { id?: string }) {
  return (
    <Illustration
      id={id}
      title="How a substance moves through the body"
      description="A flow diagram. A substance given into a vein enters the bloodstream directly. One given under the skin or into a muscle reaches the bloodstream through small blood vessels or the lymphatic system. One swallowed and absorbed from the gut travels to the liver before reaching the rest of the body. From the bloodstream, peptides mostly stay in the blood and the fluid around cells. Most peptides are broken down by enzymes, and small peptides can be filtered out by the kidneys."
      viewBox="0 0 800 320"
      minWidth={640}
      basis={{ kind: 'claims', claimKeys: ['PKG-01', 'PKG-13', 'PKG-14', 'PKG-17', 'PKG-18', 'PKG-19', 'RTE-13'] }}
      caption="Absorption, distribution, metabolism and elimination, drawn as a route map. The peptide-specific notes are generalisations from a review of peptide pharmacokinetics, not a description of any compound."
    >
      <Label x={24} y={30} lines={['How it gets in']} size="xs" tone="slate" anchor="start" caps />
      <Node x={20} y={46} w={176} h={44} lines={['into a vein']} />
      <Node x={20} y={128} w={176} h={50} lines={['under the skin or', 'into a muscle']} />
      <Node x={20} y={226} w={176} h={44} lines={['swallowed']} />

      <Node x={250} y={226} w={110} h={44} lines={['gut']} />
      <Node x={410} y={226} w={110} h={44} lines={['liver first']} />

      <Node x={300} y={98} w={220} h={70} lines={['bloodstream']} tone="blood" />

      <Label x={780} y={30} lines={['Where it goes, how it leaves']} size="xs" tone="slate" anchor="end" caps />
      <Node x={574} y={46} w={206} h={50} lines={['fluid around cells', '(peptides mostly stay here)']} />
      <Node x={574} y={128} w={206} h={50} lines={['broken down by enzymes', '(most peptides)']} />
      <Node x={574} y={210} w={206} h={50} lines={['filtered by the kidneys', '(small peptides can be)']} />
      <Node x={604} y={276} w={146} h={34} lines={['leaves the body']} tone="out" />

      <g stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.line} fill="none">
        <path d="M 196 68 C 250 68, 262 110, 296 118" markerEnd={arrowUrl(id)} />
        <path d="M 196 153 C 240 153, 256 146, 296 140" markerEnd={arrowUrl(id)} />
        <line x1={196} y1={248} x2={246} y2={248} markerEnd={arrowUrl(id)} />
        <line x1={360} y1={248} x2={406} y2={248} markerEnd={arrowUrl(id)} />
        <path d="M 466 226 C 466 196, 456 186, 440 172" markerEnd={arrowUrl(id)} />
        <path d="M 520 118 C 548 100, 552 78, 570 72" markerEnd={arrowUrl(id)} />
        <line x1={520} y1={140} x2={570} y2={150} markerEnd={arrowUrl(id)} />
        <path d="M 520 158 C 548 190, 552 226, 570 232" markerEnd={arrowUrl(id)} />
      </g>
      <line x1={677} y1={260} x2={677} y2={272} stroke="currentColor" className="text-slate" strokeWidth={STROKE.hairline} strokeDasharray={DASH} markerEnd={softArrowUrl(id)} />
      <Label x={210} y={186} lines={['via blood vessels', 'or lymph']} size="xs" tone="slate" anchor="start" />
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Routes of administration
// ---------------------------------------------------------------------------

export function RoutesIllustration({ id = 'ill-routes' }: { id?: string }) {
  const others = [
    { y: 70, title: 'By mouth', note: ['travels through the gut, then', 'the liver, before the rest of the body'] },
    { y: 132, title: 'Into the nose', note: ['absorbed through the nasal lining;', 'large molecules pass poorly'] },
    { y: 194, title: 'Through the skin', note: ['the outer layer holds back large,', 'water-loving molecules'] },
    { y: 256, title: 'Under the tongue or cheek', note: ['enters the blood directly for', 'certain drugs, skipping gut and liver'] },
  ] as const;
  return (
    <Illustration
      id={id}
      title="Routes of administration, and what each one has to cross"
      description="On the left, a cross-section beneath the skin shows three injection routes as regulators define them: into a vein, beneath the skin into the layer of fat, blood and lymph vessels, and within a muscle. On the right, four other routes and the barrier each meets: by mouth, through the gut and then the liver; into the nose, across the nasal lining, which large molecules pass poorly; through the skin, whose outer layer holds back large water-loving molecules; and under the tongue or cheek, where certain drugs enter the blood directly."
      viewBox="0 0 800 320"
      minWidth={640}
      basis={{ kind: 'claims', claimKeys: ['RTE-02', 'RTE-03', 'RTE-04', 'RTE-12', 'RTE-20', 'RTE-21', 'RTE-23', 'RTE-25', 'PKG-14'] }}
      caption="This describes routes; it is not a guide to giving anything. Each route decides what a molecule must survive on the way in, and how much of it arrives."
    >
      {/* Tissue cross-section */}
      <rect x={20} y={70} width={360} height={30} rx={4} className="fill-warm-white text-rule" stroke="currentColor" />
      <rect x={20} y={100} width={360} height={86} className="fill-sea-glass" opacity={0.55} />
      <rect x={20} y={186} width={360} height={96} className="fill-rule-soft" />
      {[200, 214, 228, 242, 256, 270].map((y) => (
        <line key={y} x1={24} y1={y} x2={376} y2={y + 6} className="text-rule" stroke="currentColor" strokeWidth={STROKE.hairline} />
      ))}
      <Label x={28} y={90} lines={['skin']} size="xs" tone="slate" anchor="start" />
      <Label x={28} y={118} lines={['fat, small', 'blood and', 'lymph vessels']} size="xs" tone="slate" anchor="start" />
      <Label x={28} y={274} lines={['muscle']} size="xs" tone="slate" anchor="start" />
      <ellipse cx={196} cy={166} rx={26} ry={12} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
      <Label x={196} y={170} lines={['vein']} size="xs" tone="teal" />
      <circle cx={306} cy={128} r={6} className="fill-warm-white text-slate" stroke="currentColor" />
      <circle cx={322} cy={170} r={5} className="fill-warm-white text-slate" stroke="currentColor" />

      <g stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.emphasis}>
        <line x1={196} y1={50} x2={196} y2={148} markerEnd={arrowUrl(id)} />
        <line x1={268} y1={50} x2={268} y2={150} markerEnd={arrowUrl(id)} />
        <line x1={346} y1={50} x2={346} y2={228} markerEnd={arrowUrl(id)} />
      </g>
      <Label x={196} y={22} lines={['into', 'a vein']} size="xs" tone="deep" weight={500} />
      <Label x={268} y={22} lines={['beneath', 'the skin']} size="xs" tone="deep" weight={500} />
      <Label x={346} y={22} lines={['within', 'a muscle']} size="xs" tone="deep" weight={500} />
      <Label x={206} y={306} lines={['Injected routes, as regulators define them']} size="xs" tone="slate" />

      {/* Other routes */}
      <line x1={410} y1={40} x2={410} y2={290} className="text-rule" stroke="currentColor" />
      {others.map((o) => (
        <g key={o.title}>
          <circle cx={444} cy={o.y - 5} r={8} className="fill-warm-white text-tide-teal" stroke="currentColor" strokeWidth={STROKE.line} />
          <Label x={462} y={o.y} lines={[o.title]} size="sm" tone="ink" anchor="start" weight={600} />
          <Label x={462} y={o.y + 18} lines={o.note} size="xs" tone="soft" anchor="start" />
        </g>
      ))}
    </Illustration>
  );
}

// ---------------------------------------------------------------------------
// Concentration over time: Cmax, Tmax, AUC, half-life
// ---------------------------------------------------------------------------

/**
 * The curve is computed, not sketched: a one-compartment model with first-order
 * absorption and elimination, C(t) ∝ e^(−kₑt) − e^(−kₐt). The half-life bracket is
 * drawn between two times one elimination half-life apart in the terminal
 * phase, so the level at its right end really is half the level at its left.
 * The constants are arbitrary and no value is shown: the shape is the point.
 */
const KA = 1.2;
const KE = 0.22;
const T_END = 16;
const X0 = 84;
const X1 = 700;
const Y_BASE = 230;
const HEIGHT = 170;

function conc(t: number): number {
  return Math.exp(-KE * t) - Math.exp(-KA * t);
}

export function ConcentrationTimeIllustration({ id = 'ill-concentration-time' }: { id?: string }) {
  const tMax = Math.log(KA / KE) / (KA - KE);
  const cMax = conc(tMax);
  const x = (t: number) => X0 + (t / T_END) * (X1 - X0);
  const y = (t: number) => Y_BASE - (conc(t) / cMax) * HEIGHT;
  const steps = 120;
  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * T_END;
    return [x(t), y(t)] as const;
  });
  const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`).join(' ');
  const area = `${line} L ${X1.toFixed(1)} ${String(Y_BASE)} L ${String(X0)} ${String(Y_BASE)} Z`;
  const t1 = 7;
  const t2 = t1 + Math.log(2) / KE;

  return (
    <Illustration
      id={id}
      title="A substance's level in the blood over time"
      description="A schematic curve with no values. After a single dose the level in the blood rises to a highest point, Cmax, reached at a time called Tmax, then falls. The area under the curve summarises total exposure. The half-life is marked on the falling part of the curve as the time over which the level halves."
      viewBox="0 0 760 290"
      minWidth={580}
      basis={{ kind: 'claims', claimKeys: ['PKG-04', 'PKG-05', 'PKG-06', 'PKG-08'] }}
      caption="The shape, not any number, is the point: a half-life belongs to a product, a population and a route, so none is shown. The curve is calculated from a standard absorption–elimination model."
    >
      <path d={area} className="fill-sea-glass" opacity={0.7} />
      <path d={line} fill="none" stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.emphasis + 0.4} strokeLinejoin="round" />

      {/* Axes */}
      <line x1={X0} y1={Y_BASE} x2={X1 + 20} y2={Y_BASE} stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} markerEnd={softArrowUrl(id)} />
      <line x1={X0} y1={Y_BASE} x2={X0} y2={40} stroke="currentColor" className="text-slate" strokeWidth={STROKE.line} markerEnd={softArrowUrl(id)} />
      <Label x={X1 + 20} y={Y_BASE + 22} lines={['time']} size="xs" tone="slate" anchor="end" />
      <Label x={X0 - 4} y={26} lines={['level in the blood']} size="xs" tone="slate" anchor="start" />

      {/* Cmax and Tmax */}
      <line x1={X0} y1={y(tMax)} x2={x(tMax)} y2={y(tMax)} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <line x1={x(tMax)} y1={y(tMax)} x2={x(tMax)} y2={Y_BASE} stroke="currentColor" className="text-deep-tide" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <circle cx={x(tMax)} cy={y(tMax)} r={4.5} className="fill-deep-tide" />
      <Label x={x(tMax) + 14} y={y(tMax) + 4} lines={['highest level (Cmax)']} size="xs" tone="deep" anchor="start" weight={500} />
      <Label x={x(tMax)} y={Y_BASE + 22} lines={['time to highest level (Tmax)']} size="xs" tone="deep" weight={500} />

      {/* Half-life */}
      <circle cx={x(t1)} cy={y(t1)} r={4} className="fill-tide-teal" />
      <circle cx={x(t2)} cy={y(t2)} r={4} className="fill-tide-teal" />
      <line x1={x(t1)} y1={y(t1)} x2={x(t1)} y2={y(t1) - 44} stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <line x1={x(t2)} y1={y(t2)} x2={x(t2)} y2={y(t1) - 44} stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.hairline} strokeDasharray={DASH} />
      <line x1={x(t1)} y1={y(t1) - 40} x2={x(t2)} y2={y(t1) - 40} stroke="currentColor" className="text-tide-teal" strokeWidth={STROKE.line} markerStart={arrowUrl(id)} markerEnd={arrowUrl(id)} />
      <Label x={(x(t1) + x(t2)) / 2} y={y(t1) - 50} lines={['half-life: the level halves']} size="xs" tone="teal" weight={600} />

      <Label x={x(2.2)} y={Y_BASE - 22} lines={['area under the curve:', 'total exposure (AUC)']} size="xs" tone="deep" anchor="start" />
    </Illustration>
  );
}
