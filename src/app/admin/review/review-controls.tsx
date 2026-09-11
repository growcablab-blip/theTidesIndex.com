'use client';

import { useActionState } from 'react';
import { reviewTypesForRole, type StaffRole } from '@/server/auth/roles';
import { publishAction, recordReviewAction, setWorkflowStatusAction } from '../actions';

/**
 * Review and publication controls.
 *
 * What is offered here follows the acting role, but nothing is authorised here:
 * a reviewer who somehow submitted a review type outside their remit would be
 * refused by the database policy, and a publish attempt that has not met its
 * gates would be refused by the trigger.
 */
export function ReviewControls({
  entityType,
  entityId,
  role,
  canPublish,
  workflowStatus,
}: {
  entityType: 'peptide' | 'claim' | 'protocol' | 'quality_topic';
  entityId: string;
  role: StaffRole;
  canPublish: boolean;
  workflowStatus: string;
}) {
  const [reviewState, reviewFormAction] = useActionState(recordReviewAction, null);
  const [publishState, publishFormAction] = useActionState(publishAction, null);
  const [statusState, statusFormAction] = useActionState(setWorkflowStatusAction, null);

  const availableReviews = reviewTypesForRole(role);
  const isPublished = workflowStatus === 'published';

  return (
    <div className="space-y-6">
      <div className="rounded border border-rule p-4">
        <h3 className="font-serif text-base text-deep-tide">Record a review</h3>

        {availableReviews.length === 0 ? (
          <p className="mt-2 text-sm text-slate">Your role does not record reviews.</p>
        ) : (
          <form action={reviewFormAction} className="mt-3 space-y-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />

            <label className="block text-sm">
              <span className="font-medium text-ink">Review type</span>
              <select
                name="reviewType"
                required
                className="mt-1 w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
              >
                {availableReviews.map((reviewType) => (
                  <option key={reviewType} value={reviewType}>
                    {reviewType.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Outcome</span>
              <select
                name="outcome"
                required
                className="mt-1 w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
              >
                <option value="approved">Approve</option>
                <option value="changes_requested">Request changes</option>
                <option value="rejected">Reject</option>
              </select>
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Comments</span>
              <textarea
                name="comments"
                rows={3}
                className="mt-1 w-full rounded border border-rule bg-warm-white px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              className="rounded border border-deep-tide px-3 py-1.5 text-sm text-deep-tide"
            >
              Record review
            </button>

            <Result state={reviewState} success="Review recorded." />

            <p className="text-xs text-slate">
              Recorded in your name, against this record&rsquo;s current version. Requesting changes
              or rejecting withdraws published content immediately.
            </p>
          </form>
        )}
      </div>

      <div className="rounded border border-rule p-4">
        <h3 className="font-serif text-base text-deep-tide">Publication</h3>

        {isPublished ? (
          <form action={statusFormAction} className="mt-3 space-y-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <input type="hidden" name="status" value="needs_update" />
            <p className="text-sm text-ink">This record is public.</p>
            <button
              type="submit"
              className="rounded border border-amber-700 px-3 py-1.5 text-sm text-amber-900"
            >
              Withdraw for update
            </button>
            <Result state={statusState} success="Withdrawn from the public site." />
          </form>
        ) : (
          <form action={publishFormAction} className="mt-3 space-y-3">
            <input type="hidden" name="entityType" value={entityType} />
            <input type="hidden" name="entityId" value={entityId} />
            <button
              type="submit"
              disabled={!canPublish}
              className="rounded bg-deep-tide px-3 py-1.5 text-sm text-warm-white disabled:opacity-50"
            >
              Publish
            </button>
            {!canPublish ? (
              <p className="text-xs text-slate">
                Outstanding requirements are listed under publication readiness.
              </p>
            ) : null}
            <Result state={publishState} success="Published." />
          </form>
        )}
      </div>
    </div>
  );
}

function Result({
  state,
  success,
}: {
  state: { ok: boolean; message?: string; fieldErrors?: Readonly<Record<string, string[]>> } | null;
  success: string;
}) {
  if (!state) return null;

  if (state.ok) {
    return (
      <p role="status" className="text-sm text-deep-tide">
        {success}
      </p>
    );
  }

  return (
    <div role="alert" className="text-sm text-red-900">
      <p>{state.message}</p>
      {state.fieldErrors ? (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {Object.entries(state.fieldErrors).flatMap(([field, messages]) =>
            messages.map((message) => <li key={`${field}-${message}`}>{message}</li>),
          )}
        </ul>
      ) : null}
    </div>
  );
}
