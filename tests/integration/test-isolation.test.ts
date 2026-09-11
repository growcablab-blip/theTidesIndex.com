import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedData } from '@db/seed/seed-data';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * That the suite is deterministic under a shared worker.
 *
 * `isolate: false` was adopted because spawning and tearing down a fork around
 * every suite crashed a worker roughly once per full run — twenty suites each
 * building a real Postgres image in WebAssembly. It is the right trade, and it
 * buys stability with a risk: files now share a module registry, so a suite that
 * mutates an imported singleton, or that leans on rows another suite created, can
 * pass in one order and fail in another.
 *
 * The run is shuffled, which makes that kind of coupling fail fast. These tests
 * are the standing check underneath it: each asserts a property the shared worker
 * could silently take away.
 */

describe('the suite is deterministic under a shared worker', () => {
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

  // --- Database state -----------------------------------------------------
  it('starts from the same row counts every time', async () => {
    const [counts] = await query<{
      sources: number;
      claims: number;
      gaps: number;
      relationships: number;
      certificates: number;
    }>(
      db,
      `select (select count(*) from sources)::int as sources,
              (select count(*) from claims)::int as claims,
              (select count(*) from evidence_gaps)::int as gaps,
              (select count(*) from quality_relationships)::int as relationships,
              (select count(*) from certificates)::int as certificates`,
    );

    // Pinned rather than merely non-zero: a suite leaking rows into this one
    // would otherwise look like growth nobody notices.
    expect(counts).toEqual({
      sources: seedData.sourceManifest.sources.length,
      claims: seedData.evidencePackets.reduce((n, p) => n + p.claims.length, 0),
      gaps: seedData.evidencePackets.reduce((n, p) => n + p.notYetSupported.length, 0),
      relationships: seedData.qualityMap.edges.length,
      certificates: 1,
    });
  });

  it('leaves nothing behind from a previous test in this file', async () => {
    // The row this test would see if `beforeEach` had not truncated.
    const leaked = await query<{ n: number }>(
      db,
      `select count(*)::int as n from quality_topics where quality_key = 'leak-probe'`,
    );
    expect(leaked[0]?.n).toBe(0);

    await query(
      db,
      `insert into quality_topics (quality_key, name, slug) values ('leak-probe', 'Leak probe', 'leak-probe')`,
    );
  });

  it('does not see the row the previous test wrote', async () => {
    const leaked = await query<{ n: number }>(
      db,
      `select count(*)::int as n from quality_topics where quality_key = 'leak-probe'`,
    );
    // Shuffling means these two may run in either order, which is the point:
    // whichever runs second must not see the other's write.
    expect(leaked[0]?.n).toBe(0);
  });

  it('resets a mutation made to seeded content', async () => {
    const before = await query<{ what_it_proves: string | null }>(
      db,
      `select what_it_proves from quality_topics where quality_key = 'hplc-purity'`,
    );
    expect(before[0]?.what_it_proves).not.toBeNull();

    await query(db, `update quality_topics set what_it_proves = 'MUTATED' where quality_key = 'hplc-purity'`);

    const after = await query<{ what_it_proves: string | null }>(
      db,
      `select what_it_proves from quality_topics where quality_key = 'hplc-purity'`,
    );
    expect(after[0]?.what_it_proves).toBe('MUTATED');
    // The next test's beforeEach restores it; the assertion below is that check.
  });

  it('finds seeded content unmutated despite the previous test', async () => {
    const rows = await query<{ what_it_proves: string | null }>(
      db,
      `select what_it_proves from quality_topics where quality_key = 'hplc-purity'`,
    );
    expect(rows[0]?.what_it_proves).not.toBe('MUTATED');
  });

  // --- Shared module state ------------------------------------------------
  it('has an unmutated seed singleton', () => {
    // `seedData` is a module-level object shared by every file in the worker. A
    // test that writes to it — even with a `finally` to put it back — leaves the
    // rest of the run one aborted assertion away from reading corrupted data.
    // The C.3 loader takes its edges as an argument for exactly this reason.
    const hub = seedData.qualityMap.edges.filter((e) => e.from === 'hplc-purity');
    expect(hub).toHaveLength(11);
    expect(hub.filter((e) => e.to === 'identity-testing')).toHaveLength(1);

    const sterility = hub.find((e) => e.to === 'sterility');
    expect(sterility?.gapKey).toBe('hplc-purity-gap-01');
    expect(sterility?.isEditorialNavigational).toBe(false);
  });

  it('has an unmutated source registry', () => {
    const grant = seedData.sourceManifest.sources.find((s) => s.source_key === 'SRC-006');
    expect(grant?.qc_status).toBe('usable');
    expect(grant?.printed_page_offset).toBe(11);

    const q7 = seedData.sourceManifest.sources.find((s) => s.source_key === 'SRC-017');
    expect(q7?.printed_page_offset).toBe(6);
  });

  it('holds no process-level state that a query depends on', async () => {
    // Role-scoped sessions use `set_config(..., true)`, which is transaction
    // local. If any of it escaped into the connection, a later query outside a
    // session would run as that role rather than as the owner.
    const [row] = await query<{ role: string; claim_sub: string }>(
      db,
      `select current_setting('role', true) as role,
              coalesce(current_setting('request.jwt.claim.sub', true), '') as claim_sub`,
    );
    expect(row?.role === 'none' || row?.role === '' || row?.role === null).toBe(true);
    expect(row?.claim_sub).toBe('');
  });
});
