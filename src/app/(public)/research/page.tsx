import Link from 'next/link';
import type { Metadata } from 'next';
import { getResearchQuestions } from '@/server/public/queries';
import { previewResearchQuestions } from '@/server/public/preview';
import type { ResearchQuestionEntry } from '@/server/public/research-index';
import { Callout, Container, EmptyState } from '@/components/public/primitives';
import { OPPORTUNITY_LABELS } from '@/components/public/research-figures';

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
 * Two things this page must not become. It is not a list of things readers
 * should try: every question describes what would be useful to *study*. And it
 * is not a ranking: groups are by kind of question and compounds are listed
 * alphabetically within them.
 */

type SearchParams = Promise<{ type?: string; subject?: string }>;

const ORDER = [
  'human_evidence',
  'human_safety',
  'human_pharmacokinetics',
  'independent_replication',
  'long_term_outcomes',
  'protocol_validation',
  'dose_response',
  'route_comparison',
  'formulation_comparison',
  'mechanism_confirmation',
  'identity_clarification',
  'product_characterisation',
  'regulatory_position',
];

const WHY: Record<string, string> = {
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

export default async function ResearchPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const published = await getResearchQuestions();
  const all: ResearchQuestionEntry[] = published.length > 0 ? published : ((await previewResearchQuestions()) ?? []);
  const isPreview = published.length === 0 && all.length > 0;

  const type = params.type && ORDER.includes(params.type) ? params.type : undefined;
  const subjects = [...new Map(all.map((q) => [q.subjectSlug, q.subjectName])).entries()].sort((a, b) =>
    a[1].localeCompare(b[1]),
  );
  const subject = params.subject && subjects.some(([slug]) => slug === params.subject) ? params.subject : undefined;

  const shown = all.filter((q) => (type === undefined || q.opportunityType === type) && (subject === undefined || q.subjectSlug === subject));
  const byType = ORDER.map((key) => ({ key, items: shown.filter((q) => q.opportunityType === key) })).filter((g) => g.items.length > 0);
  const counts = new Map(ORDER.map((key) => [key, all.filter((q) => q.opportunityType === key).length]));

  return (
    <Container width="wide" className="py-10 sm:py-14">
      <header className="max-w-[66ch]">
        <p className="meta-label text-tide-teal">Research agenda</p>
        <h1 className="mt-2 font-serif text-3xl text-ink sm:text-5xl">What would be useful to study next</h1>
        <p className="mt-4 text-lg text-ink-soft">
          Every question here comes from something this index could not find evidence for. Read
          together, they show where the peptide literature is thin — which is often not where the
          attention is.
        </p>
      </header>

      {isPreview ? (
        <p className="mt-6 max-w-[66ch] rounded-md border border-[var(--color-caution)] px-4 py-3 text-sm text-ink-soft">
          Development preview. These records are awaiting review and are not published.
        </p>
      ) : null}

      <div className="mt-8 max-w-[70ch]">
        <Callout title="Questions for research, not suggestions to try">
          <p>
            A question on this page describes a study that would reduce uncertainty. It is not a
            recommendation to use anything, and a missing study is not evidence that something does
            not work — only that nobody has shown whether it does.
          </p>
        </Callout>
      </div>

      {all.length === 0 ? (
        <div className="mt-10 max-w-[66ch]">
          <EmptyState
            headline="No research questions are published yet"
            detail="Questions appear here when the compound or topic record they belong to is published."
          />
        </div>
      ) : (
        <>
          <form method="get" className="mt-10 flex flex-wrap items-end gap-4 rounded-md border border-rule bg-mist px-4 py-4">
            <label className="text-sm text-ink-soft">
              <span className="meta-label block">Kind of question</span>
              <select name="type" defaultValue={type ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">All ({all.length})</option>
                {ORDER.filter((key) => (counts.get(key) ?? 0) > 0).map((key) => (
                  <option key={key} value={key}>
                    {OPPORTUNITY_LABELS[key] ?? key} ({counts.get(key)})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-ink-soft">
              <span className="meta-label block">Compound or topic</span>
              <select name="subject" defaultValue={subject ?? ''} className="mt-1 rounded border border-rule bg-warm-white px-2 py-1.5 text-sm text-ink">
                <option value="">All</option>
                {subjects.map(([slug, name]) => (
                  <option key={slug} value={slug}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded border border-deep-tide bg-deep-tide px-3 py-1.5 text-sm text-warm-white">
              Show
            </button>
            {type || subject ? (
              <Link href="/research" className="text-sm text-deep-tide underline-offset-2 hover:underline">
                Clear
              </Link>
            ) : null}
            <p className="w-full text-xs text-slate">
              {shown.length} of {all.length} questions from {subjects.length} records.
            </p>
          </form>

          <div className="mt-10 space-y-12">
            {byType.map((group) => (
              <section key={group.key} aria-labelledby={`q-${group.key}`} id={group.key}>
                <h2 id={`q-${group.key}`} className="font-serif text-2xl text-ink">
                  {OPPORTUNITY_LABELS[group.key] ?? group.key}
                  <span className="ml-2 text-base text-slate">{group.items.length}</span>
                </h2>
                <p className="mt-1 max-w-[62ch] text-sm text-slate">{WHY[group.key]}</p>
                <ul className="mt-5 grid gap-4 lg:grid-cols-2">
                  {group.items.map((q) => (
                    <li key={q.gapKey} className="rounded-md border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-5 py-4">
                      <Link
                        href={q.subjectKind === 'compound' ? `/peptides/${q.subjectSlug}#research-questions` : `/quality/${q.subjectSlug}#not-established`}
                        className="text-xs tracking-wide text-deep-tide uppercase hover:underline"
                      >
                        {q.subjectName}
                      </Link>
                      <p className="mt-1.5 font-serif text-lg leading-snug text-ink">{q.question}</p>
                      <p className="mt-2 text-sm text-ink-soft">
                        <span className="text-slate">Because: </span>
                        {q.why}
                      </p>
                      {q.whatWouldResolveIt ? (
                        <p className="mt-1 text-sm text-ink-soft">
                          <span className="text-slate">What would settle it: </span>
                          {q.whatWouldResolveIt}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
