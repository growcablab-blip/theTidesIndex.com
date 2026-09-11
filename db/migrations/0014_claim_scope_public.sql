-- ===========================================================================
-- The scope of a certificate requirement travels with it to the reader.
--
-- A requirement shown without the document type it governs is read as
-- universal. ICH Q7 §11.4 is not universal — it addresses certificates for
-- active pharmaceutical ingredients and intermediates — and the whole reason
-- `certificate_type_scope` exists is so that cannot be lost. It was reaching
-- the database and stopping there, which is the half that does no good.
-- ===========================================================================

CREATE OR REPLACE VIEW public_v_claims WITH (security_barrier = true) AS
  SELECT id, claim_key, peptide_id, quality_topic_id, claim_text,
         plain_language_text, claim_category, importance, interpretation_notes,
         uncertainty_text, is_editorial_non_evidentiary, version, published_at,
         last_reviewed_at, needs_update,
         certificate_type_scope
  FROM claims
  WHERE publication_state = 'published';
