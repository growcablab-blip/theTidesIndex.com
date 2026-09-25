import Link from 'next/link';

/**
 * The two ways in, and the six things a reader might want.
 *
 * The front page was credible and gave a reader nothing to do. It said what the
 * index is and left them to work out whether any of it was for them.
 *
 * These answer the three questions a first screen has to: what is here, who is
 * it for, and what can I do next. Two audiences, six tasks, one database — the
 * paths differ in presentation depth, never in the records underneath, which is
 * the whole argument against building two sites.
 *
 * A destination that does not exist yet says so on the card. A task card that
 * led somewhere empty would be worse than no card.
 */

export interface AudienceCard {
  readonly eyebrow: string;
  readonly title: string;
  readonly body: string;
  readonly items: readonly string[];
  readonly href: string;
  readonly cta: string;
}

const AUDIENCES: readonly AudienceCard[] = [
  {
    eyebrow: 'If you are a patient, or reading for yourself',
    title: 'Understand what is actually known',
    body: 'Plain language over the same source-linked records a clinician sees, with the doses left out and the uncertainty left in.',
    items: [
      'What peptides are, and why a clinician might raise them',
      'What the evidence shows — and where it runs out',
      'How quality and testing work, and what a certificate does not tell you',
      'Questions worth asking before you agree to anything',
    ],
    href: '/learn',
    cta: 'Start with how to read it',
  },
  {
    eyebrow: 'If you are a clinician or work in a clinic',
    title: 'Check a claim against its source',
    body: 'Every statement carries the passage it rests on, what this index makes of that passage, and what it records as unsettled.',
    items: [
      'Human evidence kept separate from preclinical and practitioner report',
      'Source-reported regimens, attributed and never averaged',
      'Administration routes, and what has actually been studied',
      'Analytical quality: purity, identity, content, certificates',
    ],
    href: '/peptides',
    cta: 'Browse the compound register',
  },
];

export function AudiencePaths() {
  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
      {AUDIENCES.map((audience) => (
        <div
          key={audience.title}
          className="flex flex-col rounded-lg border border-rule bg-warm-white p-6 sm:p-7"
        >
          <p className="meta-label text-tide-teal">{audience.eyebrow}</p>
          <h3 className="mt-2.5 font-serif text-xl text-ink sm:text-2xl">{audience.title}</h3>
          <p className="mt-2.5 text-ink-soft">{audience.body}</p>
          <ul className="mt-5 flex-1 space-y-2.5">
            {audience.items.map((item) => (
              <li key={item} className="flex gap-3 text-sm text-ink-soft">
                <span aria-hidden="true" className="mt-[0.45rem] h-px w-3 shrink-0 bg-tide-teal" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href={audience.href}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-md border border-deep-tide px-4 py-2.5 text-sm font-medium text-deep-tide transition-colors hover:bg-deep-tide hover:text-warm-white"
          >
            {audience.cta}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      ))}
    </div>
  );
}

interface TaskCard {
  readonly title: string;
  readonly body: string;
  readonly href: string | null;
  /** Shown instead of a link when the destination is not written yet. */
  readonly state?: string;
}

/*
 * The journeys the platform is for.
 *
 * Every one of these is a question about evidence, mechanism, route, protocol
 * or quality. None of them is "look up a regulatory status", which is a real
 * question and a small one: a regulator's position on a compound in one
 * jurisdiction is a fact recorded inside a record, not a reason anybody comes
 * here. A platform whose front door offered "check if it is approved" would be
 * teaching people to sort compounds by approval, and that is the opposite of
 * what the evidence layer underneath is built to show.
 */
const TASKS: readonly TaskCard[] = [
  {
    title: 'Understand a peptide',
    body: 'What it is, what has been studied in people, what only in animals, and what nobody has established yet.',
    href: '/peptides',
  },
  {
    title: 'Compare protocols',
    body: 'Regimens exactly as each source published them — side by side, attributed, never merged into a recommendation.',
    href: '/protocols',
  },
  {
    title: 'Explore the evidence',
    body: 'Human, preclinical and practitioner evidence kept apart, and what changes once you stop treating them as one pile.',
    href: '/evidence',
  },
  {
    title: 'Understand quality',
    body: 'Purity, identity and content are three different questions. What a certificate answers, and what it does not.',
    href: '/quality',
  },
  {
    title: 'See how peptides are made',
    body: 'From a sequence on paper to material in a vial, and which step each test actually speaks to.',
    href: '/quality/sequence-to-vial',
  },
  {
    title: 'Explore open research questions',
    body: 'What nobody has shown yet, why it matters, and the kind of study that would settle it.',
    href: '/research',
  },
];

export function TaskGrid() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {TASKS.map((task) => {
        const inner = (
          <>
            <span className="font-serif text-lg text-ink group-hover:text-deep-tide">
              {task.title}
            </span>
            <span className="mt-1.5 flex-1 text-sm text-ink-soft">{task.body}</span>
            {task.state === undefined ? (
              <span
                aria-hidden="true"
                className="mt-4 text-sm text-tide-teal transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            ) : (
              <span className="mt-4 text-xs text-[var(--color-caution)]">{task.state}</span>
            )}
          </>
        );

        return (
          <li key={task.title}>
            {task.href === null ? (
              // Named, not hidden, and not a link. A card that led somewhere
              // empty would be worse than no card at all.
              <div className="flex h-full flex-col rounded-lg border border-dashed border-rule bg-mist px-5 py-5">
                {inner}
              </div>
            ) : (
              <Link
                href={task.href}
                className="group flex h-full flex-col rounded-lg border border-rule bg-warm-white px-5 py-5 transition-colors hover:border-tide-teal"
              >
                {inner}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
