CREATE TYPE "public"."evidence_gap_type" AS ENUM('source_missing', 'source_inaccessible', 'source_corrupted', 'primary_source_missing', 'no_current_reviewed_evidence', 'scope_not_established', 'numerical_threshold_not_established', 'human_evidence_not_established', 'route_not_established', 'safety_not_established', 'regulatory_status_unverified', 'terminology_unresolved', 'conflicting_sources', 'formulation_unspecified', 'chain_of_custody_unknown');--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "replaces_source_key" text;--> statement-breakpoint
ALTER TABLE "evidence_gaps" ADD COLUMN "gap_type" "evidence_gap_type" DEFAULT 'no_current_reviewed_evidence' NOT NULL;
--> statement-breakpoint

-- ===========================================================================
-- A replacement file is not the same evidence.
--
-- Seven sources in this register need replacing. When one arrives it will be a
-- different artefact: a different scan, possibly a different edition, almost
-- certainly a different pagination. Every locator resting on the old copy — "p.
-- 223, table 4-1" — was recorded against pages that no longer necessarily hold
-- what they held.
--
-- Relying on an editor to remember that is relying on the one thing that failed
-- repeatedly during C.1 to C.5. So the database notices instead: when a source's
-- file identity changes, everything resting on it is flagged for re-checking and
-- told why.
--
-- Deliberately a flag rather than a withdrawal. The claim may well still be
-- correct — the point is that nobody has confirmed it against the new copy, and
-- `needs_update` is exactly the state for "live, and somebody must look".
-- ===========================================================================

CREATE OR REPLACE FUNCTION tides_source_file_replaced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_reason text;
BEGIN
  -- Only a change of artefact counts. Editing a note or a QC status does not
  -- move a single page number.
  IF NEW.local_file_sha256 IS NOT DISTINCT FROM OLD.local_file_sha256 THEN
    RETURN NULL;
  END IF;

  -- First acquisition of a source that never had a file is not a replacement:
  -- nothing was resting on the absent copy.
  IF OLD.local_file_sha256 IS NULL THEN
    RETURN NULL;
  END IF;

  v_reason := format(
    'The held copy of %s was replaced on %s. Every locator on this record was '
    || 'recorded against the previous copy and must be re-resolved against the '
    || 'new one before this is relied on again.',
    NEW.source_key, current_date);

  UPDATE claims c
  SET needs_update = true,
      needs_update_reason = v_reason
  WHERE EXISTS (
    SELECT 1 FROM claim_evidence ce
    WHERE ce.claim_id = c.id AND ce.source_id = NEW.id
  );

  UPDATE protocols p
  SET needs_update = true,
      needs_update_reason = v_reason
  WHERE EXISTS (
    SELECT 1 FROM protocol_sources ps
    WHERE ps.protocol_id = p.id AND ps.source_id = NEW.id
  );

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE TRIGGER sources_file_replaced
  AFTER UPDATE OF local_file_sha256 ON sources
  FOR EACH ROW EXECUTE FUNCTION tides_source_file_replaced();
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_source_file_replaced() FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_source_file_replaced() TO authenticated, service_role;
--> statement-breakpoint

-- Gap type reaches the reader, because "no source is held" and "the sources
-- disagree" are different things to be told.
CREATE OR REPLACE VIEW public_v_evidence_gaps WITH (security_barrier = true) AS
  SELECT g.id, g.gap_key, g.quality_topic_id, g.peptide_id, g.statement,
         g.why_not_supported, g.what_would_resolve_it, g.verification_issue_key,
         g.sort_order, g.gap_type
  FROM evidence_gaps g
  LEFT JOIN quality_topics q ON q.id = g.quality_topic_id
  LEFT JOIN peptides p ON p.id = g.peptide_id
  WHERE q.publication_state = 'published'
     OR p.publication_state = 'published';
