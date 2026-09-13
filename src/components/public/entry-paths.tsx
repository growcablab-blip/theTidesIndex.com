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
    body: 'Plain language over the same reviewed records a clinician sees, with the doses left out and the uncertainty left in.',
    items: [
      'What peptides are, and why a clinician might raise them',
      'What the evidence shows — and where it runs out',
      'How quality and testing work, and what a certificate does not tell you',
      'Questions worth asking before you agree to anything',
    ],
    href: '/quality',
    cta: 'Start with quality and testing',
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

const TASKS: readonly TaskCard[] = [
  {
    title: 'A compound',
    body: 'BPC-157, tesamorelin, retatrutide and the rest of the register — what is recorded, and what is not.',
    href: '/peptides',
  },
  {
    title: 'A test or a certificate',
    body: 'Purity, identity, content and what a certificate of analysis does and does not establish.',
    href: '/quality',
  },
  {
    title: 'The evidence itself',
    body: 'How human, preclinical, practitioner and regulatory evidence are told apart, and why it matters.',
    href: '/evidence',
  },
  {
    title: 'A route of administration',
    body: 'Which routes are recorded for which compounds, and what has actually been reported about them.',
    href: '/routes',
  },
  {
    title: 'A protocol',
    body: 'What named sources report, each attributed, never merged into a single regimen.',
    href: null,
    state: 'In development — no protocol has been extracted and reviewed yet',
  },
  {
    title: 'How peptides are made',
    body: 'Synthesis, purification, testing, fill and finish, storage — the path from a reaction to a vial.',
    href: null,
    state: 'In development — the manufacturing topics are registered and unwritten',
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
