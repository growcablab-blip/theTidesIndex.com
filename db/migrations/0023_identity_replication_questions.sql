-- ---------------------------------------------------------------------------
-- 0023 — what a name refers to, whether anyone repeated it, and what to ask next
--
-- Three additions, all forced by the same compound.
--
-- Verification issue V-001 has sat open since the first migration: practitioner
-- sources use "TB-500" and "Thymosin beta-4" interchangeably, and the register
-- recorded the alias as `related_but_distinct` without being able to say what
-- the relationship actually is. The analytical literature settles it — TB-500 is
-- the N-terminally acetylated 17–23 fragment, Ac-LKKTETQ, seven residues of a
-- forty-three residue protein — and nothing in this schema could record that a
-- name had been *resolved to a chemical form by a named source*, which is a
-- different statement from an alias.
--
--   compound_identity_claims   what a name refers to, per source
--
-- The second: Thymosin beta-4 has human trials. Two independent Phase I safety
-- studies, on two continents, on two different preparations, five orders of
-- magnitude apart in dose. That is replication, and it is a far more important
-- fact than the number of papers — which the register could only have counted.
--
--   replication_assessments    single study, same group, independent, human
--
-- The third: the platform's purpose is to help people see what is worth
-- researching next, and every gap already records what would resolve it. What
-- was missing was the shape of the question, so that a gap could become a
-- research opportunity rather than only a caveat.
--
--   evidence_gaps.research_question / opportunity_type
--
-- Plus three columns on screened records — country, language and research group
-- — because "is this replicated" and "is this one laboratory" cannot be asked of
-- a ledger that does not know who wrote what, and because evidence must not be
-- ranked by the country it came from, which requires knowing the country.
-- ---------------------------------------------------------------------------

-- --- What a name refers to --------------------------------------------------
--
-- One row is one source's statement about what a name denotes. The table exists
-- because an alias cannot carry evidence: `related_but_distinct` records that
-- two names travel together and says nothing about chemistry, which was the
-- right conservative answer for three years and is no longer the best available
-- one.

CREATE TYPE identity_form AS ENUM (
  /* The complete molecule as originally characterised. */
  'full_length',
  /* A defined subsequence of it. */
  'fragment',
  /* A modified or engineered variant. */
  'analogue',
  /* A preparation whose contents are stated but not chemically defined. */
  'preparation',
  /* The source uses the name without saying what it denotes. */
  'unspecified'
);
--> statement-breakpoint

CREATE TYPE identity_verification AS ENUM (
  /* An analytical measurement of the substance itself. */
  'analytically_characterised',
  /* A primary study stating the sequence it used. */
  'stated_by_primary_source',
  /* A review or handbook repeating it. */
  'stated_by_secondary_source',
  /* Asserted with no chemical detail given. */
  'asserted_without_detail',
  /* The source contradicts better-supported evidence. */
  'contradicted'
);
--> statement-breakpoint

CREATE TABLE compound_identity_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,

  /* The name exactly as the source writes it. */
  name_used text NOT NULL,
  chemical_form text,
  sequence text,
  residue_count integer,
  molecular_weight numeric(14, 4),
  weight_basis text,
  form identity_form NOT NULL DEFAULT 'unspecified',
  verification identity_verification NOT NULL DEFAULT 'asserted_without_detail',
  /* Where the source is using the name: a study, a product label, a regimen. */
  usage_context text NOT NULL,
  notes text,

  evidence_type_key text NOT NULL REFERENCES evidence_types(key) ON UPDATE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_location_id uuid REFERENCES source_locations(id) ON DELETE RESTRICT,

  review_state review_state NOT NULL DEFAULT 'unreviewed',
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  /* A weight still has to say what it is the weight of. Same rule as
     compound_forms, and for the same reason. */
  CONSTRAINT compound_identity_weight_has_basis
    CHECK (molecular_weight IS NULL
           OR (weight_basis IS NOT NULL AND btrim(weight_basis) <> '')),
  /* A residue count and a sequence must agree when both are given. Cheap, and
     it catches the specific error this table was built to prevent: a source
     that names a fragment and prints the parent's length. */
  CONSTRAINT compound_identity_residue_count_agrees
    CHECK (sequence IS NULL OR residue_count IS NULL
           OR residue_count = length(regexp_replace(sequence, '[^A-Za-z]', '', 'g')))
);
--> statement-breakpoint

CREATE INDEX compound_identity_claims_peptide_idx ON compound_identity_claims (peptide_id);
--> statement-breakpoint
CREATE INDEX compound_identity_claims_name_idx ON compound_identity_claims (name_used);
--> statement-breakpoint

-- --- Replication ------------------------------------------------------------
--
-- Deliberately not a paper count. The states are ordered by what they let a
-- reader conclude, and the ordering is the point: forty papers from one
-- laboratory is a weaker position than two from two.

CREATE TYPE replication_state AS ENUM (
  'single_study',
  'repeated_same_group',
  'independent_group',
  'independent_multiple_countries',
  'confirmed_in_humans',
  'conflicting_replication',
  'failed_replication',
  'not_assessed'
);
--> statement-breakpoint

CREATE TABLE replication_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,

  /* The finding whose replication is being assessed, stated neutrally. */
  finding text NOT NULL,
  state replication_state NOT NULL DEFAULT 'not_assessed',
  /* Counts are supporting detail, never the assessment itself. */
  study_count integer,
  group_count integer,
  country_count integer,
  models text,
  human_confirmed boolean NOT NULL DEFAULT false,
  /* What the state rests on. Required: a replication claim with no working
     shown is an opinion wearing a taxonomy. */
  basis text NOT NULL,
  limitations text,
  /* External identifiers of the records the assessment rests on. */
  supporting_records text,

  review_state review_state NOT NULL DEFAULT 'unreviewed',
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT replication_counts_nonnegative
    CHECK (coalesce(study_count, 0) >= 0 AND coalesce(group_count, 0) >= 0
           AND coalesce(country_count, 0) >= 0),
  /* A claim of independent replication needs more than one group behind it. */
  CONSTRAINT replication_independent_needs_groups
    CHECK (state NOT IN ('independent_group', 'independent_multiple_countries')
           OR coalesce(group_count, 0) >= 2)
);
--> statement-breakpoint

CREATE INDEX replication_assessments_peptide_idx ON replication_assessments (peptide_id);
--> statement-breakpoint

-- --- Research questions ------------------------------------------------------
--
-- Carried on the gap rather than in a table of their own, so a question cannot
-- exist without the recorded absence that motivates it. "What would be useful
-- to study" is the platform's purpose stated as a field; "what someone should
-- try" is not, and the distinction is why this hangs off a gap.

ALTER TABLE evidence_gaps
  ADD COLUMN research_question text,
  ADD COLUMN opportunity_type text;
--> statement-breakpoint

ALTER TABLE evidence_gaps
  ADD CONSTRAINT evidence_gaps_opportunity_type_known
  CHECK (opportunity_type IS NULL OR opportunity_type IN (
    'identity_clarification',
    'human_evidence',
    'human_safety',
    'human_pharmacokinetics',
    'route_comparison',
    'formulation_comparison',
    'dose_response',
    'independent_replication',
    'long_term_outcomes',
    'mechanism_confirmation',
    'protocol_validation',
    'product_characterisation',
    'regulatory_position'
  ));
--> statement-breakpoint

-- A question without a type, or a type without a question, is half a record.
ALTER TABLE evidence_gaps
  ADD CONSTRAINT evidence_gaps_question_and_type_together
  CHECK ((research_question IS NULL) = (opportunity_type IS NULL));
--> statement-breakpoint

-- --- Three study types the first screen did not need -------------------------
--
-- `human_biomarker` is the dominant category in the Thymosin beta-4 corpus and
-- had nowhere to go: 603 of 1,112 records carry the MeSH heading "Humans"
-- because the peptide is one the human body already makes, and almost none of
-- them administered anything. Filing those as human evidence would have
-- inverted the compound's entire evidence picture.
--
-- `analytical_method` is most of the TB-500 corpus: a substance studied in order
-- to be detected in doping control is not a substance studied for effect.
--
-- `false_match` is what eight of TB-500's thirty-one records are — a feed
-- additive, a tuberculosis case count, a tablet price table. Marked rather than
-- deleted, because they are 26% of the result and the clearest demonstration
-- available that a search total is not a body of evidence.
ALTER TYPE screen_study_type ADD VALUE IF NOT EXISTS 'human_biomarker';
--> statement-breakpoint
ALTER TYPE screen_study_type ADD VALUE IF NOT EXISTS 'analytical_method';
--> statement-breakpoint
ALTER TYPE screen_study_type ADD VALUE IF NOT EXISTS 'false_match';
--> statement-breakpoint

-- --- A screen may be stratified ---------------------------------------------
--
-- The BPC-157 corpus was 230 records and every one of them is in the ledger.
-- Thymosin beta-4 is 1,112, which cannot be hand-adjudicated and should not be
-- rule-classified and presented as though it had been.
--
-- So a screen now carries two numbers: what the query returned, and what the
-- ledger actually classifies. A stratified screen says which stratum it took,
-- and the difference between the two figures is visible rather than implied.
ALTER TABLE literature_screens
  ADD COLUMN screened_count integer,
  ADD COLUMN stratum text;
--> statement-breakpoint

-- Backfilled for the census screens, where the two are the same number.
UPDATE literature_screens SET screened_count = result_count WHERE screened_count IS NULL;
--> statement-breakpoint

ALTER TABLE literature_screens
  ADD CONSTRAINT literature_screens_screened_within_result
  CHECK (screened_count IS NULL OR (screened_count >= 0 AND screened_count <= result_count));
--> statement-breakpoint

-- A screen that classified less than its whole result set must say which part
-- it took. Otherwise a partial ledger reads as a complete one.
ALTER TABLE literature_screens
  ADD CONSTRAINT literature_screens_stratum_declared
  CHECK (screened_count IS NULL OR screened_count = result_count
         OR (stratum IS NOT NULL AND btrim(stratum) <> ''));
--> statement-breakpoint

-- --- Screened records gain provenance ---------------------------------------

ALTER TABLE literature_screen_records
  ADD COLUMN country text,
  ADD COLUMN language text,
  ADD COLUMN research_group text;
--> statement-breakpoint

-- --- Touch triggers ----------------------------------------------------------

CREATE TRIGGER compound_identity_claims_a_touch BEFORE UPDATE ON compound_identity_claims
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER replication_assessments_a_touch BEFORE UPDATE ON replication_assessments
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint

-- --- Public views ------------------------------------------------------------

CREATE OR REPLACE VIEW public_v_literature_screens WITH (security_barrier = true) AS
  SELECT s.id, s.screen_key, s.peptide_id, s.database_name, s.query_text,
         s.search_date, s.result_count, s.deduplication_notes,
         s.inclusion_criteria, s.human_primary_criteria, s.notes, s.version,
         s.screened_count, s.stratum
    FROM literature_screens s
    JOIN peptides p ON p.id = s.peptide_id
   WHERE s.publication_state = 'published'::publication_state_value
     AND p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_compound_identity_claims WITH (security_barrier = true) AS
  SELECT c.id, c.identity_key, c.peptide_id, c.name_used, c.chemical_form,
         c.sequence, c.residue_count, c.molecular_weight, c.weight_basis,
         c.form, c.verification, c.usage_context, c.notes, c.evidence_type_key,
         c.source_id, c.source_location_id, c.version
    FROM compound_identity_claims c
    JOIN peptides p ON p.id = c.peptide_id
   WHERE p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_replication_assessments WITH (security_barrier = true) AS
  SELECT r.id, r.assessment_key, r.peptide_id, r.finding, r.state,
         r.study_count, r.group_count, r.country_count, r.models,
         r.human_confirmed, r.basis, r.limitations, r.supporting_records,
         r.version
    FROM replication_assessments r
    JOIN peptides p ON p.id = r.peptide_id
   WHERE r.publication_state = 'published'::publication_state_value
     AND p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

-- The gap view gains the question. `CREATE OR REPLACE` may only append
-- columns, in order, so the existing list is reproduced exactly and the two new
-- columns go on the end.
CREATE OR REPLACE VIEW public_v_evidence_gaps WITH (security_barrier = true) AS
  SELECT g.id, g.gap_key, g.quality_topic_id, g.peptide_id, g.statement,
         g.why_not_supported, g.what_would_resolve_it, g.verification_issue_key,
         g.sort_order, g.gap_type, g.research_question, g.opportunity_type
  FROM evidence_gaps g
  LEFT JOIN quality_topics q ON q.id = g.quality_topic_id
  LEFT JOIN peptides p ON p.id = g.peptide_id
  WHERE q.publication_state = 'published'
     OR p.publication_state = 'published';
--> statement-breakpoint

CREATE OR REPLACE VIEW public_v_literature_screen_records WITH (security_barrier = true) AS
  SELECT r.id, r.screen_id, r.external_id, r.external_id_type, r.title,
         r.publication_year, r.journal, r.publication_types, r.study_type,
         r.evidence_class, r.included, r.primary_or_secondary,
         r.peptide_identity_certainty, r.full_text_status, r.classified_by,
         r.reason, r.country, r.language, r.research_group
    FROM literature_screen_records r
    JOIN public_v_literature_screens s ON s.id = r.screen_id;
