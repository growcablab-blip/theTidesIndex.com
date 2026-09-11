-- ===========================================================================
-- The Tides Index — access control and the public read surface.
--
-- Two rules govern this file:
--
--   1. The anonymous role holds NO privilege on any base table. Public reads go
--      exclusively through the `public_v_*` views below. Row-level security
--      alone would not be enough: RLS filters rows, and some of what must never
--      be public is a *column* — claim_evidence.extracted_text_private holds
--      verbatim text from copyrighted books, retained only so a reviewer can
--      confirm a reading.
--
--   2. Patient/simple mode cannot receive a dose. `public_v_protocol_simple`
--      does not contain amount, frequency, timing, duration, cycle or titration
--      columns at all. Suppression is structural, not a conditional in a
--      component, so it cannot be defeated by a rendering bug, a JSON payload,
--      a print stylesheet or a future refactor.
--      (EDITORIAL_POLICY.md; ACCEPTANCE_TESTS.md B.2, B.5)
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------
-- Supabase provisions these; created here when absent so the same migrations
-- run against a bare Postgres.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint

-- Staff identity mirrors Supabase Auth where that schema exists.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'auth' AND table_name = 'users')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_auth_users_fk')
  THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_user_id_auth_users_fk
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END
$$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Baseline privileges
-- ---------------------------------------------------------------------------
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

-- Staff reach base tables through their own JWT, so every policy below is
-- enforced by the database rather than by whichever code path made the query.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
--> statement-breakpoint
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
-- RLS is enabled, not FORCEd. FORCE would subject the table owner to these
-- policies as well, which would break the SECURITY DEFINER audit and cascade
-- triggers -- the revision writer could not append history, and a demotion
-- cascade fired by a reviewer would be refused by the editor-write policy.
-- Application roles (anon, authenticated) are not table owners, so their access
-- is unchanged either way.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Every active staff member may read internal records; drafts and reviewer
-- notes are shared working material.
-- Content is written by editors and admins. Reviewers record decisions in
-- `reviews`, they do not rewrite the record they are reviewing.
DO $$
DECLARE
  t text;
  k_content_tables text[] := ARRAY[
    'sources', 'source_locations', 'peptides', 'peptide_aliases', 'claims',
    'claim_evidence', 'protocols', 'protocol_sources', 'peptide_routes',
    'regulatory_statuses', 'quality_topics', 'disagreements',
    'disagreement_positions', 'publications', 'publication_sections',
    'publication_claims', 'corrections', 'verification_issues',
    'search_documents'
  ];
  k_reference_tables text[] := ARRAY[
    'source_types', 'evidence_types', 'routes', 'compound_types',
    'compound_categories', 'review_clocks'
  ];
BEGIN
  FOREACH t IN ARRAY k_content_tables
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

  FOREACH t IN ARRAY k_reference_tables
  LOOP
    EXECUTE format($p$
      CREATE POLICY staff_read ON public.%I FOR SELECT TO authenticated
      USING (tides_current_staff_role() IS NOT NULL)
    $p$, t);

    -- Controlled vocabularies change the meaning of every record that
    -- references them, so only an admin may edit them.
    EXECUTE format($p$
      CREATE POLICY admin_write ON public.%I FOR ALL TO authenticated
      USING (tides_has_role('admin'))
      WITH CHECK (tides_has_role('admin'))
    $p$, t);
  END LOOP;
END
$$;
--> statement-breakpoint

-- Staff directory.
CREATE POLICY staff_read ON profiles FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL OR user_id = tides_current_user_id());
--> statement-breakpoint
CREATE POLICY admin_manage ON profiles FOR ALL TO authenticated
  USING (tides_has_role('admin'))
  WITH CHECK (tides_has_role('admin'));
--> statement-breakpoint

-- A reviewer may only record the kind of review their role performs, and only
-- in their own name. This is what stops a single account from manufacturing the
-- full set of approvals a protocol needs.
CREATE POLICY staff_read ON reviews FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL);
--> statement-breakpoint
CREATE POLICY reviewer_insert ON reviews FOR INSERT TO authenticated
  WITH CHECK (
    reviewer_user_id = tides_current_user_id()
    AND (
      tides_has_role('admin')
      OR (tides_has_role('editor') AND review_type IN ('source_check', 'primary_verification'))
      OR (tides_has_role('scientific_reviewer') AND review_type = 'scientific')
      OR (tides_has_role('clinical_reviewer') AND review_type = 'clinical')
      OR (tides_has_role('compliance_reviewer') AND review_type = 'compliance')
    )
  );
--> statement-breakpoint

-- Revision history is append-only and written by trigger. There is no policy
-- permitting INSERT, UPDATE or DELETE from any application role.
CREATE POLICY staff_read ON revisions FOR SELECT TO authenticated
  USING (tides_current_staff_role() IS NOT NULL);
--> statement-breakpoint


-- ===========================================================================
-- Public read surface
-- ===========================================================================
-- Views run with the privileges of their owner and carry security_barrier so
-- predicates cannot be pushed past the published-only filter.

-- --- Controlled vocabularies (public reference data) ----------------------
CREATE VIEW public_v_source_types WITH (security_barrier = true) AS
  SELECT key, public_label, description, sort_order
  FROM source_types WHERE is_active;
--> statement-breakpoint

CREATE VIEW public_v_evidence_types WITH (security_barrier = true) AS
  SELECT key, public_label, description, evidence_class, is_human_evidence,
         is_interpretive, sort_order
  FROM evidence_types WHERE is_active;
--> statement-breakpoint

CREATE VIEW public_v_routes WITH (security_barrier = true) AS
  SELECT key, name, slug, description_simple, description_practitioner,
         general_limitations, sort_order
  FROM routes WHERE is_active;
--> statement-breakpoint

CREATE VIEW public_v_compound_types WITH (security_barrier = true) AS
  SELECT key, label, description, is_peptide, sort_order FROM compound_types;
--> statement-breakpoint

CREATE VIEW public_v_compound_categories WITH (security_barrier = true) AS
  SELECT key, label, description, sort_order FROM compound_categories;
--> statement-breakpoint

-- --- Sources --------------------------------------------------------------
-- Bibliographic metadata only. The private filename, its checksum and the
-- internal copyright notes never leave the staff surface, and a source marked
-- `exclude` is not listed at all.
CREATE VIEW public_v_sources WITH (security_barrier = true) AS
  SELECT id, source_key, title, source_type_key, authors, publisher,
         publication_name, publication_date, year, edition, doi, pmid,
         trial_registry_id, isbn, canonical_url, qc_status, is_citable,
         primary_role, coverage_notes, authority_notes, limitations_notes,
         source_summary
  FROM sources
  WHERE qc_status <> 'exclude';
--> statement-breakpoint

CREATE VIEW public_v_source_locations WITH (security_barrier = true) AS
  SELECT sl.id, sl.source_id, sl.page_start, sl.page_end, sl.chapter,
         sl.section, sl.figure, sl.table_number, sl.timestamp_start_seconds,
         sl.timestamp_end_seconds, sl.url_fragment, sl.locator_text
  FROM source_locations sl
  JOIN sources s ON s.id = sl.source_id
  WHERE s.qc_status <> 'exclude';
--> statement-breakpoint

-- --- Compounds ------------------------------------------------------------
CREATE VIEW public_v_peptides WITH (security_barrier = true) AS
  SELECT id, peptide_key, canonical_name, slug, compound_type_key,
         primary_category_key, natural_or_synthetic, molecular_description,
         sequence, short_description, simple_summary, practitioner_summary,
         unknowns_summary, version, published_at, last_reviewed_at,
         evidence_cutoff_at
  FROM peptides
  WHERE workflow_status = 'published';
--> statement-breakpoint

-- alias_type travels with the alias so the interface can distinguish a true
-- synonym from a name that is merely discussed alongside it. Presenting
-- `related_but_distinct` as a synonym would assert an identity no source has
-- established (verification issue V-001, TB-500 vs Thymosin beta-4).
CREATE VIEW public_v_peptide_aliases WITH (security_barrier = true) AS
  SELECT a.id, a.peptide_id, a.alias, a.alias_type, a.notes
  FROM peptide_aliases a
  JOIN peptides p ON p.id = a.peptide_id
  WHERE p.workflow_status = 'published';
--> statement-breakpoint

-- --- Claims and their provenance -----------------------------------------
CREATE VIEW public_v_claims WITH (security_barrier = true) AS
  SELECT id, claim_key, peptide_id, quality_topic_id, claim_text,
         plain_language_text, claim_category, importance, interpretation_notes,
         uncertainty_text, is_editorial_non_evidentiary, version, published_at,
         last_reviewed_at
  FROM claims
  WHERE workflow_status = 'published';
--> statement-breakpoint

-- extracted_text_private, reviewer_notes and interpretation_concerns are
-- absent by construction.
CREATE VIEW public_v_claim_evidence WITH (security_barrier = true) AS
  SELECT ce.id, ce.claim_id, ce.source_id, ce.source_location_id,
         ce.evidence_type_key, ce.relationship, ce.population_model,
         ce.route_key, ce.formulation, ce.interpretation,
         ce.primary_source_verified
  FROM claim_evidence ce
  JOIN claims c ON c.id = ce.claim_id
  JOIN sources s ON s.id = ce.source_id
  WHERE c.workflow_status = 'published'
    AND s.qc_status <> 'exclude';
--> statement-breakpoint

-- --- Protocols ------------------------------------------------------------
-- Practitioner surface: the regimen exactly as the named source reported it.
CREATE VIEW public_v_protocol_practitioner WITH (security_barrier = true) AS
  SELECT id, protocol_key, peptide_id, combination_name, objective_context,
         population_model, route_key, formulation, amount_reported, amount_unit,
         frequency_text, timing_text, duration_text, cycle_text, titration_text,
         combinations_text, monitoring_text, contraindications_text,
         safety_notes, adverse_events_text, outcome_context, regulatory_context,
         evidence_type_key, version, published_at, last_reviewed_at
  FROM protocols
  WHERE workflow_status = 'published';
--> statement-breakpoint

-- Patient surface.
--
-- Deliberately incomplete: there is no amount, unit, frequency, timing,
-- duration, cycle or titration column here, and there must never be one. A
-- patient reading this learns that named sources describe regimens, what those
-- regimens were aiming at, in which population, and by which route — which is
-- what supports an informed conversation with a clinician — without receiving
-- anything that functions as an instruction.
--
-- Free-text clinical fields are omitted too, not because they are secret, but
-- because monitoring, titration and safety prose routinely carry embedded
-- numbers.
CREATE VIEW public_v_protocol_simple WITH (security_barrier = true) AS
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
           AS has_safety_guidance
  FROM protocols p
  WHERE p.workflow_status = 'published'
    AND p.patient_visibility;
--> statement-breakpoint

CREATE VIEW public_v_protocol_sources WITH (security_barrier = true) AS
  SELECT ps.id, ps.protocol_id, ps.source_id, ps.source_location_id,
         ps.source_role
  FROM protocol_sources ps
  JOIN protocols p ON p.id = ps.protocol_id
  WHERE p.workflow_status = 'published';
--> statement-breakpoint

-- --- Route, regulatory, quality, disagreement -----------------------------
CREATE VIEW public_v_peptide_routes WITH (security_barrier = true) AS
  SELECT id, peptide_id, route_key, evidence_type_key, source_id,
         source_location_id, population_model, formulation, pk_notes,
         bioavailability_notes, limitations_notes, published_at
  FROM peptide_routes
  WHERE workflow_status = 'published';
--> statement-breakpoint

CREATE VIEW public_v_regulatory_statuses WITH (security_barrier = true) AS
  SELECT id, peptide_id, jurisdiction, indication_context, status, authority,
         source_id, source_location_id, checked_at, notes, published_at
  FROM regulatory_statuses
  WHERE workflow_status = 'published';
--> statement-breakpoint

CREATE VIEW public_v_quality_topics WITH (security_barrier = true) AS
  SELECT id, quality_key, name, slug, short_description, simple_summary,
         practitioner_summary, what_it_proves, what_it_does_not_prove,
         common_misinterpretations, version, published_at, last_reviewed_at,
         sort_order
  FROM quality_topics
  WHERE workflow_status = 'published';
--> statement-breakpoint

CREATE VIEW public_v_disagreements WITH (security_barrier = true) AS
  SELECT id, disagreement_key, peptide_id, quality_topic_id, topic,
         plain_language_text, candidate_explanation, explanation_notes,
         resolution_requirement, published_at
  FROM disagreements
  WHERE workflow_status = 'published';
--> statement-breakpoint

CREATE VIEW public_v_disagreement_positions WITH (security_barrier = true) AS
  SELECT dp.id, dp.disagreement_id, dp.source_id, dp.source_location_id,
         dp.evidence_type_key, dp.position_text, dp.sort_order
  FROM disagreement_positions dp
  JOIN disagreements d ON d.id = dp.disagreement_id
  WHERE d.workflow_status = 'published';
--> statement-breakpoint

-- --- Publications, corrections, search ------------------------------------
CREATE VIEW public_v_publications WITH (security_barrier = true) AS
  SELECT id, publication_key, publication_type, title, slug, subtitle,
         audience, reading_mode, peptide_id, quality_topic_id, version,
         published_at, last_reviewed_at, evidence_cutoff_at,
         superseded_by_publication_id
  FROM publications
  WHERE status IN ('published', 'superseded');
--> statement-breakpoint

CREATE VIEW public_v_publication_sections WITH (security_barrier = true) AS
  SELECT s.id, s.publication_id, s.sort_order, s.heading, s.body_structured,
         s.audience, s.generated_from_claims
  FROM publication_sections s
  JOIN publications p ON p.id = s.publication_id
  WHERE p.status IN ('published', 'superseded');
--> statement-breakpoint

CREATE VIEW public_v_corrections WITH (security_barrier = true) AS
  SELECT id, correction_key, entity_type, entity_id, severity, what_changed,
         reason, identified_at, corrected_at
  FROM corrections
  WHERE is_public AND corrected_at IS NOT NULL;
--> statement-breakpoint

CREATE VIEW public_v_search_documents WITH (security_barrier = true) AS
  SELECT id, entity_type, entity_id, slug, title, subtitle, alias_text,
         body_text, peptide_id, peptide_slug, evidence_classes, route_keys,
         source_type_keys, category_key, is_human_evidence, search_vector
  FROM search_documents;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Grants on the public surface
-- ---------------------------------------------------------------------------
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
END
$$;
--> statement-breakpoint

-- Functions exposed to the public read path. Everything else stays internal.
REVOKE ALL ON FUNCTION tides_current_staff_role() FROM PUBLIC, anon;
--> statement-breakpoint
REVOKE ALL ON FUNCTION tides_has_approved_review(reviewable_entity_type, uuid, integer, review_type)
  FROM PUBLIC, anon;
--> statement-breakpoint
