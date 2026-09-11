import type { GateResult, ReviewType } from '@/domain/publishing/gates';

const REVIEW_LABELS: Readonly<Record<ReviewType, string>> = {
  source_check: 'Source check',
  primary_verification: 'Primary verification',
  scientific: 'Scientific review',
  clinical: 'Clinical review',
  compliance: 'Compliance review',
};

/**
 * Shows what stands between a record and publication.
 *
 * The list is specific and actionable by design. An editor should never have to
 * guess why something will not publish, and should never discover it by
 * pressing the button and receiving a database error.
 */
export function GatePanel({
  status,
  requiredReviews,
}: {
  status: GateResult & { version: number; approvedReviews?: readonly ReviewType[] };
  requiredReviews: readonly ReviewType[];
}) {
  const approved = status.approvedReviews ?? [];

  return (
    <div className="rounded border border-rule bg-mist p-4">
      <h3 className="font-serif text-base text-deep-tide">Publication readiness</h3>

      {status.canPublish ? (
        <p className="mt-2 text-sm text-deep-tide">
          Every requirement is met at version {status.version}. Publishing will make this record
          public.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-ink">
            {status.failures.length} {status.failures.length === 1 ? 'item' : 'items'} outstanding at
            version {status.version}:
          </p>
          <ul className="mt-2 space-y-2">
            {status.failures.map((failure) => (
              <li key={failure.code} className="text-sm text-ink">
                <span className="font-medium">{failure.field}</span> — {failure.message}
              </li>
            ))}
          </ul>
        </>
      )}

      <h4 className="mt-4 text-xs font-medium tracking-wide text-slate uppercase">
        Reviews at this version
      </h4>
      <ul className="mt-1 space-y-1">
        {requiredReviews.map((reviewType) => {
          const done = approved.includes(reviewType);
          return (
            <li key={reviewType} className="text-sm">
              <span aria-hidden="true">{done ? '✓' : '·'}</span>{' '}
              <span className={done ? 'text-deep-tide' : 'text-slate'}>
                {REVIEW_LABELS[reviewType]}: {done ? 'approved' : 'outstanding'}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs text-slate">
        Approvals are recorded against a specific version. Editing this record advances its version
        and the approvals must be given again — review does not survive rewriting.
      </p>
    </div>
  );
}
