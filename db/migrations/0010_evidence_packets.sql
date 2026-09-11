CREATE TABLE "evidence_gaps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"gap_key" text NOT NULL,
	"quality_topic_id" uuid,
	"peptide_id" uuid,
	"statement" text NOT NULL,
	"why_not_supported" text NOT NULL,
	"what_would_resolve_it" text,
	"verification_issue_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "evidence_gaps_gapKey_unique" UNIQUE("gap_key"),
	CONSTRAINT "evidence_gaps_subject_present" CHECK ("evidence_gaps"."quality_topic_id" is not null or "evidence_gaps"."peptide_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "source_locations" ADD COLUMN "location_key" text;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "printed_page_offset" integer;--> statement-breakpoint
ALTER TABLE "evidence_gaps" ADD CONSTRAINT "evidence_gaps_quality_topic_id_quality_topics_id_fk" FOREIGN KEY ("quality_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_gaps" ADD CONSTRAINT "evidence_gaps_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_gaps" ADD CONSTRAINT "evidence_gaps_verification_issue_key_verification_issues_issue_key_fk" FOREIGN KEY ("verification_issue_key") REFERENCES "public"."verification_issues"("issue_key") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "evidence_gaps_quality_topic_idx" ON "evidence_gaps" USING btree ("quality_topic_id");--> statement-breakpoint
CREATE INDEX "evidence_gaps_peptide_idx" ON "evidence_gaps" USING btree ("peptide_id");--> statement-breakpoint
CREATE UNIQUE INDEX "claim_evidence_claim_location_uniq" ON "claim_evidence" USING btree ("claim_id","source_location_id");--> statement-breakpoint
ALTER TABLE "source_locations" ADD CONSTRAINT "source_locations_locationKey_unique" UNIQUE("location_key");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_automation_scope" CHECK (performed_by = 'human'
          or review_type in ('source_check', 'primary_verification'));
--> statement-breakpoint

-- ===========================================================================
-- Evidence packets.
--
-- An extraction packet is a unit of real editorial work: a set of discrete
-- claims taken from one source, each pinned to an exact location, each carrying
-- the platform's reading and the limits of that reading, together with the
-- statements the packet could NOT support.
--
-- Three things had to become representable for a packet to survive re-loading
-- and to be handed to a reviewer honestly:
--
--   1. A source location needs a stable key, or re-running an extraction either
--      duplicates locators or orphans the evidence that points at them.
--   2. A claim cites a location once. Re-extraction revises a reading; it does
--      not accumulate citations of the same passage.
--   3. What the packet could not support has to be recorded as firmly as what it
--      could, or the gap quietly closes the next time someone writes the page.
-- ===========================================================================

-- --- What the register cannot yet say ---------------------------------------
ALTER TABLE evidence_gaps ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY staff_read ON evidence_gaps FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY editor_insert ON evidence_gaps FOR INSERT TO authenticated
  WITH CHECK (tides_has_role('admin', 'editor'));
--> statement-breakpoint
CREATE POLICY editor_update ON evidence_gaps FOR UPDATE TO authenticated
  USING (tides_has_role('admin', 'editor'))
  WITH CHECK (tides_has_role('admin', 'editor'));
--> statement-breakpoint
CREATE POLICY admin_delete ON evidence_gaps FOR DELETE TO authenticated
  USING (tides_has_role('admin'));
--> statement-breakpoint

CREATE TRIGGER evidence_gaps_touch BEFORE UPDATE ON evidence_gaps
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint

-- A gap has no publication state of its own: it is visible exactly when its
-- subject is. A topic therefore cannot be published with its stated limits
-- stripped out, because there is no state in which one is live and the other is
-- not.
CREATE VIEW public_v_evidence_gaps WITH (security_barrier = true) AS
  SELECT g.id, g.gap_key, g.quality_topic_id, g.peptide_id, g.statement,
         g.why_not_supported, g.what_would_resolve_it, g.verification_issue_key,
         g.sort_order
  FROM evidence_gaps g
  LEFT JOIN quality_topics q ON q.id = g.quality_topic_id
  LEFT JOIN peptides p ON p.id = g.peptide_id
  WHERE q.publication_state = 'published'
     OR p.publication_state = 'published';
--> statement-breakpoint

GRANT SELECT ON public_v_evidence_gaps TO anon, authenticated;
--> statement-breakpoint


-- --- Recording automated work -----------------------------------------------
-- The reviews table is written under a policy requiring
-- `reviewer_user_id = tides_current_user_id()`, which an automated check cannot
-- satisfy: it has no reviewer, by construction. Without a route in, automated
-- work would be unrecordable through a staff session and would have to be
-- written by a superuser, which is how "an editor ran a tool" quietly becomes
-- "no one knows who ran it".
--
-- So: a named tool, run by a named member of staff, recorded as automated. The
-- function refuses any review type that constitutes an approval of medical
-- content — enforced again by the `reviews_automation_scope` constraint, so it
-- holds for every writer including the table owner.
CREATE OR REPLACE FUNCTION tides_record_automated_check(
  p_entity_type reviewable_entity_type,
  p_entity_id uuid,
  p_review_type review_type,
  p_tool text,
  p_comments text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_table text;
  v_version integer;
BEGIN
  IF NOT tides_has_role('admin', 'editor') THEN
    RETURN 'Only an editor or an admin may record an automated check.';
  END IF;

  IF p_review_type NOT IN ('source_check', 'primary_verification') THEN
    RETURN 'Automation may verify sources. Scientific, clinical and compliance '
           || 'review are judgements a named person is answerable for.';
  END IF;

  IF NOT tides_present(p_tool) THEN
    RETURN 'An automated check must name the tool that performed it.';
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
    RETURN 'This kind of record does not carry checks.';
  END IF;

  -- Always at the record's current version. A check recorded against a stale
  -- version would advance nothing and would read as though it had.
  EXECUTE format('SELECT version FROM %I WHERE id = $1', v_table)
  INTO v_version
  USING p_entity_id;

  IF v_version IS NULL THEN
    RETURN 'That record no longer exists.';
  END IF;

  INSERT INTO reviews (
    entity_type, entity_id, entity_version, review_type,
    performed_by, automated_tool, outcome, comments
  )
  VALUES (
    p_entity_type, p_entity_id, v_version, p_review_type,
    'automated', p_tool, 'approved', p_comments
  );

  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION tides_record_automated_check(reviewable_entity_type, uuid, review_type, text, text)
  FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION tides_record_automated_check(reviewable_entity_type, uuid, review_type, text, text)
  TO authenticated, service_role;
