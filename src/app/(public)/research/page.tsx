import Link from 'next/link';
import type { Metadata } from 'next';
import { getResearchQuestions } from '@/server/public/queries';
import { previewResearchQuestions } from '@/server/public/preview';
import { getReadingMode } from '@/server/public/reading-mode';
import type { ResearchQuestionEntry } from '@/server/public/research-index';
import { Callout, Container, EmptyState } from '@/components/public/primitives';
import { ModeExplainer, ModeSwitch } from '@/components/public/mode-switch';
import { KnownUnknownIllustration } from '@/components/illustrations';
import { GAP_TYPE_LABELS, OPPORTUNITY_LABELS } from '@/components/public/research-figures';
import {
  CategorySection,
  CategoryTally,
  waitsOnSource,
} from '@/components/public/research-page';
import {
  OPPORTUNITY_TYPES,
  RESEARCH_CATEGORIES,
  categoryFor,
  countByCategory,
  groupByCategory,
  isResearchCategoryKey,
} from '@/domain/research/categories';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Research questions',
  description:
    'What would be useful to study next, across every compound and quality topic, derived from what the evidence does not yet establish.',
  robots: { index: false, follow: false },
};

/**
 * The research agenda.
 *
 * Every question on this page is attached to a recorded gap — a statement this
 * index would make if it held a source for it, and does not. The page cannot
 * hold a question of its own, which is what keeps it an agenda rather than a
 * wish list, and every entry says what kind of absence produced it.
 *
 * Version three is about reading, not records. Seventy-odd questions under
 * thirteen database headings read as a table dump, so the page now opens with
 * the method (what is recorded, what is not, what would settle it), a tally of
 * nine kinds of question a reader can tell apart at a glance, and then one
 * section per kind with the questions grouped under the record they belong to.
 * Filters are still a GET form — shareable, and working without JavaScript —
 * but folded away until somebody wants them.
 *
 * The two depths differ in what they ask of the reader. Simple mode names each
 * kind in plain words and keeps the absence taxonomy out of the way; the
 * practitioner view sets the three parts of each question side by side and
 * shows what kind of absence produced it.
 *
 * Two things this page must not become. It is not a list of things readers
 * should try: every question describes what would be useful to *study*, and no
 * entry describes how to run anything. And it is not a ranking: sections follow
 * a fixed reading order by kind, and records are alphabetical within them.
 */

type SearchParams = Promise<{
  category?: string;
  type?: string;
  subject?: string;
  absence?: string;
}>;

const SELECT =
  'mt-1 w-full rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink sm:w-auto';

export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, mode, published] = await Promise.all([
    searchParams,
    getReadingMode(),
    getResearchQuestions(),
  ]);
  const simple = mode === 'simple';
  const all: ResearchQuestionEntry[] =
    published.length > 0 ? published : ((await previewResearchQuestions()) ?? []);
  const isPreview = published.length === 0 && all.length > 0;

  // Filters. Unknown values are ignored rather than emptying the page; `type`
  // stays because other pages link to a single opportunity type.
  const category = isResearchCategoryKey(params.category) ? params.category : undefined;
  const type = OPPORTUNITY_TYPES.find((t) => t === params.type);
  const subjects = [...new Map(all.map((q) => [q.subjectSlug, q.subjectName])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1]),
  );
  const subject = subjects.some(([slug]) => slug === params.subject) ? params.subject : undefined;
  const absences = [...new Set(all.map((q) => q.gapType))].sort((a, b) =>
    (GAP_TYPE_LABELS[a] ?? a).localeCompare(GAP_TYPE_LABELS[b] ?? b),
  );
  const absence = absences.find((a) => a === params.absence);
  const filtered =
    category !== undefined || type !== undefined || subject !== undefined || absence !== undefined;

  const shown = all.filter(
    (q) =>
      (category === undefined || categoryFor(q.opportunityType).key === category) &&
      (type === undefined || q.opportunityType === type) &&
      (subject === undefined || q.subjectSlug === subject) &&
      (absence === undefined || q.gapType === absence),
  );
  const groups = groupByCategory(shown);
  const counts = countByCategory(all);
  const ours = all.filter((q) => waitsOnSource(q.gapType)).length;
  const typesPresent = OPPORTUNITY_TYPES.filter((t) => all.some((q) => q.opportunityType === t));

  return (
    <>
      {/* --- Hero ----------------------------------------------------------- */}
      <section className="border-b border-rule bg-gradient-to-b from-mist to-warm-white">
        <Container width="wide" className="py-10 sm:py-14">
          <p className="meta-label text-tide-teal">Research agenda</p>

          {isPreview ? (
            <p
              role="note"
              className="mt-4 inline-block rounded-md border border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-3 py-1.5 text-xs font-medium tracking-wide text-[var(--color-caution)] uppercase"
            >
              Unpublished preview — awaiting review
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-start justify-between gap-6">
            <div className="max-w-[60ch]">
              <h1 className="font-serif text-4xl leading-[1.08] text-ink sm:text-5xl">
                What would be useful to study next
              </h1>
              <p className="depth-body mt-5 text-lg leading-relaxed text-ink-soft">
                {simple
                  ? 'Every question here is something the sources this index holds do not yet show. They are grouped by kind, so you can see where the gaps are before reading any one of them.'
                  : 'Every question here comes from something this index could not find evidence for. Read together, they show where the peptide literature is thin — which is often not where the attention is.'}
              </p>
            </div>
            <div className="shrink-0">
              <ModeSwitch mode={mode} path="/research" />
            </div>
          </div>
          <div className="mt-5 max-w-[80ch]">
            <ModeExplainer mode={mode} />
          </div>
        </Container>
      </section>

      <Container width="wide" className="py-10 sm:py-14">
        {all.length === 0 ? (
          <div className="max-w-[66ch]">
            <EmptyState
              headline="No research questions are published yet"
              detail="Questions appear here when the compound or topic record they belong to is published."
            />
          </div>
        ) : (
          <>
            {/* --- How to read an entry -------------------------------------- */}
            <section aria-labelledby="how-to-read" className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
              <div className="min-w-0">
                <KnownUnknownIllustration id="research-known-unknown" />
              </div>
              <div>
                <h2 id="how-to-read" className="font-serif text-2xl text-ink sm:text-3xl">
                  Three things for every question
                </h2>
                <ol className="mt-5 space-y-4">
                  {[
                    {
                      title: 'What is recorded',
                      body: simple
                        ? 'What the sources this index holds do show. Follow “What is recorded” beside each compound.'
                        : 'The evidence already on the compound record, one link away from each group of questions.',
                    },
                    {
                      title: 'What is not yet known',
                      body: 'The gap, stated as an absence with its reason — never as a claim that something does not work.',
                    },
                    {
                      title: 'What would settle it',
                      body: 'The kind of study that would close the gap. A study for researchers, not a suggestion to use anything.',
                    },
                  ].map((step, i) => (
                    <li key={step.title} className="flex gap-4">
                      <span
                        aria-hidden="true"
                        className={`tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm ${
                          i === 1
                            ? 'border-dashed border-slate/60 text-slate'
                            : 'border-tide-teal/60 bg-warm-white text-deep-tide'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-ink">{step.title}</p>
                        <p className="depth-body mt-0.5 text-sm leading-relaxed text-ink-soft">
                          {step.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </section>

            <div className="mt-8 max-w-[72ch]">
              <Callout title="Questions for research, not suggestions to try">
                <p>
                  A question on this page describes a study that would reduce uncertainty. It is not
                  a recommendation to use anything, and a missing study is not evidence that
                  something does not work — only that nobody has shown whether it does.
                </p>
              </Callout>
            </div>

            {/* --- At a glance ------------------------------------------------ */}
            <section aria-labelledby="at-a-glance" className="editorial-break mt-12">
              <h2 id="at-a-glance" className="font-serif text-2xl text-ink sm:text-3xl">
                {simple ? 'The kinds of gap' : 'Questions by kind'}
              </h2>
              <p className="depth-body mt-2 max-w-[70ch] text-ink-soft">
                {all.length} questions from {subjects.length} records.{' '}
                {simple
                  ? `${String(ours)} of them wait on this index obtaining a source that already exists, rather than on new research.`
                  : `${String(ours)} wait on a source this index has not obtained rather than on new research. Counts are of questions, not a measure of any compound.`}
              </p>
              <div className="mt-6">
                <CategoryTally
                  counts={counts}
                  shownKeys={new Set(groups.map((g) => g.category.key))}
                  simple={simple}
                />
              </div>

              {/* Filters, folded away: most readers browse by kind above. */}
              <details className="tides-disclosure no-print mt-8 rounded-md border border-rule bg-mist" open={filtered}>
                <summary className="cursor-pointer px-4 py-3 text-sm text-deep-tide">
                  Narrow the list
                  {filtered ? (
                    <span className="text-slate">
                      {' '}
                      — showing {shown.length} of {all.length}
                    </span>
                  ) : null}
                </summary>
                <div className="px-4 pb-4">
                  <form method="get" className="flex flex-wrap items-end gap-4">
                    <label className="w-full text-sm text-ink-soft sm:w-auto">
                      <span className="meta-label block">Kind of question</span>
                      <select name="category" defaultValue={category ?? ''} className={SELECT}>
                        <option value="">All ({all.length})</option>
                        {RESEARCH_CATEGORIES.filter((c) => (counts.get(c.key) ?? 0) > 0).map((c) => (
                          <option key={c.key} value={c.key}>
                            {simple ? c.plainLabel : c.label} ({counts.get(c.key)})
                          </option>
                        ))}
                      </select>
                    </label>
                    {simple ? (
                      type === undefined ? null : <input type="hidden" name="type" value={type} />
                    ) : (
                      <label className="w-full text-sm text-ink-soft sm:w-auto">
                        <span className="meta-label block">Opportunity type</span>
                        <select name="type" defaultValue={type ?? ''} className={SELECT}>
                          <option value="">Any</option>
                          {typesPresent.map((t) => (
                            <option key={t} value={t}>
                              {OPPORTUNITY_LABELS[t] ?? t}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {simple ? (
                      absence === undefined ? null : <input type="hidden" name="absence" value={absence} />
                    ) : (
                      <label className="w-full text-sm text-ink-soft sm:w-auto">
                        <span className="meta-label block">Kind of absence</span>
                        <select name="absence" defaultValue={absence ?? ''} className={SELECT}>
                          <option value="">Any</option>
                          {absences.map((key) => (
                            <option key={key} value={key}>
                              {GAP_TYPE_LABELS[key] ?? key}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label className="w-full text-sm text-ink-soft sm:w-auto">
                      <span className="meta-label block">Compound or topic</span>
                      <select name="subject" defaultValue={subject ?? ''} className={SELECT}>
                        <option value="">All</option>
                        {subjects.map(([slug, name]) => (
                          <option key={slug} value={slug}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded border border-deep-tide bg-deep-tide px-4 py-1.5 text-sm text-warm-white"
                    >
                      Show
                    </button>
                    {filtered ? (
                      <Link
                        href="/research"
                        className="text-sm text-deep-tide underline-offset-2 hover:underline"
                      >
                        Clear
                      </Link>
                    ) : null}
                  </form>
                </div>
              </details>
            </section>

            {/* --- The questions, by kind ------------------------------------- */}
            {groups.length === 0 ? (
              <div className="mt-10 max-w-[66ch]">
                <EmptyState
                  headline="No questions match these filters"
                  detail="Clear a filter to see more of the agenda."
                />
              </div>
            ) : (
              <div className="mt-4">
                {groups.map((group) => (
                  <CategorySection
                    key={group.category.key}
                    category={group.category}
                    items={group.items}
                    simple={simple}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}
