-- ===========================================================================
-- The Tides Index — deterministic search indexing.
--
-- Postgres full-text plus trigram fuzzy matching, maintained by trigger.
--
-- Two properties matter more than ranking quality:
--
--   1. Only `published` records are indexed, so the search index cannot become
--      a side channel for draft medical content.
--
--   2. `related_but_distinct` aliases are indexed but never treated as
--      identity. Searching "TB-500" should surface the Thymosin beta-4 record
--      because that is where the discussion lives, while the interface says
--      plainly that the relationship is unresolved (verification issue V-001).
--      Only `synonym`, `abbreviation`, `brand_name`, `research_code` and
--      `chemical_name` aliases are folded into the peptide's own alias text;
--      the ambiguous kinds are indexed with the qualifier attached.
-- ===========================================================================

CREATE OR REPLACE FUNCTION tides_reindex_peptide(p_peptide_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_peptide peptides%ROWTYPE;
BEGIN
  SELECT * INTO v_peptide FROM peptides WHERE id = p_peptide_id;

  IF NOT FOUND OR v_peptide.workflow_status <> 'published' THEN
    DELETE FROM search_documents WHERE entity_type = 'peptide' AND entity_id = p_peptide_id;
    RETURN;
  END IF;

  INSERT INTO search_documents (
    entity_type, entity_id, slug, title, subtitle, alias_text, body_text,
    peptide_id, peptide_slug, evidence_classes, route_keys, source_type_keys,
    category_key, is_human_evidence, indexed_at
  )
  SELECT
    'peptide',
    v_peptide.id,
    v_peptide.slug,
    v_peptide.canonical_name,
    v_peptide.short_description,
    (
      SELECT string_agg(
               CASE
                 WHEN a.alias_type IN ('common_misnomer', 'related_but_distinct')
                   THEN a.alias || ' (' || replace(a.alias_type::text, '_', ' ') || ')'
                 ELSE a.alias
               END,
               ' ' ORDER BY a.alias)
      FROM peptide_aliases a
      WHERE a.peptide_id = v_peptide.id
    ),
    concat_ws(' ', v_peptide.simple_summary, v_peptide.practitioner_summary,
              v_peptide.unknowns_summary, v_peptide.molecular_description),
    v_peptide.id,
    v_peptide.slug,
    (
      SELECT array_agg(DISTINCT et.evidence_class)
      FROM claims c
      JOIN claim_evidence ce ON ce.claim_id = c.id
      JOIN evidence_types et ON et.key = ce.evidence_type_key
      WHERE c.peptide_id = v_peptide.id AND c.workflow_status = 'published'
    ),
    (
      SELECT array_agg(DISTINCT pr.route_key)
      FROM peptide_routes pr
      WHERE pr.peptide_id = v_peptide.id AND pr.workflow_status = 'published'
    ),
    (
      SELECT array_agg(DISTINCT s.source_type_key)
      FROM claims c
      JOIN claim_evidence ce ON ce.claim_id = c.id
      JOIN sources s ON s.id = ce.source_id
      WHERE c.peptide_id = v_peptide.id AND c.workflow_status = 'published'
    ),
    v_peptide.primary_category_key,
    coalesce((
      SELECT bool_or(et.is_human_evidence)
      FROM claims c
      JOIN claim_evidence ce ON ce.claim_id = c.id
      JOIN evidence_types et ON et.key = ce.evidence_type_key
      WHERE c.peptide_id = v_peptide.id AND c.workflow_status = 'published'
    ), false),
    now()
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    alias_text = EXCLUDED.alias_text,
    body_text = EXCLUDED.body_text,
    peptide_id = EXCLUDED.peptide_id,
    peptide_slug = EXCLUDED.peptide_slug,
    evidence_classes = EXCLUDED.evidence_classes,
    route_keys = EXCLUDED.route_keys,
    source_type_keys = EXCLUDED.source_type_keys,
    category_key = EXCLUDED.category_key,
    is_human_evidence = EXCLUDED.is_human_evidence,
    indexed_at = now();
END;
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_reindex_quality_topic(p_topic_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_topic quality_topics%ROWTYPE;
BEGIN
  SELECT * INTO v_topic FROM quality_topics WHERE id = p_topic_id;

  IF NOT FOUND OR v_topic.workflow_status <> 'published' THEN
    DELETE FROM search_documents WHERE entity_type = 'quality_topic' AND entity_id = p_topic_id;
    RETURN;
  END IF;

  INSERT INTO search_documents (
    entity_type, entity_id, slug, title, subtitle, body_text, indexed_at
  )
  VALUES (
    'quality_topic',
    v_topic.id,
    v_topic.slug,
    v_topic.name,
    v_topic.short_description,
    concat_ws(' ', v_topic.simple_summary, v_topic.practitioner_summary,
              v_topic.what_it_proves, v_topic.what_it_does_not_prove,
              v_topic.common_misinterpretations),
    now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    body_text = EXCLUDED.body_text,
    indexed_at = now();
END;
$fn$;
--> statement-breakpoint

-- Sources are indexed on bibliographic metadata only. A source excluded from
-- the archive is not discoverable.
CREATE OR REPLACE FUNCTION tides_reindex_source(p_source_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_source sources%ROWTYPE;
BEGIN
  SELECT * INTO v_source FROM sources WHERE id = p_source_id;

  IF NOT FOUND OR v_source.qc_status = 'exclude' THEN
    DELETE FROM search_documents WHERE entity_type = 'source' AND entity_id = p_source_id;
    RETURN;
  END IF;

  INSERT INTO search_documents (
    entity_type, entity_id, slug, title, subtitle, alias_text, body_text,
    source_type_keys, indexed_at
  )
  VALUES (
    'source',
    v_source.id,
    v_source.source_key,
    v_source.title,
    nullif(concat_ws(' · ',
      (SELECT string_agg(value #>> '{}', ', ') FROM jsonb_array_elements(v_source.authors)),
      v_source.year::text), ''),
    (SELECT string_agg(value #>> '{}', ' ') FROM jsonb_array_elements(v_source.authors)),
    concat_ws(' ', v_source.primary_role, v_source.coverage_notes, v_source.source_summary),
    ARRAY[v_source.source_type_key],
    now()
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title = EXCLUDED.title,
    subtitle = EXCLUDED.subtitle,
    alias_text = EXCLUDED.alias_text,
    body_text = EXCLUDED.body_text,
    source_type_keys = EXCLUDED.source_type_keys,
    indexed_at = now();
END;
$fn$;
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Trigger adapters
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION tides_reindex_peptide_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM tides_reindex_peptide(coalesce(NEW.id, OLD.id));
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

-- Alias and claim changes alter a peptide's indexed text and facets, so they
-- reindex the parent compound rather than creating entries of their own.
CREATE OR REPLACE FUNCTION tides_reindex_peptide_parent_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_peptide_id uuid := coalesce(NEW.peptide_id, OLD.peptide_id);
BEGIN
  IF v_peptide_id IS NOT NULL THEN
    PERFORM tides_reindex_peptide(v_peptide_id);
  END IF;
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_reindex_quality_topic_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM tides_reindex_quality_topic(coalesce(NEW.id, OLD.id));
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE OR REPLACE FUNCTION tides_reindex_source_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  PERFORM tides_reindex_source(coalesce(NEW.id, OLD.id));
  RETURN NULL;
END;
$fn$;
--> statement-breakpoint

CREATE TRIGGER peptides_reindex AFTER INSERT OR UPDATE OR DELETE ON peptides
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_peptide_trigger();
--> statement-breakpoint
CREATE TRIGGER peptide_aliases_reindex AFTER INSERT OR UPDATE OR DELETE ON peptide_aliases
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_peptide_parent_trigger();
--> statement-breakpoint
CREATE TRIGGER claims_reindex_peptide AFTER INSERT OR UPDATE OR DELETE ON claims
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_peptide_parent_trigger();
--> statement-breakpoint
CREATE TRIGGER peptide_routes_reindex AFTER INSERT OR UPDATE OR DELETE ON peptide_routes
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_peptide_parent_trigger();
--> statement-breakpoint
CREATE TRIGGER quality_topics_reindex AFTER INSERT OR UPDATE OR DELETE ON quality_topics
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_quality_topic_trigger();
--> statement-breakpoint
CREATE TRIGGER sources_reindex AFTER INSERT OR UPDATE OR DELETE ON sources
  FOR EACH ROW EXECUTE FUNCTION tides_reindex_source_trigger();
--> statement-breakpoint


-- ---------------------------------------------------------------------------
-- Full rebuild
-- ---------------------------------------------------------------------------
-- Used after bulk imports and available as a maintenance operation.
CREATE OR REPLACE FUNCTION tides_rebuild_search_index()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_id uuid;
  v_count integer := 0;
BEGIN
  DELETE FROM search_documents;

  FOR v_id IN SELECT id FROM peptides LOOP
    PERFORM tides_reindex_peptide(v_id);
    v_count := v_count + 1;
  END LOOP;

  FOR v_id IN SELECT id FROM quality_topics LOOP
    PERFORM tides_reindex_quality_topic(v_id);
    v_count := v_count + 1;
  END LOOP;

  FOR v_id IN SELECT id FROM sources LOOP
    PERFORM tides_reindex_source(v_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$fn$;
