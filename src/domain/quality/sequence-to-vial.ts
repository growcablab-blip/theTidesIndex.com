/**
 * The reading order for "From sequence to final vial".
 *
 * Structure only: the order of stages, the question each answers, and which
 * claims belong to it. What a stage says comes from those claims. Kept out of
 * the page so a test can check every referenced claim key against the evidence
 * packets — a renamed claim would otherwise turn a sourced stage into
 * "source needed" without anyone noticing.
 */

export interface VialStage {
  readonly key: string;
  readonly name: string;
  readonly lines: readonly [string] | readonly [string, string];
  readonly question: string;
  /**
   * What leaves this stage and arrives at the next one.
   *
   * Structure, not content: it names the material handed on, which is what
   * turns a list of topics into a journey. It states no property of the
   * material and cites nothing, because everything a stage *establishes* comes
   * from its claims.
   */
  readonly handsOn?: string;
  readonly claimKeys: readonly string[];
  /** Why a stage has no claims, where that is known. Status, not content. */
  readonly missing?: string;
  readonly related?: readonly { href: string; label: string }[];
}

export const SEQUENCE_TO_VIAL_TOPICS = [
  'peptide-synthesis-spps',
  'purification',
  'storage-stability',
  'batch-traceability',
  'transport-excursions',
] as const;

export const SEQUENCE_TO_VIAL_STAGES: readonly VialStage[] = [
  {
    key: 'design',
    name: 'Sequence and process design',
    lines: ['Sequence and', 'process design'],
    question: 'How will this sequence be made, and at what scale?',
    handsOn: 'A sequence and a plan for making it.',
    claimKeys: ['SPPS-006', 'SPPS-007'],
  },
  {
    key: 'raw-materials',
    name: 'Raw materials',
    lines: ['Raw materials'],
    question: 'Were the ingredients specified, tested and released before use?',
    handsOn: 'Resin, protected amino acids, reagents and solvents, each specified.',
    claimKeys: ['SPPS-008', 'TRACE-001'],
  },
  {
    key: 'assembly',
    name: 'Chain assembly (solid-phase synthesis)',
    lines: ['Chain assembly', '(SPPS)'],
    question: 'How is the chain built, and where do errors enter?',
    handsOn: 'A protected chain, still attached to the resin.',
    claimKeys: ['SPPS-001', 'SPPS-002', 'SPPS-005'],
  },
  {
    key: 'cleavage',
    name: 'Cleavage and deprotection',
    lines: ['Cleavage and', 'deprotection'],
    question: 'What can the step that frees the peptide do to it?',
    handsOn: 'The peptide, free of the resin and its protecting groups.',
    claimKeys: ['SPPS-003'],
  },
  {
    key: 'crude',
    name: 'Crude peptide',
    lines: ['Crude peptide'],
    question: 'What else is in the material at this point?',
    handsOn: 'Crude material: the intended peptide among the by-products of making it.',
    claimKeys: ['SPPS-004', 'PUR-001'],
  },
  {
    key: 'purification',
    name: 'Purification',
    lines: ['Purification'],
    question: 'How far was it purified, and for what purpose?',
    handsOn: 'A purified fraction, at whatever level the intended use asked for.',
    claimKeys: ['PUR-002', 'PUR-003', 'PUR-004'],
  },
  {
    key: 'characterisation',
    name: 'Analytical characterisation',
    lines: ['Analytical', 'characterisation'],
    question: 'Do independent tests agree that this is the intended peptide?',
    handsOn: 'The same material, now with measurements attached to it.',
    claimKeys: ['PUR-005'],
    related: [
      { href: '/quality/hplc-purity', label: 'HPLC purity' },
      { href: '/quality/identity-testing', label: 'Identity testing' },
      { href: '/quality/peptide-content-assay', label: 'Peptide content' },
    ],
  },
  {
    key: 'api',
    name: 'Bulk peptide (API) and batch record',
    lines: ['Bulk peptide', '(API)'],
    question: 'Is there a batch record, with in-process checks and a formal release?',
    handsOn: 'Bulk peptide with a batch record behind it.',
    claimKeys: ['TRACE-002', 'TRACE-004', 'TRACE-005'],
  },
  {
    key: 'formulation',
    name: 'Formulation',
    lines: ['Formulation'],
    question: 'What else was added, and why?',
    handsOn: 'The peptide with whatever else the product contains.',
    claimKeys: [],
    missing:
      'The formulation text registered for this (SRC-014) is not the registered work, and no other held source covers peptide formulation.',
  },
  {
    key: 'fill-finish',
    name: 'Fill and finish',
    lines: ['Fill and finish'],
    question: 'How was the material put into vials and sealed?',
    handsOn: 'Material in its final container, sealed.',
    claimKeys: [],
    missing: 'No held source describes filling, sealing or sterile processing of peptide products.',
  },
  {
    key: 'lyophilisation',
    name: 'Lyophilisation',
    lines: ['Lyophilisation'],
    question: 'Was it freeze-dried, and how?',
    handsOn: 'A dried cake in a vial.',
    claimKeys: [],
    missing:
      'The lyophilisation text registered for this (SRC-013) is a two-page contents listing. The storage stage below records what the held textbook says about freeze-drying research peptides for storage, which is not a manufacturing process.',
  },
  {
    key: 'release',
    name: 'Finished-product release testing',
    lines: ['Release testing'],
    question: 'What was tested on the finished vial, not just the bulk peptide?',
    handsOn: 'A batch either released or not, and the tests that decided.',
    claimKeys: [],
    missing:
      'No held source states release testing for finished peptide products. Sterility and bacterial endotoxin topics are blocked on compendial access.',
    related: [{ href: '/quality/certificate-of-analysis', label: 'Reading a certificate' }],
  },
  {
    key: 'storage',
    name: 'Storage',
    lines: ['Storage'],
    question: 'Could the material have changed since it was tested?',
    handsOn: 'The same vials, older, under recorded conditions or unrecorded ones.',
    claimKeys: ['STAB-001', 'STAB-004', 'STAB-002', 'STAB-003', 'STAB-005', 'STAB-006'],
  },
  {
    key: 'transport',
    name: 'Transport and repackaging',
    lines: ['Transport and', 'repackaging'],
    question: 'Who handled it between the maker and you, and under what conditions?',
    handsOn: 'A vial that has arrived somewhere, having been handled by somebody.',
    claimKeys: ['TRANS-001', 'TRANS-002', 'TRACE-006'],
  },
  {
    key: 'vial',
    name: 'The final vial',
    lines: ['The final vial'],
    question: 'Which of the stages above does the paperwork in front of you describe?',
    claimKeys: ['TRANS-003'],
  },
];

/** The five questions. Each points at the claim that makes it a fair question. */
export const KNOW_THE_FIVE: readonly { title: string; question: string; claimKey: string }[] = [
  {
    title: 'Know the source',
    question: 'Who actually made this material, as distinct from who sold it?',
    claimKey: 'TRACE-006',
  },
  {
    title: 'Know the process',
    question: 'Research-scale or pharmaceutical-scale, and purified to what level for what use?',
    claimKey: 'SPPS-006',
  },
  {
    title: 'Know the test',
    question: 'Which tests, on what, and did more than one kind of test agree?',
    claimKey: 'PUR-005',
  },
  {
    title: 'Know the batch',
    question: 'Does the batch number lead to a record, or only to a label?',
    claimKey: 'TRACE-002',
  },
  {
    title: 'Know the chain',
    question: 'What happened to it between the test and the vial?',
    claimKey: 'STAB-003',
  },
];

export const VIAL_CHECKPOINTS: readonly { label: string; detail: string; claimKey: string }[] = [
  { label: 'Raw material release', detail: 'before use', claimKey: 'SPPS-008' },
  { label: 'In-process controls', detail: 'during manufacture', claimKey: 'TRACE-004' },
  { label: 'Characterisation', detail: 'more than one method', claimKey: 'PUR-005' },
  { label: 'Batch release', detail: 'before distribution', claimKey: 'TRACE-005' },
  { label: 'Re-evaluation', detail: 'after long storage', claimKey: 'STAB-003' },
];

/** Every claim key the page depends on, for tests. */
export function referencedClaimKeys(): string[] {
  return [
    ...new Set([
      ...SEQUENCE_TO_VIAL_STAGES.flatMap((s) => s.claimKeys),
      ...KNOW_THE_FIVE.map((k) => k.claimKey),
      ...VIAL_CHECKPOINTS.map((c) => c.claimKey),
    ]),
  ];
}
