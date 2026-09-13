import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readQualityTopic } from '@/server/public/quality-topic';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * The extraction workflow, where it is enforced rather than written down
 * (Phase C.6).
 *
 * `docs/EVIDENCE_EXTRACTION_WORKFLOW.md` records the procedure. A procedure kept
 * only in a document is followed until the week somebody is in a hurry, so the
 * parts that failed during C.1 to C.5 are enforced here instead — and these
 * tests are what stop the enforcement being quietly removed.
 *
 * Section 19 of the C.6 brief asks the workflow to handle three deliberately
 * different cases without special pleading. Those are the last three groups.
 */

describe('the extraction workflow, enforced', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
  });

  // --- Stage 14: a replacement file is not the same evidence ---------------
  it('flags every dependent record when a source file is replaced', async () => {
    const before = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where needs_update`,
    );
    expect(before[0]?.n).toBe(0);

    // A new artefact: different scan, possibly different edition, certainly not
    // guaranteed to hold the same thing on page 223.
    await query(
      db,
      `update sources set local_file_sha256 = repeat('f', 64) where source_key = 'SRC-006'`,
    );

    const after = await query<{ claim_key: string; needs_update_reason: string }>(
      db,
      `select claim_key, needs_update_reason from claims
       where needs_update and claim_key like 'HPLC-%'`,
    );

    expect(after.length).toBeGreaterThan(0);
    expect(after[0]?.needs_update_reason).toMatch(/SRC-006/);
    expect(after[0]?.needs_update_reason).toMatch(/re-resolved against the new one/);
  });

  it('flags nothing on a record resting on a different source', async () => {
    await query(
      db,
      `update sources set local_file_sha256 = repeat('f', 64) where source_key = 'SRC-006'`,
    );

    const coa = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where needs_update and claim_key like 'COA-%'`,
    );
    // The Q7 claims rest on SRC-017 and are untouched.
    expect(coa[0]?.n).toBe(0);
  });

  it('flags rather than withdraws, because the statement is probably still right', async () => {
    await query(
      db,
      `update sources set local_file_sha256 = repeat('f', 64) where source_key = 'SRC-006'`,
    );

    const rows = await query<{ publication_state: string; review_state: string }>(
      db,
      `select publication_state, review_state from claims where claim_key = 'HPLC-001'`,
    );
    // needs_update is exactly the state for "live, and somebody must look".
    expect(rows[0]?.publication_state).toBe('unpublished');
    expect(rows[0]?.review_state).not.toBe('rejected');
  });

  it('does not treat a first acquisition as a replacement', async () => {
    // SRC-022 has never had a file. Nothing rests on it, so acquiring it flags
    // nothing — the trigger fires only when a copy is exchanged for another.
    await query(
      db,
      `update sources set local_file_sha256 = repeat('a', 64), access_status = 'held'
       where source_key = 'SRC-022'`,
    );

    const flagged = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where needs_update`,
    );
    expect(flagged[0]?.n).toBe(0);
  });

  it('ignores an edit that does not change the artefact', async () => {
    await query(
      db,
      `update sources set limitations_notes = 'Reworded.' where source_key = 'SRC-006'`,
    );
    const flagged = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where needs_update`,
    );
    expect(flagged[0]?.n).toBe(0);
  });

  // --- Gaps are workable, not only readable -------------------------------
  it('types every recorded gap', async () => {
    const gaps = await query<{ gap_key: string; gap_type: string }>(
      db,
      `select gap_key, gap_type from evidence_gaps`,
    );

    expect(gaps.length).toBeGreaterThan(0);
    for (const gap of gaps) {
      expect(gap.gap_type, gap.gap_key).toBeTruthy();
    }

    const types = new Set(gaps.map((g) => g.gap_type));
    // The two that had to be told apart by hand when V-015 was broken up:
    // blocked on a document we cannot obtain, versus outside what we hold.
    expect(types.has('source_missing')).toBe(true);
    expect(types.has('scope_not_established')).toBe(true);
  });

  it('lets gaps be queried by what blocks them', async () => {
    const blocked = await query<{ statement: string }>(
      db,
      `select statement from evidence_gaps where gap_type = 'source_missing'`,
    );
    // Sterility and endotoxin: a source exists in the world and is not held.
    expect(blocked.map((b) => b.statement.toLowerCase()).join(' ')).toMatch(/steril/);
    expect(blocked.map((b) => b.statement.toLowerCase()).join(' ')).toMatch(/endotoxin/);
  });

  // --- Case A: an academic textbook, a chromatographic claim ---------------
  it('CASE A — handles a textbook claim end to end', async () => {
    const topic = await readQualityTopic(db, 'hplc-purity', { preview: true });
    const claim = topic?.claims.find((c) => c.claimKey === 'HPLC-002');

    expect(claim?.interpretationNotes).not.toBeNull(); // Stage 9
    expect(claim?.uncertaintyText).not.toBeNull();

    // This claim rests on two passages. Ordering is deterministic by page, so
    // the table entry is findable rather than positional.
    expect(claim?.evidence.map((e) => e.citation.printedPage)).toEqual([223, 224]);

    const table = claim?.evidence.find((e) => /table 4-1/.test(e.citation.locatorText ?? ''));
    expect(table?.citation.sourceKey).toBe('SRC-006');
    expect(table?.citation.printedPage).toBe(223); // Stage 4
    expect(table?.citation.filePage).toBe(234); // offset +11
    // A textbook claim needs no certificate scope, and must not acquire one.
    expect(claim?.certificateTypeScope).toBeNull();
  });

  // --- Case B: regulatory guidance, where scope is the whole risk ----------
  it('CASE B — handles a regulatory requirement without letting its scope escape', async () => {
    const topic = await readQualityTopic(db, 'certificate-of-analysis', { preview: true });
    const claim = topic?.claims.find((c) => c.claimKey === 'COA-002');
    const evidence = claim?.evidence[0];

    expect(evidence?.citation.sourceKey).toBe('SRC-017');
    expect(evidence?.citation.printedPage).toBe(24);
    expect(evidence?.citation.filePage).toBe(30); // offset +6
    // Stage 6b: the scope is on the record and reaches the reader.
    expect(claim?.certificateTypeScope).toBe('manufacturer_coa');
    // And a different evidence type from a textbook, because a guideline states
    // what should be done rather than reporting a result.
    expect(evidence?.evidenceTypeKey).toBe('regulatory_reference');
  });

  it('CASE B — records what the guidance does not cover, rather than extending it', async () => {
    const topic = await readQualityTopic(db, 'certificate-of-analysis', { preview: true });
    const scoped = topic?.gaps.filter((g) =>
      /finished drug product|third-party|research-use/i.test(g.statement),
    );
    expect(scoped?.length).toBe(3);
  });

  // --- Case C: a practitioner protocol, which does not exist yet -----------
  it('CASE C — has the structure for a practitioner protocol, and no protocol', async () => {
    // The workflow must handle a practitioner protocol without special pleading.
    // None has been extracted, so what is asserted here is that the structure is
    // ready and that nothing has been quietly invented in the meantime.
    /*
     * Protocols now exist — the compound packets loaded five source-reported
     * regimens for BPC-157 and one for tesamorelin. What this case is actually
     * about is that a protocol cannot exist *without* its provenance, so it
     * asserts that instead of asserting emptiness.
     */
    const orphaned = await query<{ n: number }>(
      db,
      `select count(*)::int as n from protocols p
        where not exists (select 1 from protocol_sources ps where ps.protocol_id = p.id)`,
    );
    expect(orphaned[0]?.n).toBe(0);

    // The columns the standard requires all exist and are nullable, so a field
    // the source does not state can be stored as absent rather than guessed.
    const columns = await query<{ column_name: string; is_nullable: string }>(
      db,
      `select column_name, is_nullable from information_schema.columns
       where table_name = 'protocols'`,
    );
    const byName = new Map(columns.map((c) => [c.column_name, c.is_nullable]));
    for (const required of [
      'population_model',
      'formulation',
      'amount_reported',
      'amount_unit',
      'frequency_text',
      'timing_text',
      'duration_text',
      'cycle_text',
      'titration_text',
      'combinations_text',
      'monitoring_text',
      'contraindications_text',
      'regulatory_context',
    ]) {
      expect(byName.get(required), `protocols.${required}`).toBe('YES');
    }
  });

  it('CASE C — keeps every dosing field out of the patient view', async () => {
    const columns = await query<{ column_name: string }>(
      db,
      `select column_name from information_schema.columns
       where table_name = 'public_v_protocol_simple'`,
    );
    const names = columns.map((c) => c.column_name);

    // The boundary is the database, not the component. A protocol extraction
    // that needs the front end to hide a field is extracting into the wrong
    // place.
    for (const forbidden of [
      'amount_reported',
      'amount_unit',
      'amount_min_numeric',
      'amount_max_numeric',
      'frequency_text',
      'timing_text',
      'duration_text',
      'cycle_text',
      'titration_text',
      'monitoring_text',
    ]) {
      expect(names, `patient view must not carry ${forbidden}`).not.toContain(forbidden);
    }
  });
});
