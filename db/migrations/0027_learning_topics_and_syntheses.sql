-- Product experience v1: learning topics become readable, and a Tides synthesis
-- becomes a record rather than a sentence in a component.
--
-- Three editorial states are rendered on the site:
--
--   SOURCE FACT      a claim resting on a located passage in a cited source
--                    (claims + claim_evidence, unchanged);
--   TIDES SYNTHESIS  a transparent conclusion drawn from several sourced claims,
--                    naming every claim it rests on (this migration);
--   SOURCE NEEDED    an external factual assertion no held source supports
--                    (evidence_gaps, unchanged).
--
-- A synthesis may explain how sourced facts fit together. It may not add a
-- number, a mechanism, an effect, a safety conclusion or a protocol. The
-- database enforces what it can: no numerals, at least two supporting claims,
-- and no publication ahead of the claims it rests on. The rest is held by tests
-- and by review.

-- --- 1. Learning topics: a publication state --------------------------------------

ALTER TABLE learning_topics
  ADD COLUMN publication_state publication_state_value NOT NULL DEFAULT 'unpublished';
--> statement-breakpoint

CREATE VIEW public_v_learning_topics WITH (security_barrier = true) AS
  SELECT t.id, t.topic_key, t.slug, t.title, t.publication_chapter, t.summary
    FROM learning_topics t
   WHERE t.publication_state = 'published'::publication_state_value;
--> statement-breakpoint

-- `CREATE OR REPLACE` may only append columns: the 0021 list is reproduced, and
-- a learning-topic claim is public only once its topic is.
CREATE OR REPLACE VIEW public_v_claims WITH (security_barrier = true) AS
  SELECT c.id, c.claim_key, c.peptide_id, c.quality_topic_id, c.claim_text,
         c.plain_language_text, c.claim_category, c.importance,
         c.interpretation_notes, c.uncertainty_text,
         c.is_editorial_non_evidentiary, c.version, c.published_at,
         c.last_reviewed_at, c.needs_update, c.certificate_type_scope,
         c.learning_topic_id
    FROM claims c
   WHERE c.publication_state = 'published'::publication_state_value
     AND NOT EXISTS (
       SELECT 1 FROM peptides p WHERE p.id = c.peptide_id AND p.is_demonstration
     )
     AND NOT EXISTS (
       SELECT 1 FROM quality_topics q
        WHERE q.id = c.quality_topic_id AND q.is_demonstration
     )
     AND (
       c.learning_topic_id IS NULL
       OR EXISTS (
         SELECT 1 FROM learning_topics lt
          WHERE lt.id = c.learning_topic_id
            AND lt.publication_state = 'published'::publication_state_value
       )
     );
--> statement-breakpoint

CREATE OR REPLACE VIEW public_v_evidence_gaps WITH (security_barrier = true) AS
  SELECT g.id, g.gap_key, g.quality_topic_id, g.peptide_id, g.statement,
         g.why_not_supported, g.what_would_resolve_it, g.verification_issue_key,
         g.sort_order, g.gap_type, g.research_question, g.opportunity_type,
         g.resolution_state, g.resolution_note, g.resolution_checked_at,
         g.learning_topic_id
  FROM evidence_gaps g
  LEFT JOIN quality_topics q ON q.id = g.quality_topic_id
  LEFT JOIN peptides p ON p.id = g.peptide_id
  LEFT JOIN learning_topics lt ON lt.id = g.learning_topic_id
  WHERE q.publication_state = 'published'
     OR p.publication_state = 'published'
     OR lt.publication_state = 'published';
--> statement-breakpoint

-- --- 2. Tides syntheses ------------------------------------------------------------

CREATE TABLE editorial_syntheses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  synthesis_key text NOT NULL UNIQUE,
  peptide_id uuid REFERENCES peptides(id) ON DELETE RESTRICT,
  quality_topic_id uuid REFERENCES quality_topics(id) ON DELETE RESTRICT,
  learning_topic_id uuid REFERENCES learning_topics(id) ON DELETE RESTRICT,
  /* The conclusion, in the index's own words. */
  statement text NOT NULL,
  /* The same conclusion for a general reader. */
  plain_language_text text NOT NULL,
  /* How the supporting claims lead to it — the working, shown. */
  reasoning text NOT NULL,
  /* What it deliberately does not conclude. Required: a synthesis is read as
     more than it says unless its limit is stated beside it. */
  does_not_conclude text NOT NULL,
  publication_state publication_state_value NOT NULL DEFAULT 'unpublished',
  sort_order integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT editorial_syntheses_one_subject CHECK (
    num_nonnulls(peptide_id, quality_topic_id, learning_topic_id) = 1
  ),
  -- Never invent numbers: a synthesis carries none. A figure belongs to the
  -- claim that sources it.
  CONSTRAINT editorial_syntheses_no_numerals CHECK (
    statement !~ '[0-9]' AND plain_language_text !~ '[0-9]'
  ),
  CONSTRAINT editorial_syntheses_limits_stated CHECK (
    length(btrim(reasoning)) > 0 AND length(btrim(does_not_conclude)) > 0
  )
);
--> statement-breakpoint

CREATE INDEX editorial_syntheses_learning_topic_idx ON editorial_syntheses (learning_topic_id);
--> statement-breakpoint
CREATE INDEX editorial_syntheses_peptide_idx ON editorial_syntheses (peptide_id);
--> statement-breakpoint
CREATE INDEX editorial_syntheses_quality_topic_idx ON editorial_syntheses (quality_topic_id);
--> statement-breakpoint

CREATE TRIGGER editorial_syntheses_a_touch
  BEFORE UPDATE ON editorial_syntheses
  FOR EACH ROW EXECUTE FUNCTION tides_touch_and_version_plain();
--> statement-breakpoint

CREATE TABLE editorial_synthesis_claims (
  synthesis_id uuid NOT NULL REFERENCES editorial_syntheses(id) ON DELETE CASCADE,
  claim_id uuid NOT NULL REFERENCES claims(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (synthesis_id, claim_id)
);
--> statement-breakpoint

CREATE INDEX editorial_synthesis_claims_claim_idx ON editorial_synthesis_claims (claim_id);
--> statement-breakpoint

-- A synthesis is published only when it rests on at least two claims, every one
-- of them already published. It cannot run ahead of its evidence.
CREATE OR REPLACE FUNCTION editorial_syntheses_publish_gate() RETURNS trigger
LANGUAGE plpgsql AS $fn$
DECLARE
  linked integer;
  unpublished integer;
BEGIN
  IF NEW.publication_state = 'published'::publication_state_value
     AND (TG_OP = 'INSERT' OR OLD.publication_state IS DISTINCT FROM NEW.publication_state) THEN
    SELECT count(*),
           count(*) FILTER (WHERE c.publication_state <> 'published'::publication_state_value)
      INTO linked, unpublished
      FROM editorial_synthesis_claims l
      JOIN claims c ON c.id = l.claim_id
     WHERE l.synthesis_id = NEW.id;
    IF linked < 2 THEN
      RAISE EXCEPTION 'A Tides synthesis must rest on at least two claims; % linked.', linked
        USING ERRCODE = 'check_violation';
    END IF;
    IF unpublished > 0 THEN
      RAISE EXCEPTION 'A Tides synthesis cannot be published while % of its claims are unpublished.', unpublished
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;
--> statement-breakpoint

CREATE TRIGGER editorial_syntheses_b_publish_gate
  BEFORE INSERT OR UPDATE ON editorial_syntheses
  FOR EACH ROW EXECUTE FUNCTION editorial_syntheses_publish_gate();
--> statement-breakpoint

CREATE VIEW public_v_editorial_syntheses WITH (security_barrier = true) AS
  SELECT s.id, s.synthesis_key, s.peptide_id, s.quality_topic_id, s.learning_topic_id,
         s.statement, s.plain_language_text, s.reasoning, s.does_not_conclude,
         s.sort_order, s.version
    FROM editorial_syntheses s
    LEFT JOIN peptides p ON p.id = s.peptide_id
    LEFT JOIN quality_topics q ON q.id = s.quality_topic_id
    LEFT JOIN learning_topics lt ON lt.id = s.learning_topic_id
   WHERE s.publication_state = 'published'::publication_state_value
     AND (p.publication_state = 'published' OR q.publication_state = 'published'
          OR lt.publication_state = 'published');
--> statement-breakpoint

CREATE VIEW public_v_editorial_synthesis_claims WITH (security_barrier = true) AS
  SELECT l.synthesis_id, l.claim_id, c.claim_key, l.sort_order
    FROM editorial_synthesis_claims l
    JOIN public_v_editorial_syntheses s ON s.id = l.synthesis_id
    JOIN public_v_claims c ON c.id = l.claim_id;
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
END;
$$;
