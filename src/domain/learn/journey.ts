/**
 * The learning journey.
 *
 * Seven questions, in the order understanding builds: what a peptide is, how it
 * signals, how it moves through the body, how it is made, how its quality is
 * tested, what the evidence says, and how reported protocols differ. Each step
 * points at pages the index already holds — learning topics, quality pathways,
 * the compound register, the protocol library — so the journey cannot run ahead
 * of the records it introduces.
 *
 * Navigation copy only. Nothing here states a finding: every statement a reader
 * meets at the end of a link is a claim, a synthesis or a recorded gap.
 */

export type JourneyIllustrationKey =
  | 'chain-scale'
  | 'message-receiver'
  | 'circulation'
  | 'sequence-to-vial'
  | 'mass-identity'
  | 'evidence-lanes'
  | 'protocol-comparison';

export interface JourneyLink {
  readonly href: string;
  readonly label: string;
}

export interface JourneyStep {
  readonly key: string;
  readonly question: string;
  /** One sentence a reader gets from the step without clicking. */
  readonly brief: string;
  readonly start: JourneyLink;
  readonly more: readonly JourneyLink[];
  readonly illustration: JourneyIllustrationKey;
}

export const LEARNING_JOURNEY: readonly JourneyStep[] = [
  {
    key: 'what-is-a-peptide',
    question: 'What is a peptide?',
    brief: 'The building blocks, the bond that joins them, and why the line between a peptide and a protein is a convention.',
    start: { href: '/learn/what-is-a-peptide', label: 'What a peptide is' },
    more: [{ href: '/learn/amino-acids-to-proteins', label: 'Amino acids, peptides, proteins' }],
    illustration: 'chain-scale',
  },
  {
    key: 'signalling',
    question: 'How do peptides signal?',
    brief: 'Messages and receivers: why a messenger acts only where a receptor is listening, and how a signal is switched off.',
    start: { href: '/learn/peptide-signalling', label: 'How peptide signalling works' },
    more: [
      { href: '/learn/peptides-in-the-body', label: 'Peptides the body makes' },
      { href: '/learn/receptor-pharmacology', label: 'Receptors, agonists and antagonists' },
    ],
    illustration: 'message-receiver',
  },
  {
    key: 'body',
    question: 'How do they move through the body?',
    brief: 'The ways a substance gets in, where it goes, and how the body clears it — and why peptides are usually injected.',
    start: { href: '/learn/pharmacokinetic-concepts', label: 'Pharmacokinetic concepts' },
    more: [
      { href: '/learn/routes-of-administration', label: 'Routes of administration' },
      { href: '/learn/peptides-as-medicines', label: 'Why most peptides are injected' },
    ],
    illustration: 'circulation',
  },
  {
    key: 'made',
    question: 'How are they made?',
    brief: 'From a sequence on paper to material in a vial, and which step each test actually speaks to.',
    start: { href: '/quality/sequence-to-vial', label: 'From sequence to final vial' },
    more: [],
    illustration: 'sequence-to-vial',
  },
  {
    key: 'quality',
    question: 'How is quality tested?',
    brief: 'Purity, identity and content are separate questions, and a certificate answers fewer of them than it appears to.',
    start: { href: '/quality', label: 'Quality and testing' },
    more: [
      { href: '/quality/hplc-purity', label: 'Purity' },
      { href: '/quality/identity-testing', label: 'Identity' },
      { href: '/quality/certificate-of-analysis', label: 'Reading a certificate' },
    ],
    illustration: 'mass-identity',
  },
  {
    key: 'evidence',
    question: 'What does the evidence say?',
    brief: 'Evidence from people, from animals and from practice kept in separate lanes — with what is still unknown recorded beside it.',
    start: { href: '/peptides', label: 'The compound register' },
    more: [
      { href: '/evidence', label: 'How evidence is classified' },
      { href: '/research', label: 'Open research questions' },
    ],
    illustration: 'evidence-lanes',
  },
  {
    key: 'protocols',
    question: 'How do protocols differ?',
    brief: 'Regimens exactly as each source reported them, side by side and attributed — never averaged into one.',
    start: { href: '/protocols', label: 'Source-reported protocols' },
    more: [],
    illustration: 'protocol-comparison',
  },
];

/** Where a learning topic sits in the journey, for previous and next links. */
export function journeyStepForTopic(slug: string): { step: JourneyStep; index: number } | null {
  const href = `/learn/${slug}`;
  for (const [index, step] of LEARNING_JOURNEY.entries()) {
    if (step.start.href === href || step.more.some((l) => l.href === href)) return { step, index };
  }
  return null;
}
