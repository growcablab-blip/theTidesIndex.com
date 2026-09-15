import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/public/primitives';
import { ILLUSTRATIONS, type IllustrationKey } from '@/components/illustrations';

export const metadata: Metadata = {
  title: 'Figure library',
  description: 'Every explanatory drawing in the index, with the claims or method each rests on.',
  robots: { index: false, follow: false },
};

/**
 * The figure library.
 *
 * Every drawing the site uses, in one place, each captioned with its basis: the
 * sourced claims it draws from, or the part of the index's method it depicts.
 * Useful to a reader who learns visually, and to a reviewer checking that no
 * drawing says more than its basis does.
 */

const GROUPS: readonly { heading: string; lede: string; keys: readonly IllustrationKey[] }[] = [
  {
    heading: 'What a peptide is, and how it signals',
    lede: 'The building blocks, the bond between them, and the message-and-receiver logic of signalling.',
    keys: ['chain-scale', 'peptide-bond', 'peptide-lifecycle', 'message-receiver', 'receptor-binding', 'cell-signalling'],
  },
  {
    heading: 'How a substance moves through the body',
    lede: 'Routes in, the path through the blood, and what a level-over-time curve does and does not show.',
    keys: ['routes', 'circulation', 'concentration-time'],
  },
  {
    heading: 'How peptides are made and tested',
    lede: 'From a sequence on paper to a released vial, and what each kind of test actually establishes.',
    keys: [
      'quality-spine',
      'sequence-to-vial',
      'separate-questions',
      'chromatogram',
      'mass-identity',
      'formulation',
      'sterility',
      'endotoxin',
      'lyophilisation',
      'chain-of-custody',
    ],
  },
  {
    heading: 'How this index works',
    lede: 'The separations the database enforces: evidence lanes, recorded unknowns, the three editorial states, what a study design can answer, and protocols that are never merged.',
    keys: ['evidence-lanes', 'editorial-states', 'study-design', 'known-unknown', 'protocol-comparison'],
  },
];

export default function FigureLibraryPage() {
  return (
    <Container width="page" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <Link href="/learn" className="hover:text-deep-tide">
          Learn
        </Link>{' '}
        <span aria-hidden="true">/</span> Figure library
      </nav>
      <header className="mt-4 max-w-[62ch]">
        <p className="meta-label text-tide-teal">Figure library</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-5xl">
          Every drawing, and what it rests on
        </h1>
        <p className="depth-body mt-5 text-lg leading-relaxed text-ink-soft">
          Diagrams are read faster than prose and trusted more than they earn, so each one here is
          schematic, carries no values, and says beneath it which sourced claims — or which part of
          this index&apos;s method — it draws from.
        </p>
      </header>

      {GROUPS.map((group) => (
        <section key={group.heading} className="editorial-break mt-14" aria-labelledby={`fig-${group.keys[0] ?? ''}`}>
          <h2 id={`fig-${group.keys[0] ?? ''}`} className="font-serif text-2xl text-ink sm:text-3xl">
            {group.heading}
          </h2>
          <p className="mt-2 max-w-[62ch] text-ink-soft">{group.lede}</p>
          <div className="mt-4">
            {group.keys.map((key) => {
              const Drawing = ILLUSTRATIONS[key];
              return <Drawing key={key} />;
            })}
          </div>
        </section>
      ))}
    </Container>
  );
}
