-- ===========================================================================
-- Publication is separated from human review
-- ===========================================================================
-- Owner decision, 24 September 2026.
--
-- Until now a record could not become public until a named human had approved
-- it. That coupled two different questions into one column's behaviour:
--
--     publication_state  — is this visible to the public?
--     review_state       — how far has a person actually checked it?
--
-- The owner's decision is that source-linked, provenance-complete content may
-- be public while accurately labelled as not yet human reviewed. What is
-- forbidden is not publishing unreviewed work; it is *implying* review that did
-- not happen.
--
-- So this migration removes human review as a condition of visibility, and
-- removes nothing else. Specifically:
--
--   KEPT, unchanged, in every gate below:
--     - provenance: an evidence link resolving to an exact location in a
--       citable source (tides_claim_provenance_ok, tides_protocol_provenance_ok)
--     - interpretation_notes, so how the evidence was read is on the record
--     - uncertainty_text on high and critical claims
--     - required summaries (simple_summary, unknowns_summary, what_it_proves,
--       what_it_does_not_prove, population_model, route, regulatory_context)
--     - the refusal to publish a rejected record
--
--   KEPT, and still enforced everywhere it was:
--     - tides_has_approved_review(). It is no longer a publication gate. It
--       remains the definition of an approved human review, and it is what the
--       review ladder, the review queue and the displayed assurance level are
--       built on. Automation still cannot satisfy it: it requires
--       performed_by = 'human' and a non-null reviewer_user_id.
--     - the reviews table, revisions, corrections, review_clocks, the five
--       review types, and role separation. No review history is touched.
--
--   REMOVED:
--     - the tides_has_approved_review() conditions inside the six publish
--       gates, and the review-state precondition in the coherence trigger.
--     - the automatic stamping of last_reviewed_at on publish. That line was
--       harmless while publication implied review; under this policy it would
--       have written a review date onto records nobody had reviewed, and the
--       site displays that field. It now moves to where it belongs: an actual
--       approved human review sets it, and nothing else does.
--
-- Deliberately NOT changed: editorial_syntheses_publish_gate. A Tides synthesis
-- is not source-linked content — it is this index's own conclusion drawn across
-- several claims. The owner decision of 21 September that compound-specific and
-- interpretive syntheses require human scientific review before publication is
-- about the index asserting its own authority, which is a different question
-- from making a sourced fact visible. It stands until the owner says otherwise.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- State coherence: rejected is still not publishable
-- ---------------------------------------------------------------------------
-- The only review state that now blocks publication is 'rejected'. A reviewer
-- who has read a record and refused it has made a judgement, and that judgement
-- must outrank a publication request. Every other rung — including
-- 'unreviewed' — describes how far checking has got, not whether the record may
-- be seen.
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
       AND NEW.review_state = 'rejected' THEN
      RAISE EXCEPTION
        'Cannot publish: this version was rejected by a reviewer.'
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
-- Publish gate: claims
-- ---------------------------------------------------------------------------
-- Provenance is untouched. A claim still cannot be published unless it resolves
-- to an exact location in a citable source, records how the evidence was read,
-- and — where it is high or critical importance — states what remains
-- uncertain. Editorial non-evidentiary copy remains exempt from provenance,
-- and is now exempt from review as well, since review is no longer a gate.
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


-- ---------------------------------------------------------------------------
-- Publish gate: protocols
-- ---------------------------------------------------------------------------
-- Every protection that keeps a regimen attributable is kept: a citable source
-- at an exact location, the population it was reported in so a preclinical
-- regimen can never read as a human instruction, an administration route, and
-- the regulatory context that says whether this is an approved-label
-- instruction, a study regimen, or practitioner practice.
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


-- ---------------------------------------------------------------------------
-- Publish gate: peptide records
-- ---------------------------------------------------------------------------
-- Requiring `unknowns_summary` is deliberate and is kept. A compound page that
-- cannot say what is not known is not ready to be read.
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


-- ---------------------------------------------------------------------------
-- Publish gate: quality topics
-- ---------------------------------------------------------------------------
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


-- ---------------------------------------------------------------------------
-- Publish gate: peptide-route evidence
-- ---------------------------------------------------------------------------
-- Still one molecule, one source, one exact location. The guard against the
-- generic route claim is provenance, and it is kept in full.
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


-- ---------------------------------------------------------------------------
-- Publish gate: regulatory status
-- ---------------------------------------------------------------------------
-- Regulatory status is time-sensitive and jurisdiction-specific. An undated
-- status is still not a status, and a status without an authority source still
-- cannot be published.
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


-- ---------------------------------------------------------------------------
-- last_reviewed_at now means what it says
-- ---------------------------------------------------------------------------
-- Publication no longer writes this field. An approved human review at the
-- record's current version does, and nothing else does. A record that has never
-- been reviewed therefore carries a null here, and the site renders that as
-- "not recorded" rather than inventing a date.
--
-- The version check that was already here is what keeps it honest: a review of
-- a superseded version says nothing about the current one, and does not stamp
-- it.
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

  -- Only a person's approval sets the review date. Automation advances the
  -- ladder for bookkeeping but must never be able to write a date that the
  -- public page presents as "last reviewed".
  IF NEW.performed_by = 'human' AND NEW.reviewer_user_id IS NOT NULL THEN
    EXECUTE format('UPDATE %I SET last_reviewed_at = now() WHERE id = $1', v_table)
    USING NEW.entity_id;
  END IF;

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- The compound record publishes its review state
-- ---------------------------------------------------------------------------
-- Public and reviewed are now two different facts, so the public relation has
-- to carry both. Without this the compound page could not tell a reader how far
-- the record has been checked, and a page that cannot say that is exactly the
-- page that implies review it does not have.
CREATE OR REPLACE VIEW public_v_peptides WITH (security_barrier = true) AS
  SELECT id, peptide_key, canonical_name, slug, compound_type_key,
         primary_category_key, natural_or_synthetic, molecular_description,
         sequence, short_description, simple_summary, practitioner_summary,
         unknowns_summary, version, published_at, last_reviewed_at,
         evidence_cutoff_at, needs_update, review_state
    FROM peptides
   WHERE publication_state = 'published'::publication_state_value
     AND NOT is_demonstration;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Demonstration protocols are not public
-- ---------------------------------------------------------------------------
-- Found during the 24 September baseline: `protocols` has no is_demonstration
-- column of its own, and these two views filtered on publication state alone.
-- The demonstration compound's protocols were therefore reachable through both
-- public protocol surfaces. Migration 0021 excluded demonstration records
-- everywhere it could see them; it could not see these, because the flag lives
-- on the parent.
--
-- NOT EXISTS rather than a join: a combination protocol may have no peptide_id,
-- and it must not be dropped from the register for that reason.
CREATE OR REPLACE VIEW public_v_protocol_practitioner WITH (security_barrier = true) AS
  SELECT id, protocol_key, peptide_id, combination_name, objective_context,
         population_model, route_key, formulation, amount_reported, amount_unit,
         frequency_text, timing_text, duration_text, cycle_text, titration_text,
         combinations_text, monitoring_text, contraindications_text,
         safety_notes, adverse_events_text, outcome_context, regulatory_context,
         evidence_type_key, version, published_at, last_reviewed_at, review_state
  FROM protocols p
  WHERE p.publication_state = 'published'
    AND NOT EXISTS (
      SELECT 1 FROM peptides pe
       WHERE pe.id = p.peptide_id AND pe.is_demonstration
    );
--> statement-breakpoint

CREATE OR REPLACE VIEW public_v_protocol_simple WITH (security_barrier = true) AS
  SELECT p.id,
         p.protocol_key,
         p.peptide_id,
         p.combination_name,
         p.objective_context,
         p.population_model,
         p.route_key,
         p.regulatory_context,
         p.evidence_type_key,
         p.published_at,
         (p.monitoring_text IS NOT NULL) AS has_monitoring_guidance,
         (p.contraindications_text IS NOT NULL OR p.safety_notes IS NOT NULL)
           AS has_safety_guidance,
         p.review_state
  FROM protocols p
  WHERE p.publication_state = 'published'
    AND p.patient_visibility
    AND NOT EXISTS (
      SELECT 1 FROM peptides pe
       WHERE pe.id = p.peptide_id AND pe.is_demonstration
    );
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- A material edit clears the review date as well as the review state
-- ---------------------------------------------------------------------------
-- Found while testing the change above, and it is the one place the separation
-- could have produced exactly the lie it exists to prevent.
--
-- A material edit already bumped the version and dropped `review_state` back to
-- 'captured', because the approvals were recorded against the words a reviewer
-- actually read. It left `last_reviewed_at` alone. Under the old policy that did
-- not matter: the record failed its own gate a moment later and was withdrawn,
-- so nobody saw the stale date.
--
-- Publication no longer depends on those approvals, so the record now stays
-- public through the edit — correctly, since provenance is untouched. But it
-- would have kept displaying "last reviewed" on a version no person approved.
-- The date has to go when the approvals it came from stop applying.
--
-- Everything else about this function is unchanged.
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

    /*
     * And the date with it. `last_reviewed_at` is what the page prints as
     * "last reviewed"; leaving it behind would have the record claim a check of
     * wording nobody checked.
     *
     * Guarded, because this trigger is attached to thirteen tables and three of
     * them — compound_identity_claims, literature_screens and
     * replication_assessments — have no such column. An unconditional
     * assignment made a content edit on those tables fail outright. The guard
     * reads the record rather than naming the tables, so it stays correct as
     * the schema grows.
     */
    IF to_jsonb(NEW) ? 'last_reviewed_at' THEN
      NEW.last_reviewed_at := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint
