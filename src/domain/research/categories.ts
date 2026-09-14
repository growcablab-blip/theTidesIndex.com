/**
 * Research-question categories.
 *
 * The database records thirteen opportunity types, which is the right grain for
 * an editor and the wrong one for a reader: "long-term outcomes" and "human
 * evidence" are the same kind of absence to somebody scanning the agenda, and
 * thirteen headings read as a database rather than a map. These nine categories
 * are the grouping the research page shows. Every opportunity type belongs to
 * exactly one, which a unit test proves, so a question can never fall between
 * headings or appear under two.
 *
 * Navigation copy only. The labels name a *kind* of question; nothing here
 * states a finding, and the order is a reading order, never a ranking.
 */

/** Every opportunity type the database constraint accepts. */
export const OPPORTUNITY_TYPES = [
  'identity_clarification',
  'human_evidence',
  'human_safety',
  'human_pharmacokinetics',
  'route_comparison',
  'formulation_comparison',
  'dose_response',
  'independent_replication',
  'long_term_outcomes',
  'mechanism_confirmation',
  'protocol_validation',
  'product_characterisation',
  'regulatory_position',
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export type ResearchCategoryKey =
  | 'human-evidence'
  | 'safety'
  | 'pharmacokinetics'
  | 'route'
  | 'formulation'
  | 'mechanism'
  | 'replication'
  | 'protocol'
  | 'identity-regulatory';

/** A drawn mark per category, so the distinction never rests on colour. */
export type ResearchGlyph =
  | 'person'
  | 'shield'
  | 'curve'
  | 'arrow'
  | 'layers'
  | 'receptor'
  | 'pair'
  | 'uneven'
  | 'diamond';

/**
 * The compound-page section where what *is* recorded for this kind of question
 * lives. Only sections the compound page always renders, so the link never
 * lands on nothing.
 */
export type RecordAnchor = 'evidence' | 'routes' | 'protocols' | 'regulatory';

export interface ResearchCategory {
  readonly key: ResearchCategoryKey;
  /** Practitioner heading: names the kind of gap. */
  readonly label: string;
  /** Simple heading: the same idea in plain words. */
  readonly plainLabel: string;
  /** One sentence describing what questions of this kind ask. */
  readonly describes: string;
  readonly glyph: ResearchGlyph;
  readonly recordAnchor: RecordAnchor;
  readonly opportunityTypes: readonly OpportunityType[];
}

export const RESEARCH_CATEGORIES: readonly ResearchCategory[] = [
  {
    key: 'human-evidence',
    label: 'Human evidence gap',
    plainLabel: 'Not yet shown in people',
    describes: 'Whether an effect has been measured in people at all, or over a long enough time.',
    glyph: 'person',
    recordAnchor: 'evidence',
    opportunityTypes: ['human_evidence', 'long_term_outcomes'],
  },
  {
    key: 'safety',
    label: 'Safety question',
    plainLabel: 'Harms not yet looked for',
    describes: 'Whether harms in people have been systematically collected.',
    glyph: 'shield',
    recordAnchor: 'evidence',
    opportunityTypes: ['human_safety'],
  },
  {
    key: 'pharmacokinetics',
    label: 'Pharmacokinetic question',
    plainLabel: 'What the body does with it',
    describes: 'How the substance is absorbed, how long it lasts and where it goes in a human body.',
    glyph: 'curve',
    recordAnchor: 'evidence',
    opportunityTypes: ['human_pharmacokinetics'],
  },
  {
    key: 'route',
    label: 'Route question',
    plainLabel: 'How it is given',
    describes: 'Whether the way a substance is given matches the way it was studied.',
    glyph: 'arrow',
    recordAnchor: 'routes',
    opportunityTypes: ['route_comparison'],
  },
  {
    key: 'formulation',
    label: 'Formulation question',
    plainLabel: 'What is in the product',
    describes: 'What a mixture contributes, and what products actually contain.',
    glyph: 'layers',
    recordAnchor: 'evidence',
    opportunityTypes: ['formulation_comparison', 'product_characterisation'],
  },
  {
    key: 'mechanism',
    label: 'Mechanism question',
    plainLabel: 'How it would work',
    describes: 'Whether a proposed mechanism or measurement has been confirmed directly.',
    glyph: 'receptor',
    recordAnchor: 'evidence',
    opportunityTypes: ['mechanism_confirmation'],
  },
  {
    key: 'replication',
    label: 'Replication gap',
    plainLabel: 'Found once, not yet repeated',
    describes: 'Whether anybody other than the first group has found the same thing.',
    glyph: 'pair',
    recordAnchor: 'evidence',
    opportunityTypes: ['independent_replication'],
  },
  {
    key: 'protocol',
    label: 'Protocol inconsistency',
    plainLabel: 'Schedules that were never tested',
    describes: 'Whether the schedules and amounts sources describe have ever been compared or tested.',
    glyph: 'uneven',
    recordAnchor: 'protocols',
    opportunityTypes: ['protocol_validation', 'dose_response'],
  },
  {
    key: 'identity-regulatory',
    label: 'Identity or regulatory question',
    plainLabel: 'What it is called, and its standing',
    describes: 'What a name refers to, and questions about a regulatory position.',
    glyph: 'diamond',
    recordAnchor: 'regulatory',
    opportunityTypes: ['identity_clarification', 'regulatory_position'],
  },
];

const BY_TYPE = new Map<string, ResearchCategory>(
  RESEARCH_CATEGORIES.flatMap((category) =>
    category.opportunityTypes.map((type) => [type, category] as const),
  ),
);

const LAST = RESEARCH_CATEGORIES[RESEARCH_CATEGORIES.length - 1];

/**
 * The category an opportunity type belongs to.
 *
 * An unknown type — one added to the database before this module — goes to the
 * last category rather than disappearing. A question silently dropped from the
 * agenda is worse than one filed under a broad heading.
 */
export function categoryFor(opportunityType: string): ResearchCategory {
  return BY_TYPE.get(opportunityType) ?? (LAST as ResearchCategory);
}

export function isResearchCategoryKey(value: unknown): value is ResearchCategoryKey {
  return RESEARCH_CATEGORIES.some((category) => category.key === value);
}

/**
 * Items grouped by category, in category order, empty categories omitted. Order
 * within a category is preserved exactly as given.
 */
export function groupByCategory<T extends { readonly opportunityType: string }>(
  items: readonly T[],
): { readonly category: ResearchCategory; readonly items: readonly T[] }[] {
  return RESEARCH_CATEGORIES.map((category) => ({
    category,
    items: items.filter((item) => categoryFor(item.opportunityType).key === category.key),
  })).filter((group) => group.items.length > 0);
}

/** How many items fall in each category, zero included. A count, never a score. */
export function countByCategory(
  items: readonly { readonly opportunityType: string }[],
): ReadonlyMap<ResearchCategoryKey, number> {
  const counts = new Map<ResearchCategoryKey, number>(
    RESEARCH_CATEGORIES.map((category) => [category.key, 0]),
  );
  for (const item of items) {
    const key = categoryFor(item.opportunityType).key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
