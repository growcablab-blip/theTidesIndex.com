ALTER TABLE "quality_topics" ADD COLUMN "evidence_cutoff_at" date;
--> statement-breakpoint

-- ===========================================================================
-- What a public quality page needs to be honest about itself.
--
-- Three additions, each closing a way the page could mislead:
--
--   `review_state` on the topic view, because "published" alone does not tell a
--   reader whether a person with the relevant expertise has read it. A page that
--   cannot say how far it has been checked invites the reader to assume the
--   most.
--
--   `evidence_cutoff_at`, because "last reviewed" answers when someone looked at
--   the wording, not how current the evidence is. Null where no survey has been
--   done, and the page says so rather than passing off a source's publication
--   year as a cutoff nobody performed.
--
--   `printed_page_offset` on the source view, so a citation can name the page of
--   the work AND the page of the copy this index holds without the two being
--   confused. A reader with any copy needs the first; anyone checking what was
--   actually read needs the second.
-- ===========================================================================

CREATE OR REPLACE VIEW public_v_quality_topics WITH (security_barrier = true) AS
  SELECT id, quality_key, name, slug, short_description, simple_summary,
         practitioner_summary, what_it_proves, what_it_does_not_prove,
         common_misinterpretations, version, published_at, last_reviewed_at,
         needs_update, sort_order,
         review_state,
         evidence_cutoff_at
  FROM quality_topics
  WHERE publication_state = 'published';
--> statement-breakpoint

CREATE OR REPLACE VIEW public_v_sources WITH (security_barrier = true) AS
  SELECT id, source_key, title, source_type_key, authors, publisher,
         publication_name, publication_date, year, edition, doi, pmid,
         trial_registry_id, isbn, canonical_url, qc_status, is_citable,
         primary_role, coverage_notes, authority_notes, limitations_notes,
         source_summary,
         -- Printed page + offset = page of the held copy. Never the file itself:
         -- no path, no filename, no hash, and no extracted text travels here.
         printed_page_offset
  FROM sources
  WHERE qc_status <> 'exclude';
