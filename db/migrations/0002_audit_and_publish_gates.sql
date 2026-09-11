-- ===========================================================================
-- The Tides Index — audit trail, state coherence and publish gates.
--
-- These rules live in the database, not only in application code, because the
-- guarantee they provide must hold for every writer: the web application, a
-- seeding script, a future import job, or an editor with a SQL console.
--
-- Records carry two independent states (MASTER_BUILD_SPEC.md §10):
--
--   review_state       how far editorial has checked it
--   publication_state  whether it is currently public
--
-- plus a `needs_update` flag that is orthogonal to both, so a published record
-- can be flagged for attention while staying live, and a withdrawn record can
-- be flagged while it is off the site. Keeping the dimensions separate is what
-- makes "scientifically reviewed but unpublished", "published but needs
-- update", and "previously published, now superseded" all representable.
--
-- Separate dimensions invite disagreement, so coherence is enforced here rather
-- than trusted: a record cannot be published from a state that does not permit
-- it, and a rejected record cannot stay public.
--
-- Governing documents:
--   MASTER_BUILD_SPEC.md §7 (provenance standard), §12 (publish gates)
--   EDITORIAL_POLICY.md, ACCEPTANCE_TESTS.md sections A and F
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Current actor
-- ---------------------------------------------------------------------------
-- Resolves the acting user. Prefers the Supabase Auth JWT subject when present;
-- falls back to a session GUC so server-side jobs and tests can attribute
-- their writes.
CREATE OR REPLACE FUNCTION tides_current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $fn$
DECLARE
  v_id uuid;
BEGIN
  BEGIN
    v_id := nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
  EXCEPTION WHEN others THEN
    v_id := NULL;
  END;

  IF v_id IS NULL THEN
    BEGIN
      v_id := nullif(current_setting('app.current_user_id', true), '')::uuid;
    EXCEPTION WHEN others THEN
      v_id := NULL;
    END;
  END IF;

  RETURN v_id;
END;
$fn$;
--> statement-breakpoint

-- Role of the acting user, or NULL when the actor is not active staff.
CREATE OR REPLACE FUNCTION tides_current_staff_role()
RETURNS staff_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT p.role
  FROM profiles p
  WHERE p.user_id = tides_current_user_id()
    AND p.is_active
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_has_role(VARIADIC p_roles staff_role[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $fn$
  SELECT tides_current_staff_role() = ANY(p_roles)
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- updated_at / version maintenance
-- ---------------------------------------------------------------------------
-- Any material edit bumps `version`. That matters beyond bookkeeping: reviews
-- are recorded against a specific version, so rewriting a record invalidates
-- its approvals and it must pass the gates again. Review does not survive
-- rewriting.
CREATE OR REPLACE FUNCTION tides_touch_and_version()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  -- Columns whose change is not, by itself, a content edit. State transitions
  -- and their timestamps are workflow, not authorship.
  k_ignored text[] := ARRAY[
    'version', 'created_at', 'updated_at', 'published_at', 'last_reviewed_at',
    'withdrawn_at', 'superseded_at', 'review_state', 'publication_state',
    'editorial_state', 'needs_update', 'needs_update_reason', 'status'
  ];
BEGIN
  NEW.updated_at := now();

  IF (to_jsonb(OLD) - k_ignored) IS DISTINCT FROM (to_jsonb(NEW) - k_ignored) THEN
    NEW.version := OLD.version + 1;

    -- Approvals are recorded against a version, so a material edit strands
    -- them. The verification state has to fall back to match: the text a
    -- reviewer approved is not the text that is now stored.
    IF NEW.review_state NOT IN ('unreviewed', 'rejected') THEN
      NEW.review_state := 'captured';
    END IF;

    -- A live record edited in place will fail its own publish gate a moment
    -- later, because the approvals it was published on no longer match its
    -- version. The gate withdraws it and records why. That is deliberate:
    -- content nobody has reviewed in its current wording should not stay
    -- public, however small the edit looked.
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Revision history
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so the audit row is always written regardless of the
-- caller's privileges. History is not optional.
CREATE OR REPLACE FUNCTION tides_write_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_entity_type reviewable_entity_type := TG_ARGV[0]::reviewable_entity_type;
  v_old jsonb := to_jsonb(OLD);
  v_new jsonb := to_jsonb(NEW);
  v_changed text[];
BEGIN
  SELECT coalesce(array_agg(n.key ORDER BY n.key), ARRAY[]::text[])
  INTO v_changed
  FROM jsonb_each(v_new) AS n(key, value)
  WHERE n.value IS DISTINCT FROM (v_old -> n.key)
    AND n.key <> 'updated_at';

  IF array_length(v_changed, 1) IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO revisions (
    entity_type, entity_id, version, diff_summary, snapshot,
    previous_editorial_state, new_editorial_state, changed_by
  )
  VALUES (
    v_entity_type,
    OLD.id,
    coalesce((v_old ->> 'version')::integer, 1),
    'changed: ' || array_to_string(v_changed, ', '),
    v_old,
    v_old ->> 'editorial_state',
    v_new ->> 'editorial_state',
    tides_current_user_id()
  );

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Review lookup
-- ---------------------------------------------------------------------------
-- An approved review counts only when it names a human reviewer and was
-- recorded against the version currently on the row. This is the mechanism
-- behind "no autonomous AI publishing" (docs/LOCKED_DECISIONS.md #20): a gate
-- cannot be satisfied without a row attributable to a person.
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
      AND r.reviewer_user_id IS NOT NULL
  )
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Provenance predicates
-- ---------------------------------------------------------------------------
-- Provenance is satisfied only by a citable source AND an exact location within
-- it. A source marked `replace` or `exclude` in SOURCE_MANIFEST.json is not
-- citable (sources.is_citable is generated from qc_status), which is how
-- ACCEPTANCE_TESTS.md A.4 becomes enforced rather than merely intended.
CREATE OR REPLACE FUNCTION tides_claim_provenance_ok(p_claim_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM claim_evidence ce
    JOIN sources s ON s.id = ce.source_id
    WHERE ce.claim_id = p_claim_id
      AND ce.source_location_id IS NOT NULL
      AND s.is_citable
  )
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_protocol_provenance_ok(p_protocol_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM protocol_sources ps
    JOIN sources s ON s.id = ps.source_id
    WHERE ps.protocol_id = p_protocol_id
      AND ps.source_location_id IS NOT NULL
      AND s.is_citable
  )
$fn$;
--> statement-breakpoint

-- Treats NULL and whitespace-only as absent. "Left blank" is not an answer to
-- "what remains uncertain".
CREATE OR REPLACE FUNCTION tides_present(p_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT p_text IS NOT NULL AND btrim(p_text) <> ''
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- State coherence
-- ---------------------------------------------------------------------------
-- Runs before every publish gate. Keeps the two dimensions independent without
-- letting them contradict each other, and maintains the state timestamps so
-- they cannot be set by hand to something the state does not support.
CREATE OR REPLACE FUNCTION tides_enforce_state_coherence()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  -- A rejected record is not public, whatever else was submitted.
  IF NEW.review_state = 'rejected' AND NEW.publication_state = 'published' THEN
    NEW.publication_state := 'withdrawn';
  END IF;

  IF NEW.publication_state = 'published' THEN
    -- Checked on entry only. A record already public that has since been
    -- edited stays public and flagged; requiring the check on every write
    -- would make routine edits withdraw pages.
    IF (TG_OP = 'INSERT' OR OLD.publication_state <> 'published')
       AND NEW.review_state IN ('unreviewed', 'captured', 'rejected') THEN
      RAISE EXCEPTION
        'Cannot publish: verification state is %, so no approved review exists at this version. Record the required reviews first.',
        NEW.review_state
        USING ERRCODE = 'check_violation';
    END IF;

    NEW.published_at := coalesce(NEW.published_at, now());
    NEW.withdrawn_at := NULL;
  END IF;

  IF NEW.publication_state = 'withdrawn'
     AND (TG_OP = 'INSERT' OR OLD.publication_state <> 'withdrawn') THEN
    NEW.withdrawn_at := now();
  END IF;

  IF NEW.publication_state = 'superseded'
     AND (TG_OP = 'INSERT' OR OLD.publication_state <> 'superseded') THEN
    NEW.superseded_at := now();
  END IF;

  -- A flag needs a reason. Silent flags accumulate and stop meaning anything.
  IF NEW.needs_update AND NOT tides_present(NEW.needs_update_reason) THEN
    NEW.needs_update_reason := 'Flagged for update; no reason recorded.';
  END IF;

  IF NOT NEW.needs_update THEN
    NEW.needs_update_reason := NULL;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- What a gate does with a problem
-- ---------------------------------------------------------------------------
-- Gates collect a problem rather than raising immediately, because the right
-- response depends on which way the record is moving.
--
-- Entering publication with an unmet requirement is a refusal: the editor asked
-- for something the rules do not allow, and should be told so.
--
-- Editing content that is already live is different. Refusing the write would
-- mean published content could never be corrected without first being pulled,
-- which pushes editors toward leaving errors in place. Instead the record is
-- withdrawn and flagged with the reason. The invariant that published content
-- satisfies its gate holds either way; only the ergonomics differ.
CREATE OR REPLACE FUNCTION tides_gate_outcome(
  p_problem text,
  p_entering_publication boolean
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $fn$
BEGIN
  IF p_problem IS NULL THEN
    RETURN false;
  END IF;

  IF p_entering_publication THEN
    RAISE EXCEPTION '%', p_problem USING ERRCODE = 'check_violation';
  END IF;

  RETURN true;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: claims
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_claim_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  IF NEW.is_editorial_non_evidentiary THEN
    -- Editorial, non-evidentiary copy is exempt from provenance but not from
    -- review (ACCEPTANCE_TESTS.md A.1).
    IF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'scientific') THEN
      v_problem := format(
        'Claim %s cannot be published: editorial copy still requires an approved scientific review at version %s.',
        NEW.claim_key, NEW.version);
    END IF;
  ELSIF NOT tides_claim_provenance_ok(NEW.id) THEN
    v_problem := format(
      'Claim %s cannot be published: it needs at least one evidence link to an exact location in a citable source.',
      NEW.claim_key);
  ELSIF NOT tides_present(NEW.interpretation_notes) THEN
    v_problem := format(
      'Claim %s cannot be published: interpretation_notes must record how the evidence was read.',
      NEW.claim_key);
  ELSIF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'source_check') THEN
    v_problem := format(
      'Claim %s cannot be published: an approved source check is required at version %s.',
      NEW.claim_key, NEW.version);
  ELSIF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'scientific') THEN
    v_problem := format(
      'Claim %s cannot be published: an approved scientific review is required at version %s.',
      NEW.claim_key, NEW.version);
  ELSIF NEW.importance IN ('high', 'critical')
        AND NOT tides_present(NEW.uncertainty_text) THEN
    -- High-impact claims carry the stricter gate: uncertainty must be stated
    -- and compliance must have seen it (MASTER_BUILD_SPEC.md section 12).
    v_problem := format(
      'Claim %s cannot be published: a %s-importance claim must state what remains uncertain.',
      NEW.claim_key, NEW.importance);
  ELSIF NEW.importance IN ('high', 'critical')
        AND NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'compliance') THEN
    v_problem := format(
      'Claim %s cannot be published: a %s-importance claim requires an approved compliance review at version %s.',
      NEW.claim_key, NEW.importance, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: protocols
-- ---------------------------------------------------------------------------
-- The strictest gate in the system. A regimen rendered without population,
-- route, regulatory framing, provenance and four approvals is precisely the
-- failure mode this platform exists to prevent.
CREATE OR REPLACE FUNCTION tides_protocol_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  IF NOT tides_protocol_provenance_ok(NEW.id) THEN
    v_problem := format(
      'Protocol %s cannot be published: it needs a citable source and an exact source location.',
      NEW.protocol_key);
  ELSIF NOT tides_present(NEW.population_model) THEN
    v_problem := format(
      'Protocol %s cannot be published: population_model is required so a preclinical regimen can never read as a human instruction.',
      NEW.protocol_key);
  ELSIF NEW.route_key IS NULL THEN
    v_problem := format(
      'Protocol %s cannot be published: an administration route is required.',
      NEW.protocol_key);
  ELSIF NOT tides_present(NEW.regulatory_context) THEN
    v_problem := format(
      'Protocol %s cannot be published: regulatory_context must state whether this is an approved-label instruction, a study regimen, or practitioner practice.',
      NEW.protocol_key);
  ELSIF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'source_check') THEN
    v_problem := format('Protocol %s cannot be published: approved source check required at version %s.',
      NEW.protocol_key, NEW.version);
  ELSIF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'scientific') THEN
    v_problem := format('Protocol %s cannot be published: approved scientific review required at version %s.',
      NEW.protocol_key, NEW.version);
  ELSIF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'clinical') THEN
    v_problem := format('Protocol %s cannot be published: approved clinical review required at version %s.',
      NEW.protocol_key, NEW.version);
  ELSIF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'compliance') THEN
    v_problem := format('Protocol %s cannot be published: approved compliance review required at version %s.',
      NEW.protocol_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: peptide records
-- ---------------------------------------------------------------------------
-- Requiring `unknowns_summary` is deliberate. A compound page that cannot say
-- what is not known is not ready to be read (CLAUDE.md: "unknown", "not
-- established" and "conflicting sources" are valid outputs).
CREATE OR REPLACE FUNCTION tides_peptide_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  IF NOT tides_present(NEW.simple_summary) THEN
    v_problem := format('Peptide %s cannot be published: simple_summary is required.', NEW.peptide_key);
  ELSIF NOT tides_present(NEW.unknowns_summary) THEN
    v_problem := format(
      'Peptide %s cannot be published: unknowns_summary must state what is not established.',
      NEW.peptide_key);
  ELSIF NOT tides_has_approved_review('peptide', NEW.id, NEW.version, 'scientific') THEN
    v_problem := format('Peptide %s cannot be published: approved scientific review required at version %s.',
      NEW.peptide_key, NEW.version);
  ELSIF NOT tides_has_approved_review('peptide', NEW.id, NEW.version, 'compliance') THEN
    v_problem := format('Peptide %s cannot be published: approved compliance review required at version %s.',
      NEW.peptide_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: quality topics
-- ---------------------------------------------------------------------------
-- Both halves are mandatory. The anchor message of the quality section — a high
-- HPLC purity result does not by itself establish identity, vial content,
-- sterility or endotoxin status — only survives if every explainer is forced to
-- state what it cannot prove.
CREATE OR REPLACE FUNCTION tides_quality_topic_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  IF NOT tides_present(NEW.what_it_proves) OR NOT tides_present(NEW.what_it_does_not_prove) THEN
    v_problem := format(
      'Quality topic %s cannot be published: both what_it_proves and what_it_does_not_prove are required.',
      NEW.quality_key);
  ELSIF NOT tides_has_approved_review('quality_topic', NEW.id, NEW.version, 'scientific') THEN
    v_problem := format('Quality topic %s cannot be published: approved scientific review required at version %s.',
      NEW.quality_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: peptide-route evidence
-- ---------------------------------------------------------------------------
-- Guards against the generic route claim. A published route record is always
-- one molecule, one source, one exact location (verification issue V-005).
CREATE OR REPLACE FUNCTION tides_peptide_route_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
  v_citable boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  SELECT s.is_citable INTO v_citable FROM sources s WHERE s.id = NEW.source_id;

  IF NEW.source_location_id IS NULL THEN
    v_problem := format(
      'Peptide-route record %s cannot be published: an exact source location is required.', NEW.id);
  ELSIF NOT coalesce(v_citable, false) THEN
    v_problem := format(
      'Peptide-route record %s cannot be published: its source is not citable.', NEW.id);
  ELSIF NOT tides_present(NEW.population_model) THEN
    v_problem := format(
      'Peptide-route record %s cannot be published: population_model is required so animal route evidence is never read as human evidence.',
      NEW.id);
  ELSIF NOT tides_has_approved_review('peptide_route', NEW.id, NEW.version, 'scientific') THEN
    v_problem := format('Peptide-route record %s cannot be published: approved scientific review required at version %s.',
      NEW.id, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Publish gate: regulatory status
-- ---------------------------------------------------------------------------
-- Regulatory status is time-sensitive and jurisdiction-specific. An undated
-- status is not a status.
CREATE OR REPLACE FUNCTION tides_regulatory_status_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_problem text;
  v_entering boolean;
BEGIN
  IF NEW.publication_state <> 'published' THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state <> 'published');

  IF NEW.source_id IS NULL THEN
    v_problem := format(
      'Regulatory status %s cannot be published: an authority source is required.', NEW.id);
  ELSIF NEW.checked_at > current_date THEN
    v_problem := format(
      'Regulatory status %s cannot be published: checked_at is in the future.', NEW.id);
  ELSIF NOT tides_has_approved_review('regulatory_status', NEW.id, NEW.version, 'compliance') THEN
    v_problem := format('Regulatory status %s cannot be published: approved compliance review required at version %s.',
      NEW.id, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  NEW.last_reviewed_at := coalesce(NEW.last_reviewed_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Verification state follows the review record
-- ---------------------------------------------------------------------------
-- `review_state` is not maintained by hand. Recording an approved review at the
-- record's current version advances it; it never regresses here, and a material
-- edit resets it in tides_touch_and_version. Deriving it from the reviews that
-- actually exist is what stops the displayed verification state from drifting
-- away from the evidence for it.
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

CREATE TRIGGER reviews_advance_state AFTER INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION tides_advance_review_state();
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Provenance cannot be removed from under published content
-- ---------------------------------------------------------------------------
-- Deleting or blanking the evidence that justified publication would otherwise
-- leave a published claim standing with nothing behind it. The dependent record
-- is withdrawn — it leaves the public site immediately — and flagged, so it
-- lands in the editorial queue with the reason attached.
CREATE OR REPLACE FUNCTION tides_guard_claim_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_claim_id uuid := coalesce(OLD.claim_id, NEW.claim_id);
BEGIN
  IF NOT tides_claim_provenance_ok(v_claim_id) THEN
    UPDATE claims
    SET publication_state = 'withdrawn',
        needs_update = true,
        needs_update_reason = 'Withdrawn automatically: no evidence link to an exact location in a citable source remains.'
    WHERE id = v_claim_id
      AND publication_state = 'published';
  END IF;
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_guard_protocol_provenance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_protocol_id uuid := coalesce(OLD.protocol_id, NEW.protocol_id);
BEGIN
  IF NOT tides_protocol_provenance_ok(v_protocol_id) THEN
    UPDATE protocols
    SET publication_state = 'withdrawn',
        needs_update = true,
        needs_update_reason = 'Withdrawn automatically: no citable source with an exact location remains.'
    WHERE id = v_protocol_id
      AND publication_state = 'published';
  END IF;
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

-- When a source stops being citable — a book is found to be corrupted, a copy
-- is marked `replace` — everything published on its authority is withdrawn from
-- the public site and queued for re-review. Quality state propagates.
CREATE OR REPLACE FUNCTION tides_source_citability_changed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_reason text := format(
    'Withdrawn automatically: source %s is no longer citable (%s).',
    NEW.source_key, NEW.qc_status
  );
BEGIN
  IF OLD.is_citable AND NOT NEW.is_citable THEN
    UPDATE claims c
    SET publication_state = 'withdrawn', needs_update = true, needs_update_reason = v_reason
    WHERE c.publication_state = 'published'
      AND NOT tides_claim_provenance_ok(c.id);

    UPDATE protocols p
    SET publication_state = 'withdrawn', needs_update = true, needs_update_reason = v_reason
    WHERE p.publication_state = 'published'
      AND NOT tides_protocol_provenance_ok(p.id);

    UPDATE peptide_routes pr
    SET publication_state = 'withdrawn', needs_update = true, needs_update_reason = v_reason
    WHERE pr.publication_state = 'published'
      AND pr.source_id = NEW.id;
  END IF;

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Copyright guard
-- ---------------------------------------------------------------------------
-- Full text may only be marked publishable for sources that are not restricted
-- copies. Belt and braces alongside the editorial rule in INGESTION_RULES.md.
ALTER TABLE sources
  ADD CONSTRAINT sources_fulltext_requires_usable_copy
  CHECK (NOT public_fulltext_allowed OR qc_status IN ('usable', 'incomplete'));
--> statement-breakpoint


-- ===========================================================================
-- Trigger wiring
--
-- Postgres fires BEFORE triggers in alphabetical order by trigger name, so the
-- names carry the sequence: touch (version), then coherence (state), then the
-- publish gate. A gate therefore always sees a settled version and state.
-- ===========================================================================

CREATE TRIGGER peptides_a_touch BEFORE UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER peptides_b_coherence BEFORE INSERT OR UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER peptides_c_publish_gate BEFORE INSERT OR UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_peptide_publish_gate();
--> statement-breakpoint
CREATE TRIGGER peptides_revision AFTER UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('peptide');
--> statement-breakpoint

CREATE TRIGGER claims_a_touch BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER claims_b_coherence BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER claims_c_publish_gate BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_claim_publish_gate();
--> statement-breakpoint
CREATE TRIGGER claims_revision AFTER UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('claim');
--> statement-breakpoint

CREATE TRIGGER protocols_a_touch BEFORE UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER protocols_b_coherence BEFORE INSERT OR UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER protocols_c_publish_gate BEFORE INSERT OR UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_protocol_publish_gate();
--> statement-breakpoint
CREATE TRIGGER protocols_revision AFTER UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('protocol');
--> statement-breakpoint

CREATE TRIGGER quality_topics_a_touch BEFORE UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER quality_topics_b_coherence BEFORE INSERT OR UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER quality_topics_c_publish_gate BEFORE INSERT OR UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_quality_topic_publish_gate();
--> statement-breakpoint
CREATE TRIGGER quality_topics_revision AFTER UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('quality_topic');
--> statement-breakpoint

CREATE TRIGGER peptide_routes_a_touch BEFORE UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_b_coherence BEFORE INSERT OR UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_c_publish_gate BEFORE INSERT OR UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_peptide_route_publish_gate();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_revision AFTER UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('peptide_route');
--> statement-breakpoint

CREATE TRIGGER regulatory_statuses_a_touch BEFORE UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER regulatory_statuses_b_coherence BEFORE INSERT OR UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER regulatory_statuses_c_publish_gate BEFORE INSERT OR UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_regulatory_status_publish_gate();
--> statement-breakpoint
CREATE TRIGGER regulatory_statuses_revision AFTER UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('regulatory_status');
--> statement-breakpoint

CREATE TRIGGER disagreements_a_touch BEFORE UPDATE ON disagreements
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER disagreements_b_coherence BEFORE INSERT OR UPDATE ON disagreements
  FOR EACH ROW EXECUTE FUNCTION tides_enforce_state_coherence();
--> statement-breakpoint
CREATE TRIGGER disagreements_revision AFTER UPDATE ON disagreements
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('disagreement');
--> statement-breakpoint

CREATE TRIGGER publications_a_touch BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER publications_revision AFTER UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('publication');
--> statement-breakpoint

CREATE TRIGGER sources_touch BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER sources_citability AFTER UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION tides_source_citability_changed();
--> statement-breakpoint

CREATE TRIGGER profiles_touch BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER claim_evidence_touch BEFORE UPDATE ON claim_evidence
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER publication_sections_touch BEFORE UPDATE ON publication_sections
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER verification_issues_touch BEFORE UPDATE ON verification_issues
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint

-- Provenance guards.
CREATE TRIGGER claim_evidence_provenance_guard
  AFTER UPDATE OR DELETE ON claim_evidence
  FOR EACH ROW EXECUTE FUNCTION tides_guard_claim_provenance();
--> statement-breakpoint
CREATE TRIGGER protocol_sources_provenance_guard
  AFTER UPDATE OR DELETE ON protocol_sources
  FOR EACH ROW EXECUTE FUNCTION tides_guard_protocol_provenance();
