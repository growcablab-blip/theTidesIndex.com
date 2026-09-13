-- Primary-source tracing, and who paid for the study.
--
-- Two absences the first-generation records exposed.
--
-- 1. TRACING. A great deal of what this index holds arrived through a
--    practitioner handbook that cites a study by superscript. `claim_evidence`
--    already carried a boolean for "someone opened the primary source", which
--    is not enough to be useful: the interesting states are that the citation
--    was never obtained, that only an abstract was read, and — once a full text
--    is read — whether it supports what the secondary source said about it.
--    A boolean cannot tell "nobody checked" from "checked and it did not
--    support the claim", and those are opposite facts.
--
-- 2. FUNDING. Who sponsored a study is context a reader is entitled to, and it
--    is not a quality score: industry funding does not invalidate a trial and
--    academic funding does not sanctify one. So this records what the source
--    discloses, including "not reported", and nothing derives a rating from it.

CREATE TYPE primary_trace_state AS ENUM (
  -- Nobody has looked. The honest default, and distinct from every state below.
  'not_attempted',
  -- The secondary source names a primary source that has not been obtained.
  'cited_not_obtained',
  -- The primary source was read at abstract level only. Design, setting and
  -- size are reliable at this depth; how outcomes were collected is not.
  'abstract_only',
  -- Full text read, and it says what the citing source said it says.
  'full_text_supports',
  -- Full text read, and it supports part of the claim but not all of it.
  'full_text_partially_supports',
  -- Full text read, and it does not support the claim.
  'full_text_does_not_support',
  -- Full text read, and it is about a different population, model, dose or
  -- question than the citing source implied.
  'full_text_different_context',
  -- The evidence row cites the primary study directly; there is no secondary
  -- characterisation standing between this index and the research.
  'primary_source_is_cited'
);
--> statement-breakpoint

ALTER TABLE claim_evidence
  ADD COLUMN primary_trace primary_trace_state NOT NULL DEFAULT 'not_attempted';
--> statement-breakpoint

ALTER TABLE claim_evidence
  ADD COLUMN primary_trace_note text;
--> statement-breakpoint

-- A verdict about a full text may not be recorded without saying what was read
-- and what it showed. The note is the audit trail for a state that contradicts
-- a practitioner source, which is exactly the state a reviewer will challenge.
ALTER TABLE claim_evidence
  ADD CONSTRAINT claim_evidence_trace_verdict_explained
  CHECK (
    primary_trace NOT IN (
      'full_text_supports', 'full_text_partially_supports',
      'full_text_does_not_support', 'full_text_different_context'
    )
    OR primary_trace_note IS NOT NULL
  );
--> statement-breakpoint

-- The existing boolean stays, and the two may not contradict each other: a
-- full-text verdict requires the boolean to agree that a full text was read.
--
-- Deliberately an implication rather than an equivalence. Rows predating this
-- migration carry the boolean without a state, and the honest reading of one
-- is "somebody recorded that a full text was read" — not any particular
-- verdict. Backfilling those to `full_text_supports` would manufacture a
-- reading nobody performed. They keep `not_attempted` until a packet states
-- otherwise, and the loader now derives the boolean from the state, so the
-- pairing converges on the next reseed.
ALTER TABLE claim_evidence
  ADD CONSTRAINT claim_evidence_verified_matches_trace
  CHECK (
    primary_trace NOT IN (
      'full_text_supports', 'full_text_partially_supports',
      'full_text_does_not_support', 'full_text_different_context'
    )
    OR primary_source_verified
  );
--> statement-breakpoint

CREATE INDEX claim_evidence_primary_trace_idx ON claim_evidence (primary_trace);
--> statement-breakpoint

-- The public view gains the state. `CREATE OR REPLACE` may only append
-- columns, in order, so the existing list is reproduced exactly.
CREATE OR REPLACE VIEW public_v_claim_evidence WITH (security_barrier = true) AS
  SELECT ce.id, ce.claim_id, ce.source_id, ce.source_location_id,
         ce.evidence_type_key, ce.relationship, ce.population_model,
         ce.route_key, ce.formulation, ce.interpretation,
         ce.primary_source_verified, ce.primary_trace, ce.primary_trace_note
  FROM claim_evidence ce
  JOIN claims c ON c.id = ce.claim_id
  JOIN sources s ON s.id = ce.source_id
  WHERE c.publication_state = 'published'
    AND s.qc_status <> 'exclude';
--> statement-breakpoint

-- --- Funding and conflicts ---------------------------------------------------

CREATE TYPE funding_kind AS ENUM (
  'industry',
  'government',
  'academic_institution',
  'foundation_or_charity',
  'mixed',
  'none_declared',
  'not_reported_in_source',
  'not_checked'
);
--> statement-breakpoint

CREATE TABLE study_funding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funding_key text NOT NULL UNIQUE,

  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  /* Where this was read. Null where the state is not_checked. */
  source_location_id uuid REFERENCES source_locations(id) ON DELETE SET NULL,

  funder_kind funding_kind NOT NULL,
  /* The sponsor as named by the source. Never inferred from the authors'
     affiliations, which is a different fact. */
  sponsor_name text,
  /* Whether a company that makes or sells the compound ran, funded or
     supplied the study. The question a reader actually has. */
  manufacturer_involved boolean,
  institution text,
  grant_reference text,
  /* The disclosure as the source words it. */
  disclosure_text text,
  notes text,

  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  /* A named sponsor requires a funder kind that can have one. "Not reported"
     with a sponsor name is a contradiction, and it is the shape a careless
     extraction takes. */
  CONSTRAINT study_funding_sponsor_consistent CHECK (
    sponsor_name IS NULL
    OR funder_kind NOT IN ('none_declared', 'not_reported_in_source', 'not_checked')
  ),
  /* Anything read from the source must say where. */
  CONSTRAINT study_funding_located CHECK (
    funder_kind IN ('not_checked')
    OR source_location_id IS NOT NULL
  )
);
--> statement-breakpoint

CREATE INDEX study_funding_source_idx ON study_funding (source_id);
--> statement-breakpoint

CREATE TRIGGER study_funding_a_touch BEFORE UPDATE ON study_funding
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint

CREATE VIEW public_v_study_funding WITH (security_barrier = true) AS
  SELECT f.id, f.funding_key, f.source_id, f.source_location_id, f.funder_kind,
         f.sponsor_name, f.manufacturer_involved, f.institution,
         f.grant_reference, f.disclosure_text, f.notes, f.version
    FROM study_funding f
    JOIN sources s ON s.id = f.source_id
   WHERE s.is_citable;
--> statement-breakpoint

-- The 0003 grant loop, repeated for the view added above.
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
