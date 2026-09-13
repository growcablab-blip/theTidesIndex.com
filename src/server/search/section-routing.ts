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
    id: 'nomenclature',
    label: 'What the names refer to',
    terms: [
      'identity',
      'same as',
      'what is',
      'sequence',
      'nomenclature',
      'name',
      'names',
      'fragment',
      'analogue',
      'analog',
      'synonym',
      'is it the same',
    ],
  },
  {
    id: 'replication',
    label: 'What has been repeated',
    terms: [
      // Whole words, never stems. `mentions` matches on word boundaries at both
      // ends, so a stem like "replicat" can never match "replication" — the
      // rule existed and silently never fired.
      'replication',
      'replicated',
      'replicate',
      'reproduced',
      'reproducible',
      'reproducibility',
      'independent',
      'confirmed',
      'has anyone else',
      'how strong',
      'quality of evidence',
    ],
  },
  {
    id: 'research-questions',
    label: 'What would be useful to study',
    terms: [
      'research question',
      'research questions',
      'what next',
      'gaps',
      'opportunity',
      'opportunities',
      'worth studying',
      'unanswered',
      'future research',
    ],
  },
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
      // Bare "trials" too: "Tesamorelin trials" is a research question and was
      // falling through to no hint at all.
      'trial',
      'trials',
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
  /*
   * Regulatory is last in this list, and the ordering is load-bearing.
   *
   * Rules are offered most-specific-first and capped at three, so a query that
   * names both a regulator and a scientific question gets the science first. A
   * bare compound name gets no regulatory hint at all: someone searching
   * "Tesamorelin" is not asking about the FDA, and a platform that answered as
   * though they were would be teaching them to sort compounds by approval.
   */
  {
    id: 'regulatory',
    label: 'Regulatory context',
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

/**
 * A filtered link into the protocol library, for a query that is about regimens.
 *
 * "Seeds protocols", "subcutaneous protocols", "human trial regimens" and
 * "TB-500 protocols" are not questions about one compound page. They are
 * questions the library answers by filter, so they get a library link built
 * from the words in the query — deterministically, with no generated answer.
 *
 * Returns null when the query is not about regimens at all, which is the
 * common case.
 */
export interface ProtocolLibraryLink {
  readonly href: string;
  readonly label: string;
}

const REGIMEN_WORDS = ['protocol', 'protocols', 'regimen', 'regimens', 'dose', 'doses', 'dosing', 'dosage'];

const SOURCE_NAMES: readonly { terms: readonly string[]; key: string; label: string }[] = [
  { terms: ['seeds'], key: 'SRC-001', label: 'Seeds' },
  { terms: ['lavalle'], key: 'SRC-002', label: 'LaValle' },
  { terms: ['campbell'], key: 'SRC-003', label: 'Campbell' },
  { terms: ['hack smith', 'hacksmith'], key: 'SRC-005', label: 'Hack Smith' },
];

const COMPOUND_NAMES: readonly { terms: readonly string[]; slug: string; label: string }[] = [
  // Order matters: "thymosin beta-4" must be tested before any bare "tb".
  { terms: ['tb-500', 'tb500', 'tb 500'], slug: 'tb-500', label: 'TB-500' },
  { terms: ['thymosin beta-4', 'thymosin beta 4', 'tb4', 'tb-4', 'tβ4'], slug: 'thymosin-beta-4', label: 'Thymosin beta-4' },
  { terms: ['bpc-157', 'bpc157', 'bpc 157', 'bpc'], slug: 'bpc-157', label: 'BPC-157' },
  { terms: ['tesamorelin', 'egrifta'], slug: 'tesamorelin', label: 'Tesamorelin' },
];

const ROUTE_NAMES: readonly { terms: readonly string[]; key: string; label: string }[] = [
  { terms: ['subcutaneous', 'subq', 'sub-q', 'sc'], key: 'subcutaneous', label: 'subcutaneous' },
  { terms: ['intramuscular', 'im'], key: 'intramuscular', label: 'intramuscular' },
  { terms: ['intravenous', 'iv'], key: 'intravenous', label: 'intravenous' },
  { terms: ['intranasal', 'nasal'], key: 'intranasal', label: 'intranasal' },
  { terms: ['oral', 'orally'], key: 'oral', label: 'oral' },
  { terms: ['topical'], key: 'topical', label: 'topical' },
  { terms: ['intra-articular', 'intraarticular'], key: 'intra-articular', label: 'intra-articular' },
];

const EVIDENCE_NAMES: readonly { terms: readonly string[]; key: string; label: string }[] = [
  { terms: ['trial', 'trials', 'rct', 'randomised', 'randomized'], key: 'human_rct', label: 'human trial' },
  { terms: ['label', 'labelled', 'labeled', 'approved'], key: 'approved_label_evidence', label: 'approved-label' },
  { terms: ['handbook', 'practitioner'], key: 'practitioner_reference', label: 'practitioner' },
];

export function protocolLibraryLinkFor(term: string): ProtocolLibraryLink | null {
  const query = term.trim().toLowerCase();
  if (query === '' || !REGIMEN_WORDS.some((w) => mentions(query, w))) return null;

  const params = new URLSearchParams();
  const parts: string[] = [];

  const compound = COMPOUND_NAMES.find((c) => c.terms.some((t) => mentions(query, t)));
  if (compound !== undefined) {
    params.set('peptide', compound.slug);
    parts.push(compound.label);
  }
  const source = SOURCE_NAMES.find((s) => s.terms.some((t) => mentions(query, t)));
  if (source !== undefined) {
    params.set('source', source.key);
    parts.push(`reported by ${source.label}`);
  }
  const route = ROUTE_NAMES.find((r) => r.terms.some((t) => mentions(query, t)));
  if (route !== undefined) {
    params.set('route', route.key);
    parts.push(route.label);
  }
  const evidence = EVIDENCE_NAMES.find((e) => e.terms.some((t) => mentions(query, t)));
  if (evidence !== undefined) {
    params.set('evidence', evidence.key);
    parts.push(`${evidence.label} regimens`);
  }

  const qs = params.toString();
  return {
    href: qs === '' ? '/protocols' : `/protocols?${qs}`,
    label: parts.length === 0 ? 'Browse every source-reported protocol' : `Source-reported protocols: ${parts.join(', ')}`,
  };
}

/** `/peptides/bpc-157#protocols` for a compound hit, plain href otherwise. */
export function hrefWithHint(base: string, hint: SectionHint | undefined): string {
  return hint === undefined ? base : `${base}#${hint.id}`;
}
