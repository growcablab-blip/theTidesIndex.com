-- ===========================================================================
-- An unresolved change request blocks publication
-- ===========================================================================
-- Closes the gap found while testing migration 0029.
--
-- 0029 correctly stopped requiring a human approval before a record could be
-- seen. It did not distinguish between two very different kinds of silence:
--
--     nobody has looked at this yet          — fine, publish it, label it
--     somebody looked and said it is wrong   — not fine
--
-- `tides_withdraw_on_review` (0005) already catches the second case for a
-- record that is *already live*: a reviewer recording `changes_requested` takes
-- the page down and records why. But a record that had never been published
-- could be published straight over an open request, because the publish path
-- consulted approvals only, and 0029 removed those.
--
-- This migration adds the missing condition, and nothing else. It does not
-- reintroduce a review requirement: a record nobody has reviewed still
-- publishes. What cannot publish is a record a person has explicitly flagged
-- and whose flag has not been resolved.
--
-- Resolution is defined the same way 0005 defines it — by reviewer, most recent
-- decision wins — and scoped to the record's current version, because a
-- material edit bumps the version and is itself the answer to a request for
-- changes. A request against wording that no longer exists does not haunt the
-- record forever.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Is there an unresolved request for changes at this version?
-- ---------------------------------------------------------------------------
-- True when at least one reviewer's most recent decision on this version is
-- `changes_requested`. A later `approved` from the same reviewer resolves it; a
-- later `approved` from somebody else does not, because it does not answer the
-- objection that was raised.
--
-- `rejected` is deliberately not counted here. A rejection is handled by the
-- coherence trigger, which refuses publication outright, and conflating the two
-- would make the error message wrong.
CREATE OR REPLACE FUNCTION tides_has_open_change_request(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid,
  p_version integer
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT EXISTS (
    SELECT 1
    FROM (
      SELECT DISTINCT ON (r.reviewer_user_id) r.outcome
        FROM reviews r
       WHERE r.entity_type = p_entity_type
         AND r.entity_id = p_entity_id
         AND r.entity_version = p_version
         AND r.performed_by = 'human'
         AND r.reviewer_user_id IS NOT NULL
       ORDER BY r.reviewer_user_id, r.reviewed_at DESC, r.id DESC
    ) AS latest_per_reviewer
    WHERE latest_per_reviewer.outcome = 'changes_requested'
  )
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- The gates consult it
-- ---------------------------------------------------------------------------
-- Added as the last condition in each gate, after the provenance and content
-- checks. A record that is both unsourced and flagged should hear about the
-- provenance first: that is the problem the editor can actually fix, and the
-- reviewer's objection may well have been about exactly that.

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
    NULL;
  ELSIF NOT tides_claim_provenance_ok(NEW.id) THEN
    v_problem := format(
      'Claim %s cannot be published: it needs at least one evidence link to an exact location in a citable source.',
      NEW.claim_key);
  ELSIF NOT tides_present(NEW.interpretation_notes) THEN
    v_problem := format(
      'Claim %s cannot be published: interpretation_notes must record how the evidence was read.',
      NEW.claim_key);
  ELSIF NEW.importance IN ('high', 'critical')
        AND NOT tides_present(NEW.uncertainty_text) THEN
    v_problem := format(
      'Claim %s cannot be published: a %s-importance claim must state what remains uncertain.',
      NEW.claim_key, NEW.importance);
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('claim', NEW.id, NEW.version) THEN
    v_problem := format(
      'Claim %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.claim_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

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
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('protocol', NEW.id, NEW.version) THEN
    v_problem := format(
      'Protocol %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.protocol_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

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
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('peptide', NEW.id, NEW.version) THEN
    v_problem := format(
      'Peptide %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.peptide_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

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
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('quality_topic', NEW.id, NEW.version) THEN
    v_problem := format(
      'Quality topic %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.quality_key, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

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
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('peptide_route', NEW.id, NEW.version) THEN
    v_problem := format(
      'Peptide-route record %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.id, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

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
  END IF;

  IF v_problem IS NULL
     AND tides_has_open_change_request('regulatory_status', NEW.id, NEW.version) THEN
    v_problem := format(
      'Regulatory status %s cannot be published: a reviewer has requested changes at version %s and the request is unresolved.',
      NEW.id, NEW.version);
  END IF;

  IF tides_gate_outcome(v_problem, v_entering) THEN
    NEW.publication_state := 'withdrawn';
    NEW.needs_update := true;
    NEW.needs_update_reason := v_problem;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
