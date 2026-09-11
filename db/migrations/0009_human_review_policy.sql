-- ===========================================================================
-- Human review policy.
--
-- Automation does real and useful work in this system: extracting records,
-- structuring them, comparing sources, confirming that a citation resolves to
-- what it claims, flagging contradictions, assembling review packets. Recording
-- that work honestly is better than pretending a person did it, and better than
-- refusing to record it at all.
--
-- What automation must never do is stand in for a scientific, clinical or
-- compliance approval. Those are judgements about medical content and they
-- belong to a person who can be named and held to them.
--
-- So a check is attributed to a human or to a named tool, and the publish gates
-- require `human`. Automated work still advances the verification state, which
-- is the point: a record can honestly reach "ready for scientific review"
-- without anyone having pretended to review it. An unpublished record in that
-- state is a better outcome than a published one resting on a fictional
-- approval.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Only a human approval satisfies a gate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_has_approved_review(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid,
  p_version integer,
  p_review_type review_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM reviews r
    WHERE r.entity_type = p_entity_type
      AND r.entity_id = p_entity_id
      AND r.entity_version = p_version
      AND r.review_type = p_review_type
      AND r.outcome = 'approved'
      AND r.performed_by = 'human'
      AND r.reviewer_user_id IS NOT NULL
  )
$fn$;
--> statement-breakpoint

-- Whether a check of this kind exists at all, however it was carried out.
-- Used for reporting how far a record has got, never as a publish condition.
CREATE OR REPLACE FUNCTION tides_has_check(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid,
  p_version integer,
  p_review_type review_type
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM reviews r
    WHERE r.entity_type = p_entity_type
      AND r.entity_id = p_entity_id
      AND r.entity_version = p_version
      AND r.review_type = p_review_type
      AND r.outcome = 'approved'
  )
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Verification state follows the checks that exist
-- ---------------------------------------------------------------------------
-- Unchanged in substance: an approved check advances the rung, whoever
-- performed it. An automated source check is a real source check and saying so
-- is honest. It simply does not, on its own, open the gate.
CREATE OR REPLACE FUNCTION tides_advance_review_state()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_table text;
  v_rung review_state;
  v_current_version integer;
BEGIN
  IF NEW.outcome <> 'approved' THEN
    RETURN NULL;
  END IF;

  v_table := CASE NEW.entity_type
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
    RETURN NULL;
  END IF;

  v_rung := CASE NEW.review_type
    WHEN 'source_check' THEN 'source_checked'::review_state
    WHEN 'primary_verification' THEN 'primary_source_checked'::review_state
    WHEN 'scientific' THEN 'scientific_reviewed'::review_state
    WHEN 'clinical' THEN 'clinical_reviewed'::review_state
    WHEN 'compliance' THEN 'compliance_reviewed'::review_state
  END;

  -- A review of a superseded version says nothing about the current one.
  EXECUTE format('SELECT version FROM %I WHERE id = $1', v_table)
  INTO v_current_version
  USING NEW.entity_id;

  IF v_current_version IS NULL OR v_current_version <> NEW.entity_version THEN
    RETURN NULL;
  END IF;

  EXECUTE format(
    'UPDATE %I SET review_state = $1 WHERE id = $2'
    || ' AND review_state <> ''rejected'''
    || ' AND array_position(enum_range(NULL::review_state), review_state)'
    || '   < array_position(enum_range(NULL::review_state), $1)',
    v_table
  )
  USING v_rung, NEW.entity_id;

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Handing a record to a human reviewer
-- ---------------------------------------------------------------------------
-- The state that closes the gap between what automation can finish and what only
-- a person can start. It is not settable by hand: the record has to actually
-- have the provenance and the checks behind it, so "ready for review" means the
-- packet is genuinely ready rather than that someone said so.
CREATE OR REPLACE FUNCTION tides_mark_ready_for_scientific_review(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_table text;
  v_version integer;
  v_state review_state;
  v_provenance_ok boolean;
BEGIN
  v_table := CASE p_entity_type
    WHEN 'claim' THEN 'claims'
    WHEN 'protocol' THEN 'protocols'
    WHEN 'quality_topic' THEN 'quality_topics'
    WHEN 'peptide' THEN 'peptides'
    ELSE NULL
  END;

  IF v_table IS NULL THEN
    RETURN 'This kind of record does not carry a review packet.';
  END IF;

  EXECUTE format('SELECT version, review_state FROM %I WHERE id = $1', v_table)
  INTO v_version, v_state
  USING p_entity_id;

  IF v_version IS NULL THEN
    RETURN 'That record no longer exists.';
  END IF;

  IF v_state = 'rejected' THEN
    RETURN 'A rejected record cannot be handed back for review without being revised first.';
  END IF;

  -- Provenance has to be real, whatever the state column says.
  v_provenance_ok := CASE p_entity_type
    WHEN 'claim' THEN tides_claim_provenance_ok(p_entity_id)
    WHEN 'protocol' THEN tides_protocol_provenance_ok(p_entity_id)
    ELSE true
  END;

  IF NOT v_provenance_ok THEN
    RETURN 'Not ready: the record still needs an evidence link to an exact location in a citable source.';
  END IF;

  IF NOT tides_has_check(p_entity_type, p_entity_id, v_version, 'source_check') THEN
    RETURN 'Not ready: a source check has not been recorded at this version.';
  END IF;

  -- Quality topics must carry both halves before a reviewer is asked to look.
  IF p_entity_type = 'quality_topic' THEN
    PERFORM 1 FROM quality_topics
    WHERE id = p_entity_id
      AND tides_present(what_it_proves)
      AND tides_present(what_it_does_not_prove);
    IF NOT FOUND THEN
      RETURN 'Not ready: the topic must state both what its test establishes and what it does not.';
    END IF;
  END IF;

  EXECUTE format(
    'UPDATE %I SET review_state = ''ready_for_scientific_review'' WHERE id = $1'
    || ' AND array_position(enum_range(NULL::review_state), review_state)'
    || '   < array_position(enum_range(NULL::review_state), ''ready_for_scientific_review''::review_state)',
    v_table
  )
  USING p_entity_id;

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_mark_ready_for_scientific_review(reviewable_entity_type, uuid)
  FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_mark_ready_for_scientific_review(reviewable_entity_type, uuid)
  TO authenticated, service_role;
--> statement-breakpoint
REVOKE ALL ON FUNCTION tides_has_check(reviewable_entity_type, uuid, integer, review_type)
  FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_has_check(reviewable_entity_type, uuid, integer, review_type)
  TO authenticated, service_role;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Demonstration data must be detectable after the fact
-- ---------------------------------------------------------------------------
-- The fixture is barred from production by an opt-in and a localhost check at
-- the point of loading. A restored dump bypasses both, so the flag makes it
-- findable: `npm run db:verify-production` refuses a database containing any.
CREATE OR REPLACE FUNCTION tides_demonstration_record_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT (
    (SELECT count(*) FROM profiles WHERE is_demonstration)
    + (SELECT count(*) FROM sources WHERE is_demonstration)
    + (SELECT count(*) FROM peptides WHERE is_demonstration)
    + (SELECT count(*) FROM quality_topics WHERE is_demonstration)
  )::int
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_demonstration_record_count() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_demonstration_record_count() TO authenticated, service_role;
