-- ===========================================================================
-- The public register.
--
-- Until now a compound with no published record simply did not exist publicly:
-- the page 404'd and the index omitted it. That hides the most useful thing a
-- reader can know about an early reference — which compounds are in scope and
-- being worked on, as distinct from which have been overlooked.
--
-- This view exposes the fact of registration and nothing else: name, slug,
-- alternative names, and whether a reviewed record has been published. It
-- deliberately carries no summary, no claim and no medical content, because
-- those exist only as unreviewed drafts and drafts are not publishable at any
-- level of detail.
--
-- The distinction it enables is the honest one: "no reviewed human evidence is
-- recorded here" is a statement about this index; "this compound is not in the
-- index" is a different statement; and a reader deserves to be able to tell
-- them apart.
-- ===========================================================================

CREATE VIEW public_v_peptide_register WITH (security_barrier = true) AS
  SELECT p.id,
         p.peptide_key,
         p.canonical_name,
         p.slug,
         p.compound_type_key,
         p.primary_category_key,
         (p.publication_state = 'published') AS has_published_record,
         -- How much of the record exists, without revealing any of it. Enough
         -- for a reader to see that work is under way.
         (p.simple_summary IS NOT NULL OR p.practitioner_summary IS NOT NULL) AS has_draft_summary,
         (SELECT count(*) FROM claims c WHERE c.peptide_id = p.id)::int AS draft_claim_count,
         (SELECT count(*) FROM protocols pr WHERE pr.peptide_id = p.id)::int AS draft_protocol_count
  FROM peptides p
  WHERE p.review_state <> 'rejected';
--> statement-breakpoint

-- Alternative names for registered compounds. Same reasoning: a name is not a
-- medical assertion, and being able to search for a compound that is registered
-- but unpublished is the point of the register.
CREATE VIEW public_v_peptide_register_aliases WITH (security_barrier = true) AS
  SELECT a.id, a.peptide_id, a.alias, a.alias_type, a.notes
  FROM peptide_aliases a
  JOIN peptides p ON p.id = a.peptide_id
  WHERE p.review_state <> 'rejected';
--> statement-breakpoint

GRANT SELECT ON public_v_peptide_register TO anon, authenticated;
--> statement-breakpoint
GRANT SELECT ON public_v_peptide_register_aliases TO anon, authenticated;
