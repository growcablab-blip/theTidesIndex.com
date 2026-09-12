ALTER TABLE "quality_topics" ADD COLUMN "family" text;
--> statement-breakpoint

-- ===========================================================================
-- The quality register.
--
-- The section index listed published topics only, and nothing is published, so
-- it rendered an empty state — a section with four written topics and fifteen
-- registered ones looked like a section with nothing in it.
--
-- The same problem the compound register solved in migration 0006, and the same
-- answer: "no topic is published here yet" and "this subject is not in the
-- index" are different statements, and a reader deserves to tell them apart.
--
-- What the register exposes is the shape of the work — name, family, how far it
-- has got, how much is attached. It carries no prose: a short description is
-- unreviewed content until the topic publishes, and published topics already
-- have a view that serves it.
-- ===========================================================================

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
         -- Whether this topic is blocked on a source nobody can currently get.
         --
         -- "Nobody has written this yet" and "we cannot lawfully obtain the
         -- source this needs" are different states, and the second is the more
         -- useful thing to tell a reader. The verification queue already knows
         -- which topics are blocked; this surfaces it instead of inferring
         -- blockage from an absence of claims.
         (SELECT vi.issue_key
            FROM verification_issues vi
           WHERE vi.status = 'open'
             AND vi.related_keys ? ('quality_topic:' || q.quality_key)
           ORDER BY vi.issue_key
           LIMIT 1) AS blocking_issue_key
  FROM quality_topics q;
--> statement-breakpoint

GRANT SELECT ON public_v_quality_register TO anon, authenticated;
