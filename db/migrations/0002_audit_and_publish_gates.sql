-- ===========================================================================
-- The Tides Index — audit trail and publish gates.
--
-- These rules live in the database, not only in application code, because the
-- guarantee they provide must hold for every writer: the web application, a
-- seeding script, a future import job, or an editor with a SQL console.
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
  -- Columns whose change is not, by itself, a content edit.
  k_ignored text[] := ARRAY[
    'version', 'created_at', 'updated_at', 'published_at', 'last_reviewed_at',
    'workflow_status', 'status'
  ];
BEGIN
  NEW.updated_at := now();

  IF (to_jsonb(OLD) - k_ignored) IS DISTINCT FROM (to_jsonb(NEW) - k_ignored) THEN
    NEW.version := OLD.version + 1;
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
    previous_workflow_status, new_workflow_status, changed_by
  )
  VALUES (
    v_entity_type,
    OLD.id,
    coalesce((v_old ->> 'version')::integer, 1),
    'changed: ' || array_to_string(v_changed, ', '),
    v_old,
    nullif(v_old ->> 'workflow_status', '')::workflow_status,
    nullif(v_new ->> 'workflow_status', '')::workflow_status,
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
-- Publish gate: claims
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_claim_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NEW.is_editorial_non_evidentiary THEN
    -- Editorial, non-evidentiary copy is exempt from provenance but not from
    -- review (ACCEPTANCE_TESTS.md A.1).
    IF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'scientific') THEN
      RAISE EXCEPTION
        'Claim % cannot be published: editorial copy still requires an approved scientific review at version %.',
        NEW.claim_key, NEW.version
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.published_at := coalesce(NEW.published_at, now());
    RETURN NEW;
  END IF;

  IF NOT tides_claim_provenance_ok(NEW.id) THEN
    RAISE EXCEPTION
      'Claim % cannot be published: it needs at least one evidence link to an exact location in a citable source.',
      NEW.claim_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_present(NEW.interpretation_notes) THEN
    RAISE EXCEPTION
      'Claim % cannot be published: interpretation_notes must record how the evidence was read.',
      NEW.claim_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'source_check') THEN
    RAISE EXCEPTION
      'Claim % cannot be published: an approved source check is required at version %.',
      NEW.claim_key, NEW.version
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'scientific') THEN
    RAISE EXCEPTION
      'Claim % cannot be published: an approved scientific review is required at version %.',
      NEW.claim_key, NEW.version
      USING ERRCODE = 'check_violation';
  END IF;

  -- High-impact claims carry the stricter gate: uncertainty must be stated and
  -- compliance must have seen it (MASTER_BUILD_SPEC.md §12).
  IF NEW.importance IN ('high', 'critical') THEN
    IF NOT tides_present(NEW.uncertainty_text) THEN
      RAISE EXCEPTION
        'Claim % cannot be published: a %-importance claim must state what remains uncertain.',
        NEW.claim_key, NEW.importance
        USING ERRCODE = 'check_violation';
    END IF;

    IF NOT tides_has_approved_review('claim', NEW.id, NEW.version, 'compliance') THEN
      RAISE EXCEPTION
        'Claim % cannot be published: a %-importance claim requires an approved compliance review at version %.',
        NEW.claim_key, NEW.importance, NEW.version
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
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
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NOT tides_protocol_provenance_ok(NEW.id) THEN
    RAISE EXCEPTION
      'Protocol % cannot be published: it needs a citable source and an exact source location.',
      NEW.protocol_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_present(NEW.population_model) THEN
    RAISE EXCEPTION
      'Protocol % cannot be published: population_model is required so a preclinical regimen can never read as a human instruction.',
      NEW.protocol_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.route_key IS NULL THEN
    RAISE EXCEPTION
      'Protocol % cannot be published: an administration route is required.',
      NEW.protocol_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_present(NEW.regulatory_context) THEN
    RAISE EXCEPTION
      'Protocol % cannot be published: regulatory_context must state whether this is an approved-label instruction, a study regimen, or practitioner practice.',
      NEW.protocol_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'source_check') THEN
    RAISE EXCEPTION 'Protocol % cannot be published: approved source check required at version %.',
      NEW.protocol_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'scientific') THEN
    RAISE EXCEPTION 'Protocol % cannot be published: approved scientific review required at version %.',
      NEW.protocol_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'clinical') THEN
    RAISE EXCEPTION 'Protocol % cannot be published: approved clinical review required at version %.',
      NEW.protocol_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('protocol', NEW.id, NEW.version, 'compliance') THEN
    RAISE EXCEPTION 'Protocol % cannot be published: approved compliance review required at version %.',
      NEW.protocol_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
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
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NOT tides_present(NEW.simple_summary) THEN
    RAISE EXCEPTION 'Peptide % cannot be published: simple_summary is required.',
      NEW.peptide_key USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_present(NEW.unknowns_summary) THEN
    RAISE EXCEPTION
      'Peptide % cannot be published: unknowns_summary must state what is not established.',
      NEW.peptide_key USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('peptide', NEW.id, NEW.version, 'scientific') THEN
    RAISE EXCEPTION 'Peptide % cannot be published: approved scientific review required at version %.',
      NEW.peptide_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('peptide', NEW.id, NEW.version, 'compliance') THEN
    RAISE EXCEPTION 'Peptide % cannot be published: approved compliance review required at version %.',
      NEW.peptide_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
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
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NOT tides_present(NEW.what_it_proves) OR NOT tides_present(NEW.what_it_does_not_prove) THEN
    RAISE EXCEPTION
      'Quality topic % cannot be published: both what_it_proves and what_it_does_not_prove are required.',
      NEW.quality_key USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('quality_topic', NEW.id, NEW.version, 'scientific') THEN
    RAISE EXCEPTION 'Quality topic % cannot be published: approved scientific review required at version %.',
      NEW.quality_key, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
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
  v_citable boolean;
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NEW.source_location_id IS NULL THEN
    RAISE EXCEPTION
      'Peptide-route record % cannot be published: an exact source location is required.',
      NEW.id USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.is_citable INTO v_citable FROM sources s WHERE s.id = NEW.source_id;
  IF NOT coalesce(v_citable, false) THEN
    RAISE EXCEPTION
      'Peptide-route record % cannot be published: its source is not citable.',
      NEW.id USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_present(NEW.population_model) THEN
    RAISE EXCEPTION
      'Peptide-route record % cannot be published: population_model is required so animal route evidence is never read as human evidence.',
      NEW.id USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('peptide_route', NEW.id, NEW.version, 'scientific') THEN
    RAISE EXCEPTION 'Peptide-route record % cannot be published: approved scientific review required at version %.',
      NEW.id, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
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
BEGIN
  IF NEW.workflow_status <> 'published' THEN
    RETURN NEW;
  END IF;

  IF NEW.source_id IS NULL THEN
    RAISE EXCEPTION
      'Regulatory status % cannot be published: an authority source is required.',
      NEW.id USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.checked_at > current_date THEN
    RAISE EXCEPTION
      'Regulatory status % cannot be published: checked_at is in the future.',
      NEW.id USING ERRCODE = 'check_violation';
  END IF;

  IF NOT tides_has_approved_review('regulatory_status', NEW.id, NEW.version, 'compliance') THEN
    RAISE EXCEPTION 'Regulatory status % cannot be published: approved compliance review required at version %.',
      NEW.id, NEW.version USING ERRCODE = 'check_violation';
  END IF;

  NEW.published_at := coalesce(NEW.published_at, now());
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Provenance cannot be removed from under published content
-- ---------------------------------------------------------------------------
-- Deleting or blanking the evidence that justified publication would otherwise
-- leave a published claim standing with nothing behind it. Instead of blocking
-- the edit, the dependent record is demoted to `needs_update` so it leaves the
-- public site immediately and lands in the editorial queue.
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
    SET workflow_status = 'needs_update'
    WHERE id = v_claim_id
      AND workflow_status = 'published';
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
    SET workflow_status = 'needs_update'
    WHERE id = v_protocol_id
      AND workflow_status = 'published';
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
BEGIN
  IF OLD.is_citable AND NOT NEW.is_citable THEN
    UPDATE claims c
    SET workflow_status = 'needs_update'
    WHERE c.workflow_status = 'published'
      AND NOT tides_claim_provenance_ok(c.id);

    UPDATE protocols p
    SET workflow_status = 'needs_update'
    WHERE p.workflow_status = 'published'
      AND NOT tides_protocol_provenance_ok(p.id);

    UPDATE peptide_routes pr
    SET workflow_status = 'needs_update'
    WHERE pr.workflow_status = 'published'
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
-- ===========================================================================

-- Versioned, review-bearing entities.
CREATE TRIGGER peptides_touch BEFORE UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER peptides_publish_gate BEFORE INSERT OR UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_peptide_publish_gate();
--> statement-breakpoint
CREATE TRIGGER peptides_revision AFTER UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('peptide');
--> statement-breakpoint

CREATE TRIGGER claims_touch BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER claims_publish_gate BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_claim_publish_gate();
--> statement-breakpoint
CREATE TRIGGER claims_revision AFTER UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('claim');
--> statement-breakpoint

CREATE TRIGGER protocols_touch BEFORE UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER protocols_publish_gate BEFORE INSERT OR UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_protocol_publish_gate();
--> statement-breakpoint
CREATE TRIGGER protocols_revision AFTER UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('protocol');
--> statement-breakpoint

CREATE TRIGGER quality_topics_touch BEFORE UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER quality_topics_publish_gate BEFORE INSERT OR UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_quality_topic_publish_gate();
--> statement-breakpoint
CREATE TRIGGER quality_topics_revision AFTER UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('quality_topic');
--> statement-breakpoint

CREATE TRIGGER peptide_routes_touch BEFORE UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_publish_gate BEFORE INSERT OR UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_peptide_route_publish_gate();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_revision AFTER UPDATE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('peptide_route');
--> statement-breakpoint

CREATE TRIGGER regulatory_statuses_touch BEFORE UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER regulatory_statuses_publish_gate BEFORE INSERT OR UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_regulatory_status_publish_gate();
--> statement-breakpoint
CREATE TRIGGER regulatory_statuses_revision AFTER UPDATE ON regulatory_statuses
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('regulatory_status');
--> statement-breakpoint

CREATE TRIGGER disagreements_touch BEFORE UPDATE ON disagreements
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER disagreements_revision AFTER UPDATE ON disagreements
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('disagreement');
--> statement-breakpoint

CREATE TRIGGER publications_touch BEFORE UPDATE ON publications
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
