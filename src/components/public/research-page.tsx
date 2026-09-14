import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ResearchQuestionEntry } from '@/server/public/research-index';
import {
  RESEARCH_CATEGORIES,
  type ResearchCategory,
  type ResearchCategoryKey,
  type ResearchGlyph,
} from '@/domain/research/categories';
import { EditorialStateChip } from '@/components/public/editorial-state';
import { GapResolutionNote } from '@/components/public/quality-evidence';
import {
  GAP_FAMILY,
  GAP_FAMILY_STYLE,
  GAP_TYPE_LABELS,
  OPPORTUNITY_LABELS,
  SOURCE_THAT_WOULD_HELP,
} from '@/components/public/research-figures';

/**
 * The parts of the research agenda page.
 *
 * Each category carries a word, a drawn mark and a restrained tint, in that
 * order of importance: the page must still separate a safety question from a
 * route question in greyscale print. Tints separate kinds of question, never
 * degrees of importance.
 *
 * Every scientific sentence rendered here is a field of a recorded gap. The only
 * copy written in this file describes what a heading or a field *is*.
 */

interface CategoryStyle {
  /** The glyph tile and the tally chip. */
  readonly chip: string;
  /** The left rule that ties a category's questions together. */
  readonly rule: string;
}

export const CATEGORY_STYLE: Readonly<Record<ResearchCategoryKey, CategoryStyle>> = {
  'human-evidence': {
    chip: 'border-[var(--color-evidence-human)] bg-[var(--color-evidence-human-bg)] text-[var(--color-evidence-human)]',
    rule: 'border-l-[var(--color-evidence-human)]',
  },
  safety: {
    chip: 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] text-[var(--color-caution)]',
    rule: 'border-l-[var(--color-caution-rule)]',
  },
  pharmacokinetics: {
    chip: 'border-tide-teal/50 bg-mist text-tide-teal',
    rule: 'border-l-tide-teal/50',
  },
  route: {
    chip: 'border-deep-tide/40 bg-sea-glass text-deep-tide',
    rule: 'border-l-deep-tide/40',
  },
  formulation: {
    chip: 'border-[var(--color-evidence-reference)] bg-[var(--color-evidence-reference-bg)] text-[var(--color-evidence-reference)]',
    rule: 'border-l-[var(--color-evidence-reference)]',
  },
  mechanism: {
    chip: 'border-[var(--color-evidence-preclinical)] bg-[var(--color-evidence-preclinical-bg)] text-[var(--color-evidence-preclinical)]',
    rule: 'border-l-[var(--color-evidence-preclinical)]',
  },
  replication: {
    chip: 'border-dashed border-deep-tide/50 bg-warm-white text-deep-tide',
    rule: 'border-l-deep-tide/60',
  },
  protocol: {
    chip: 'border-dashed border-slate/50 bg-surface-sunk text-ink-soft',
    rule: 'border-l-slate/40',
  },
  'identity-regulatory': {
    chip: 'border-rule bg-warm-white text-slate',
    rule: 'border-l-rule',
  },
};

/** Why questions of each opportunity type are open, as a kind — not per record. */
export const OPPORTUNITY_WHY: Readonly<Record<string, string>> = {
  human_evidence: 'Nothing has been measured in people for this outcome.',
  human_safety: 'Harms in people have not been systematically looked for.',
  human_pharmacokinetics: 'Nobody has measured what happens to the peptide in a human body.',
  independent_replication: 'A finding rests on one group, or conflicts between groups.',
  long_term_outcomes: 'Only short-term or surrogate results exist.',
  protocol_validation: 'Schedules in use have never been tested.',
  dose_response: 'How effect changes with amount has not been studied.',
  route_comparison: 'The route in use is not the route that was studied.',
  formulation_comparison: 'What a mixture contributes is unknown.',
  mechanism_confirmation: 'A mechanism or measurement has not been confirmed.',
  identity_clarification: 'What a name refers to is not settled.',
  product_characterisation: 'What products actually contain has not been measured.',
  regulatory_position: 'A regulatory question is open.',
};

/**
 * Absences this index could close itself, rather than ones needing new
 * research. Somebody offering to help should be able to see which questions
 * need a laboratory and which need a library.
 */
export function waitsOnSource(gapType: string): boolean {
  return GAP_FAMILY[gapType] === 'access';
}

// --- Glyphs ------------------------------------------------------------------

export function CategoryGlyph({
  glyph,
  className = 'h-5 w-5',
}: {
  glyph: ResearchGlyph;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {GLYPH_PATHS[glyph]}
    </svg>
  );
}

const GLYPH_PATHS: Readonly<Record<ResearchGlyph, ReactNode>> = {
  person: (
    <>
      <circle cx="10" cy="6.5" r="3" />
      <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    </>
  ),
  shield: <path d="M10 2.8l6 2.4v4.6c0 3.6-2.6 6.2-6 7.4-3.4-1.2-6-3.8-6-7.4V5.2z" />,
  curve: (
    <>
      <path d="M3 16.5h14" />
      <path d="M3 16.5C4.8 8 6.4 5 8.6 5c2.6 0 4.2 7.4 8.4 9.2" />
    </>
  ),
  arrow: (
    <>
      <path d="M2.5 10h10" />
      <path d="M9.5 6.5L13 10l-3.5 3.5" />
      <path d="M16.5 4v12" />
    </>
  ),
  layers: (
    <>
      <rect x="3.5" y="3.5" width="8.5" height="8.5" rx="1" />
      <rect x="8" y="8" width="8.5" height="8.5" rx="1" />
    </>
  ),
  receptor: (
    <>
      <circle cx="10" cy="4.8" r="2.3" />
      <path d="M4.5 9.5v1.5a5.5 5.5 0 0 0 11 0V9.5" />
    </>
  ),
  pair: (
    <>
      <circle cx="7.5" cy="10" r="4.5" />
      <circle cx="12.5" cy="10" r="4.5" strokeDasharray="2.4 2" />
    </>
  ),
  uneven: <path d="M3.5 6h9M7 10h9.5M3.5 14h5.5" />,
  diamond: <path d="M10 3l7 7-7 7-7-7z" />,
};

function GlyphTile({ category, size = 'md' }: { category: ResearchCategory; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-md border ${
        CATEGORY_STYLE[category.key].chip
      } ${size === 'md' ? 'h-11 w-11' : 'h-8 w-8'}`}
    >
      <CategoryGlyph glyph={category.glyph} className={size === 'md' ? 'h-6 w-6' : 'h-[1.1rem] w-[1.1rem]'} />
    </span>
  );
}

// --- At a glance ---------------------------------------------------------------

/**
 * The category tally: how many questions of each kind the agenda holds.
 *
 * Counts of questions, never of anything about a compound, and in the same
 * fixed reading order as the sections below — a tally sorted by size would
 * read as a league table of what is most wrong.
 */
export function CategoryTally({
  counts,
  shownKeys,
  simple,
}: {
  counts: ReadonlyMap<ResearchCategoryKey, number>;
  /** Categories with a section on the page as currently filtered. */
  shownKeys: ReadonlySet<ResearchCategoryKey>;
  simple: boolean;
}) {
  return (
    <ol className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${simple ? 'sm:gap-4' : ''}`}>
      {RESEARCH_CATEGORIES.map((category) => {
        const count = counts.get(category.key) ?? 0;
        const href = shownKeys.has(category.key)
          ? `#category-${category.key}`
          : `/research?category=${category.key}`;
        return (
          <li key={category.key}>
            <Link
              href={href}
              className="group flex h-full items-start gap-3 rounded-lg border border-rule-soft bg-warm-white px-3.5 py-3 transition-colors hover:border-tide-teal"
            >
              <GlyphTile category={category} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="font-medium text-ink group-hover:text-deep-tide">
                    {simple ? category.plainLabel : category.label}
                  </span>
                  <span className="tabular text-sm text-slate">
                    {count}
                    <span className="sr-only"> {count === 1 ? 'question' : 'questions'}</span>
                  </span>
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-slate">
                  {simple ? category.describes : category.plainLabel}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

// --- A category ---------------------------------------------------------------

interface SubjectGroup {
  readonly slug: string;
  readonly name: string;
  readonly kind: 'compound' | 'quality';
  readonly items: readonly ResearchQuestionEntry[];
}

function bySubject(items: readonly ResearchQuestionEntry[]): SubjectGroup[] {
  const groups = new Map<string, SubjectGroup & { items: ResearchQuestionEntry[] }>();
  for (const q of items) {
    const id = `${q.subjectKind}:${q.subjectSlug}`;
    const group = groups.get(id) ?? {
      slug: q.subjectSlug,
      name: q.subjectName,
      kind: q.subjectKind,
      items: [],
    };
    group.items.push(q);
    groups.set(id, group);
  }
  return [...groups.values()];
}

/**
 * One kind of question.
 *
 * Laid out as a reference column rather than a card grid: the record name sits
 * in a narrow left column with a way back to what *is* recorded for it, and its
 * questions run down the right, joined by a rule in the category's tint.
 */
export function CategorySection({
  category,
  items,
  simple,
}: {
  category: ResearchCategory;
  items: readonly ResearchQuestionEntry[];
  simple: boolean;
}) {
  const headingId = `category-${category.key}-heading`;
  const types = category.opportunityTypes.filter((type) =>
    items.some((q) => q.opportunityType === type),
  );

  return (
    <section
      id={`category-${category.key}`}
      aria-labelledby={headingId}
      className="editorial-break mt-14 scroll-mt-24 first:mt-10"
    >
      <div className="flex items-start gap-4">
        <GlyphTile category={category} />
        <div className="min-w-0 max-w-[66ch]">
          <p className="meta-label">{simple ? category.label : category.plainLabel}</p>
          <h2 id={headingId} className="mt-1 font-serif text-2xl leading-tight text-ink sm:text-3xl">
            {simple ? category.plainLabel : category.label}
            <span className="tabular ml-3 align-middle font-sans text-base text-slate">
              {items.length}
              <span className="sr-only"> {items.length === 1 ? 'question' : 'questions'}</span>
            </span>
          </h2>
          <p className="depth-body mt-2 text-ink-soft">{category.describes}</p>
        </div>
      </div>

      {simple ? null : (
        <dl className="mt-5 grid gap-x-8 gap-y-3 rounded-md bg-mist px-4 py-3.5 text-sm sm:grid-cols-2">
          {types.map((type) => (
            <div key={type}>
              <dt className="font-medium text-ink">{OPPORTUNITY_LABELS[type] ?? type}</dt>
              <dd className="mt-0.5 text-ink-soft">
                {OPPORTUNITY_WHY[type]}
                {SOURCE_THAT_WOULD_HELP[type] === undefined ? null : (
                  <span className="mt-0.5 block text-slate">
                    The kind of work that would answer it: {SOURCE_THAT_WOULD_HELP[type]}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className={simple ? 'mt-8 space-y-10' : 'mt-6 space-y-7'}>
        {bySubject(items).map((group) => (
          <SubjectBlock key={`${group.kind}:${group.slug}`} group={group} category={category} simple={simple} />
        ))}
      </div>
    </section>
  );
}

function SubjectBlock({
  group,
  category,
  simple,
}: {
  group: SubjectGroup;
  category: ResearchCategory;
  simple: boolean;
}) {
  const recordHref =
    group.kind === 'compound' ? `/peptides/${group.slug}` : `/quality/${group.slug}`;
  const knownHref =
    group.kind === 'compound' ? `${recordHref}#${category.recordAnchor}` : recordHref;

  return (
    <div className="grid gap-x-8 gap-y-3 border-t border-rule-soft pt-5 lg:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <h3 className="font-serif text-xl text-ink">
          <Link href={recordHref} className="hover:text-deep-tide hover:underline">
            {group.name}
          </Link>
        </h3>
        <p className="mt-1 text-sm">
          <Link
            href={knownHref}
            className="text-deep-tide underline decoration-deep-tide/30 underline-offset-2 hover:decoration-deep-tide"
          >
            What is recorded
            <span className="sr-only"> for {group.name}</span>
          </Link>
          <span className="text-slate">
            {' '}
            · {group.items.length} {group.items.length === 1 ? 'question' : 'questions'}
          </span>
        </p>
      </div>

      <ul
        className={`divide-y divide-rule-soft border-l-2 pl-4 sm:pl-5 ${CATEGORY_STYLE[category.key].rule}`}
      >
        {group.items.map((q) => (
          <li key={q.gapKey} className={simple ? 'py-5 first:pt-0 last:pb-0' : 'py-4 first:pt-0 last:pb-0'}>
            {simple ? <SimpleQuestion q={q} /> : <PractitionerQuestion q={q} category={category} />}
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- A question ---------------------------------------------------------------

function AnsweredMark({ state }: { state: string }) {
  if (state !== 'resolved' && state !== 'superseded') return null;
  return (
    <span className="text-2xs font-medium tracking-[0.06em] text-deep-tide uppercase">
      {state === 'resolved' ? 'Since answered' : 'Superseded'}
    </span>
  );
}

/**
 * Simple depth: the question, what nobody has shown, and the rest behind a
 * disclosure. Plain framing, no absence taxonomy.
 */
function SimpleQuestion({ q }: { q: ResearchQuestionEntry }) {
  const settle = q.whatWouldResolveIt ?? SOURCE_THAT_WOULD_HELP[q.opportunityType] ?? null;
  return (
    <article className="avoid-break">
      <AnsweredMark state={q.resolutionState} />
      <p className="font-serif text-xl leading-snug text-ink">{q.question}</p>
      <p className="depth-body mt-3 text-ink-soft">
        <span className="meta-label block">What nobody has shown yet</span>
        {q.statement}
      </p>
      {waitsOnSource(q.gapType) ? (
        <p className="mt-2 text-sm text-slate">
          This one waits on this index obtaining a source, not on new research.
        </p>
      ) : null}
      <details className="tides-disclosure mt-3 text-sm">
        <summary className="cursor-pointer text-deep-tide">
          Why it is still open{settle === null ? '' : ', and what would settle it'}
        </summary>
        <div className="mt-2 space-y-2 leading-relaxed text-ink-soft">
          <p>{q.why}</p>
          {settle === null ? null : (
            <p>
              <span className="font-medium text-ink">What would settle it: </span>
              {settle}
            </p>
          )}
        </div>
      </details>
      <GapResolutionNote gap={q} />
    </article>
  );
}

/**
 * Practitioner depth: the absence taxonomy, and the three parts side by side so
 * a reader can scan down one column — every "what would settle it" at once.
 */
function PractitionerQuestion({
  q,
  category,
}: {
  q: ResearchQuestionEntry;
  category: ResearchCategory;
}) {
  const family = GAP_FAMILY[q.gapType] ?? 'method';
  return (
    <article className="avoid-break">
      <div className="flex flex-wrap items-center gap-2">
        {category.opportunityTypes.length > 1 ? (
          <span className="meta-label">{OPPORTUNITY_LABELS[q.opportunityType] ?? q.opportunityType}</span>
        ) : null}
        <span
          className={`rounded-sm border px-1.5 py-0.5 text-2xs ${
            GAP_FAMILY_STYLE[family] ?? 'border-rule text-slate'
          }`}
        >
          <span className="sr-only">Kind of absence: </span>
          {GAP_TYPE_LABELS[q.gapType] ?? q.gapType}
        </span>
        {waitsOnSource(q.gapType) ? <EditorialStateChip kind="source-needed" /> : null}
        <AnsweredMark state={q.resolutionState} />
      </div>

      <p className="mt-2 font-serif text-lg leading-snug text-ink">{q.question}</p>

      <dl className="mt-3 grid gap-x-6 gap-y-3 text-sm md:grid-cols-3">
        <div>
          <dt className="meta-label">Not yet known</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">{q.statement}</dd>
        </div>
        <div>
          <dt className="meta-label">Why it is open</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">{q.why}</dd>
        </div>
        <div>
          <dt className="meta-label">What would settle it</dt>
          <dd className="mt-1 leading-relaxed text-ink-soft">
            {q.whatWouldResolveIt ?? (
              <span className="text-slate">
                Not recorded for this gap. The kind of work:{' '}
                {SOURCE_THAT_WOULD_HELP[q.opportunityType] ?? 'not stated'}
              </span>
            )}
          </dd>
        </div>
      </dl>
      <GapResolutionNote gap={q} />
    </article>
  );
}
