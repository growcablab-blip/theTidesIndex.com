-- ---------------------------------------------------------------------------
-- 0021 — a demonstration record is not public
--
-- The demonstration fixture exists so the compound pages have something to
-- render in development, and it flowed through the real publish gates, which
-- was the point. What nobody checked is where it surfaced: it was the only
-- published compound, so the public directory listed it, the search index
-- returned it, and the front page counted it as "1 compound published".
--
-- That last one is the serious version. A reader arriving at the site was told
-- that something had been published, traced and reviewed. Nothing had.
--
-- The fixture is not deleted — it is the only way to exercise the published
-- path locally. It is removed from the *public* views, so it remains reachable
-- through the editorial and development surfaces and nowhere else.
--
-- `public_v_certificates` already did this, from migration 0013. This applies
-- the same rule everywhere else it belongs.
-- ---------------------------------------------------------------------------

-- --- Compounds -------------------------------------------------------------

CREATE OR REPLACE VIEW public_v_peptides WITH (security_barrier = true) AS
  SELECT id, peptide_key, canonical_name, slug, compound_type_key,
         primary_category_key, natural_or_synthetic, molecular_description,
         sequence, short_description, simple_summary, practitioner_summary,
         unknowns_summary, version, published_at, last_reviewed_at,
         evidence_cutoff_at, needs_update
    FROM peptides
   WHERE publication_state = 'published'::publication_state_value
     AND NOT is_demonstration;
--> statement-breakpoint

-- The register lists what is in scope, published or not, so it needs the same
-- exclusion for a different reason: a demonstration compound is not in scope.
CREATE OR REPLACE VIEW public_v_peptide_register WITH (security_barrier = true) AS
  SELECT id, peptide_key, canonical_name, slug, compound_type_key,
         primary_category_key,
         publication_state = 'published'::publication_state_value AS has_published_record,
         simple_summary IS NOT NULL OR practitioner_summary IS NOT NULL AS has_draft_summary,
         ((SELECT count(*) FROM claims c WHERE c.peptide_id = p.id))::integer
           AS draft_claim_count,
         ((SELECT count(*) FROM protocols pr WHERE pr.peptide_id = p.id))::integer
           AS draft_protocol_count
    FROM peptides p
   WHERE review_state <> 'rejected'::review_state
     AND NOT is_demonstration;
--> statement-breakpoint

-- --- Quality topics --------------------------------------------------------

CREATE OR REPLACE VIEW public_v_quality_topics WITH (security_barrier = true) AS
  SELECT id, quality_key, name, slug, short_description, simple_summary,
         practitioner_summary, what_it_proves, what_it_does_not_prove,
         common_misinterpretations, version, published_at, last_reviewed_at,
         needs_update, sort_order, review_state, evidence_cutoff_at
    FROM quality_topics
   WHERE publication_state = 'published'::publication_state_value
     AND NOT is_demonstration;
--> statement-breakpoint

DROP VIEW IF EXISTS public_v_quality_register;--> statement-breakpoint

CREATE VIEW public_v_quality_register WITH (security_barrier = true) AS
  SELECT q.id,
         q.quality_key,
         q.name,
         q.slug,
         q.family,
         q.sort_order,
         q.review_state,
         q.publication_state,
         (q.publication_state = 'published') AS is_published,
         q.needs_update,
         (SELECT count(*) FROM claims c WHERE c.quality_topic_id = q.id)::int AS claim_count,
         (SELECT count(*) FROM evidence_gaps g WHERE g.quality_topic_id = q.id)::int AS gap_count,
         (SELECT count(*) FROM quality_relationships r WHERE r.from_topic_id = q.id)::int
           AS relationship_count,
         (SELECT vi.issue_key
            FROM verification_issues vi
           WHERE vi.status = 'open'
             AND vi.related_keys ? ('quality_topic:' || q.quality_key)
           ORDER BY vi.issue_key
           LIMIT 1) AS open_issue_key
    FROM quality_topics q
   WHERE NOT q.is_demonstration;
--> statement-breakpoint

GRANT SELECT ON public_v_quality_register TO anon, authenticated;--> statement-breakpoint

-- --- Sources ---------------------------------------------------------------
-- The demonstration dataset registers sources whose names announce them as
-- demonstrations. They are still not this index's sources.
CREATE OR REPLACE VIEW public_v_sources WITH (security_barrier = true) AS
  SELECT id, source_key, title, source_type_key, authors, publisher,
         publication_name, publication_date, year, edition, doi, pmid,
         trial_registry_id, isbn, canonical_url, qc_status, is_citable,
         primary_role, coverage_notes, authority_notes, limitations_notes,
         source_summary, printed_page_offset
    FROM sources
   WHERE qc_status <> 'exclude'::source_qc_status
     AND NOT is_demonstration;
--> statement-breakpoint

-- --- Claims ----------------------------------------------------------------
-- Claims carry no flag of their own: a claim is a demonstration claim exactly
-- when its subject is a demonstration record. Deriving it rather than adding a
-- column keeps the two from disagreeing.
CREATE OR REPLACE VIEW public_v_claims WITH (security_barrier = true) AS
  SELECT c.id, c.claim_key, c.peptide_id, c.quality_topic_id, c.claim_text,
         c.plain_language_text, c.claim_category, c.importance,
         c.interpretation_notes, c.uncertainty_text,
         c.is_editorial_non_evidentiary, c.version, c.published_at,
         c.last_reviewed_at, c.needs_update, c.certificate_type_scope
    FROM claims c
   WHERE c.publication_state = 'published'::publication_state_value
     AND NOT EXISTS (
       SELECT 1 FROM peptides p WHERE p.id = c.peptide_id AND p.is_demonstration
     )
     AND NOT EXISTS (
       SELECT 1 FROM quality_topics q
        WHERE q.id = c.quality_topic_id AND q.is_demonstration
     );
--> statement-breakpoint

-- --- Search ----------------------------------------------------------------
-- The search index is built from whatever exists; the public view is what may
-- be returned. Filtering here rather than at indexing time means a fixture
-- loaded after the index was built cannot leak into results.
CREATE OR REPLACE VIEW public_v_search_documents WITH (security_barrier = true) AS
  SELECT d.*
    FROM search_documents d
   WHERE NOT EXISTS (
       SELECT 1 FROM peptides p
        WHERE p.is_demonstration
          AND (p.id = d.entity_id OR p.id = d.peptide_id)
     )
     AND NOT EXISTS (
       SELECT 1 FROM quality_topics q
        WHERE q.is_demonstration AND q.id = d.entity_id
     )
     AND NOT EXISTS (
       SELECT 1 FROM sources s WHERE s.is_demonstration AND s.id = d.entity_id
     );
