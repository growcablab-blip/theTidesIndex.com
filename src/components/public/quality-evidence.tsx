import Link from 'next/link';
import type {
  EvidenceGap,
  RelationshipEvidenceStatus,
  TopicRelationship,
} from '@/server/public/queries';

/**
 * The four kinds of thing a quality page says, kept visually distinct.
 *
 * The distinction that matters most is between a statement a reviewed source
 * supports and one the reviewed library does not establish either way. Those two
 * are not degrees of confidence in the same assertion — they are different kinds
 * of statement, and rendering them alike would let a reader take an absence of
 * evidence for evidence of absence.
 *
 * So each carries a worded label, a shape, and an accessible description.
 * Colour is never the carrier: the same information survives greyscale printing,
 * forced-colours mode, and a reader who cannot distinguish the hues
 * (DESIGN_SYSTEM.md).
 */

interface Semantics {
  readonly label: string;
  readonly glyph: string;
  readonly glyphLabel: string;
  readonly container: string;
  readonly chip: string;
}

const SEMANTICS: Readonly<Record<RelationshipEvidenceStatus, Semantics>> = {
  evidence_backed: {
    label: 'Supported by a reviewed source',
    glyph: '§',
    glyphLabel: 'Source-linked',
    container: 'border-l-[3px] border-l-tide-teal border border-rule bg-warm-white',
    chip: 'border-tide-teal text-deep-tide',
  },
  complementary: {
    label: 'Read alongside — supported by a reviewed source',
    glyph: '§',
    glyphLabel: 'Source-linked',
    container: 'border-l-[3px] border-l-tide-teal border border-rule bg-warm-white',
    chip: 'border-tide-teal text-deep-tide',
  },
  evidence_gap: {
    label: 'Not established by current sources',
    glyph: '?',
    glyphLabel: 'Evidence gap',
    container:
      'border-l-[3px] border-l-[var(--color-caution)] border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)]',
    chip: 'border-[var(--color-caution-rule)] text-[var(--color-caution)]',
  },
  structural: {
    label: 'Navigational link — no evidence claimed',
    glyph: '→',
    glyphLabel: 'Navigational',
    container: 'border border-dashed border-rule bg-mist',
    chip: 'border-dashed border-rule text-slate',
  },
};

const RELATIONSHIP_HEADINGS: Readonly<Record<string, string>> = {
  commonly_conflated: 'Commonly confused with this',
  complementary: 'Read alongside this',
  not_addressed_by: 'Questions this test does not answer',
  same_process: 'Part of the same process',
  other_attribute: 'Other attributes of the same material',
  scoped_by: 'What a result is a statement about',
};

/** Order the map is read in: the confusions first, because they do the work. */
const HEADING_ORDER: readonly string[] = [
  'commonly_conflated',
  'not_addressed_by',
  'complementary',
  'same_process',
  'scoped_by',
  'other_attribute',
];

function StatusChip({ status }: { status: RelationshipEvidenceStatus }) {
  const semantics = SEMANTICS[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${semantics.chip}`}
    >
      <span aria-hidden="true" className="font-mono">
        {semantics.glyph}
      </span>
      {semantics.label}
    </span>
  );
}

/**
 * What the reviewed library does not establish.
 *
 * Worded as a statement about this index rather than about the world. "Current
 * reviewed sources here do not establish this" is true and checkable; "HPLC
 * cannot tell you this" would be a claim, and one no source in the register
 * supports.
 */
export function EvidenceGapList({ gaps }: { gaps: readonly EvidenceGap[] }) {
  if (gaps.length === 0) return null;

  return (
    <ul className="space-y-4">
      {gaps.map((gap) => (
        <li
          key={gap.id}
          className={`rounded-md px-5 py-4 ${SEMANTICS.evidence_gap.container}`}
        >
          <StatusChip status="evidence_gap" />
          <p className="mt-2.5 text-ink">{gap.statement}</p>
          <p className="mt-2 text-sm text-ink-soft">
            <span className="font-medium">Why this index does not say it:</span>{' '}
            {gap.whyNotSupported}
          </p>
          {gap.whatWouldResolveIt ? (
            <p className="mt-1.5 text-sm text-slate">
              <span className="font-medium">What would settle it:</span> {gap.whatWouldResolveIt}
            </p>
          ) : null}
          {gap.verificationIssueKey ? (
            <p className="mt-1.5 text-xs tracking-wide text-slate uppercase">
              Tracked as {gap.verificationIssueKey}
            </p>
          ) : null}
          <GapResolutionNote gap={gap} />
        </li>
      ))}
    </ul>
  );
}

const RESOLUTION_LABEL: Record<string, string> = {
  partially_resolved: 'Partly closed by later evidence',
  resolved: 'Closed by later evidence',
  superseded: 'Superseded',
};

/**
 * What later evidence did to a gap, shown on the gap itself.
 *
 * An open gap renders nothing extra: that is the default a reader already
 * assumes. A gap that moved says so, with the note that justifies the move and
 * the date it was checked, so a closed absence is never simply missing.
 */
export function GapResolutionNote({
  gap,
}: {
  gap: Pick<EvidenceGap, 'resolutionState' | 'resolutionNote'>;
}) {
  const label = RESOLUTION_LABEL[gap.resolutionState];
  if (label === undefined || gap.resolutionNote === null) return null;
  return (
    <p className="mt-2 border-l-2 border-tide-teal pl-3 text-sm text-ink-soft">
      <span className="font-medium text-deep-tide">{label}.</span> {gap.resolutionNote}
    </p>
  );
}

/**
 * The quality map, grouped by what kind of relationship each edge is.
 *
 * A link into a topic with nothing written yet is still shown, labelled. The
 * alternative — hiding it — would leave this page looking like the whole story,
 * which is the exact misreading the section exists to prevent.
 */
export function RelatedTopicMap({
  relationships,
}: {
  relationships: readonly TopicRelationship[];
}) {
  if (relationships.length === 0) return null;

  const groups = new Map<string, TopicRelationship[]>();
  for (const relationship of relationships) {
    const group = groups.get(relationship.relationshipType) ?? [];
    group.push(relationship);
    groups.set(relationship.relationshipType, group);
  }
  const ordered = [...groups].sort(
    (a, b) => HEADING_ORDER.indexOf(a[0]) - HEADING_ORDER.indexOf(b[0]),
  );

  return (
    <div className="space-y-8">
      {ordered.map(([type, group]) => (
        <section key={type} aria-labelledby={`rel-${type}`}>
          <h3 id={`rel-${type}`} className="font-serif text-lg text-deep-tide">
            {RELATIONSHIP_HEADINGS[type] ?? type}
          </h3>
          <ul className="mt-3 grid gap-3 lg:grid-cols-2">
            {group.map((relationship) => (
              <li key={relationship.id}>
                <RelationshipCard relationship={relationship} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RelationshipCard({ relationship }: { relationship: TopicRelationship }) {
  const semantics = SEMANTICS[relationship.evidenceStatus];

  const heading = relationship.toIsPublished ? (
    <Link
      href={`/quality/${relationship.toSlug}`}
      className="font-medium text-deep-tide underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
    >
      {relationship.toName}
    </Link>
  ) : (
    <span className="font-medium text-ink">{relationship.toName}</span>
  );

  return (
    <div className={`h-full rounded-md px-4 py-3.5 ${semantics.container}`}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {heading}
        {relationship.toIsPublished ? null : (
          // Named, not hidden. A reader learns the question exists even where
          // this index has nothing to say about it yet.
          <span className="text-xs tracking-wide text-slate uppercase">
            Reference page in preparation
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-ink-soft">{relationship.rationale}</p>
      <div className="mt-2.5">
        <StatusChip status={relationship.evidenceStatus} />
      </div>
    </div>
  );
}

/**
 * A legend, because the four treatments only communicate if a reader is told
 * once what they mean.
 */
export function EvidenceLegend() {
  const entries: RelationshipEvidenceStatus[] = [
    'evidence_backed',
    'evidence_gap',
    'structural',
  ];
  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-3">
      {entries.map((status) => (
        <div key={status} className={`rounded-md px-4 py-3 ${SEMANTICS[status].container}`}>
          <dt>
            <StatusChip status={status} />
          </dt>
          <dd className="mt-2 text-slate">{DESCRIPTIONS[status]}</dd>
        </div>
      ))}
    </dl>
  );
}

const DESCRIPTIONS: Readonly<Record<RelationshipEvidenceStatus, string>> = {
  evidence_backed:
    'A named source, at an exact page, says this. The citation is given and can be checked.',
  complementary: 'A named source supports reading the two together.',
  evidence_gap:
    'The sources this index currently holds do not settle the point. That is a statement about this library, not a finding about the world.',
  structural:
    'A way of moving around the quality section. It asserts nothing about what either test establishes.',
};
