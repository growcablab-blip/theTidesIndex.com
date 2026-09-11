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
-- general-purpose way to change a workflow status.
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
  v_status workflow_status;
  v_table text;
BEGIN
  -- The caller's own most recent decision on this record.
  SELECT r.outcome INTO v_outcome
  FROM reviews r
  WHERE r.entity_type = p_entity_type
    AND r.entity_id = p_entity_id
    AND r.reviewer_user_id = tides_current_user_id()
  ORDER BY r.reviewed_at DESC
  LIMIT 1;

  IF v_outcome IS NULL OR v_outcome = 'approved' THEN
    RETURN false;
  END IF;

  v_status := CASE v_outcome
    WHEN 'rejected' THEN 'rejected'::workflow_status
    ELSE 'needs_update'::workflow_status
  END;

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

  EXECUTE format(
    'UPDATE %I SET workflow_status = $1 WHERE id = $2 AND workflow_status = ''published''',
    v_table
  )
  USING v_status, p_entity_id;

  RETURN true;
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_withdraw_on_review(reviewable_entity_type, uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_withdraw_on_review(reviewable_entity_type, uuid)
  TO authenticated, service_role;
