import type { ReactNode } from 'react';

/**
 * Progressive disclosure, built on `<details>`.
 *
 * A quality topic page carries everything at once: the explanation, the claims,
 * every locator, the interpretation, the uncertainty, the gaps, the map and the
 * record's own state. Nothing there is surplus — a reader who wants to check a
 * citation needs all of it — but a reader who wants to know what a purity
 * figure means meets a wall of apparatus before the answer.
 *
 * So the depth becomes optional. **Nothing is removed and nothing is hidden
 * behind JavaScript**: `<details>` is native, works with the keyboard, is
 * announced by screen readers, and is searchable in-page by modern browsers.
 *
 * `defaultOpen` exists because the right answer differs by audience, and the
 * page decides: a practitioner reading in practitioner mode is here *for* the
 * evidence and should not have to open it.
 *
 * Printing opens everything — `open` is forced by a print rule in globals.css,
 * because a printed page with a collapsed section on it is a printed page with
 * a hole in it.
 */
export function Disclosure({
  summary,
  detail,
  count,
  defaultOpen = false,
  children,
}: {
  /** The line a reader decides on. Says what is inside, not "more". */
  summary: string;
  /** One sentence on why they might open it. */
  detail?: string | undefined;
  /** How much is inside, where a number is meaningful. */
  count?: number | undefined;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="tides-disclosure group rounded-md border border-rule bg-warm-white open:bg-transparent"
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 rounded-md px-4 py-3.5 transition-colors hover:bg-mist focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tide-teal group-open:border-b group-open:border-rule">
        <span
          aria-hidden="true"
          className="mt-[0.35rem] shrink-0 text-tide-teal transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        <span className="flex-1">
          <span className="block font-medium text-ink">
            {summary}
            {count === undefined ? null : (
              <span className="ml-2 text-sm font-normal text-slate">{count}</span>
            )}
          </span>
          {detail === undefined ? null : (
            <span className="mt-0.5 block text-sm text-slate">{detail}</span>
          )}
        </span>
      </summary>
      <div className="px-4 pt-4 pb-5">{children}</div>
    </details>
  );
}
