import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';

/**
 * Where each Tides synthesis stands with human scientific review (migration 0028).
 *
 * A synthesis about a compound, or one interpreting mechanism, efficacy, safety,
 * clinical meaning or a protocol, is not published until an active scientific
 * reviewer has approved its current version. A general synthesis on a learning or
 * quality topic needs no such review.
 *
 * The database decides; this reports it. The state comes from
 * `tides_synthesis_review_state`, the same rule the publish gate applies.
 */

export type SynthesisInterpretationKind =
  | 'general'
  | 'mechanism'
  | 'efficacy'
  | 'safety'
  | 'clinical_interpretation'
  | 'protocol_interpretation';

export type SynthesisReviewState =
  | 'not_required'
  | 'awaiting_scientific_review'
  | 'changes_requested'
  | 'rejected'
  | 'approved';

export interface SynthesisLatestReview {
  readonly outcome: 'approved' | 'changes_requested' | 'rejected';
  readonly reviewerName: string | null;
  readonly comments: string | null;
  readonly reviewedAt: string;
}

export interface SynthesisReviewItem {
  readonly id: string;
  readonly synthesisKey: string;
  readonly subjectKind: 'peptide' | 'quality' | 'learning';
  readonly subjectLabel: string;
  readonly interpretationKind: SynthesisInterpretationKind;
  readonly version: number;
  readonly publicationState: string;
  readonly reviewState: SynthesisReviewState;
  /** The latest scientific review at the current version, if any. */
  readonly latestReview: SynthesisLatestReview | null;
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

/**
 * Syntheses that require human scientific review and do not yet hold an
 * approval at their current version: awaiting a first review, sent back with
 * changes requested, or rejected.
 */
export async function listSynthesesAwaitingScientificReview(
  db: Database,
): Promise<SynthesisReviewItem[]> {
  const result = await db.execute(sql`
    select s.id, s.synthesis_key, s.version, s.interpretation_kind::text as interpretation_kind,
           s.publication_state::text as publication_state,
           case when s.peptide_id is not null then 'peptide'
                when s.quality_topic_id is not null then 'quality'
                else 'learning' end as subject_kind,
           coalesce(p.canonical_name, q.name, lt.title) as subject_label,
           tides_synthesis_review_state(s.id) as review_state,
           lr.outcome::text as latest_outcome, lr.comments as latest_comments,
           lr.reviewed_at as latest_reviewed_at, pr.display_name as latest_reviewer
      from editorial_syntheses s
      left join peptides p on p.id = s.peptide_id
      left join quality_topics q on q.id = s.quality_topic_id
      left join learning_topics lt on lt.id = s.learning_topic_id
      left join lateral (
        select r.outcome, r.comments, r.reviewed_at, r.reviewer_user_id
          from reviews r
         where r.entity_type::text = 'editorial_synthesis'
           and r.entity_id = s.id
           and r.entity_version = s.version
           and r.review_type = 'scientific'
         order by r.reviewed_at desc
         limit 1
      ) lr on true
      left join profiles pr on pr.user_id = lr.reviewer_user_id
     where tides_synthesis_requires_review(s.peptide_id, s.interpretation_kind)
       and tides_synthesis_review_state(s.id) <> 'approved'
     order by case tides_synthesis_review_state(s.id)
                when 'changes_requested' then 0
                when 'awaiting_scientific_review' then 1
                else 2 end,
              s.synthesis_key
  `);

  return rows<Record<string, unknown>>(result).map((r) => ({
    id: String(r.id),
    synthesisKey: String(r.synthesis_key),
    subjectKind: r.subject_kind as SynthesisReviewItem['subjectKind'],
    subjectLabel: typeof r.subject_label === 'string' ? r.subject_label : '',
    interpretationKind: r.interpretation_kind as SynthesisInterpretationKind,
    version: Number(r.version),
    publicationState: String(r.publication_state),
    reviewState: r.review_state as SynthesisReviewState,
    latestReview:
      typeof r.latest_outcome === 'string'
        ? {
            outcome: r.latest_outcome as SynthesisLatestReview['outcome'],
            reviewerName: typeof r.latest_reviewer === 'string' ? r.latest_reviewer : null,
            comments: typeof r.latest_comments === 'string' ? r.latest_comments : null,
            reviewedAt: toIso(r.latest_reviewed_at),
          }
        : null,
  }));
}
