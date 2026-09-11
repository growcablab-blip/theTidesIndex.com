-- ===========================================================================
-- Withdrawal on a non-approving review.
--
-- When a reviewer rejects a record or asks for changes, published content must
-- leave the public site immediately rather than waiting for an editor to act on
-- the comment. But reviewers deliberately hold no write access to content: they
-- record decisions, they do not rewrite the record under review.
--
-- The withdrawal is therefore a system consequence of a legitimate review, not
-- an editorial edit, and runs as a SECURITY DEFINER function — the same shape as
-- the provenance cascade in migration 0002. The function refuses to do anything
-- unless the caller genuinely recorded such a review, so it cannot be used as a
-- general-purpose way to change a record's state.
--
-- Note what it does and does not touch. A rejection sets `review_state` to
-- 'rejected' as well as withdrawing, because rejection is a verification
-- judgement. A request for changes leaves the verification state alone and only
-- flags and withdraws: the reviewer is asking for work, not overturning the
-- checks already done.
-- ===========================================================================

CREATE OR REPLACE FUNCTION tides_withdraw_on_review(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_outcome review_outcome;
  v_comments text;
  v_reason text;
  v_table text;
BEGIN
  -- The caller's own most recent decision on this record.
  SELECT r.outcome, r.comments INTO v_outcome, v_comments
  FROM reviews r
  WHERE r.entity_type = p_entity_type
    AND r.entity_id = p_entity_id
    AND r.reviewer_user_id = tides_current_user_id()
  ORDER BY r.reviewed_at DESC
  LIMIT 1;

  IF v_outcome IS NULL OR v_outcome = 'approved' THEN
    RETURN false;
  END IF;

  v_table := CASE p_entity_type
    WHEN 'peptide' THEN 'peptides'
    WHEN 'claim' THEN 'claims'
    WHEN 'protocol' THEN 'protocols'
    WHEN 'quality_topic' THEN 'quality_topics'
    WHEN 'peptide_route' THEN 'peptide_routes'
    WHEN 'regulatory_status' THEN 'regulatory_statuses'
    WHEN 'disagreement' THEN 'disagreements'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RETURN false;
  END IF;

  v_reason := CASE v_outcome
    WHEN 'rejected' THEN 'Rejected at review.'
    ELSE 'Changes requested at review.'
  END;

  IF tides_present(v_comments) THEN
    v_reason := v_reason || ' ' || v_comments;
  END IF;

  IF v_outcome = 'rejected' THEN
    EXECUTE format(
      'UPDATE %I SET review_state = ''rejected'', publication_state = ''withdrawn'','
      || ' needs_update = true, needs_update_reason = $1 WHERE id = $2',
      v_table
    )
    USING v_reason, p_entity_id;
  ELSE
    EXECUTE format(
      'UPDATE %I SET needs_update = true, needs_update_reason = $1,'
      || ' publication_state = CASE WHEN publication_state = ''published'''
      || ' THEN ''withdrawn''::publication_state_value ELSE publication_state END'
      || ' WHERE id = $2',
      v_table
    )
    USING v_reason, p_entity_id;
  END IF;

  RETURN true;
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_withdraw_on_review(reviewable_entity_type, uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_withdraw_on_review(reviewable_entity_type, uuid)
  TO authenticated, service_role;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Staleness
-- ---------------------------------------------------------------------------
-- Flags records whose review clock has run out, without withdrawing them.
-- A page that is overdue for review is still the best information available,
-- and saying "last reviewed on this date, review now due" is more useful to a
-- clinician than an empty page. This is the case `needs_update` on a published
-- record exists for (docs/REVIEW_WORKFLOW.md).
CREATE OR REPLACE FUNCTION tides_flag_stale_records(p_content_class review_clock_class)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_max_months integer;
  v_count integer := 0;
  v_reason text;
BEGIN
  SELECT max_months INTO v_max_months FROM review_clocks WHERE content_class = p_content_class;
  IF v_max_months IS NULL THEN
    RETURN 0;
  END IF;

  v_reason := format(
    'Review clock elapsed: %s months since last review (%s).',
    v_max_months, p_content_class
  );

  IF p_content_class = 'peptide_evidence' THEN
    UPDATE peptides
    SET needs_update = true, needs_update_reason = v_reason
    WHERE publication_state = 'published'
      AND NOT needs_update
      AND coalesce(last_reviewed_at, published_at) < now() - make_interval(months => v_max_months);
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF p_content_class = 'regulatory_status' THEN
    UPDATE regulatory_statuses
    SET needs_update = true, needs_update_reason = v_reason
    WHERE publication_state = 'published'
      AND NOT needs_update
      AND checked_at < (current_date - make_interval(months => v_max_months));
    GET DIAGNOSTICS v_count = ROW_COUNT;

  ELSIF p_content_class IN ('general_quality_science', 'foundational_chemistry') THEN
    UPDATE quality_topics
    SET needs_update = true, needs_update_reason = v_reason
    WHERE publication_state = 'published'
      AND NOT needs_update
      AND coalesce(last_reviewed_at, published_at) < now() - make_interval(months => v_max_months);
    GET DIAGNOSTICS v_count = ROW_COUNT;
  END IF;

  RETURN v_count;
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_flag_stale_records(review_clock_class) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_flag_stale_records(review_clock_class) TO authenticated, service_role;
