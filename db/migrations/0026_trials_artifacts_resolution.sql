-- Trials, held artifacts, gap resolution and learning topics.
--
-- Four things the 14 September 2026 source batch could not be recorded without.
--
-- 1. ARTIFACTS. A source is a work; an artifact is a file somebody holds. They
--    were one row, which could not say that the owner's Word document is a
--    transcription of an article rather than the article, that two downloads of
--    a USP chapter are the same bytes, or that a file named for a textbook is an
--    advertisement. `source_artifacts` records each file considered, what it
--    turned out to be, and whether it is the working copy.
--
-- 2. TRIALS. A publication, a registry record, a protocol, a statistical plan
--    and a substudy of one trial are five sources and one trial. Counting them as
--    five trials inflates replication; keeping them unlinked hides that a
--    liver-fat paper and an obesity paper share participants. `clinical_trials`
--    is the trial; `trial_documents` says which source answers which question.
--
-- 3. COMPARISONS. Journal, registry, protocol and plan answer different
--    questions, and none outranks the others. Where two of them report the same
--    thing differently the difference is itself evidence, so it is recorded
--    against both exact locations rather than resolved by picking one.
--
-- 4. RESOLUTION. A gap closed by new evidence must not simply vanish: a reader
--    who saw it yesterday is owed the record of what closed it. Gaps now carry a
--    resolution state and the note that justifies it.

-- --- 0. Versioning for tables without editorial state -------------------------
--
-- `tides_touch_and_version` (0002) bumps `version` on a material edit and then
-- demotes `review_state`, because approvals are recorded against a version. It
-- dereferences NEW.review_state unconditionally inside that branch, so on a
-- table without the column any material UPDATE fails with
-- 'record "new" has no field "review_state"'. The tables below carry a version
-- but no review state of their own, and `study_funding` (0025) was attached to
-- the stateful function by mistake: a correction to a funding row would have
-- failed. Re-seeding identical content never enters the branch, which is why
-- no test caught it until one edited a row.
CREATE OR REPLACE FUNCTION tides_touch_and_version_plain()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  k_ignored text[] := ARRAY['version', 'created_at', 'updated_at'];
BEGIN
  NEW.updated_at := now();
  IF (to_jsonb(OLD) - k_ignored) IS DISTINCT FROM (to_jsonb(NEW) - k_ignored) THEN
    NEW.version := OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

DROP TRIGGER study_funding_a_touch ON study_funding;
--> statement-breakpoint

CREATE TRIGGER study_funding_a_touch BEFORE UPDATE ON study_funding
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_plain();
--> statement-breakpoint

-- --- 1. Artifacts --------------------------------------------------------------

CREATE TYPE artifact_kind AS ENUM (
  'publisher_version',
  'issuer_download',
  'registry_document',
  'registry_snapshot',
  'research_copy_unverified_distribution',
  'owner_transcription',
  'partial_translated_copy',
  'machine_translated_derivative',
  'index_only',
  'advertisement',
  'mislabelled_file',
  'duplicate',
  'supplementary_material'
);
--> statement-breakpoint

CREATE TYPE artifact_disposition AS ENUM (
  -- The file citations on its source resolve against.
  'working_copy',
  -- Kept and described, but nothing is cited from it.
  'retained_reference',
  -- A duplicate or derivative left in the intake folder.
  'not_retained',
  -- Not the work it claims to be, or unusable.
  'rejected'
);
--> statement-breakpoint

CREATE TYPE artifact_verification AS ENUM (
  'matched_to_issuer',
  'title_page_verified',
  'abstract_verified_body_unverified',
  'transcription_unverified',
  'not_verified',
  'identity_refuted'
);
--> statement-breakpoint

CREATE TABLE source_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_key text NOT NULL UNIQUE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE CASCADE,

  artifact_kind artifact_kind NOT NULL,
  disposition artifact_disposition NOT NULL,
  verification artifact_verification NOT NULL,

  /* The filename as received. Private: never exposed by a public view. */
  filename text NOT NULL,
  sha256 text NOT NULL,
  bytes integer,
  page_count integer,
  language text,

  /* Where it came from: the owner's intake, or a named download. */
  acquired_from text NOT NULL,
  acquired_at date,
  duplicate_of_artifact_key text,
  /* How the copy reached its supplier, where that is not the issuer. */
  distribution_provenance text,
  notes text,
  /* What a reader may be told about the copy held. */
  public_note text,

  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT source_artifacts_sha256_shape CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  /* A file whose identity is refuted, or which nobody has verified, cannot be
     the copy citations resolve against. */
  CONSTRAINT source_artifacts_working_copy_verified CHECK (
    disposition <> 'working_copy'
    OR verification IN ('matched_to_issuer', 'title_page_verified')
  ),
  /* A transcription is never quietly promoted to the article it transcribes. */
  CONSTRAINT source_artifacts_transcription_not_verified CHECK (
    artifact_kind <> 'owner_transcription'
    OR verification IN ('transcription_unverified', 'abstract_verified_body_unverified')
  ),
  CONSTRAINT source_artifacts_duplicate_names_original CHECK (
    artifact_kind <> 'duplicate' OR duplicate_of_artifact_key IS NOT NULL OR notes IS NOT NULL
  )
);
--> statement-breakpoint

CREATE UNIQUE INDEX source_artifacts_one_working_copy
  ON source_artifacts (source_id) WHERE disposition = 'working_copy';
--> statement-breakpoint

CREATE INDEX source_artifacts_source_idx ON source_artifacts (source_id);
--> statement-breakpoint

CREATE TRIGGER source_artifacts_a_touch BEFORE UPDATE ON source_artifacts
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_plain();
--> statement-breakpoint

-- No filename, no hash: what kind of copy is held, and how far it was verified.
CREATE VIEW public_v_source_artifacts WITH (security_barrier = true) AS
  SELECT a.id, a.artifact_key, a.source_id, a.artifact_kind, a.disposition,
         a.verification, a.language, a.page_count, a.public_note
    FROM source_artifacts a
    JOIN sources s ON s.id = a.source_id
   WHERE s.qc_status <> 'exclude';
--> statement-breakpoint

-- --- 2. Trials -----------------------------------------------------------------

CREATE TYPE trial_document_role AS ENUM (
  'primary_publication',
  'substudy_publication',
  'post_hoc_publication',
  'secondary_publication',
  'registry_record',
  'posted_results',
  'protocol',
  'statistical_analysis_plan',
  'supplement',
  'conference_material'
);
--> statement-breakpoint

CREATE TYPE trial_link_basis AS ENUM (
  -- The registry lists the publication and the publication gives the number.
  'registry_and_publication',
  'stated_in_registry',
  'stated_in_publication',
  -- The document was posted to the registry record itself.
  'posted_to_registry',
  -- Plausible and not confirmed by either side. Must be explained.
  'unconfirmed'
);
--> statement-breakpoint

CREATE TYPE trial_document_depth AS ENUM (
  'full_text_held',
  'abstract_only',
  'structured_record_held',
  'not_held'
);
--> statement-breakpoint

CREATE TABLE clinical_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_key text NOT NULL UNIQUE,
  peptide_id uuid NOT NULL REFERENCES peptides(id) ON DELETE RESTRICT,

  registry_name text NOT NULL,
  registry_id text NOT NULL UNIQUE,
  sponsor_protocol_id text,
  acronym text,
  official_title text NOT NULL,

  phase text NOT NULL,
  design text NOT NULL,
  population text NOT NULL,
  comparator text,
  enrolment_text text,
  countries text,
  site_count integer,
  duration_text text,
  primary_outcome text,
  secondary_outcomes text,
  analysis_populations text,
  statistical_plan text,
  oversight text,
  /* Study-design data: the arms as randomised. Practitioner depth only; the
     public query withholds it in simple mode. Never a recommended regimen. */
  dose_arms_text text,

  sponsor text NOT NULL,
  registry_status text NOT NULL,
  start_date date,
  primary_completion_date date,
  completion_date date,
  results_posted_date date,
  registry_last_update date,
  registry_checked_at date NOT NULL,

  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

CREATE INDEX clinical_trials_peptide_idx ON clinical_trials (peptide_id);
--> statement-breakpoint

CREATE TRIGGER clinical_trials_a_touch BEFORE UPDATE ON clinical_trials
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_plain();
--> statement-breakpoint

CREATE TABLE trial_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id uuid NOT NULL REFERENCES clinical_trials(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  role trial_document_role NOT NULL,
  link_basis trial_link_basis NOT NULL,
  depth trial_document_depth NOT NULL,
  version_label text,
  document_date date,
  /* What this document can answer that the others cannot. */
  answers text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trial_documents_unique UNIQUE (trial_id, source_id, role),
  CONSTRAINT trial_documents_unconfirmed_explained CHECK (
    link_basis <> 'unconfirmed' OR notes IS NOT NULL
  )
);
--> statement-breakpoint

CREATE INDEX trial_documents_trial_idx ON trial_documents (trial_id);
--> statement-breakpoint

CREATE TYPE trial_comparison_state AS ENUM (
  'agree',
  'differ',
  'only_one_reports',
  'not_comparable'
);
--> statement-breakpoint

CREATE TABLE trial_source_comparisons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_key text NOT NULL UNIQUE,
  trial_id uuid NOT NULL REFERENCES clinical_trials(id) ON DELETE CASCADE,
  topic text NOT NULL,

  location_a_id uuid NOT NULL REFERENCES source_locations(id) ON DELETE RESTRICT,
  a_reports text NOT NULL,
  location_b_id uuid NOT NULL REFERENCES source_locations(id) ON DELETE RESTRICT,
  b_reports text NOT NULL,

  state trial_comparison_state NOT NULL,
  /* Only what a source states. "Neither source explains it" is an answer. */
  known_explanation text NOT NULL,
  why_it_matters text,
  /* Carries arm amounts, so simple mode never receives it. */
  dose_specific boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT trial_source_comparisons_two_places CHECK (location_a_id <> location_b_id)
);
--> statement-breakpoint

CREATE INDEX trial_source_comparisons_trial_idx ON trial_source_comparisons (trial_id);
--> statement-breakpoint

CREATE TRIGGER trial_source_comparisons_a_touch BEFORE UPDATE ON trial_source_comparisons
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_plain();
--> statement-breakpoint

CREATE VIEW public_v_clinical_trials WITH (security_barrier = true) AS
  SELECT t.id, t.trial_key, t.peptide_id, t.registry_name, t.registry_id,
         t.sponsor_protocol_id, t.acronym, t.official_title, t.phase, t.design,
         t.population, t.comparator, t.enrolment_text, t.countries, t.site_count,
         t.duration_text, t.primary_outcome, t.secondary_outcomes,
         t.analysis_populations, t.statistical_plan, t.oversight, t.dose_arms_text,
         t.sponsor, t.registry_status, t.start_date, t.primary_completion_date,
         t.completion_date, t.results_posted_date, t.registry_last_update,
         t.registry_checked_at, t.notes, t.sort_order
    FROM clinical_trials t
    JOIN peptides p ON p.id = t.peptide_id
   WHERE p.publication_state = 'published';
--> statement-breakpoint

CREATE VIEW public_v_trial_documents WITH (security_barrier = true) AS
  SELECT d.id, d.trial_id, d.source_id, d.role, d.link_basis, d.depth,
         d.version_label, d.document_date, d.answers, d.notes, d.sort_order
    FROM trial_documents d
    JOIN clinical_trials t ON t.id = d.trial_id
    JOIN peptides p ON p.id = t.peptide_id
    JOIN sources s ON s.id = d.source_id
   WHERE p.publication_state = 'published'
     AND s.qc_status <> 'exclude';
--> statement-breakpoint

CREATE VIEW public_v_trial_source_comparisons WITH (security_barrier = true) AS
  SELECT c.id, c.comparison_key, c.trial_id, c.topic, c.location_a_id, c.a_reports,
         c.location_b_id, c.b_reports, c.state, c.known_explanation,
         c.why_it_matters, c.dose_specific, c.sort_order
    FROM trial_source_comparisons c
    JOIN clinical_trials t ON t.id = c.trial_id
    JOIN peptides p ON p.id = t.peptide_id
   WHERE p.publication_state = 'published';
--> statement-breakpoint

-- --- 3. Learning topics --------------------------------------------------------

-- Foundational teaching (what a receptor is, what an agonist does) is neither a
-- compound record nor a quality topic, and it still owes a page in a source.
CREATE TABLE learning_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_key text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  /* Which publication chapter this topic serves. */
  publication_chapter text,
  summary text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint

ALTER TABLE claims
  ADD COLUMN learning_topic_id uuid REFERENCES learning_topics(id) ON DELETE RESTRICT;
--> statement-breakpoint

ALTER TABLE claims DROP CONSTRAINT claims_subject_present;
--> statement-breakpoint

ALTER TABLE claims ADD CONSTRAINT claims_subject_present CHECK (
  peptide_id IS NOT NULL
  OR quality_topic_id IS NOT NULL
  OR learning_topic_id IS NOT NULL
  OR is_editorial_non_evidentiary
);
--> statement-breakpoint

CREATE INDEX claims_learning_topic_idx ON claims (learning_topic_id);
--> statement-breakpoint

-- --- 4. Gap resolution ---------------------------------------------------------

CREATE TYPE gap_resolution_state AS ENUM (
  'open',
  'partially_resolved',
  'resolved',
  'superseded'
);
--> statement-breakpoint

ALTER TABLE evidence_gaps
  ADD COLUMN resolution_state gap_resolution_state NOT NULL DEFAULT 'open';
--> statement-breakpoint

ALTER TABLE evidence_gaps ADD COLUMN resolution_note text;
--> statement-breakpoint

ALTER TABLE evidence_gaps ADD COLUMN resolution_checked_at date;
--> statement-breakpoint

ALTER TABLE evidence_gaps
  ADD COLUMN learning_topic_id uuid REFERENCES learning_topics(id) ON DELETE CASCADE;
--> statement-breakpoint

-- A change of state must say what changed it and when it was checked.
ALTER TABLE evidence_gaps ADD CONSTRAINT evidence_gaps_resolution_explained CHECK (
  resolution_state = 'open'
  OR (resolution_note IS NOT NULL AND resolution_checked_at IS NOT NULL)
);
--> statement-breakpoint

ALTER TABLE evidence_gaps DROP CONSTRAINT evidence_gaps_subject_present;
--> statement-breakpoint

ALTER TABLE evidence_gaps ADD CONSTRAINT evidence_gaps_subject_present CHECK (
  quality_topic_id IS NOT NULL OR peptide_id IS NOT NULL OR learning_topic_id IS NOT NULL
);
--> statement-breakpoint

CREATE INDEX evidence_gaps_learning_topic_idx ON evidence_gaps (learning_topic_id);
--> statement-breakpoint

-- `CREATE OR REPLACE` may only append columns, so the 0023 list is reproduced.
CREATE OR REPLACE VIEW public_v_evidence_gaps WITH (security_barrier = true) AS
  SELECT g.id, g.gap_key, g.quality_topic_id, g.peptide_id, g.statement,
         g.why_not_supported, g.what_would_resolve_it, g.verification_issue_key,
         g.sort_order, g.gap_type, g.research_question, g.opportunity_type,
         g.resolution_state, g.resolution_note, g.resolution_checked_at
  FROM evidence_gaps g
  LEFT JOIN quality_topics q ON q.id = g.quality_topic_id
  LEFT JOIN peptides p ON p.id = g.peptide_id
  WHERE q.publication_state = 'published'
     OR p.publication_state = 'published';
--> statement-breakpoint

-- The 0003 grant loop, repeated for the views added above.
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
