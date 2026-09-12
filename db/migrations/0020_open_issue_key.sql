-- ---------------------------------------------------------------------------
-- 0020 — the register field says what it measures
--
-- `blocking_issue_key` returned the first open verification issue whose
-- `related_keys` name the topic. That is not the same as an issue that blocks
-- the topic, and the difference is visible in the seeded data: V-008 ("purity
-- versus identity versus content") names hplc-purity, which is written and not
-- blocked by anything.
--
-- The page was saved only by a short-circuit — it consults the field solely for
-- topics with no claims — so nothing was displayed wrongly. But a field called
-- `blocking_issue_key` that does not mean blocking is a defect waiting for the
-- next person who trusts its name.
--
-- Whether an issue blocks a *particular* topic is a property of the pair, and
-- `related_keys` is a flat list that cannot express it. Rather than invent that
-- classification, the field is renamed to what it actually reports, and the
-- page's wording follows it.
-- ---------------------------------------------------------------------------

DROP VIEW IF EXISTS public_v_quality_register;--> statement-breakpoint

CREATE VIEW public_v_quality_register WITH (security_barrier = true) AS
  SELECT q.id,
         q.quality_key,
         q.name,
         q.slug,
         q.family,
         q.sort_order,
         q.review_state,
         q.publication_state,
         (q.publication_state = 'published') AS is_published,
         q.needs_update,
         (SELECT count(*) FROM claims c WHERE c.quality_topic_id = q.id)::int AS claim_count,
         (SELECT count(*) FROM evidence_gaps g WHERE g.quality_topic_id = q.id)::int AS gap_count,
         (SELECT count(*) FROM quality_relationships r WHERE r.from_topic_id = q.id)::int
           AS relationship_count,
         -- The lowest-numbered open verification issue that names this topic.
         --
         -- "Nobody has written this yet" and "this index has recorded a
         -- specific open question about it" are different states, and the
         -- second is the more useful thing to tell a reader. What it does not
         -- say is *why* the topic is unwritten: several of these issues are
         -- about terminology or conflation rather than about obtaining a
         -- source, and the queue does not distinguish them per topic.
         (SELECT vi.issue_key
            FROM verification_issues vi
           WHERE vi.status = 'open'
             AND vi.related_keys ? ('quality_topic:' || q.quality_key)
           ORDER BY vi.issue_key
           LIMIT 1) AS open_issue_key
  FROM quality_topics q;
--> statement-breakpoint

GRANT SELECT ON public_v_quality_register TO anon, authenticated;
