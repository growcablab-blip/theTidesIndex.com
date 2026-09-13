import Link from 'next/link';
import type { Metadata } from 'next';
import { listQualityRegister, type QualityRegisterEntry } from '@/server/public/queries';
import { getReadingMode } from '@/server/public/reading-mode';
import { Callout, Container } from '@/components/public/primitives';
import { AnalyticalQuestionsFigure } from '@/components/public/quality-figures';
import { ModeSwitch } from '@/components/public/mode-switch';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Quality and testing',
  description:
    'What each analytical test establishes about a peptide preparation — and, more importantly, what it does not.',
};

/**
 * The quality section index.
 *
 * It previously listed published topics only, and nothing is published, so it
 * rendered an empty state: a section with four written topics and fifteen
 * registered ones looked like a section with nothing in it.
 *
 * It now reads from the register, which carries every topic and how far each has
 * got. State is content here rather than metadata — a reader learns as much from
 * "no source is held for this" as from a finished page, and a section that hides
 * its own incompleteness is the kind of thing this index exists not to be.
 *
 * Grouping is editorial and comes from `quality_topics.family`, deliberately not
 * from the relationship map. A map edge is a claim about how two topics relate
 * and must cite its basis; a family is a shelf somebody put a topic on.
 */

/**
 * Featured learning pathways.
 *
 * The directory below lists twenty-one topics of roughly equal visual weight,
 * which is accurate and useless as a starting point: a reader who does not
 * already know the subject cannot tell which door to open first.
 *
 * A pathway is an editorial argument about reading order. It is defined here
 * rather than in the database for the same reason the families are not derived
 * from the relationship map — a map edge is a claim about how two topics relate
 * and must cite its basis, and a reading order is neither.
 *
 * The three that are not built are listed anyway. A reader deciding whether
 * this section will eventually cover their question is better served by seeing
 * the plan than by seeing one pathway and guessing.
 */
const FUTURE_PATHWAYS: readonly { title: string; covers: string; state: string }[] = [
  {
    title: 'Manufacturing and the final vial',
    covers: 'Synthesis · purification · fill and finish · lyophilisation · excipients',
    state: 'Topics registered, sources not yet held',
  },
  {
    title: 'Microbiological quality',
    covers: 'Sterility · bacterial endotoxin',
    state: 'Blocked on compendial access',
  },
  {
    title: 'Storage and transport',
    covers: 'Stability · temperature excursions · reconstitution and handling',
    state: 'Topics registered, sources not yet held',
  },
];

const PATHWAY: readonly { slug: string; step: string; question: string }[] = [
  {
    slug: 'hplc-purity',
    step: 'Start with the number on the report',
    question: 'What does a purity figure actually describe?',
  },
  {
    slug: 'identity-testing',
    step: 'Then ask what the material is',
    question: 'Is this the substance it is supposed to be?',
  },
  {
    slug: 'peptide-content-assay',
    step: 'Then ask how much there is',
    question: 'How much of the target material is present?',
  },
  {
    slug: 'certificate-of-analysis',
    step: 'Then read the document itself',
    question: 'Does this certificate describe what I am holding?',
  },
];

const FAMILIES: readonly { key: string; name: string; blurb: string }[] = [
  {
    key: 'analytical',
    name: 'Analytical characterisation',
    blurb: 'What the material is, how mixed it is, and how much of it there is.',
  },
  {
    key: 'microbiological',
    name: 'Microbiological quality',
    blurb: 'A separate class of question from the analytical tests above.',
  },
  {
    key: 'chemical-physical',
    name: 'Chemical and physical attributes',
    blurb: 'What else is present besides the intended substance.',
  },
  {
    key: 'manufacturing',
    name: 'Manufacturing and traceability',
    blurb: 'How material is made, and whether a batch can be followed.',
  },
  {
    key: 'handling',
    name: 'Storage, transport and administration',
    blurb: 'What happens to a material after it is released.',
  },
  {
    key: 'documents',
    name: 'Reading the documents',
    blurb: 'What a certificate is, and whether it describes the material in hand.',
  },
];

/** The real state, in words, never dressed up as completeness. */
function stateLabel(entry: QualityRegisterEntry): { label: string; tone: 'ready' | 'open' } {
  if (entry.isPublished) return { label: 'Published', tone: 'ready' };
  if (entry.reviewState === 'ready_for_scientific_review') {
    return { label: 'Written — awaiting scientific review', tone: 'ready' };
  }
  if (entry.claimCount > 0) return { label: 'Evidence captured', tone: 'ready' };
  /*
   * A recorded open question is a different state from nobody having got to it,
   * and the more useful one to report.
   *
   * The label deliberately does not say *what* the question is. It said "source
   * access pending" until C.10, which was true of sterility and endotoxin and
   * wrong for the topics whose recorded issue is about terminology or
   * conflation — the verification queue links an issue to a topic but does not
   * record whether that issue is what is holding the topic up. Saying less is
   * the only accurate option until it does.
   */
  if (entry.openIssueKey !== null) {
    return { label: 'Open question recorded', tone: 'open' };
  }
  return { label: 'In preparation', tone: 'open' };
}

export default async function QualityIndexPage() {
  const [register, mode] = await Promise.all([listQualityRegister(), getReadingMode()]);
  const practitioner = mode === 'practitioner';

  const bySlug = new Map(register.map((entry) => [entry.slug, entry]));
  const written = new Set(PATHWAY.map((step) => step.slug));

  return (
    <Container width="wide" className="py-10 sm:py-14">
      <header className="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
        <div className="max-w-[62ch]">
          <h1 className="font-serif text-3xl text-ink sm:text-4xl">Quality and testing</h1>
          <p className="mt-3 text-lg text-ink-soft">
            How a peptide gets from synthesis to a vial, what is tested along the way, and what each
            test can and cannot establish.
          </p>
        </div>
        <ModeSwitch mode={mode} path="/quality" />
      </header>

      {/* The organising idea, before the list. */}
      <div className="mt-8 max-w-[66ch]">
        <Callout title="Why every page here has two halves">
          <p>
            A certificate of analysis is easy to over-read. A high chromatographic purity figure is
            a statement about the sample that was analysed — it is not a statement about identity,
            nor about how much peptide is in the vial, nor about sterility, nor about endotoxin.
            Those are four further questions, each answered by a different test.
          </p>
          <p className="mt-2">
            So every topic here states what its test establishes and what it does not. A topic that
            cannot say both is not published.
          </p>
        </Callout>
      </div>

      {/* --- Start here ---------------------------------------------------- */}
      <section aria-labelledby="start-here" className="mt-14">
        <p className="meta-label text-tide-teal">Learning pathway one</p>
        <h2 id="start-here" className="mt-2 font-serif text-2xl text-ink sm:text-3xl">
          Understanding analytical testing
        </h2>
        <p className="mt-2 max-w-[62ch] text-ink-soft">
          Four pages, in order. They follow the questions a test report raises rather than the order
          a laboratory would teach them. Roughly forty minutes end to end, or five for the first
          page alone.
        </p>

        <ol className="mt-6 grid gap-4 lg:grid-cols-2">
          {PATHWAY.map((step, index) => {
            const entry = bySlug.get(step.slug);
            const state = entry ? stateLabel(entry) : null;
            return (
              <li key={step.slug}>
                <Link
                  href={`/quality/${step.slug}`}
                  className="group flex h-full flex-col rounded-md border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal"
                >
                  <span className="text-xs tracking-wide text-slate uppercase">
                    Step {index + 1} · {step.step}
                  </span>
                  <span className="mt-1.5 font-serif text-lg text-ink group-hover:text-deep-tide">
                    {entry?.name ?? step.slug}
                  </span>
                  <span className="mt-1 flex-1 text-sm text-ink-soft">{step.question}</span>
                  {state ? (
                    <span className="mt-3 text-xs text-slate">{state.label}</span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ol>

        <Link
          href="/quality/sequence-to-vial"
          className="group mt-10 block rounded-md border border-l-[3px] border-rule border-l-deep-tide bg-warm-white px-5 py-5 transition-colors hover:border-deep-tide"
        >
          <span className="meta-label text-tide-teal">Learning pathway two</span>
          <span className="mt-1.5 block font-serif text-2xl text-ink group-hover:text-deep-tide">
            From sequence to final vial
          </span>
          <span className="mt-1 block max-w-[62ch] text-sm text-ink-soft">
            Fifteen stages from design to the vial in your hand: where impurities come from, where
            checks happen, what a batch number is supposed to lead to, and which stages no held
            source describes.
          </span>
        </Link>

        <div className="mt-10">
          <p className="meta-label">Pathways in development</p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-3">
            {FUTURE_PATHWAYS.map((pathway) => (
              <li
                key={pathway.title}
                className="rounded-md border border-dashed border-rule bg-mist px-4 py-3.5"
              >
                <span className="block font-medium text-ink">{pathway.title}</span>
                <span className="mt-1 block text-xs text-slate">{pathway.covers}</span>
                <span className="mt-2 block text-xs text-[var(--color-caution)]">
                  {pathway.state}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --- The three questions -------------------------------------------- */}
      <section aria-labelledby="three-questions" className="mt-14 max-w-[76ch]">
        <h2 id="three-questions" className="font-serif text-2xl text-ink">
          Three questions a report answers separately
        </h2>
        <p className="mt-2 text-ink-soft">
          The first three pages above. A result for one is not an answer about another.
        </p>
        <div className="mt-5">
          <AnalyticalQuestionsFigure id="fig-quality-index" />
        </div>
      </section>

      {/* --- The families --------------------------------------------------- */}
      <section aria-labelledby="everything-else" className="mt-14">
        <h2 id="everything-else" className="font-serif text-2xl text-ink sm:text-3xl">
          The full topic directory
        </h2>
        <p className="mt-2 max-w-[64ch] text-ink-soft">
          Every topic this index recognises, and how far each has got. Several are registered and
          unwritten — in most cases because the sources they need are not held. What is unwritten
          is listed rather than hidden.
        </p>

        <div className="mt-8 space-y-8">
          {FAMILIES.map((family) => {
            const topics = register.filter((entry) => entry.family === family.key);
            if (topics.length === 0) return null;

            return (
              <div key={family.key}>
                <h3 className="font-serif text-lg text-deep-tide">{family.name}</h3>
                <p className="mt-1 max-w-[60ch] text-sm text-slate">{family.blurb}</p>

                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {topics.map((entry) => {
                    const state = stateLabel(entry);
                    const readable = written.has(entry.slug);
                    return (
                      <li key={entry.id}>
                        {readable ? (
                          <Link
                            href={`/quality/${entry.slug}`}
                            className="group flex h-full flex-col rounded-md border border-rule bg-warm-white px-3.5 py-3 transition-colors hover:border-tide-teal"
                          >
                            <TopicCard entry={entry} state={state} practitioner={practitioner} />
                          </Link>
                        ) : (
                          // Named, not hidden, and not a link: there is nothing
                          // to read. A reader still learns the question exists.
                          <div className="flex h-full flex-col rounded-md border border-dashed border-rule bg-mist px-3.5 py-3">
                            <TopicCard entry={entry} state={state} practitioner={practitioner} />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <p className="mt-14 max-w-[62ch] text-sm text-slate">
        Where a topic is unwritten, this index has usually recorded why: most often a compendial or
        regulatory reference it does not hold. The{' '}
        <Link href="/sources" className="underline decoration-rule underline-offset-2">
          source register
        </Link>{' '}
        records which are held, which are awaiting replacement, and which require access this index
        does not have.
      </p>
    </Container>
  );
}

function TopicCard({
  entry,
  state,
  practitioner,
}: {
  entry: QualityRegisterEntry;
  state: { label: string; tone: 'ready' | 'open' };
  practitioner: boolean;
}) {
  return (
    <>
      <span className="font-medium text-ink group-hover:text-deep-tide">{entry.name}</span>
      <span
        className={`mt-1.5 flex-1 text-xs ${
          state.tone === 'ready' ? 'text-deep-tide' : 'text-slate'
        }`}
      >
        {state.label}
      </span>
      {practitioner && (entry.claimCount > 0 || entry.gapCount > 0) ? (
        // Counts are a practitioner's orientation, not a reader's. A number of
        // claims tells somebody assessing the section how much is behind a
        // topic; to everyone else it reads like a score.
        <span className="mt-1.5 text-xs text-slate">
          {entry.claimCount} claim{entry.claimCount === 1 ? '' : 's'} · {entry.gapCount} recorded
          gap{entry.gapCount === 1 ? '' : 's'}
        </span>
      ) : null}
      {entry.needsUpdate ? (
        <span className="mt-1.5 text-xs text-[var(--color-caution)]">Flagged for re-review</span>
      ) : null}
    </>
  );
}
