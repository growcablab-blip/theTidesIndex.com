-- Human scientific review for Tides syntheses.
--
-- Owner decision: a Tides synthesis about a compound, or one that interprets
-- mechanism, efficacy, safety, clinical meaning or a protocol, may be drafted
-- internally but is not published until a named scientific reviewer has
-- approved the exact wording that would go public. A general, foundational
-- synthesis on a learning or quality topic keeps the mechanical rules of 0027.
--
-- Nothing new is invented for the review itself. It is a row in `reviews`, the
-- same append-only record every other gate reads: bound to a version, attributed
-- to a person, with an outcome and comments. What this migration adds is:
--
--   1. an interpretation kind on each synthesis, so "general" is declared rather
--      than assumed;
--   2. a guard on `reviews`, so a synthesis review is scientific, names the
--      version it read, and comes from an active scientific reviewer — held for
--      every writer, not only through the row-level policy;
--   3. a version rule that treats publication as workflow and the claims a
--      synthesis rests on as content, so publishing cannot strand an approval
--      and relinking cannot keep one;
--   4. a publish gate and a public view that both require a standing approval at
--      the current version.
--
-- A review of an earlier version says nothing about the current one. A rejection
-- or change request at the current version outranks an approval at it.

-- --- 1. Vocabulary -----------------------------------------------------------------

-- Not used as a literal anywhere in this file: a value added by ADD VALUE cannot
-- be referenced inside the transaction that adds it. Static SQL below compares
-- `entity_type::text`; plpgsql resolves the literal at run time.
ALTER TYPE reviewable_entity_type ADD VALUE IF NOT EXISTS 'editorial_synthesis';
--> statement-breakpoint

CREATE TYPE synthesis_interpretation_kind AS ENUM (
  -- Explains how sourced facts fit together. Mechanical rules apply.
  'general',
  'mechanism',
  'efficacy',
  'safety',
  'clinical_interpretation',
  'protocol_interpretation'
);
--> statement-breakpoint

-- Existing rows are foundational explanations on learning topics: `general`.
ALTER TABLE editorial_syntheses
  ADD COLUMN interpretation_kind synthesis_interpretation_kind NOT NULL DEFAULT 'general';
--> statement-breakpoint

-- --- 2. Who must review ------------------------------------------------------------

-- Compound-specific means review, whatever kind was declared: a "general"
-- statement about one compound is still read as a statement about that compound.
-- A function rather than a generated column, because a BEFORE trigger sees a
-- generated column as null and the version rule below compares whole rows.
CREATE OR REPLACE FUNCTION tides_synthesis_requires_review(
  p_peptide_id uuid,
  p_kind synthesis_interpretation_kind
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $fn$
  SELECT p_peptide_id IS NOT NULL OR p_kind <> 'general'::synthesis_interpretation_kind
$fn$;
--> statement-breakpoint

-- The standing scientific decision on one version of a synthesis:
-- 'rejected', 'changes_requested', 'approved' or 'awaiting_scientific_review'.
-- A negative decision outranks an approval at the same version.
CREATE OR REPLACE FUNCTION tides_synthesis_review_decision(
  p_synthesis_id uuid,
  p_version integer
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_rejected boolean;
  v_changes boolean;
  v_approved boolean;
BEGIN
  SELECT coalesce(bool_or(r.outcome = 'rejected'), false),
         coalesce(bool_or(r.outcome = 'changes_requested'), false),
         coalesce(bool_or(r.outcome = 'approved'), false)
    INTO v_rejected, v_changes, v_approved
    FROM reviews r
   WHERE r.entity_type = 'editorial_synthesis'::reviewable_entity_type
     AND r.entity_id = p_synthesis_id
     AND r.entity_version = p_version
     AND r.review_type = 'scientific'
     AND r.performed_by = 'human'
     AND r.reviewer_user_id IS NOT NULL;

  RETURN CASE
    WHEN v_rejected THEN 'rejected'
    WHEN v_changes THEN 'changes_requested'
    WHEN v_approved THEN 'approved'
    ELSE 'awaiting_scientific_review'
  END;
END;
$fn$;
--> statement-breakpoint

-- What an editor sees: 'not_required' for a general, non-compound synthesis,
-- otherwise the decision standing at the current version.
CREATE OR REPLACE FUNCTION tides_synthesis_review_state(p_synthesis_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_row record;
BEGIN
  SELECT s.id, s.version, s.peptide_id, s.interpretation_kind
    INTO v_row
    FROM editorial_syntheses s
   WHERE s.id = p_synthesis_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF NOT tides_synthesis_requires_review(v_row.peptide_id, v_row.interpretation_kind) THEN
    RETURN 'not_required';
  END IF;
  RETURN tides_synthesis_review_decision(v_row.id, v_row.version);
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_synthesis_review_decision(uuid, integer) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_synthesis_review_decision(uuid, integer) TO authenticated, service_role;
--> statement-breakpoint
REVOKE ALL ON FUNCTION tides_synthesis_review_state(uuid) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_synthesis_review_state(uuid) TO authenticated, service_role;
--> statement-breakpoint

-- --- 3. The review record ----------------------------------------------------------

-- The `reviewer_insert` policy (0003) binds a reviewer to their role for
-- application sessions. A synthesis review is held tighter and for every writer:
-- scientific only, recorded by an active scientific reviewer in person, against
-- the version currently stored. An administrator can record many things; a
-- judgement about what a compound does is not one of them.
CREATE OR REPLACE FUNCTION tides_synthesis_review_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_version integer;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.entity_type::text = 'editorial_synthesis' OR NEW.entity_type::text = 'editorial_synthesis' THEN
      -- A decision is a record. Losing the reviewer's profile may null the name
      -- (ON DELETE SET NULL); anything else is a new review, not an edit.
      IF NEW.entity_type IS DISTINCT FROM OLD.entity_type
         OR NEW.entity_id IS DISTINCT FROM OLD.entity_id
         OR NEW.entity_version IS DISTINCT FROM OLD.entity_version
         OR NEW.review_type IS DISTINCT FROM OLD.review_type
         OR NEW.outcome IS DISTINCT FROM OLD.outcome
         OR NEW.performed_by IS DISTINCT FROM OLD.performed_by
         OR (NEW.reviewer_user_id IS DISTINCT FROM OLD.reviewer_user_id
             AND NEW.reviewer_user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'A synthesis review cannot be altered. Record a new review instead.'
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.entity_type::text <> 'editorial_synthesis' THEN
    RETURN NEW;
  END IF;

  IF NEW.review_type <> 'scientific' OR NEW.performed_by <> 'human' THEN
    RAISE EXCEPTION 'A Tides synthesis is reviewed by a person, scientifically; % review by % is not recorded.',
      NEW.review_type, NEW.performed_by
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles p
     WHERE p.user_id = NEW.reviewer_user_id
       AND p.is_active
       AND p.role = 'scientific_reviewer'
  ) THEN
    RAISE EXCEPTION 'A synthesis review must be recorded by an active scientific reviewer.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.version INTO v_version FROM editorial_syntheses s WHERE s.id = NEW.entity_id;
  IF v_version IS NULL THEN
    RAISE EXCEPTION 'No Tides synthesis has id %.', NEW.entity_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF NEW.entity_version <> v_version THEN
    RAISE EXCEPTION 'A synthesis review must name the version it read: stored version is %, review names %.',
      v_version, NEW.entity_version
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

CREATE TRIGGER reviews_synthesis_guard
  BEFORE INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION tides_synthesis_review_guard();
--> statement-breakpoint

-- --- 4. What counts as an edit -----------------------------------------------------

-- Publication and ordering are workflow, not authorship (as in 0002 and 0019).
-- The plain touch of 0026 counted them, which would have made publishing an
-- approved synthesis bump its version and strand the approval it rests on.
CREATE OR REPLACE FUNCTION tides_touch_and_version_synthesis()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  k_ignored text[] := ARRAY['version', 'created_at', 'updated_at', 'publication_state', 'sort_order'];
BEGIN
  NEW.updated_at := now();
  IF (to_jsonb(OLD) - k_ignored) IS DISTINCT FROM (to_jsonb(NEW) - k_ignored) THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

DROP TRIGGER editorial_syntheses_a_touch ON editorial_syntheses;
--> statement-breakpoint

CREATE TRIGGER editorial_syntheses_a_touch
  BEFORE UPDATE ON editorial_syntheses
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_synthesis();
--> statement-breakpoint

-- The claims a synthesis rests on are part of what was reviewed. Adding or
-- removing one is an edit, and bumps the version. Reordering is not.
CREATE OR REPLACE FUNCTION tides_synthesis_claims_version()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  v_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.synthesis_id ELSE NEW.synthesis_id END;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.synthesis_id = OLD.synthesis_id AND NEW.claim_id = OLD.claim_id THEN
    RETURN NULL;
  END IF;
  UPDATE editorial_syntheses SET version = version + 1 WHERE id = v_id;
  IF TG_OP = 'UPDATE' AND NEW.synthesis_id <> OLD.synthesis_id THEN
    UPDATE editorial_syntheses SET version = version + 1 WHERE id = OLD.synthesis_id;
  END IF;
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE TRIGGER editorial_synthesis_claims_version
  AFTER INSERT OR UPDATE OR DELETE ON editorial_synthesis_claims
  FOR EACH ROW EXECUTE FUNCTION tides_synthesis_claims_version();
--> statement-breakpoint

-- The wording a reviewer approved stays recoverable after it is rewritten.
CREATE TRIGGER editorial_syntheses_revision
  AFTER UPDATE ON editorial_syntheses
  FOR EACH ROW EXECUTE FUNCTION tides_write_revision('editorial_synthesis');
--> statement-breakpoint

-- --- 5. The publish gate -----------------------------------------------------------

-- Unchanged for a general synthesis: on entering publication it must rest on at
-- least two claims, all published. A synthesis that requires review must also
-- hold an approved human scientific review at its current version, and no
-- rejection or change request at it. Entering without one is refused; a live
-- synthesis that loses it (edited, relinked) is withdrawn, as 0002 does for
-- claims.
CREATE OR REPLACE FUNCTION editorial_syntheses_publish_gate() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  linked integer;
  unpublished integer;
  v_entering boolean;
  v_decision text;
  v_problem text;
BEGIN
  IF NEW.publication_state <> 'published'::publication_state_value THEN
    RETURN NEW;
  END IF;

  v_entering := (TG_OP = 'INSERT' OR OLD.publication_state IS DISTINCT FROM NEW.publication_state);

  IF v_entering THEN
    SELECT count(*),
           count(*) FILTER (WHERE c.publication_state <> 'published'::publication_state_value)
      INTO linked, unpublished
      FROM editorial_synthesis_claims l
      JOIN claims c ON c.id = l.claim_id
     WHERE l.synthesis_id = NEW.id;
    IF linked < 2 THEN
      RAISE EXCEPTION 'A Tides synthesis must rest on at least two claims; % linked.', linked
        USING ERRCODE = 'check_violation';
    END IF;
    IF unpublished > 0 THEN
      RAISE EXCEPTION 'A Tides synthesis cannot be published while % of its claims are unpublished.', unpublished
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF tides_synthesis_requires_review(NEW.peptide_id, NEW.interpretation_kind) THEN
    v_decision := tides_synthesis_review_decision(NEW.id, NEW.version);
    IF v_decision <> 'approved' THEN
      v_problem := format(
        'Tides synthesis %s cannot be published: it is compound-specific or interpretive (%s) and requires an approved human scientific review at version %s; the standing decision is %s.',
        NEW.synthesis_key, NEW.interpretation_kind, NEW.version, v_decision);
      IF tides_gate_outcome(v_problem, v_entering) THEN
        NEW.publication_state := 'withdrawn'::publication_state_value;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

-- --- 6. The public view ------------------------------------------------------------

-- Defence in depth: whatever `publication_state` says, a synthesis that requires
-- review is not public without a standing approval at its current version. The
-- review lookup is inlined so the view needs no function the public can call.
CREATE OR REPLACE VIEW public_v_editorial_syntheses WITH (security_barrier = true) AS
  SELECT s.id, s.synthesis_key, s.peptide_id, s.quality_topic_id, s.learning_topic_id,
         s.statement, s.plain_language_text, s.reasoning, s.does_not_conclude,
         s.sort_order, s.version
    FROM editorial_syntheses s
    LEFT JOIN peptides p ON p.id = s.peptide_id
    LEFT JOIN quality_topics q ON q.id = s.quality_topic_id
    LEFT JOIN learning_topics lt ON lt.id = s.learning_topic_id
   WHERE s.publication_state = 'published'::publication_state_value
     AND (p.publication_state = 'published' OR q.publication_state = 'published'
          OR lt.publication_state = 'published')
     AND (
       NOT (s.peptide_id IS NOT NULL OR s.interpretation_kind <> 'general'::synthesis_interpretation_kind)
       OR (
         EXISTS (
           SELECT 1 FROM reviews r
            WHERE r.entity_type::text = 'editorial_synthesis'
              AND r.entity_id = s.id
              AND r.entity_version = s.version
              AND r.review_type = 'scientific'
              AND r.performed_by = 'human'
              AND r.reviewer_user_id IS NOT NULL
              AND r.outcome = 'approved'
         )
         AND NOT EXISTS (
           SELECT 1 FROM reviews r
            WHERE r.entity_type::text = 'editorial_synthesis'
              AND r.entity_id = s.id
              AND r.entity_version = s.version
              AND r.review_type = 'scientific'
              AND r.outcome IN ('rejected', 'changes_requested')
         )
       )
     );
--> statement-breakpoint

-- The 0003 grant loop, repeated: a replaced view keeps its grants, but the loop
-- is idempotent and keeps this migration self-standing.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT table_name FROM information_schema.views
    WHERE table_schema = 'public' AND table_name LIKE 'public\_v\_%'
  LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO anon, authenticated', v.table_name);
  END LOOP;
END;
$$;
