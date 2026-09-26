-- ===========================================================================
-- Two relations get the stable identity their siblings already have
-- ===========================================================================
-- The second half of the re-seed problem, found while proving the first half
-- fixed. Migration 0031 stopped a re-seed *withdrawing* published protocols.
-- It did not stop a re-seed *unpublishing* 177 other published records.
--
-- The cause is different and simpler. Six relations are owned wholesale by a
-- compound packet and were rebuilt by deleting every row and inserting fresh
-- ones. A fresh row is a new row: new id, and `publication_state` back at its
-- default. Nothing was withdrawn and no trigger fired — the published records
-- simply ceased to exist and were replaced by unpublished ones that happened
-- to say the same thing.
--
-- Four of the six already carry a natural key — `product_key`,
-- `observation_key`, `identity_key`, `assessment_key` — so they can be
-- upserted, and the seed now does that.
--
-- `peptide_routes` and `regulatory_statuses` had no key to upsert on. They get
-- one here. Both keys were verified against the data before being declared:
-- (peptide, route, source location) and (peptide, jurisdiction, indication)
-- are each already unique across the whole library.
--
-- NULLS NOT DISTINCT is deliberate. `source_location_id` and
-- `indication_context` happen to be populated everywhere today, but with the
-- default NULL-distinct behaviour a single future null would silently opt that
-- row out of the constraint, and out of the upsert with it — which is exactly
-- the failure this migration exists to end.
-- ===========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS peptide_routes_identity_key
  ON peptide_routes (peptide_id, route_key, source_location_id) NULLS NOT DISTINCT;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS regulatory_statuses_identity_key
  ON regulatory_statuses (peptide_id, jurisdiction, indication_context) NULLS NOT DISTINCT;
