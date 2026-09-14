import Link from 'next/link';
import type { Metadata } from 'next';
import { Callout, Container } from '@/components/public/primitives';

export const metadata: Metadata = {
  title: 'Learn',
  description:
    'How to read what this index holds: what the evidence classes mean, how a statement is built, and where to start if peptides are new to you.',
  robots: { index: false, follow: false },
};

/**
 * The Learn hub.
 *
 * Navigation reflects tasks, and the most common arrival is someone who has
 * heard a name and wants to know what it means before they meet a register of
 * 12 compounds and 119 sources. This page is that door.
 *
 * It makes no claim about any peptide. Every card points at something the index
 * already holds — an explainer, a method document, a quality topic — so the hub
 * cannot drift ahead of the records it introduces.
 */

interface Card {
  readonly href: string;
  readonly title: string;
  readonly body: string;
  readonly note?: string;
}

const START: readonly Card[] = [
  {
    href: '/evidence',
    title: 'How evidence is classified',
    body: 'The difference between a study in people, a study in animals, and a clinician describing what they do. Most disagreements about peptides are really disagreements about this.',
  },
  {
    href: '/quality',
    title: 'What quality and testing actually establish',
    body: 'Purity, identity and content are three different questions, and a certificate answers less than it appears to. Written from analytical sources and testable against them.',
  },
  {
    href: '/quality/sequence-to-vial',
    title: 'From sequence to final vial',
    body: 'How a peptide is made, purified, filled and released — and which step each test speaks to.',
  },
  {
    href: '/routes',
    title: 'Routes of administration',
    body: 'What each route asks of a molecule, and why the route a source reports is not a route it recommends.',
  },
];

const DEEPER: readonly Card[] = [
  {
    href: '/methodology',
    title: 'How this index works',
    body: 'Extraction, locators, review states, and the gates a statement passes before anyone can read it as published.',
  },
  {
    href: '/editorial-policy',
    title: 'Editorial policy',
    body: 'What this index will and will not say, including why it never averages regimens and never issues a dose.',
  },
  {
    href: '/coverage',
    title: 'What is and is not here',
    body: 'The honest boundary of the register: what has been extracted, what is awaiting review, and what has not been attempted.',
  },
  {
    href: '/sources',
    title: 'The source register',
    body: 'Every source held, including the copies that turned out to be unusable and why.',
  },
];

export default function LearnPage() {
  return (
    <Container width="page" className="py-10 sm:py-14">
      <header className="max-w-[62ch]">
        <p className="meta-label text-tide-teal">Learn</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-5xl">
          Start with how to read it, not with what to take
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-soft">
          Peptides are an area where confident writing is cheap and evidence is thin, and the
          hardest part of reading about them is telling one from the other. These pages are about
          that skill. None of them recommends anything.
        </p>
      </header>

      <section aria-labelledby="start" className="mt-12">
        <h2 id="start" className="font-serif text-2xl text-ink">
          Four things worth understanding first
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {START.map((card) => (
            <CardLink key={card.href} card={card} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="records" className="mt-14">
        <h2 id="records" className="font-serif text-2xl text-ink">
          How to read a compound record
        </h2>
        <p className="mt-2 max-w-[66ch] text-ink-soft">
          Every record answers the same four questions in the same order, and you can stop after any
          of them.
        </p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['What it is', 'The molecule, the names it is sold under, and whether those names refer to the same thing.'],
            ['What is known', 'What has been measured in people, what only in animals, and whether anyone repeated it.'],
            ['What is not known', 'Recorded as explicitly as the findings, because most of what there is to say is here.'],
            ['What sources report', 'Regimens attributed to the source that published them. Never merged, never averaged.'],
          ].map(([title, body], index) => (
            <li key={title} className="rounded-md border border-rule bg-warm-white px-5 py-4">
              <span className="font-serif text-2xl text-tide-teal">{index + 1}</span>
              <p className="mt-1 font-serif text-lg text-ink">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{body}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-wrap gap-4">
          <Link
            href="/peptides"
            className="rounded-md border border-deep-tide bg-deep-tide px-5 py-2.5 text-sm font-medium text-warm-white"
          >
            Browse the compounds
          </Link>
          <Link
            href="/research"
            className="rounded-md border border-rule px-5 py-2.5 text-sm text-ink-soft transition-colors hover:border-tide-teal hover:text-deep-tide"
          >
            See what is still unknown
          </Link>
        </div>
      </section>

      <section aria-labelledby="deeper" className="mt-14">
        <h2 id="deeper" className="font-serif text-2xl text-ink">
          How the index is built
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {DEEPER.map((card) => (
            <CardLink key={card.href} card={card} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="books" className="mt-14 max-w-[70ch]">
        <h2 id="books" className="font-serif text-2xl text-ink">
          The publications
        </h2>
        <p className="mt-2 text-ink-soft">
          Five volumes are generated from the same records this site renders, so a printed page and
          a web page cannot disagree. None is published yet: each carries its review state on its
          cover, and a volume awaiting scientific review says so there.
        </p>
        <dl className="mt-6 space-y-3">
          {[
            ['Understanding Peptides', 'Plain language, for patients and new clinic staff. No doses, no administration instructions.'],
            ['Peptide Science & Applications', 'The general science behind the records, for clinicians and scientifically confident readers.'],
            ['The Peptide Reference Guide', 'The twelve compound monographs, bound.'],
            ['Peptide Protocols & Clinical Quick Reference', 'Every source-reported regimen, attributed. No recommended protocol.'],
            [
              'Peptide Quality: From Manufacturing to the Final Vial',
              'Purity, identity, content, certificates, and how a vial is made.',
            ],
          ].map(([title, body]) => (
            <div key={title} className="border-l-2 border-rule pl-4">
              <dt className="font-serif text-base text-ink">{title}</dt>
              <dd className="text-sm text-ink-soft">{body}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="mt-12 max-w-[70ch]">
        <Callout title="Nothing here is advice">
          <p>
            This index is a reference. It does not recommend treatment, it does not sell anything,
            and it is not a substitute for a clinician who knows your history. If a page here tells
            you what a source reported, that is all it is telling you.
          </p>
        </Callout>
      </div>
    </Container>
  );
}

function CardLink({ card }: { card: Card }) {
  return (
    <li>
      <Link
        href={card.href}
        className="group flex h-full flex-col rounded-md border border-rule bg-warm-white px-5 py-4 transition-colors hover:border-tide-teal"
      >
        <p className="font-serif text-lg text-ink group-hover:text-deep-tide">{card.title}</p>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">{card.body}</p>
        {card.note === undefined ? null : (
          <p className="mt-2 text-xs text-slate">{card.note}</p>
        )}
      </Link>
    </li>
  );
}
