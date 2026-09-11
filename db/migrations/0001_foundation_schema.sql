CREATE TYPE "public"."alias_type" AS ENUM('synonym', 'abbreviation', 'brand_name', 'research_code', 'chemical_name', 'common_misnomer', 'related_but_distinct');--> statement-breakpoint
CREATE TYPE "public"."audience" AS ENUM('patient', 'practitioner', 'both');--> statement-breakpoint
CREATE TYPE "public"."claim_importance" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."correction_severity" AS ENUM('typographical', 'clarification', 'substantive', 'material_medical');--> statement-breakpoint
CREATE TYPE "public"."disagreement_explanation" AS ENUM('route', 'formulation', 'population', 'dose', 'study_design', 'terminology', 'date', 'unresolved');--> statement-breakpoint
CREATE TYPE "public"."document_status" AS ENUM('draft', 'in_review', 'published', 'needs_update', 'superseded', 'archived');--> statement-breakpoint
CREATE TYPE "public"."evidence_class" AS ENUM('human', 'preclinical', 'reference_opinion');--> statement-breakpoint
CREATE TYPE "public"."evidence_relationship" AS ENUM('supports', 'contradicts', 'contextualizes', 'cites');--> statement-breakpoint
CREATE TYPE "public"."protocol_source_role" AS ENUM('original', 'secondary_reference', 'commentary');--> statement-breakpoint
CREATE TYPE "public"."publication_state_value" AS ENUM('unpublished', 'published', 'withdrawn', 'superseded');--> statement-breakpoint
CREATE TYPE "public"."publication_type" AS ENUM('book', 'book_chapter', 'article', 'peptide_reference', 'quality_topic', 'patient_handout', 'practitioner_guide', 'methodology', 'policy');--> statement-breakpoint
CREATE TYPE "public"."reading_mode" AS ENUM('simple', 'practitioner');--> statement-breakpoint
CREATE TYPE "public"."regulatory_status_value" AS ENUM('approved', 'authorized_limited', 'investigational_clinical', 'preclinical', 'discontinued', 'withdrawn', 'not_approved', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."review_clock_class" AS ENUM('foundational_chemistry', 'general_quality_science', 'peptide_evidence', 'investigational_program', 'regulatory_status');--> statement-breakpoint
CREATE TYPE "public"."review_outcome" AS ENUM('approved', 'changes_requested', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_state" AS ENUM('unreviewed', 'captured', 'source_checked', 'primary_source_checked', 'scientific_reviewed', 'clinical_reviewed', 'compliance_reviewed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."review_type" AS ENUM('source_check', 'primary_verification', 'scientific', 'clinical', 'compliance');--> statement-breakpoint
CREATE TYPE "public"."reviewable_entity_type" AS ENUM('source', 'peptide', 'claim', 'protocol', 'peptide_route', 'quality_topic', 'regulatory_status', 'disagreement', 'publication', 'publication_section');--> statement-breakpoint
CREATE TYPE "public"."search_entity_type" AS ENUM('peptide', 'claim', 'protocol', 'quality_topic', 'source', 'publication');--> statement-breakpoint
CREATE TYPE "public"."source_qc_status" AS ENUM('usable', 'incomplete', 'replace', 'pending', 'exclude');--> statement-breakpoint
CREATE TYPE "public"."staff_role" AS ENUM('admin', 'editor', 'scientific_reviewer', 'clinical_reviewer', 'compliance_reviewer');--> statement-breakpoint
CREATE TABLE "compound_categories" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "compound_types" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_peptide" boolean NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence_types" (
	"key" text PRIMARY KEY NOT NULL,
	"public_label" text NOT NULL,
	"description" text,
	"evidence_class" "evidence_class" NOT NULL,
	"is_human_evidence" boolean NOT NULL,
	"is_interpretive" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description_simple" text,
	"description_practitioner" text,
	"general_limitations" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "routes_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "source_types" (
	"key" text PRIMARY KEY NOT NULL,
	"public_label" text NOT NULL,
	"description" text,
	"typical_evidence_class" "evidence_class",
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"role" "staff_role" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" uuid NOT NULL,
	"page_start" integer,
	"page_end" integer,
	"chapter" text,
	"section" text,
	"figure" text,
	"table_number" text,
	"timestamp_start_seconds" integer,
	"timestamp_end_seconds" integer,
	"url_fragment" text,
	"locator_text" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_key" text NOT NULL,
	"title" text NOT NULL,
	"source_type_key" text NOT NULL,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publisher" text,
	"publication_name" text,
	"publication_date" date,
	"year" integer,
	"edition" text,
	"doi" text,
	"pmid" text,
	"trial_registry_id" text,
	"isbn" text,
	"canonical_url" text,
	"qc_status" "source_qc_status" DEFAULT 'pending' NOT NULL,
	"is_citable" boolean GENERATED ALWAYS AS (qc_status not in ('replace', 'exclude')) STORED NOT NULL,
	"local_private_filename" text,
	"local_file_sha256" text,
	"primary_role" text,
	"coverage_notes" text,
	"authority_notes" text,
	"limitations_notes" text,
	"copyright_access_notes" text,
	"public_fulltext_allowed" boolean DEFAULT false NOT NULL,
	"source_summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sources_sourceKey_unique" UNIQUE("source_key")
);
--> statement-breakpoint
CREATE TABLE "peptide_aliases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peptide_id" uuid NOT NULL,
	"alias" text NOT NULL,
	"alias_type" "alias_type" DEFAULT 'synonym' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peptide_aliases_peptide_alias_key" UNIQUE("peptide_id","alias")
);
--> statement-breakpoint
CREATE TABLE "peptides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peptide_key" text NOT NULL,
	"canonical_name" text NOT NULL,
	"slug" text NOT NULL,
	"compound_type_key" text,
	"primary_category_key" text,
	"natural_or_synthetic" text,
	"molecular_description" text,
	"sequence" text,
	"short_description" text,
	"simple_summary" text,
	"practitioner_summary" text,
	"unknowns_summary" text,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"evidence_cutoff_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "peptides_peptideKey_unique" UNIQUE("peptide_key"),
	CONSTRAINT "peptides_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quality_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quality_key" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_description" text,
	"simple_summary" text,
	"practitioner_summary" text,
	"what_it_proves" text,
	"what_it_does_not_prove" text,
	"common_misinterpretations" text,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "quality_topics_qualityKey_unique" UNIQUE("quality_key"),
	CONSTRAINT "quality_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "claim_evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_location_id" uuid,
	"evidence_type_key" text NOT NULL,
	"relationship" "evidence_relationship" DEFAULT 'supports' NOT NULL,
	"population_model" text,
	"route_key" text,
	"formulation" text,
	"extracted_text_private" text,
	"interpretation" text,
	"primary_source_verified" boolean DEFAULT false NOT NULL,
	"interpretation_concerns" text,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"claim_key" text NOT NULL,
	"peptide_id" uuid,
	"quality_topic_id" uuid,
	"claim_text" text NOT NULL,
	"plain_language_text" text,
	"claim_category" text,
	"importance" "claim_importance" DEFAULT 'medium' NOT NULL,
	"interpretation_notes" text,
	"uncertainty_text" text,
	"is_editorial_non_evidentiary" boolean DEFAULT false NOT NULL,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "claims_claimKey_unique" UNIQUE("claim_key"),
	CONSTRAINT "claims_subject_present" CHECK ("claims"."peptide_id" is not null or "claims"."quality_topic_id" is not null or "claims"."is_editorial_non_evidentiary")
);
--> statement-breakpoint
CREATE TABLE "protocol_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_location_id" uuid,
	"source_role" "protocol_source_role" DEFAULT 'original' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocols" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"protocol_key" text NOT NULL,
	"peptide_id" uuid,
	"combination_name" text,
	"objective_context" text NOT NULL,
	"population_model" text,
	"route_key" text,
	"formulation" text,
	"amount_reported" text,
	"amount_unit" text,
	"frequency_text" text,
	"timing_text" text,
	"duration_text" text,
	"cycle_text" text,
	"titration_text" text,
	"amount_min_numeric" numeric(14, 4),
	"amount_max_numeric" numeric(14, 4),
	"combinations_text" text,
	"monitoring_text" text,
	"contraindications_text" text,
	"safety_notes" text,
	"adverse_events_text" text,
	"outcome_context" text,
	"regulatory_context" text,
	"evidence_type_key" text NOT NULL,
	"patient_visibility" boolean DEFAULT false NOT NULL,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"reviewer_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocols_protocolKey_unique" UNIQUE("protocol_key"),
	CONSTRAINT "protocols_subject_present" CHECK ("protocols"."peptide_id" is not null or "protocols"."combination_name" is not null),
	CONSTRAINT "protocols_amount_range_ordered" CHECK ("protocols"."amount_min_numeric" is null or "protocols"."amount_max_numeric" is null or "protocols"."amount_min_numeric" <= "protocols"."amount_max_numeric")
);
--> statement-breakpoint
CREATE TABLE "disagreement_positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disagreement_id" uuid NOT NULL,
	"source_id" uuid NOT NULL,
	"source_location_id" uuid,
	"evidence_type_key" text NOT NULL,
	"position_text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disagreement_positions_unique" UNIQUE("disagreement_id","source_id","position_text")
);
--> statement-breakpoint
CREATE TABLE "disagreements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"disagreement_key" text NOT NULL,
	"peptide_id" uuid,
	"quality_topic_id" uuid,
	"topic" text NOT NULL,
	"plain_language_text" text,
	"candidate_explanation" "disagreement_explanation" DEFAULT 'unresolved' NOT NULL,
	"explanation_notes" text,
	"resolution_requirement" text,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disagreements_disagreementKey_unique" UNIQUE("disagreement_key")
);
--> statement-breakpoint
CREATE TABLE "peptide_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peptide_id" uuid NOT NULL,
	"route_key" text NOT NULL,
	"evidence_type_key" text NOT NULL,
	"source_id" uuid NOT NULL,
	"source_location_id" uuid,
	"population_model" text,
	"formulation" text,
	"pk_notes" text,
	"bioavailability_notes" text,
	"limitations_notes" text,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "regulatory_statuses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"peptide_id" uuid NOT NULL,
	"jurisdiction" text NOT NULL,
	"indication_context" text,
	"status" "regulatory_status_value" NOT NULL,
	"authority" text,
	"source_id" uuid,
	"source_location_id" uuid,
	"checked_at" date NOT NULL,
	"recheck_due_at" date,
	"notes" text,
	"review_state" "review_state" DEFAULT 'unreviewed' NOT NULL,
	"publication_state" "publication_state_value" DEFAULT 'unpublished' NOT NULL,
	"needs_update" boolean DEFAULT false NOT NULL,
	"needs_update_reason" text,
	"editorial_state" text GENERATED ALWAYS AS (case
        when review_state = 'rejected' then 'rejected'
        when publication_state = 'superseded' then 'superseded'
        when publication_state = 'withdrawn' then 'withdrawn'
        when publication_state = 'published' and needs_update then 'published_needs_update'
        when publication_state = 'published' then 'published'
        when needs_update then 'needs_update'
        when review_state = 'compliance_reviewed' then 'compliance_reviewed'
        when review_state = 'clinical_reviewed' then 'clinical_reviewed'
        when review_state = 'scientific_reviewed' then 'scientific_reviewed'
        when review_state = 'primary_source_checked' then 'primary_source_checked'
        when review_state = 'source_checked' then 'source_checked'
        when review_state = 'captured' then 'captured'
        else 'unreviewed'
      end) STORED,
	"withdrawn_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"publication_section_id" uuid,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_claims_unique" UNIQUE("publication_id","claim_id")
);
--> statement-breakpoint
CREATE TABLE "publication_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"heading" text,
	"body_structured" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"audience" "audience",
	"generated_from_claims" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_sections_order_key" UNIQUE("publication_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_key" text NOT NULL,
	"publication_type" "publication_type" NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"subtitle" text,
	"audience" "audience" DEFAULT 'both' NOT NULL,
	"reading_mode" "reading_mode",
	"peptide_id" uuid,
	"quality_topic_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"status" "document_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"last_reviewed_at" timestamp with time zone,
	"evidence_cutoff_at" date,
	"superseded_by_publication_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publications_publicationKey_unique" UNIQUE("publication_key"),
	CONSTRAINT "publications_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "corrections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"correction_key" text NOT NULL,
	"entity_type" "reviewable_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"severity" "correction_severity" NOT NULL,
	"what_changed" text NOT NULL,
	"reason" text NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"reported_by" text,
	"corrected_by_user_id" uuid,
	"identified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"corrected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "corrections_correctionKey_unique" UNIQUE("correction_key")
);
--> statement-breakpoint
CREATE TABLE "review_clocks" (
	"content_class" "review_clock_class" PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"min_months" integer NOT NULL,
	"max_months" integer NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "reviewable_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version" integer DEFAULT 1 NOT NULL,
	"review_type" "review_type" NOT NULL,
	"reviewer_user_id" uuid,
	"outcome" "review_outcome" NOT NULL,
	"comments" text,
	"reviewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "reviewable_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"diff_summary" text,
	"snapshot" jsonb,
	"previous_editorial_state" text,
	"new_editorial_state" text,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"issue_key" text NOT NULL,
	"topic" text NOT NULL,
	"why_it_matters" text NOT NULL,
	"current_source_signal" text,
	"needed_verification" text,
	"priority" text DEFAULT 'high' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"related_entity_type" "reviewable_entity_type",
	"related_entity_id" uuid,
	"related_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"opened_at" date DEFAULT now() NOT NULL,
	"resolved_at" date,
	"resolution_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verification_issues_issueKey_unique" UNIQUE("issue_key")
);
--> statement-breakpoint
CREATE TABLE "search_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "search_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"alias_text" text,
	"body_text" text,
	"peptide_id" uuid,
	"peptide_slug" text,
	"evidence_classes" "evidence_class"[],
	"route_keys" text[],
	"source_type_keys" text[],
	"category_key" text,
	"is_human_evidence" boolean DEFAULT false NOT NULL,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A')
        || setweight(to_tsvector('english', coalesce(alias_text, '')), 'A')
        || setweight(to_tsvector('english', coalesce(subtitle, '')), 'B')
        || setweight(to_tsvector('english', coalesce(body_text, '')), 'C')) STORED,
	"indexed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "search_documents_entity_key" UNIQUE("entity_type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "source_locations" ADD CONSTRAINT "source_locations_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_source_type_key_source_types_key_fk" FOREIGN KEY ("source_type_key") REFERENCES "public"."source_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "peptide_aliases" ADD CONSTRAINT "peptide_aliases_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peptides" ADD CONSTRAINT "peptides_compound_type_key_compound_types_key_fk" FOREIGN KEY ("compound_type_key") REFERENCES "public"."compound_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "peptides" ADD CONSTRAINT "peptides_primary_category_key_compound_categories_key_fk" FOREIGN KEY ("primary_category_key") REFERENCES "public"."compound_categories"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_source_location_id_source_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."source_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_evidence_type_key_evidence_types_key_fk" FOREIGN KEY ("evidence_type_key") REFERENCES "public"."evidence_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "claim_evidence" ADD CONSTRAINT "claim_evidence_route_key_routes_key_fk" FOREIGN KEY ("route_key") REFERENCES "public"."routes"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "claims" ADD CONSTRAINT "claims_quality_topic_id_quality_topics_id_fk" FOREIGN KEY ("quality_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_sources" ADD CONSTRAINT "protocol_sources_protocol_id_protocols_id_fk" FOREIGN KEY ("protocol_id") REFERENCES "public"."protocols"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_sources" ADD CONSTRAINT "protocol_sources_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_sources" ADD CONSTRAINT "protocol_sources_source_location_id_source_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."source_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_route_key_routes_key_fk" FOREIGN KEY ("route_key") REFERENCES "public"."routes"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "protocols" ADD CONSTRAINT "protocols_evidence_type_key_evidence_types_key_fk" FOREIGN KEY ("evidence_type_key") REFERENCES "public"."evidence_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "disagreement_positions" ADD CONSTRAINT "disagreement_positions_disagreement_id_disagreements_id_fk" FOREIGN KEY ("disagreement_id") REFERENCES "public"."disagreements"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disagreement_positions" ADD CONSTRAINT "disagreement_positions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disagreement_positions" ADD CONSTRAINT "disagreement_positions_source_location_id_source_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."source_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disagreement_positions" ADD CONSTRAINT "disagreement_positions_evidence_type_key_evidence_types_key_fk" FOREIGN KEY ("evidence_type_key") REFERENCES "public"."evidence_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "disagreements" ADD CONSTRAINT "disagreements_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disagreements" ADD CONSTRAINT "disagreements_quality_topic_id_quality_topics_id_fk" FOREIGN KEY ("quality_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peptide_routes" ADD CONSTRAINT "peptide_routes_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peptide_routes" ADD CONSTRAINT "peptide_routes_route_key_routes_key_fk" FOREIGN KEY ("route_key") REFERENCES "public"."routes"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "peptide_routes" ADD CONSTRAINT "peptide_routes_evidence_type_key_evidence_types_key_fk" FOREIGN KEY ("evidence_type_key") REFERENCES "public"."evidence_types"("key") ON DELETE no action ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "peptide_routes" ADD CONSTRAINT "peptide_routes_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "peptide_routes" ADD CONSTRAINT "peptide_routes_source_location_id_source_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."source_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_statuses" ADD CONSTRAINT "regulatory_statuses_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_statuses" ADD CONSTRAINT "regulatory_statuses_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_statuses" ADD CONSTRAINT "regulatory_statuses_source_location_id_source_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."source_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_claims" ADD CONSTRAINT "publication_claims_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_claims" ADD CONSTRAINT "publication_claims_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "public"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_claims" ADD CONSTRAINT "publication_claims_publication_section_id_publication_sections_id_fk" FOREIGN KEY ("publication_section_id") REFERENCES "public"."publication_sections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_sections" ADD CONSTRAINT "publication_sections_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_peptide_id_peptides_id_fk" FOREIGN KEY ("peptide_id") REFERENCES "public"."peptides"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_quality_topic_id_quality_topics_id_fk" FOREIGN KEY ("quality_topic_id") REFERENCES "public"."quality_topics"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrections" ADD CONSTRAINT "corrections_corrected_by_user_id_profiles_user_id_fk" FOREIGN KEY ("corrected_by_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewer_user_id_profiles_user_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "revisions" ADD CONSTRAINT "revisions_changed_by_profiles_user_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("user_id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "evidence_types_public_label_key" ON "evidence_types" USING btree ("public_label");--> statement-breakpoint
CREATE INDEX "source_locations_source_idx" ON "source_locations" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "sources_source_type_idx" ON "sources" USING btree ("source_type_key");--> statement-breakpoint
CREATE INDEX "sources_qc_status_idx" ON "sources" USING btree ("qc_status");--> statement-breakpoint
CREATE INDEX "sources_title_trgm_idx" ON "sources" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "peptide_aliases_alias_trgm_idx" ON "peptide_aliases" USING gin ("alias" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "peptide_aliases_type_idx" ON "peptide_aliases" USING btree ("alias_type");--> statement-breakpoint
CREATE INDEX "peptides_review_state_idx" ON "peptides" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "peptides_publication_state_idx" ON "peptides" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "peptides_category_idx" ON "peptides" USING btree ("primary_category_key");--> statement-breakpoint
CREATE INDEX "peptides_name_trgm_idx" ON "peptides" USING gin ("canonical_name" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "quality_topics_review_state_idx" ON "quality_topics" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "quality_topics_publication_state_idx" ON "quality_topics" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "claim_evidence_claim_idx" ON "claim_evidence" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_source_idx" ON "claim_evidence" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "claim_evidence_evidence_type_idx" ON "claim_evidence" USING btree ("evidence_type_key");--> statement-breakpoint
CREATE INDEX "claim_evidence_relationship_idx" ON "claim_evidence" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "claims_peptide_idx" ON "claims" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "claims_quality_topic_idx" ON "claims" USING btree ("quality_topic_id");--> statement-breakpoint
CREATE INDEX "claims_review_state_idx" ON "claims" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "claims_publication_state_idx" ON "claims" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "claims_importance_idx" ON "claims" USING btree ("importance");--> statement-breakpoint
CREATE INDEX "protocol_sources_protocol_idx" ON "protocol_sources" USING btree ("protocol_id");--> statement-breakpoint
CREATE INDEX "protocol_sources_source_idx" ON "protocol_sources" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "protocols_peptide_idx" ON "protocols" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "protocols_route_idx" ON "protocols" USING btree ("route_key");--> statement-breakpoint
CREATE INDEX "protocols_review_state_idx" ON "protocols" USING btree ("review_state");--> statement-breakpoint
CREATE INDEX "protocols_publication_state_idx" ON "protocols" USING btree ("publication_state");--> statement-breakpoint
CREATE INDEX "protocols_evidence_type_idx" ON "protocols" USING btree ("evidence_type_key");--> statement-breakpoint
CREATE INDEX "disagreement_positions_disagreement_idx" ON "disagreement_positions" USING btree ("disagreement_id");--> statement-breakpoint
CREATE INDEX "disagreements_peptide_idx" ON "disagreements" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "disagreements_quality_topic_idx" ON "disagreements" USING btree ("quality_topic_id");--> statement-breakpoint
CREATE INDEX "peptide_routes_peptide_idx" ON "peptide_routes" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "peptide_routes_route_idx" ON "peptide_routes" USING btree ("route_key");--> statement-breakpoint
CREATE INDEX "peptide_routes_evidence_type_idx" ON "peptide_routes" USING btree ("evidence_type_key");--> statement-breakpoint
CREATE INDEX "regulatory_statuses_peptide_idx" ON "regulatory_statuses" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "regulatory_statuses_jurisdiction_idx" ON "regulatory_statuses" USING btree ("jurisdiction");--> statement-breakpoint
CREATE INDEX "regulatory_statuses_checked_idx" ON "regulatory_statuses" USING btree ("checked_at");--> statement-breakpoint
CREATE INDEX "publication_claims_claim_idx" ON "publication_claims" USING btree ("claim_id");--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "publications_type_idx" ON "publications" USING btree ("publication_type");--> statement-breakpoint
CREATE INDEX "publications_peptide_idx" ON "publications" USING btree ("peptide_id");--> statement-breakpoint
CREATE INDEX "corrections_entity_idx" ON "corrections" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "corrections_public_idx" ON "corrections" USING btree ("is_public","corrected_at");--> statement-breakpoint
CREATE INDEX "reviews_entity_idx" ON "reviews" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "reviews_entity_version_idx" ON "reviews" USING btree ("entity_type","entity_id","entity_version");--> statement-breakpoint
CREATE INDEX "reviews_reviewer_idx" ON "reviews" USING btree ("reviewer_user_id");--> statement-breakpoint
CREATE INDEX "revisions_entity_idx" ON "revisions" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "revisions_entity_version_idx" ON "revisions" USING btree ("entity_type","entity_id","version");--> statement-breakpoint
CREATE INDEX "revisions_changed_at_idx" ON "revisions" USING btree ("changed_at");--> statement-breakpoint
CREATE INDEX "verification_issues_status_idx" ON "verification_issues" USING btree ("status","priority");--> statement-breakpoint
CREATE INDEX "search_documents_vector_idx" ON "search_documents" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "search_documents_title_trgm_idx" ON "search_documents" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "search_documents_alias_trgm_idx" ON "search_documents" USING gin ("alias_text" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "search_documents_entity_type_idx" ON "search_documents" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX "search_documents_peptide_idx" ON "search_documents" USING btree ("peptide_id");