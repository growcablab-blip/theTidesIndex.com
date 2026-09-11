import type { QualityTopicRecordState } from '@/server/public/quality-topic';

/**
 * How far this record has been checked, stated before the reader gets to the
 * content rather than after it.
 *
 * The failure this prevents is a specific one. A record can be complete,
 * sourced, locator-checked and internally consistent while no person with the
 * relevant expertise has yet read it. "Ready for scientific review" is a real
 * and honest state — it is as far as automated work can legitimately take a
 * record — and it looks, to a reader, exactly like a finished page unless the
 * page says otherwise.
 *
 * So the rung is named in words, never implied by the absence of a warning, and
 * the wording for an unreviewed record leads with what has *not* happened.
 */

interface Rung {
  readonly label: string;
  readonly meaning: string;
  readonly reviewed: boolean;
}

const RUNGS: Readonly<Record<string, Rung>> = {
  unreviewed: {
    label: 'Not yet checked',
    meaning: 'Nothing here has been verified against its sources.',
    reviewed: false,
  },
  captured: {
    label: 'Captured',
    meaning: 'Extracted from sources; not yet checked against them.',
    reviewed: false,
  },
  source_checked: {
    label: 'Source checked',
    meaning:
      'Every statement has been confirmed to appear where it is cited. No scientific review has taken place.',
    reviewed: false,
  },
  primary_source_checked: {
    label: 'Primary source verified',
    meaning:
      'Citations have been traced to the original studies rather than to summaries of them. No scientific review has taken place.',
    reviewed: false,
  },
  ready_for_scientific_review: {
    label: 'Awaiting scientific review',
    meaning:
      'Every statement resolves to an exact page in a named source, and that has been checked automatically. No scientist has yet read this page. Treat it as a prepared draft, not a reviewed reference.',
    reviewed: false,
  },
  scientific_reviewed: {
    label: 'Scientifically reviewed',
    meaning: 'A named reviewer with relevant expertise has approved this version.',
    reviewed: true,
  },
  clinical_reviewed: {
    label: 'Clinically reviewed',
    meaning: 'Scientific and clinical reviewers have approved this version.',
    reviewed: true,
  },
  compliance_reviewed: {
    label: 'Compliance reviewed',
    meaning: 'Scientific, clinical and compliance reviewers have approved this version.',
    reviewed: true,
  },
  rejected: {
    label: 'Rejected',
    meaning: 'A reviewer rejected this version. It should not be relied on.',
    reviewed: false,
  },
};

export function reviewRung(reviewState: string): Rung {
  return (
    RUNGS[reviewState] ?? {
      label: 'Unknown',
      meaning: 'The review state of this record could not be determined.',
      reviewed: false,
    }
  );
}

/**
 * The banner shown above an unpublished record in a local preview.
 *
 * Loud on purpose. A preview that looks like the live site is how unreviewed
 * content ends up quoted.
 */
export function PreviewBanner({ state }: { state: QualityTopicRecordState }) {
  if (!state.isPreview) return null;
  const rung = reviewRung(state.reviewState);

  return (
    <div
      role="note"
      aria-label="Unpublished preview"
      className="mb-6 rounded-md border-2 border-dashed border-[var(--color-caution)] bg-[var(--color-caution-bg)] px-5 py-4"
    >
      <p className="text-sm font-semibold tracking-wide text-[var(--color-caution)] uppercase">
        Unpublished preview — not live
      </p>
      <p className="mt-1.5 text-sm text-ink-soft">
        This record is <strong>{rung.label.toLowerCase()}</strong> and has not been published.{' '}
        {rung.meaning} It is rendered here so that the page can be examined and reviewed; the
        publish gate is unchanged and continues to refuse publication without a human scientific
        approval.
      </p>
    </div>
  );
}

/**
 * The review state as part of the page, for published and preview alike.
 *
 * Kept near the top rather than in a footer: a reader decides how much weight to
 * give a page in the first few seconds, and this is the fact that should inform
 * that decision.
 */
export function ReviewStatusPanel({ state }: { state: QualityTopicRecordState }) {
  const rung = reviewRung(state.reviewState);

  return (
    <div
      className={`rounded-md border px-5 py-4 ${
        rung.reviewed
          ? 'border-rule bg-mist'
          : 'border-[var(--color-caution-rule)] bg-[var(--color-caution-bg)]'
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">
          Review status
        </span>
        <span className="text-sm font-medium text-ink">{rung.label}</span>
        <span className="text-sm text-slate">
          {state.publicationState === 'published' ? 'Published' : 'Not published'}
        </span>
        {state.needsUpdate ? (
          <span className="text-sm text-[var(--color-caution)]">Flagged for update</span>
        ) : null}
      </div>
      <p className="mt-1.5 max-w-[68ch] text-sm text-ink-soft">{rung.meaning}</p>
    </div>
  );
}

/**
 * The evidence cutoff, said plainly when there isn't one.
 *
 * "Last reviewed" answers when someone looked at the wording; it says nothing
 * about how current the underlying evidence is. Leaving the field out where no
 * survey has been done would let the review date stand in for it.
 */
export function EvidenceCutoff({ value }: { value: string | null }) {
  if (value !== null) return <>{value}</>;
  return (
    <span className="text-slate">
      Not recorded — no literature survey has been carried out for this topic.
    </span>
  );
}
