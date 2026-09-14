import Link from 'next/link';
import type { Metadata } from 'next';
import { Callout, Container } from '@/components/public/primitives';
import { VOLUMES } from '@/domain/publications/volumes';

export const metadata: Metadata = {
  title: 'The publications',
  description:
    'Five volumes generated from the same records the site renders: who each is for, what it holds, and how far it has got.',
  robots: { index: false, follow: false },
};

/**
 * The publication family.
 *
 * A reader who wants the whole argument in order, rather than a record at a
 * time, is looking for a book. This page says what each volume is for and how
 * far it has got — including, for the patient volume, which chapters are
 * written and which are still briefs, because that split is the honest measure
 * of the programme.
 *
 * No volume is published. None is offered for download here: they are generated
 * artefacts of unreviewed records, and publishing them is a decision for a
 * reviewer, not a build step.
 */
export default function PublicationsPage() {
  return (
    <Container width="page" className="py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <Link href="/learn" className="hover:text-deep-tide">
          Learn
        </Link>{' '}
        <span aria-hidden="true">/</span> The publications
      </nav>

      <header className="mt-4 max-w-[62ch]">
        <p className="meta-label text-tide-teal">Reference series</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight text-ink sm:text-5xl">
          Five volumes, generated from the same records
        </h1>
        <p className="depth-body mt-5 text-lg leading-relaxed text-ink-soft">
          Each volume is built from the records this site renders, so a printed page and a web page
          cannot disagree. Each carries its review state on its cover. None is published.
        </p>
      </header>

      <div className="mt-12 space-y-10">
        {VOLUMES.map((volume) => (
          <article key={volume.key} className="editorial-break grid gap-6 pt-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12">
            <div>
              <p className="meta-label">{volume.number}</p>
              <h2 className="mt-1.5 font-serif text-2xl leading-snug text-ink">{volume.title}</h2>
              {volume.subtitle === null ? null : (
                <p className="mt-1 font-serif text-lg text-slate">{volume.subtitle}</p>
              )}
              <p className="mt-3 text-sm text-ink-soft">
                <span className="meta-label mr-1.5">For</span>
                {volume.audience}
              </p>
            </div>

            <div>
              <p className="depth-body leading-relaxed text-ink-soft">{volume.holds}</p>
              <p className="mt-3 rounded-lg border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-4 py-2.5 text-sm text-[var(--color-caution)]">
                {volume.status}
              </p>

              {volume.chapters === undefined ? null : (
                <ol className="mt-5 grid gap-x-8 gap-y-1.5 sm:grid-cols-2">
                  {volume.chapters.map((chapter) => (
                    <li key={chapter.number} className="flex items-baseline gap-2.5 text-sm">
                      <span
                        aria-hidden="true"
                        className={
                          chapter.written
                            ? 'mt-1.5 h-2 w-2 shrink-0 rounded-full bg-tide-teal'
                            : 'mt-1.5 h-2 w-2 shrink-0 rounded-full border border-dashed border-[var(--color-caution)]'
                        }
                      />
                      <span className={chapter.written ? 'text-ink-soft' : 'text-slate'}>
                        {chapter.title}
                        <span className="sr-only">{chapter.written ? ' — written' : ' — still a brief'}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="mt-14 max-w-[70ch]">
        <Callout title="Why you cannot download them here">
          <p>
            Each volume is generated from records that have not been through scientific review. A
            printed reference is trusted more than a web page, not less, so the volumes stay
            internal until a named reviewer has approved what they contain.
          </p>
        </Callout>
      </div>
    </Container>
  );
}
