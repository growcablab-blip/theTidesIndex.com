import type { QualityMarkKind } from '@/components/public/quality-marks';
import type { QualityRegisterEntry } from '@/server/public/queries';

/**
 * The twelve dimensions of "what quality means", as a reading map.
 *
 * Structure only, like a pathway: which topic a reader should open for each
 * dimension, and where it sits in the sequence-to-vial story. The line beside
 * each dimension is a navigational question, never a finding — what a topic
 * establishes is on the topic page, from its claims.
 *
 * Whether a dimension is written is not declared here. It is read from the
 * register at render time, so the map cannot say more is written than is.
 */

export interface QualityDimension {
  readonly key: QualityMarkKind;
  readonly name: string;
  readonly question: string;
  /** The topic that answers this dimension, by slug. */
  readonly topicSlug: string;
  /**
   * Set where the dimension is covered inside another topic rather than by its
   * own page (fill and finish sits within the sterility records). The link then
   * goes to the stage in the journey, where its claims are shown.
   */
  readonly withinTopic?: boolean;
  /** Anchor on /quality/sequence-to-vial. */
  readonly stage?: string;
}

export interface DimensionMovement {
  readonly key: string;
  readonly title: string;
  readonly line: string;
  readonly dimensions: readonly QualityDimension[];
}

export const QUALITY_MOVEMENTS: readonly DimensionMovement[] = [
  {
    key: 'making',
    title: 'Making the peptide',
    line: 'From a sequence on paper to a purified substance.',
    dimensions: [
      {
        key: 'sequence',
        name: 'Sequence',
        question: 'How will this sequence be made, and at what scale?',
        topicSlug: 'peptide-synthesis-spps',
        withinTopic: true,
        stage: 'design',
      },
      {
        key: 'synthesis',
        name: 'Synthesis',
        question: 'How is the chain built, and where do errors enter?',
        topicSlug: 'peptide-synthesis-spps',
        stage: 'assembly',
      },
      {
        key: 'purification',
        name: 'Purification',
        question: 'How far was it purified, and for what purpose?',
        topicSlug: 'purification',
        stage: 'purification',
      },
    ],
  },
  {
    key: 'measuring',
    title: 'Knowing what is there',
    line: 'Separate questions, each answered by a different test.',
    dimensions: [
      {
        key: 'identity',
        name: 'Identity',
        question: 'Is this the substance it is supposed to be?',
        topicSlug: 'identity-testing',
        stage: 'characterisation',
      },
      {
        key: 'content',
        name: 'Content',
        question: 'How much of the target material is present?',
        topicSlug: 'peptide-content-assay',
        stage: 'characterisation',
      },
      {
        key: 'sterility',
        name: 'Sterility',
        question: 'What does a sterility result cover, and what does it not?',
        topicSlug: 'sterility',
        stage: 'release',
      },
      {
        key: 'endotoxin',
        name: 'Endotoxin',
        question: 'What is an endotoxin result read against?',
        topicSlug: 'bacterial-endotoxin',
        stage: 'release',
      },
    ],
  },
  {
    key: 'finishing',
    title: 'Making the vial',
    line: 'The bulk substance becomes a finished, sealed product.',
    dimensions: [
      {
        key: 'fill-finish',
        name: 'Fill and finish',
        question: 'How was the material put into vials and sealed?',
        topicSlug: 'sterility',
        withinTopic: true,
        stage: 'fill-finish',
      },
      {
        key: 'lyophilisation',
        name: 'Lyophilisation',
        question: 'Was it freeze-dried, and how?',
        topicSlug: 'lyophilisation',
        stage: 'lyophilisation',
      },
    ],
  },
  {
    key: 'following',
    title: 'Following it',
    line: 'Whether a batch, its paperwork and its handling can be traced.',
    dimensions: [
      {
        key: 'batch',
        name: 'Batch',
        question: 'Does the batch number lead to a record, or only to a label?',
        topicSlug: 'batch-traceability',
        stage: 'api',
      },
      {
        key: 'documentation',
        name: 'Documentation',
        question: 'Does this certificate describe what I am holding?',
        topicSlug: 'certificate-of-analysis',
        stage: 'vial',
      },
      {
        key: 'custody',
        name: 'Chain of custody',
        question: 'Who handled it between the maker and you, and under what conditions?',
        topicSlug: 'transport-excursions',
        stage: 'transport',
      },
    ],
  },
];

/** A topic is readable once it has evidence behind it or has been published. */
export function isReadable(entry: QualityRegisterEntry | undefined): boolean {
  return entry !== undefined && (entry.isPublished || entry.claimCount > 0);
}

/** The real state, in words, never dressed up as completeness. */
export function stateLabel(entry: QualityRegisterEntry): { label: string; tone: 'ready' | 'open' } {
  if (entry.isPublished) return { label: 'Published', tone: 'ready' };
  if (entry.reviewState === 'ready_for_scientific_review') {
    return { label: 'Written — awaiting scientific review', tone: 'ready' };
  }
  if (entry.claimCount > 0) return { label: 'Evidence captured', tone: 'ready' };
  /*
   * A recorded open question is a different state from nobody having got to it,
   * and the more useful one to report. The label deliberately does not say what
   * the question is: the verification queue links an issue to a topic but does
   * not record whether that issue is what is holding the topic up.
   */
  if (entry.openIssueKey !== null) return { label: 'Open question recorded', tone: 'open' };
  return { label: 'In preparation', tone: 'open' };
}
