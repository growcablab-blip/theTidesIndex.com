import Link from 'next/link';
import type { Citation } from '@/server/public/queries';

/**
 * Citation rendering.
 *
 * The product promise is that a reader never has to wonder where a statement
 * came from. That means a citation has to carry four things without being
 * asked: who said it, what kind of source they are, exactly where in that source
 * it appears, and whether the copy behind it is sound.
 *
 * The last one is unusual and deliberate. Most references present every citation
 * as equally solid. Here a source whose held copy is partial or awaiting
 * replacement says so on the citation itself, because a reader deciding how much
 * weight to give a statement needs that more than they need a tidy list.
 */

export function formatAuthors(authors: readonly string[]): string {
  if (authors.length === 0) return '';
  if (authors.length === 1) return authors[0] ?? '';
  if (authors.length === 2) return `${authors[0] ?? ''} and ${authors[1] ?? ''}`;
  return `${authors[0] ?? ''} et al.`;
}

/** One line, for use inside an evidence card or a table cell. */
export function CitationLine({ citation }: { citation: Citation }) {
  const authors = formatAuthors(citation.authors);

  return (
    <span className="text-sm text-ink-soft">
      <Link
        href={`/sources/${citation.sourceKey}`}
        className="underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
      >
        {authors ? `${authors}, ` : ''}
        <cite className="not-italic">{citation.sourceTitle}</cite>
      </Link>
      {citation.year ? <span className="text-slate"> ({citation.year})</span> : null}
      {citation.locatorText ? (
        <span className="text-slate">, {citation.locatorText}</span>
      ) : null}
      {!citation.isCitable ? (
        <span className="ml-1.5 rounded-sm border border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)] px-1 py-px text-2xs whitespace-nowrap text-[var(--color-caution)]">
          copy under replacement
        </span>
      ) : null}
    </span>
  );
}

/**
 * The full provenance trail, shown where a reader is most likely to be
 * interrogating a statement rather than skimming it.
 */
export function CitationBlock({ citation }: { citation: Citation }) {
  const authors = formatAuthors(citation.authors);

  return (
    <div className="text-sm">
      <p className="text-ink-soft">
        <Link
          href={`/sources/${citation.sourceKey}`}
          className="underline decoration-rule underline-offset-2 hover:decoration-tide-teal"
        >
          {authors ? `${authors}. ` : ''}
          <cite className="not-italic">{citation.sourceTitle}</cite>
        </Link>
        {citation.year ? ` (${String(citation.year)})` : ''}
      </p>

      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate">
        <span>{citation.sourceTypeLabel}</span>
        <span aria-hidden="true">·</span>
        <span>
          {citation.locatorText ?? <span className="italic">Exact location not recorded</span>}
        </span>
        <LocatorPages citation={citation} />
        {citation.doi ? (
          <>
            <span aria-hidden="true">·</span>
            <a
              href={`https://doi.org/${citation.doi}`}
              rel="noreferrer noopener"
              className="print-url underline decoration-rule underline-offset-2"
              data-print-url={`https://doi.org/${citation.doi}`}
            >
              DOI
            </a>
          </>
        ) : null}
      </p>

      {!citation.isCitable ? (
        <p className="mt-1 text-xs text-[var(--color-caution)]">
          The copy held of this source is partial or awaiting replacement, so it cannot support
          published statements. See the source record for what is known about it.
        </p>
      ) : null}
    </div>
  );
}

/**
 * The two page numbers, kept apart.
 *
 * A locator is recorded as the page printed in the work, because that is what a
 * reader with any copy can find. The copy this index holds may number from its
 * cover and run ahead by a fixed amount, so the page someone would turn to in
 * the held file is a different number. Both are useful and they answer different
 * questions, so neither is shown without saying which it is.
 */
function LocatorPages({ citation }: { citation: Citation }) {
  // The locator already names the page of the work — repeating it as "printed
  // page N" beside "p. N" reads as two different facts. What it cannot say is
  // where that page sits in the copy this index holds, so that is what is added,
  // labelled, and only when the two actually differ.
  if (citation.filePage === null || citation.filePage === citation.printedPage) {
    if (citation.locatorText !== null || citation.printedPage === null) return null;
    return (
      <>
        <span aria-hidden="true">·</span>
        <span>Printed page {citation.printedPage}</span>
      </>
    );
  }

  return (
    <>
      <span aria-hidden="true">·</span>
      <span className="text-slate">p. {citation.filePage} in the copy held here</span>
    </>
  );
}

/**
 * Deduplicated reference list for the foot of a page.
 *
 * Numbered so a printed page can be read on its own, which is how these get
 * used in practice.
 */
export function ReferenceList({ citations }: { citations: readonly Citation[] }) {
  const seen = new Map<string, Citation>();
  for (const citation of citations) {
    if (!seen.has(citation.sourceKey)) seen.set(citation.sourceKey, citation);
  }
  const unique = [...seen.values()].sort((a, b) => a.sourceKey.localeCompare(b.sourceKey));

  return (
    <ol className="space-y-3">
      {unique.map((citation, index) => (
        <li key={citation.sourceKey} className="avoid-break grid grid-cols-[2rem_1fr] gap-2">
          <span className="tabular text-sm text-slate">{index + 1}.</span>
          <CitationBlock citation={citation} />
        </li>
      ))}
    </ol>
  );
}
