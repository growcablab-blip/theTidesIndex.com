-- ---------------------------------------------------------------------------
-- 0022 — a fact has conditions, and a conflict has a reason
--
-- The previous sprint traced an authoritative source and then made a mistake of
-- a kind this schema had no way to prevent: it read every difference between the
-- FDA label and a practitioner handbook as the label correcting an error.
--
-- Four of the five were not errors.
--
--   Half-life      8 minutes and 26/38 minutes are different products, different
--                  doses and single versus repeated administration. The FDA's own
--                  two current labels give 8 and 11 minutes for the same molecule.
--   Molecular      5135.9 is the free-base equivalent; 5195.908 is the molecule
--   weight         plus exactly one acetate. Different chemical forms.
--   Adverse        The handbook's "rash" is in the label's Table 1 at 4%. It was
--   effects        missing from a >5% summary bullet, which is a threshold, not
--                  a denial.
--   Neoplasms      The label is more specific than the handbook, not opposed to
--                  it — and the handbook is the stricter of the two on active
--                  malignancy.
--
-- The fifth, the jurisdiction, was not a source error either: the handbook says
-- "approved by US FDA in 2010" on the page after the one this index read. The
-- error was the index's own.
--
-- None of that was representable. A claim could hold a number and a citation but
-- not the conditions the number was measured under; a peptide had one molecular
-- description; a disagreement could name a candidate explanation but never say
-- that the explanation had been established. So this migration adds:
--
--   compound_products   the marketed formulation, distinct from the molecule
--   compound_forms      chemical form, formula and weight, with its basis
--   pk_observations     a PK result with the conditions that produced it
--   disagreement resolution, with a constraint requiring it to show its working
--   literature_screens  a search, its criteria, and every record it returned
--
-- The last one exists so that "no primary human study was identified" can be a
-- statement with a query, a date and a ledger behind it instead of a sentence.
-- ---------------------------------------------------------------------------

-- --- Products, distinct from the molecule ----------------------------------
--
-- EGRIFTA, EGRIFTA SV and EGRIFTA WR are three products of one molecule with
-- different strengths, reconstitution, storage, doses and pharmacokinetics, and
-- the labelling says in terms that they are not substitutable. Flattening them
-- into "tesamorelin" loses the only detail that makes a dose meaningful.

CREATE TABLE compound_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,

  product_name text NOT NULL,
  proprietary_name text,
  manufacturer text,

  -- Regulatory identity of this product, which is a property of the product
  -- and not of the molecule.
  authority text,
  jurisdiction text,
  application_number text,
  marketing_status text,

  -- Presentation. `presentation` is neutral; the four below reconstruct a dose
  -- and are withheld from patient mode in the query, like every other
  -- dose-bearing field in this schema.
  presentation text,
  strength_text text,
  reconstitution_text text,
  labelled_dose_text text,
  storage_text text,
  excipients_text text,

  substitutability_note text,
  notes text,

  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_location_id uuid REFERENCES source_locations(id) ON DELETE RESTRICT,

  review_state review_state NOT NULL DEFAULT 'unreviewed',
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  needs_update boolean NOT NULL DEFAULT false,
  needs_update_reason text,
  withdrawn_at timestamptz,
  superseded_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX compound_products_peptide_idx ON compound_products (peptide_id);
--> statement-breakpoint
CREATE INDEX compound_products_source_idx ON compound_products (source_id);
--> statement-breakpoint

-- --- Chemical form ---------------------------------------------------------
--
-- `weight_basis` is the column that would have prevented the error. A molecular
-- weight without it is ambiguous between the free base, the salt as supplied,
-- and the free-base equivalent of a salt — three numbers that differ by
-- hundreds of daltons and none of which is wrong.

CREATE TABLE compound_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,

  /* 'free base', 'acetate salt', 'monoacetate' — as the source states it. */
  chemical_form text NOT NULL,
  molecular_formula text,
  molecular_weight numeric(14, 4),
  /* What the weight is the weight OF. Required whenever a weight is given. */
  weight_basis text,
  form_stated_by_source boolean NOT NULL DEFAULT true,
  notes text,

  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_location_id uuid REFERENCES source_locations(id) ON DELETE RESTRICT,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT compound_forms_weight_has_basis
    CHECK (molecular_weight IS NULL
           OR (weight_basis IS NOT NULL AND btrim(weight_basis) <> ''))
);
--> statement-breakpoint

CREATE INDEX compound_forms_peptide_idx ON compound_forms (peptide_id);
--> statement-breakpoint

-- --- Pharmacokinetic observations ------------------------------------------
--
-- One row is one reported result under one set of conditions. There is no
-- column for "the half-life of tesamorelin" and there is not meant to be.

CREATE TYPE pk_administration AS ENUM ('single_dose', 'repeat_dose', 'not_stated');
--> statement-breakpoint

CREATE TABLE pk_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  observation_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,
  /* Which product, where the source names one. Null means the source did not. */
  product_id uuid REFERENCES compound_products(id) ON DELETE SET NULL,

  /* 'elimination half-life', 'volume of distribution', 'bioavailability'… */
  parameter text NOT NULL,
  /* Verbatim as reported. Never recalculated, never unit-converted. */
  value_text text NOT NULL,

  /* The conditions. `dose_context` reconstructs a dose and is treated as such. */
  dose_context text,
  administration pk_administration NOT NULL DEFAULT 'not_stated',
  population text NOT NULL,
  route_key text REFERENCES routes(key) ON UPDATE CASCADE,
  study_condition text,

  evidence_type_key text NOT NULL REFERENCES evidence_types(key) ON UPDATE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  source_location_id uuid REFERENCES source_locations(id) ON DELETE RESTRICT,
  notes text,

  review_state review_state NOT NULL DEFAULT 'unreviewed',
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  needs_update boolean NOT NULL DEFAULT false,
  needs_update_reason text,
  withdrawn_at timestamptz,
  superseded_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  published_at timestamptz,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX pk_observations_peptide_idx ON pk_observations (peptide_id);
--> statement-breakpoint
CREATE INDEX pk_observations_product_idx ON pk_observations (product_id);
--> statement-breakpoint
CREATE INDEX pk_observations_parameter_idx ON pk_observations (parameter);
--> statement-breakpoint

-- --- Disagreement: what kind of difference is it ---------------------------
--
-- `disagreement_explanation` already carried the axis of difference — route,
-- formulation, population, dose, study design, terminology, date. Two are
-- added, because the two errors this migration answers are on axes the enum
-- could not name.

ALTER TYPE disagreement_explanation ADD VALUE IF NOT EXISTS 'chemical_form';
--> statement-breakpoint
ALTER TYPE disagreement_explanation ADD VALUE IF NOT EXISTS 'reporting_threshold';
--> statement-breakpoint

-- The axis of difference and whether the difference has been *settled* are two
-- questions, and the old enum answered them in one column: 'unresolved' sat
-- alongside 'formulation' as though they were alternatives. They are not. A
-- disagreement can be explained by formulation and still unresolved, or
-- explained by formulation and closed.
CREATE TYPE disagreement_resolution AS ENUM (
  /* Nobody has established why the sources differ. */
  'unresolved',
  /* Established: they describe different products or presentations. */
  'resolved_different_formulation',
  /* Established: different populations. */
  'resolved_different_population',
  /* Established: different dose, duration, sampling or study state. */
  'resolved_different_study_condition',
  /* Established: free base, salt, or a salt's free-base equivalent. */
  'resolved_different_chemical_form',
  /* Established: one number is below a frequency cut-off the other applied.
     Absence from a threshold table is not a finding of absence. */
  'resolved_different_reporting_threshold',
  /* Established: a source states something that is false. Rare, and it should
     be — most apparent contradictions are not this. */
  'source_error_confirmed',
  /* The secondary source is not wrong, but reports without the qualifying
     detail that makes the value interpretable. */
  'secondary_source_less_precise',
  /* Both are accurate; the regulatory source is more specific, or binding,
     and controls the safety presentation for the approved product. */
  'regulatory_source_more_specific',
  /* The difference was created by this index misreading a source. Kept
     separate from source_error_confirmed because attributing an in-house
     extraction error to a source is itself a form of getting it wrong. */
  'index_error_confirmed'
);
--> statement-breakpoint

ALTER TABLE disagreements
  ADD COLUMN resolution disagreement_resolution NOT NULL DEFAULT 'unresolved',
  ADD COLUMN resolution_basis text,
  ADD COLUMN resolved_at date;
--> statement-breakpoint

-- A resolution has to show its working. Marking a conflict settled is the one
-- operation here that removes information from a reader's view, so it may not
-- be done silently.
ALTER TABLE disagreements
  ADD CONSTRAINT disagreements_resolution_shows_working
  CHECK (resolution = 'unresolved'::disagreement_resolution
         OR (resolution_basis IS NOT NULL AND btrim(resolution_basis) <> ''));
--> statement-breakpoint

-- --- Literature screens ----------------------------------------------------
--
-- A search result count is not evidence. It is the size of a universe that
-- somebody still has to read, and the previous sprint was right to say so and
-- wrong to leave it at a number in a sentence.
--
-- These two tables make the difference queryable: `result_count` is how many
-- records the query returned, and what may be said about the compound comes
-- from the classified rows, never from that number.

CREATE TABLE literature_screens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE CASCADE,

  database_name text NOT NULL,
  query_text text NOT NULL,
  search_date date NOT NULL,
  /* Records the query returned. NOT a count of studies, and nothing public
     may present it as one. */
  result_count integer NOT NULL,
  deduplication_notes text NOT NULL,
  inclusion_criteria text NOT NULL,
  human_primary_criteria text NOT NULL,
  notes text,

  review_state review_state NOT NULL DEFAULT 'unreviewed',
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT literature_screens_count_nonnegative CHECK (result_count >= 0)
);
--> statement-breakpoint

CREATE INDEX literature_screens_peptide_idx ON literature_screens (peptide_id);
--> statement-breakpoint

CREATE TYPE screen_study_type AS ENUM (
  'human_interventional',
  'human_observational',
  'case_report',
  'human_pk_safety',
  'animal_in_vivo',
  'ex_vivo',
  'in_vitro',
  'review',
  'commentary_editorial',
  'other_peripheral',
  'withdrawn'
);
--> statement-breakpoint

CREATE TABLE literature_screen_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  screen_id uuid NOT NULL REFERENCES literature_screens(id) ON DELETE CASCADE,

  external_id text NOT NULL,
  external_id_type text NOT NULL DEFAULT 'pmid',
  title text NOT NULL,
  publication_year integer,
  journal text,
  publication_types text,

  study_type screen_study_type NOT NULL,
  evidence_class text NOT NULL,
  included boolean NOT NULL,
  primary_or_secondary text NOT NULL,
  peptide_identity_certainty text NOT NULL,
  full_text_status text NOT NULL DEFAULT 'abstract_only',
  /* 'rule' or 'manual'. A reader can see which rows a person decided. */
  classified_by text NOT NULL,
  reason text NOT NULL,

  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT literature_screen_records_unique UNIQUE (screen_id, external_id),
  CONSTRAINT literature_screen_records_class
    CHECK (evidence_class IN ('human', 'preclinical', 'not_evidence')),
  CONSTRAINT literature_screen_records_primacy
    CHECK (primary_or_secondary IN ('primary', 'secondary')),
  CONSTRAINT literature_screen_records_classifier
    CHECK (classified_by IN ('rule', 'manual'))
);
--> statement-breakpoint

CREATE INDEX literature_screen_records_screen_idx
  ON literature_screen_records (screen_id);
--> statement-breakpoint
CREATE INDEX literature_screen_records_type_idx
  ON literature_screen_records (study_type);
--> statement-breakpoint

-- --- Touch triggers --------------------------------------------------------

CREATE TRIGGER compound_products_a_touch BEFORE UPDATE ON compound_products
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER pk_observations_a_touch BEFORE UPDATE ON pk_observations
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint
CREATE TRIGGER literature_screens_a_touch BEFORE UPDATE ON literature_screens
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version();
--> statement-breakpoint

-- --- Public views ----------------------------------------------------------
--
-- Read through the same relation-switching pattern as everything else: the
-- public view is the only relation a public query touches, and a record reaches
-- it by being published on a compound that is published and not a fixture.

CREATE VIEW public_v_compound_products WITH (security_barrier = true) AS
  SELECT cp.id, cp.product_key, cp.peptide_id, cp.product_name,
         cp.proprietary_name, cp.manufacturer, cp.authority, cp.jurisdiction,
         cp.application_number, cp.marketing_status, cp.presentation,
         cp.strength_text, cp.reconstitution_text, cp.labelled_dose_text,
         cp.storage_text, cp.excipients_text, cp.substitutability_note,
         cp.notes, cp.source_id, cp.source_location_id, cp.version,
         cp.published_at, cp.last_reviewed_at
    FROM compound_products cp
    JOIN peptides p ON p.id = cp.peptide_id
   WHERE cp.publication_state = 'published'::publication_state_value
     AND p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_compound_forms WITH (security_barrier = true) AS
  SELECT cf.id, cf.form_key, cf.peptide_id, cf.chemical_form,
         cf.molecular_formula, cf.molecular_weight, cf.weight_basis,
         cf.form_stated_by_source, cf.notes, cf.source_id, cf.source_location_id
    FROM compound_forms cf
    JOIN peptides p ON p.id = cf.peptide_id
   WHERE p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_pk_observations WITH (security_barrier = true) AS
  SELECT o.id, o.observation_key, o.peptide_id, o.product_id, o.parameter,
         o.value_text, o.dose_context, o.administration, o.population,
         o.route_key, o.study_condition, o.evidence_type_key, o.source_id,
         o.source_location_id, o.notes, o.version, o.published_at,
         o.last_reviewed_at
    FROM pk_observations o
    JOIN peptides p ON p.id = o.peptide_id
   WHERE o.publication_state = 'published'::publication_state_value
     AND p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_literature_screens WITH (security_barrier = true) AS
  SELECT s.id, s.screen_key, s.peptide_id, s.database_name, s.query_text,
         s.search_date, s.result_count, s.deduplication_notes,
         s.inclusion_criteria, s.human_primary_criteria, s.notes, s.version
    FROM literature_screens s
    JOIN peptides p ON p.id = s.peptide_id
   WHERE s.publication_state = 'published'::publication_state_value
     AND p.publication_state = 'published'::publication_state_value
     AND NOT p.is_demonstration;
--> statement-breakpoint

CREATE VIEW public_v_literature_screen_records WITH (security_barrier = true) AS
  SELECT r.id, r.screen_id, r.external_id, r.external_id_type, r.title,
         r.publication_year, r.journal, r.publication_types, r.study_type,
         r.evidence_class, r.included, r.primary_or_secondary,
         r.peptide_identity_certainty, r.full_text_status, r.classified_by,
         r.reason
    FROM literature_screen_records r
    JOIN public_v_literature_screens s ON s.id = r.screen_id;
--> statement-breakpoint

-- The disagreement view gains the resolution, which is the part a reader most
-- needs: "these values differ because they were measured under different
-- conditions" is a far more useful thing to be told than two numbers.
CREATE OR REPLACE VIEW public_v_disagreements WITH (security_barrier = true) AS
  SELECT id, disagreement_key, peptide_id, quality_topic_id, topic,
         plain_language_text, candidate_explanation, explanation_notes,
         resolution_requirement, published_at, resolution, resolution_basis,
         resolved_at
  FROM disagreements
  WHERE publication_state = 'published';
