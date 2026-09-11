import type { ReactNode } from 'react';

/**
 * In-page contents for long reference pages.
 *
 * A compound page in practitioner mode is long by necessity, and a clinician
 * arriving with a specific question — "what human evidence is there?" — should
 * not have to scroll to find out. Sticky on wide screens, a plain list at the
 * top on narrow ones.
 *
 * Entries whose section is empty are still listed, marked as such. Knowing that
 * a section exists and is empty is itself an answer, and hiding it would make
 * the page look more complete than it is.
 */

export interface ContentsEntry {
  readonly id: string;
  readonly label: string;
  readonly count?: number;
  readonly empty?: boolean;
}

export function ContentsRail({ entries }: { entries: readonly ContentsEntry[] }) {
  return (
    <nav aria-label="On this page" className="no-print">
      <p className="meta-label">On this page</p>
      <ul className="mt-2.5 space-y-1.5 border-l border-rule">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className="-ml-px flex items-baseline justify-between gap-2 border-l border-transparent py-0.5 pl-3 text-sm transition-colors hover:border-tide-teal hover:text-deep-tide"
            >
              <span className={entry.empty ? 'text-slate-light' : 'text-ink-soft'}>
                {entry.label}
              </span>
              {entry.empty ? (
                <span className="shrink-0 text-2xs text-slate-light">none yet</span>
              ) : entry.count !== undefined ? (
                <span className="tabular shrink-0 text-2xs text-slate">{entry.count}</span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Two-column reading layout: contents rail beside a single measured column. */
export function ReferenceLayout({
  rail,
  children,
}: {
  rail: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-14">
      <div className="min-w-0 lg:order-1">{children}</div>
      <aside className="lg:order-2">
        <div className="lg:sticky lg:top-24">{rail}</div>
      </aside>
    </div>
  );
}
