CREATE TYPE "public"."quality_relationship" AS ENUM('complementary', 'commonly_conflated', 'not_addressed_by', 'same_process', 'other_attribute', 'scoped_by');--> statement-breakpoint
CREATE TABLE "quality_relationships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_topic_id" uuid NOT NULL,
	"to_topic_id" uuid NOT NULL,
	"relationship_type" "quality_relationship" NOT NULL,
	"rationale" text NOT NULL,
	"claim_key" text,
	"gap_key" text,
	"is_editorial_navigational" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quality_relationships_distinct" CHECK ("quality_relationships"."from_topic_id" <> "quality_relationships"."to_topic_id"),
	CONSTRAINT "quality_relationships_basis" CHECK (case
        when relationship_type in ('commonly_conflated', 'not_addressed_by')
          then claim_key is not null or gap_key is not null
        else is_editorial_navigational or claim_key is not null or gap_key is not null
      end)
);
--> statement-breakpoint
ALTER TABLE "quality_relationships" ADD CONSTRAINT "quality_relationships_from_topic_id_quality_topics_id_fk" FOREIGN KEY ("from_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_relationships" ADD CONSTRAINT "quality_relationships_to_topic_id_quality_topics_id_fk" FOREIGN KEY ("to_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_relationships" ADD CONSTRAINT "quality_relationships_claim_key_claims_claim_key_fk" FOREIGN KEY ("claim_key") REFERENCES "public"."claims"("claim_key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "quality_relationships" ADD CONSTRAINT "quality_relationships_gap_key_evidence_gaps_gap_key_fk" FOREIGN KEY ("gap_key") REFERENCES "public"."evidence_gaps"("gap_key") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
CREATE UNIQUE INDEX "quality_relationships_edge_uniq" ON "quality_relationships" USING btree ("from_topic_id","to_topic_id","relationship_type");--> statement-breakpoint
CREATE INDEX "quality_relationships_from_idx" ON "quality_relationships" USING btree ("from_topic_id");--> statement-breakpoint
CREATE INDEX "quality_relationships_to_idx" ON "quality_relationships" USING btree ("to_topic_id");
--> statement-breakpoint

-- ===========================================================================
-- The quality map.
--
-- A certificate of analysis is a list of separate answers, and it is read as
-- one verdict. The map is the structure that holds them apart: for a given
-- test, what else it relates to and — the useful half — what it does not
-- answer.
--
-- That useful half is also the risk. "A purity figure says nothing about
-- sterility" is a statement about evidence, and a map able to assert it would
-- become a second place where medical content is written, outside the
-- provenance chain and outside the publish gates. The `_basis` check above is
-- what prevents that: the two relationship types that make such a statement
-- must resolve to the claim that establishes it or to the recorded gap that
-- explains why the register cannot.
--
-- So the map can always be traced back to the evidence layer, and can never
-- substitute for it.
-- ===========================================================================

ALTER TABLE quality_relationships ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

CREATE POLICY staff_read ON quality_relationships FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY editor_insert ON quality_relationships FOR INSERT TO authenticated
  WITH CHECK (tides_has_role('admin', 'editor'));
--> statement-breakpoint
CREATE POLICY editor_update ON quality_relationships FOR UPDATE TO authenticated
  USING (tides_has_role('admin', 'editor'))
  WITH CHECK (tides_has_role('admin', 'editor'));
--> statement-breakpoint
CREATE POLICY admin_delete ON quality_relationships FOR DELETE TO authenticated
  USING (tides_has_role('admin'));
--> statement-breakpoint

CREATE TRIGGER quality_relationships_touch BEFORE UPDATE ON quality_relationships
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint

-- Visibility follows the topic the reader is on, not the topic being pointed at.
--
-- An edge to a topic with nothing written yet is worth showing: "sterility is a
-- separate question, and this index has no record for it" is a true and useful
-- thing for a reader to learn, and hiding it would leave the page looking as
-- though purity were the whole story. So the view carries the target's
-- publication state and lets the surface render a link or an in-preparation
-- note — the same choice made for registered-but-unpublished compounds in
-- migration 0006.
CREATE VIEW public_v_quality_relationships WITH (security_barrier = true) AS
  SELECT r.id,
         r.from_topic_id,
         r.to_topic_id,
         r.relationship_type,
         r.rationale,
         r.claim_key,
         r.gap_key,
         r.is_editorial_navigational,
         r.sort_order,
         t.quality_key   AS to_quality_key,
         t.name          AS to_name,
         t.slug          AS to_slug,
         -- Whether the target is readable yet. The surface decides how to say so.
         (t.publication_state = 'published') AS to_is_published
  FROM quality_relationships r
  JOIN quality_topics f ON f.id = r.from_topic_id
  JOIN quality_topics t ON t.id = r.to_topic_id
  WHERE f.publication_state = 'published';
--> statement-breakpoint

GRANT SELECT ON public_v_quality_relationships TO anon, authenticated;
