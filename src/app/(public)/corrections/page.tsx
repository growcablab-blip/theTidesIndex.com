import Link from 'next/link';
import type { Metadata } from 'next';
import { listCorrections } from '@/server/public/queries';
import {
  Callout,
  Container,
  EmptyState,
  Section,
  formatDate,
} from '@/components/public/primitives';

/**
 * Rendered on demand rather than at build time.
 *
 * The content of this page changes when an editor publishes, not when the
 * application is deployed, so a build-time snapshot would serve stale evidence
 * until the next deploy. It also means a build does not need database access,
 * which keeps deployment independent of the database being reachable.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Corrections',
  description: 'Material changes to published content, and how to report an error.',
};

const SEVERITY_LABEL: Readonly<Record<string, string>> = {
  typographical: 'Typographical',
  clarification: 'Clarification',
  substantive: 'Substantive',
  material_medical: 'Material — medical content',
};

/**
 * The public corrections log.
 *
 * A reference that never publishes a correction is either perfect or not
 * looking. Publishing them is the cheaper of the two positions to defend, and it
 * tells a reader what kind of errors this index actually makes.
 */
export default async function CorrectionsPage() {
  const corrections = await listCorrections();

  return (
    <Container width="reading" className="py-10 sm:py-14">
      <header>
        <h1 className="font-serif text-3xl text-ink sm:text-4xl">Corrections</h1>
        <p className="mt-3 text-lg text-ink-soft">
          Material changes to published content, and how to tell us something is wrong.
        </p>
      </header>

      <Section id="report" title="Reporting an error">
        <div className="prose-tides">
          <p>
            If a statement here is wrong, mis-sourced, or attributed to a work that does not say it,
            we want to know — particularly if a citation does not resolve to what it claims.
          </p>
          <p>
            Include the page, the statement, and what you believe the correct position is. If you can
            point at a source and a page, that shortens the work considerably.
          </p>
          <Callout title="A correction contact has not been published yet">
            <p>
              This is a gap, and it is listed as one on the{' '}
              <Link href="/coverage">coverage page</Link> rather than papered over. Until a contact
              route is live, corrections cannot be submitted through the site.
            </p>
          </Callout>
        </div>
      </Section>

      <Section id="what-happens" title="What happens to a correction">
        <div className="prose-tides">
          <p>
            A material error is corrected promptly, the previous version is retained in the record
            history, and every page that depended on the corrected statement is flagged for
            re-review. Where the error was in a source rather than in the reading of it, the source
            is re-assessed and anything else resting on it is re-checked too.
          </p>
          <p>
            Corrections that change what a statement means are published below. Typographical fixes
            are recorded internally but not listed here.
          </p>
        </div>
      </Section>

      <Section id="log" title="Published corrections">
        {corrections.length === 0 ? (
          <EmptyState
            headline="No corrections have been published."
            detail="This index has published very little so far, so there has been little to correct. That will change, and when it does the changes appear here."
          />
        ) : (
          <ul className="space-y-5">
            {corrections.map((correction) => (
              <li
                key={correction.id}
                className="avoid-break rounded-md border border-rule bg-warm-white px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className="meta-label">
                    {SEVERITY_LABEL[correction.severity] ?? correction.severity}
                  </p>
                  <p className="text-sm text-slate">{formatDate(correction.correctedAt)}</p>
                </div>
                <p className="mt-2 text-ink-soft">{correction.whatChanged}</p>
                <p className="mt-2 border-t border-rule-soft pt-2 text-sm text-slate">
                  {correction.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </Container>
  );
}
