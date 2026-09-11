CREATE TYPE "public"."certificate_authenticity_state" AS ENUM('not_checked', 'issuer_verified', 'report_identifier_verified', 'laboratory_verified', 'retrieved_from_issuer', 'discrepancy_detected', 'unable_to_verify');--> statement-breakpoint
CREATE TYPE "public"."certificate_type" AS ENUM('manufacturer_coa', 'third_party_test_report', 'finished_product_release', 'supplier_repacker_certificate', 'other_unknown');--> statement-breakpoint
CREATE TYPE "public"."chain_linkage_state" AS ENUM('established', 'stated_only', 'not_established', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."tested_material_scope" AS ENUM('api', 'intermediate', 'bulk_material', 'finished_product', 'unknown');--> statement-breakpoint
CREATE TABLE "certificate_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_id" uuid NOT NULL,
	"test_name" text NOT NULL,
	"analytical_method" text,
	"method_reference" text,
	"reference_standard" text,
	"specification_text" text,
	"result_numeric" numeric,
	"result_unit" text,
	"result_text" text,
	"attachment_reference" text,
	"test_date" date,
	"quality_topic_id" uuid,
	"independently_verified" boolean DEFAULT false NOT NULL,
	"verification_notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_tests_verification_explained" CHECK (not "certificate_tests"."independently_verified" or "certificate_tests"."verification_notes" is not null)
);
--> statement-breakpoint
CREATE TABLE "certificates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"certificate_key" text NOT NULL,
	"certificate_type" "certificate_type" DEFAULT 'other_unknown' NOT NULL,
	"document_title" text,
	"issuing_entity" text,
	"laboratory_name" text,
	"laboratory_address" text,
	"laboratory_contact" text,
	"manufacturer_name" text,
	"manufacturer_address" text,
	"distributor_name" text,
	"document_date" date,
	"report_number" text,
	"provenance_notes" text,
	"stated_material_name" text,
	"stated_grade" text,
	"stated_strength" text,
	"batch_number" text,
	"manufacturer_batch_number" text,
	"sample_identifier" text,
	"submitted_sample_identifier" text,
	"expiry_date" date,
	"retest_date" date,
	"tested_material_scope" "tested_material_scope" DEFAULT 'unknown' NOT NULL,
	"submitted_by" text,
	"chain_of_custody_known" boolean,
	"batch_linkage" "chain_linkage_state" DEFAULT 'unknown' NOT NULL,
	"manufacturer_identity_established" boolean DEFAULT false NOT NULL,
	"authorised_by" text,
	"what_it_demonstrates" text,
	"what_it_does_not_demonstrate" text,
	"provenance_gaps" text,
	"missing_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"unverified_relationships" text,
	"authenticity_state" "certificate_authenticity_state" DEFAULT 'not_checked' NOT NULL,
	"authenticity_notes" text,
	"is_specimen" boolean DEFAULT false NOT NULL,
	"is_demonstration" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "certificates_certificateKey_unique" UNIQUE("certificate_key"),
	CONSTRAINT "certificates_specimen_declares_itself" CHECK (not "certificates"."is_specimen" or "certificates"."document_title" ilike '%specimen%' or "certificates"."document_title" ilike '%demonstration%'),
	CONSTRAINT "certificates_authenticity_explained" CHECK (authenticity_state = 'not_checked' or "certificates"."authenticity_notes" is not null)
);
--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "access_status" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "sources" ADD COLUMN "access_notes" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "certificate_type_scope" "certificate_type";--> statement-breakpoint
ALTER TABLE "certificate_tests" ADD CONSTRAINT "certificate_tests_certificate_id_certificates_id_fk" FOREIGN KEY ("certificate_id") REFERENCES "public"."certificates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate_tests" ADD CONSTRAINT "certificate_tests_quality_topic_id_quality_topics_id_fk" FOREIGN KEY ("quality_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "certificate_tests_certificate_idx" ON "certificate_tests" USING btree ("certificate_id");--> statement-breakpoint
CREATE INDEX "certificate_tests_quality_topic_idx" ON "certificate_tests" USING btree ("quality_topic_id");--> statement-breakpoint
CREATE INDEX "certificates_type_idx" ON "certificates" USING btree ("certificate_type");--> statement-breakpoint
CREATE INDEX "certificates_batch_idx" ON "certificates" USING btree ("batch_number");--> statement-breakpoint
CREATE INDEX "certificates_specimen_idx" ON "certificates" USING btree ("is_specimen");--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_certificate_scope_declared" CHECK ("claims"."claim_category" is null
          or "claims"."claim_category" not like 'certificate-content%'
          or "claims"."certificate_type_scope" is not null);
--> statement-breakpoint

-- ===========================================================================
-- Certificates.
--
-- The question a certificate page exists to answer is not "what does the number
-- say". It is: does this document actually describe the material in question?
--
-- Three rules are enforced here rather than left to editorial care, because each
-- fails silently and each failure reads perfectly well:
--
--   1. Only a declared specimen is ever public. A real certificate names a
--      supplier, a batch and a laboratory, and those belong to whoever gave it
--      to us. There is no state in which one reaches a reader.
--   2. A reported result is not a verified result, and the column that says so
--      defaults to false and cannot be set without saying what was checked.
--   3. A Q7 certificate requirement carries the document type it governs, or the
--      claims table refuses it.
-- ===========================================================================

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE certificate_tests ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['certificates', 'certificate_tests']
  LOOP
    EXECUTE format($p$
      CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated
      USING (tides_current_staff_role() IS NOT NULL)
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY editor_insert ON public.%I FOR INSERT TO authenticated
      WITH CHECK (tides_has_role('admin', 'editor'))
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY editor_update ON public.%I FOR UPDATE TO authenticated
      USING (tides_has_role('admin', 'editor'))
      WITH CHECK (tides_has_role('admin', 'editor'))
    $p$, t);
    EXECUTE format($p$
      CREATE POLICY admin_delete ON public.%I FOR DELETE TO authenticated
      USING (tides_has_role('admin'))
    $p$, t);
  END LOOP;
END
$$;
--> statement-breakpoint

CREATE TRIGGER certificates_touch BEFORE UPDATE ON certificates
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint
CREATE TRIGGER certificate_tests_touch BEFORE UPDATE ON certificate_tests
  FOR EACH ROW EXECUTE FUNCTION tides_touch_updated_at();
--> statement-breakpoint

-- --- Only a declared specimen is public -------------------------------------
--
-- Not "unpublished by default" — structurally impossible. A real certificate
-- carries a supplier's name, a batch number and a laboratory's identity, none of
-- which are this index's to publish. The teaching document is fictional, says so
-- in its own title, and is the only thing this view can ever return.
CREATE VIEW public_v_certificates WITH (security_barrier = true) AS
  SELECT id, certificate_key, certificate_type, document_title, issuing_entity,
         laboratory_name, laboratory_address, laboratory_contact,
         manufacturer_name, manufacturer_address, distributor_name,
         document_date, report_number, provenance_notes,
         stated_material_name, stated_grade, stated_strength,
         batch_number, manufacturer_batch_number, sample_identifier,
         submitted_sample_identifier, expiry_date, retest_date,
         tested_material_scope, submitted_by, chain_of_custody_known,
         batch_linkage, manufacturer_identity_established, authorised_by,
         what_it_demonstrates, what_it_does_not_demonstrate, provenance_gaps,
         missing_fields, unverified_relationships,
         authenticity_state, authenticity_notes, is_specimen
  FROM certificates
  WHERE is_specimen AND NOT is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_certificate_tests WITH (security_barrier = true) AS
  SELECT t.id, t.certificate_id, t.test_name, t.analytical_method,
         t.method_reference, t.reference_standard, t.specification_text,
         t.result_numeric, t.result_unit, t.result_text,
         t.attachment_reference, t.test_date, t.quality_topic_id,
         t.independently_verified, t.verification_notes, t.sort_order
  FROM certificate_tests t
  JOIN certificates c ON c.id = t.certificate_id
  WHERE c.is_specimen AND NOT c.is_demonstration;
--> statement-breakpoint

GRANT SELECT ON public_v_certificates TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public_v_certificate_tests TO anon, authenticated;
--> statement-breakpoint

-- --- Demonstration data stays findable --------------------------------------
-- Certificates join the set of records `npm run db:verify-production` refuses to
-- find in a production database. Specimens are deliberate published content and
-- are not counted; the local fixture is.
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
    + (SELECT count(*) FROM certificates WHERE is_demonstration)
  )::int
$fn$;
