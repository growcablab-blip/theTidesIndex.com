/**
 * Where on a compound record a query is probably trying to get to.
 *
 * "BPC-157 human evidence" and "Tesamorelin FDA" name the same two records as
 * "BPC-157" and "Tesamorelin", and a result list that answers all four the same
 * way has thrown away the only part of the query that says what the reader
 * wants. A compound page runs to a dozen sections; landing at the top of it is
 * not an answer.
 *
 * This is navigation vocabulary and nothing else. It maps ordinary search words
 * onto section anchors that exist on the page, and it contains no statement
 * about any compound — a deliberate line, because the moment a routing table
 * starts encoding what is true of a substance it becomes a second, unreviewed
 * source of medical content.
 *
 * A pure function over a string, so it is cheap to test and cannot depend on
 * what happens to be published.
 */

export interface SectionHint {
  /** Anchor id on the compound page. */
  readonly id: string;
  /** What the link says. */
  readonly label: string;
}

interface Rule {
  readonly id: string;
  readonly label: string;
  /** Matched case-insensitively against the whole query. */
  readonly terms: readonly string[];
}

/**
 * Ordered. When a query matches several rules every match is offered, in this
 * order, so that a reader choosing between them sees the more specific
 * destinations first.
 */
const RULES: readonly Rule[] = [
  {
    id: 'literature',
    label: 'What a literature search returns',
    terms: [
      'human evidence',
      'human study',
      'human studies',
      'human trial',
      'human trials',
      'clinical trial',
      'clinical trials',
      'evidence base',
      'literature',
      'studies',
      'rct',
      'randomised',
      'randomized',
      'is there any evidence',
    ],
  },
  {
    id: 'protocols',
    label: 'Source-reported protocols',
    terms: ['protocol', 'protocols', 'regimen', 'regimens', 'dose', 'dosing', 'dosage', 'how much'],
  },
  {
    id: 'routes',
    label: 'Administration routes',
    terms: [
      'route',
      'routes',
      'oral',
      'orally',
      'subcutaneous',
      'injection',
      'injected',
      'topical',
      'intranasal',
      'bioavailability',
    ],
  },
  {
    id: 'regulatory',
    label: 'Regulatory and development status',
    terms: [
      'fda',
      'ema',
      'regulator',
      'regulatory',
      'approved',
      'approval',
      'legal',
      'banned',
      'wada',
      'prescription',
    ],
  },
  {
    id: 'products',
    label: 'Products and chemical form',
    terms: [
      'product',
      'products',
      'brand',
      'formulation',
      'vial',
      'molecular weight',
      'acetate',
      'free base',
      'chemical form',
    ],
  },
  {
    id: 'pharmacokinetics',
    label: 'Pharmacokinetics',
    terms: ['half-life', 'half life', 'pharmacokinetic', 'pharmacokinetics', 'clearance', 'pk'],
  },
  {
    id: 'disagreements',
    label: 'Disagreements and unknowns',
    terms: [
      'cancer',
      'tumour',
      'tumor',
      'oncology',
      'malignancy',
      'disagree',
      'disagreement',
      'conflicting',
      'contradiction',
      'controversy',
      'unknown',
      'unknowns',
      'risk',
      'risks',
    ],
  },
  {
    id: 'evidence',
    label: 'Evidence',
    terms: ['mechanism', 'how does it work', 'what does it do', 'effect', 'effects', 'works'],
  },
];

/** Word-boundary match, so "pk" does not fire on "pkinase" and "dose" not on "doses of". */
function mentions(haystack: string, term: string): boolean {
  const escaped = term.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Trailing 's' is allowed so a rule needs only one spelling of a plural it
  // has not listed; leading boundaries are strict.
  return new RegExp(`(^|[^a-z0-9])${escaped}(s?)($|[^a-z0-9])`, 'i').test(haystack);
}

/**
 * Section hints for a query, most specific first. Empty when the query says
 * nothing about what the reader wants beyond the compound's name — which is the
 * common case and correctly produces no hints rather than a guess.
 */
export function sectionHintsFor(term: string): readonly SectionHint[] {
  const query = term.trim().toLowerCase();
  if (query === '') return [];

  const hints: SectionHint[] = [];
  for (const rule of RULES) {
    if (rule.terms.some((t) => mentions(query, t))) {
      hints.push({ id: rule.id, label: rule.label });
    }
  }
  // Three is the point at which a row of suggestions stops being a shortcut and
  // starts being a second result list.
  return hints.slice(0, 3);
}

/** `/peptides/bpc-157#protocols` for a compound hit, plain href otherwise. */
export function hrefWithHint(base: string, hint: SectionHint | undefined): string {
  return hint === undefined ? base : `${base}#${hint.id}`;
}
