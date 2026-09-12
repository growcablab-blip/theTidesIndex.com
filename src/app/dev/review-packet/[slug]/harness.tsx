import type { ReviewDiff } from '@/server/editorial/review-diff';

/**
 * What a reviewer is asked to do, stated on the packet itself.
 *
 * A reviewer arriving for the first time should not have to have read a
 * separate document to know what they are being asked. The full version is in
 * `docs/SCIENTIFIC_REVIEWER_GUIDE.md`; this is the part that must be in front of
 * them while they work.
 */
export function ReviewerInstructions({
  claimCount,
  gapCount,
}: {
  claimCount: number;
  gapCount: number;
}) {
  return (
    <section
      aria-labelledby="reviewer-instructions"
      className="rounded-md border border-rule bg-mist px-5 py-5"
    >
      <h2 id="reviewer-instructions" className="font-serif text-lg text-deep-tide">
        What you are being asked
      </h2>
      <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">
        {claimCount} statement{claimCount === 1 ? '' : 's'}, each with the passage it rests on, how
        this index reads that passage, and what it records as uncertain. Plus {gapCount} point
        {gapCount === 1 ? '' : 's'} the index declines to make.
      </p>

      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
            You are being asked whether
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>the source says what this index says it says;</li>
            <li>the reading of it is fair, and not stronger than the passage supports;</li>
            <li>the stated uncertainty covers what a reader ought to be warned about;</li>
            <li>the scope is right — population, material, document type, jurisdiction;</li>
            <li>anything is asserted that the cited passage does not carry.</li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
            You are not being asked
          </h3>
          <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
            <li>to write or rewrite the content — request a change instead;</li>
            <li>to judge any product, supplier or certificate;</li>
            <li>to vouch for sources this index does not hold;</li>
            <li>
              to fill a gap from your own knowledge. If you know something the sources here do not
              establish, that is a source to acquire, not a claim to approve.
            </li>
          </ul>
        </div>
      </div>

      <p className="mt-4 max-w-[70ch] border-t border-rule pt-3 text-sm text-slate">
        An approval is bound to the version shown. Any later edit bumps the version and your
        approval stops applying — you will be asked again, and shown what changed.
      </p>
    </section>
  );
}

/**
 * What moved since the version a reviewer last saw.
 *
 * The returning-reviewer case. Without it, a re-review is a request to read an
 * apparently identical record again with no indication of what changed, which is
 * where a reviewer stops answering.
 */
export function ReviewDiffPanel({ diff }: { diff: ReviewDiff }) {
  return (
    <section
      aria-labelledby="review-diff"
      className="rounded-md border border-rule bg-warm-white px-5 py-5"
    >
      <h2 id="review-diff" className="font-serif text-lg text-deep-tide">
        What changed since version {diff.reviewedVersion}
      </h2>

      {diff.note !== null ? (
        <p className="mt-2 max-w-[70ch] text-sm text-ink-soft">{diff.note}</p>
      ) : null}

      {diff.changes.length === 0 ? (
        diff.unchanged && diff.note === null ? (
          <p className="mt-2 text-sm text-slate">
            Nothing has changed. This is the version that was reviewed.
          </p>
        ) : null
      ) : (
        <ul className="mt-3 space-y-4">
          {diff.changes.map((change) => (
            <li key={change.field}>
              <p className="text-xs font-semibold tracking-wide text-deep-tide uppercase">
                {change.label}
              </p>
              <div className="mt-1.5 grid gap-2 lg:grid-cols-2">
                <div className="rounded-sm border border-rule bg-mist px-3 py-2">
                  <p className="text-xs tracking-wide text-slate uppercase">
                    At version {diff.reviewedVersion}
                  </p>
                  <p className="mt-1 text-sm text-slate">
                    {change.before ?? <span className="italic">not recorded</span>}
                  </p>
                </div>
                <div className="rounded-sm border border-l-[3px] border-rule border-l-tide-teal bg-warm-white px-3 py-2">
                  <p className="text-xs tracking-wide text-slate uppercase">
                    Now, at version {diff.currentVersion}
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    {change.after ?? <span className="italic">not recorded</span>}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
