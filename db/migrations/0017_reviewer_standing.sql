ALTER TABLE "profiles" ADD COLUMN "professional_role" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "review_domain" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "organisation" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "credential_summary" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "conflicts_disclosed" boolean;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "disclosure_notes" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "disclosed_at" date;
--> statement-breakpoint

-- ===========================================================================
-- Reviewer standing.
--
-- Two constraints, both about what an approval is worth rather than about
-- tidiness.
--
-- A disclosed conflict must say what it is: "yes, I have one" with no note is
-- worse than silence, because it looks like a disclosure and carries nothing.
--
-- And a disclosure needs a date. Standing changes — somebody takes a
-- consultancy, joins a board — so a disclosure without a date cannot be read
-- against the review it was supposed to qualify.
-- ===========================================================================

ALTER TABLE profiles ADD CONSTRAINT profiles_disclosure_is_explained CHECK (
  conflicts_disclosed IS NULL
  OR (conflicts_disclosed = false)
  OR (conflicts_disclosed = true AND disclosure_notes IS NOT NULL)
);
--> statement-breakpoint

ALTER TABLE profiles ADD CONSTRAINT profiles_disclosure_is_dated CHECK (
  conflicts_disclosed IS NULL OR disclosed_at IS NOT NULL
);
