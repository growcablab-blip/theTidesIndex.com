-- ===========================================================================
-- The provenance watchdogs check at commit, not mid-statement
-- ===========================================================================
-- Found while verifying the Section 4 compound expansion.
--
-- THE FAILURE
--
-- A routine `npm run db:seed` took every published protocol off the public
-- site. 98 of them, silently, with no error and no refusal in the seed output.
--
-- The cause is a legitimate watchdog watching an illegitimate moment. A
-- compound packet owns its `protocol_sources` rows, so it rebuilds them:
--
--     delete from protocol_sources where protocol_id = ...   -- (1)
--     insert into protocol_sources ...                       -- (2)
--
-- `protocol_sources_provenance_guard` fires AFTER (1), sees a published
-- protocol with no citable source, and does exactly what it was written to do:
-- withdraws it. Statement (2) then restores the source, but nothing restores
-- the protocol, and nothing should — the publish path deliberately refuses to
-- resurrect a withdrawn record, because "withdrawn" is a decision, not a
-- lapse.
--
-- So the end state was: complete, valid provenance, and an empty public
-- protocol library. The graph was never actually broken. The watchdog was
-- shown a frame of a rebuild and asked to judge it as a finished state.
--
-- THE FIX
--
-- Both provenance guards become deferred constraint triggers. Their events are
-- queued and processed once, at COMMIT, instead of after each statement. The
-- guard therefore sees the completed graph and nothing else.
--
-- Paired with this, `seedDatabase` now runs inside one transaction (see
-- db/seed/index.ts), so a re-seed is a single atomic rebuild: the intermediate
-- state exists only inside it, and the guards are asked their question once,
-- about the final graph.
--
-- WHAT THIS DOES NOT WEAKEN
--
-- Every check is unchanged, and so is every consequence. `tides_protocol_
-- provenance_ok` and `tides_claim_provenance_ok` are not touched; the guards
-- still withdraw; the publish gates still refuse. The only change is *when*
-- the question is asked.
--
-- Real provenance loss is still caught, in every path:
--
--   - a `DELETE` or `UPDATE` in autocommit — an editor removing a citation, an
--     admin action, a script — commits immediately, so the deferred trigger
--     fires immediately. There is no window in which such a record stays
--     published.
--   - a transaction that genuinely ends with a published protocol having no
--     citable source is caught at its commit, which is the first moment the
--     statement is even true.
--   - a seed that fails part way now rolls back entirely, so it cannot leave a
--     published record without provenance behind.
--
-- The one behaviour that genuinely changes is the one that was wrong: a
-- rebuild that removes provenance and puts equivalent provenance back, inside
-- one transaction, no longer withdraws anything.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- Replace both guards
-- ---------------------------------------------------------------------------
-- A constraint trigger cannot be created with `OR REPLACE`, and an ordinary
-- trigger cannot be converted in place, so each is dropped and recreated. The
-- functions they call are untouched: same logic, same withdrawal, same reason
-- text.

DROP TRIGGER IF EXISTS claim_evidence_provenance_guard ON claim_evidence;
--> statement-breakpoint
DROP TRIGGER IF EXISTS protocol_sources_provenance_guard ON protocol_sources;
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER claim_evidence_provenance_guard
  AFTER UPDATE OR DELETE ON claim_evidence
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION tides_guard_claim_provenance();
--> statement-breakpoint

CREATE CONSTRAINT TRIGGER protocol_sources_provenance_guard
  AFTER UPDATE OR DELETE ON protocol_sources
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION tides_guard_protocol_provenance();
