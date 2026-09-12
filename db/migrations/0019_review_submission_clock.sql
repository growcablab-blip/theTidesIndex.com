-- ---------------------------------------------------------------------------
-- 0019 — when a record was handed to a reviewer
--
-- Turnaround is the review metric that matters, and it could not be computed:
-- nothing recorded when a record entered `ready_for_scientific_review`.
-- `updated_at` is not a substitute — it moves on every edit, including edits
-- made after submission — and inferring a submission date from it would have
-- produced a confident number that was not measuring what it claimed to.
--
-- So the column is added rather than the metric faked.
--
-- The clock restarts when a record falls back below the ready rung, because at
-- that point the reviewer is being asked about different text and the wait that
-- matters is the new one. It is *kept* when the record advances past ready, so
-- a completed review's turnaround stays computable.
-- ---------------------------------------------------------------------------

ALTER TABLE "peptides" ADD COLUMN "review_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "quality_topics" ADD COLUMN "review_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "review_submitted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "protocols" ADD COLUMN "review_submitted_at" timestamp with time zone;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Submitting is workflow, not authorship.
--
-- `tides_touch_and_version` bumps the version on any change outside its ignore
-- list, and a version bump strands every approval. A submission timestamp that
-- counted as a content edit would therefore invalidate the very review it was
-- recording the start of, on the way in.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_touch_and_version()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
DECLARE
  k_ignored text[] := ARRAY[
    'version', 'created_at', 'updated_at', 'published_at', 'last_reviewed_at',
    'withdrawn_at', 'superseded_at', 'review_state', 'publication_state',
    'editorial_state', 'needs_update', 'needs_update_reason', 'status',
    'review_submitted_at'
  ];
BEGIN
  NEW.updated_at := now();

  IF (to_jsonb(OLD) - k_ignored) IS DISTINCT FROM (to_jsonb(NEW) - k_ignored) THEN
    NEW.version := OLD.version + 1;

    -- Approvals are recorded against a version, so a material edit strands
    -- them. The verification state has to fall back to match: the text a
    -- reviewer approved is not the text that is now stored.
    IF NEW.review_state NOT IN ('unreviewed', 'rejected') THEN
      NEW.review_state := 'captured';
    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- The clock itself.
--
-- Runs as `_ab_`: after `_a_touch`, which is what knocks a record back to
-- `captured` when it is edited, and before `_b_coherence`. Ordering matters —
-- reading `NEW.review_state` before the touch trigger has had its say would see
-- the submitted state of a record that has just been rewritten, and start a
-- clock on a submission that the same statement had already cancelled.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_track_review_submission()
RETURNS trigger
LANGUAGE plpgsql
AS $fn$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.review_state = 'ready_for_scientific_review' THEN
      NEW.review_submitted_at := now();
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.review_state = 'ready_for_scientific_review'
     AND OLD.review_state IS DISTINCT FROM 'ready_for_scientific_review' THEN
    NEW.review_submitted_at := now();
  ELSIF NEW.review_state IN ('unreviewed', 'captured', 'source_checked',
                             'primary_source_checked', 'rejected')
     AND OLD.review_state IS DISTINCT FROM NEW.review_state THEN
    -- Fell back below the ready rung. The earlier submission no longer stands,
    -- and leaving the timestamp would report a wait nobody is actually having.
    NEW.review_submitted_at := NULL;
  END IF;

  RETURN NEW;
END;
$fn$;--> statement-breakpoint

CREATE TRIGGER claims_ab_review_clock BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_track_review_submission();--> statement-breakpoint
CREATE TRIGGER quality_topics_ab_review_clock BEFORE INSERT OR UPDATE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_track_review_submission();--> statement-breakpoint
CREATE TRIGGER protocols_ab_review_clock BEFORE INSERT OR UPDATE ON protocols
  FOR EACH ROW EXECUTE FUNCTION tides_track_review_submission();--> statement-breakpoint
CREATE TRIGGER peptides_ab_review_clock BEFORE INSERT OR UPDATE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_track_review_submission();--> statement-breakpoint

-- Rows already sitting at the ready rung predate the column. Backfilling them
-- from `updated_at` would be the invented number this migration exists to
-- avoid, so they stay null and the metric reports them as unmeasured.
COMMENT ON COLUMN "claims"."review_submitted_at" IS
  'When this record entered ready_for_scientific_review. Null means never submitted, or submitted before this column existed - not zero wait.';
