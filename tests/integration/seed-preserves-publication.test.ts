import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * A re-seed must not take the public site down.
 *
 * The failure these tests exist for: `npm run db:seed` withdrew all 98
 * published protocols, silently, with no error in its output. A compound packet
 * owns its `protocol_sources` rows and rebuilds them by deleting and
 * re-inserting; the provenance watchdog fired on the delete, saw a published
 * protocol with no citable source, and withdrew it. The insert put the source
 * back. Nothing put the protocol back, and nothing should — the publish path
 * deliberately refuses to resurrect a withdrawn record.
 *
 * So the end state was complete, valid provenance and an empty public protocol
 * library. The graph was never broken; the watchdog was shown one frame of a
 * rebuild and asked to judge it as a finished state.
 *
 * The fix is migration 0031 plus a transactional seed: the guards became
 * deferred constraint triggers, so they are asked once, at commit, about the
 * completed graph. These tests pin both halves of that — and, just as
 * important, pin that the watchdog still bites when provenance is *really*
 * lost. A guard that never fires would pass the first test and miss the point.
 */

/** Publishes every protocol that can pass its gate, and returns their ids. */
async function publishAllProtocols(db: TestDb): Promise<string[]> {
  await query(db, `update protocols set publication_state = 'published'`);
  return publishedProtocolIds(db);
}

async function publishedProtocolIds(db: TestDb): Promise<string[]> {
  const rows = await query<{ id: string }>(
    db,
    `select id from protocols where publication_state = 'published' order by protocol_key`,
  );
  return rows.map((r) => r.id);
}

/**
 * Every relation the site can publish from, and whose rows a compound packet
 * owns. The six after `protocols` are the ones that used to be rebuilt
 * wholesale.
 */
const PUBLISHABLE = [
  'protocols',
  'peptide_routes',
  'regulatory_statuses',
  'compound_products',
  'pk_observations',
  'compound_identity_claims',
  'replication_assessments',
] as const;

async function publishEverything(db: TestDb): Promise<void> {
  for (const table of PUBLISHABLE) {
    await query(db, `update ${table} set publication_state = 'published'`);
  }
}

/** The published row ids of each relation, sorted, so two seeds can be compared. */
async function publishedByTable(db: TestDb): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (const table of PUBLISHABLE) {
    const rows = await query<{ id: string }>(
      db,
      `select id from ${table} where publication_state = 'published' order by id`,
    );
    out[table] = rows.map((r) => r.id);
  }
  return out;
}

describe('a re-seed preserves publication state', () => {
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

  it('keeps the guards deferred, so they judge the finished graph', async () => {
    /*
     * The mechanism itself, asserted in the catalogue. Both guards must be
     * deferred constraint triggers. Recreating either as an ordinary trigger
     * would restore the bug while every other test here still passed, because
     * the seed would go back to being judged mid-rebuild.
     */
    const rows = await query<{ tgname: string; tgdeferrable: boolean; tginitdeferred: boolean }>(
      db,
      `select tgname, tgdeferrable, tginitdeferred
         from pg_trigger
        where tgname in ('protocol_sources_provenance_guard', 'claim_evidence_provenance_guard')
        order by tgname`,
    );

    expect(rows.map((r) => r.tgname)).toEqual([
      'claim_evidence_provenance_guard',
      'protocol_sources_provenance_guard',
    ]);
    for (const row of rows) {
      expect(row.tgdeferrable, `${row.tgname} is not deferrable`).toBe(true);
      expect(row.tginitdeferred, `${row.tgname} is not initially deferred`).toBe(true);
    }
  });

  // --- A: a valid published protocol survives a complete re-seed ----------
  it('leaves every published protocol published after a complete re-seed', async () => {
    const before = await publishAllProtocols(db);
    expect(before.length).toBeGreaterThan(0);

    await seedDatabase(db);

    expect(await publishedProtocolIds(db)).toEqual(before);

    // Not withdrawn, and not flagged either: the seed changed nothing about
    // these records, so it has nothing to say about them.
    const [withdrawn] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from protocols where publication_state = 'withdrawn'`,
    );
    expect(withdrawn?.n).toBe(0);

    const [flagged] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from protocols
        where needs_update and needs_update_reason like 'Withdrawn automatically%'`,
    );
    expect(flagged?.n).toBe(0);

    // And the public view agrees, which is what a reader would notice.
    const [visible] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from public_v_protocol_practitioner`,
    );
    expect(visible?.n).toBe(before.length);
  });

  it('leaves published claims published too', async () => {
    /*
     * `claim_evidence` is rebuilt selectively rather than wholesale, so claims
     * survived the original bug by luck of implementation rather than by
     * design. Now that its guard is deferred as well, the guarantee is the
     * same for both relations, and this says so.
     */
    await query(db, `update claims set publication_state = 'published'`);
    const [before] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where publication_state = 'published'`,
    );
    expect(before?.n).toBeGreaterThan(0);

    await seedDatabase(db);

    const [after] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claims where publication_state = 'published'`,
    );
    expect(after?.n).toBe(before?.n);
  });

  // --- B: real provenance loss is still caught ---------------------------
  it('still withdraws a protocol that really loses its provenance', async () => {
    const published = await publishAllProtocols(db);
    const target = published[0];
    expect(target).toBeDefined();

    // An ordinary statement, outside any rebuild: an editor removing the last
    // citation, a script, an admin action. It commits on its own, so the
    // deferred guard fires on it immediately.
    await query(db, `delete from protocol_sources where protocol_id = $1`, [target]);

    const [row] = await query<{ publication_state: string; needs_update_reason: string | null }>(
      db,
      `select publication_state, needs_update_reason from protocols where id = $1`,
      [target],
    );
    expect(row?.publication_state).toBe('withdrawn');
    expect(row?.needs_update_reason).toMatch(/no citable source with an exact location remains/);

    // Its neighbours are untouched: the guard withdraws the record that lost
    // its provenance, not the table.
    expect(await publishedProtocolIds(db)).toEqual(published.filter((id) => id !== target));
  });

  it('still withdraws a protocol whose provenance is lost inside a transaction', async () => {
    /*
     * Deferral must not become an escape hatch. A transaction that genuinely
     * *ends* with a published protocol standing on nothing is caught at its
     * commit — which is the first moment the statement is even true.
     */
    const published = await publishAllProtocols(db);
    const target = published[0];

    await db.transaction(async (tx) => {
      await tx.execute(sql`delete from protocol_sources where protocol_id = ${target}`);
    });

    const [row] = await query<{ publication_state: string }>(
      db,
      `select publication_state from protocols where id = $1`,
      [target],
    );
    expect(row?.publication_state).toBe('withdrawn');
  });

  // --- C: an incomplete rebuild leaves nothing behind ---------------------
  it('leaves nothing behind when a rebuild fails half way', async () => {
    const published = await publishAllProtocols(db);
    expect(published.length).toBeGreaterThan(0);

    // A rebuild that removes provenance and then fails, which is what an
    // interrupted seed is. Because the seed is one transaction, the failure
    // takes the whole rebuild with it.
    await expect(
      db.transaction(async (tx) => {
        await tx.execute(sql`delete from protocol_sources`);
        throw new Error('rebuild failed half way');
      }),
    ).rejects.toThrow('rebuild failed half way');

    // Nothing withdrawn, and nothing published without provenance: the
    // database is exactly as it was before the attempt.
    expect(await publishedProtocolIds(db)).toEqual(published);

    const [orphaned] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from protocols p
        where p.publication_state = 'published'
          and not exists (select 1 from protocol_sources ps where ps.protocol_id = p.id)`,
    );
    expect(orphaned?.n).toBe(0);
  });

  // --- D: seeding is idempotent with respect to publication state ---------
  it('changes no publication state however many times it is run', async () => {
    /*
     * Across every publishable relation, not only protocols.
     *
     * Protocols were withdrawn by the watchdog; six other relations were
     * rebuilt by deleting and re-inserting, which gave their rows new ids and
     * a default `publication_state`. Nothing was withdrawn and nothing raised
     * — 177 published records simply ceased to exist and were replaced by
     * unpublished ones saying the same thing. Counting published rows per
     * table catches both failures, and comparing ids catches the second even
     * if the counts happen to match.
     */
    await publishEverything(db);
    const before = await publishedByTable(db);
    for (const [table, ids] of Object.entries(before)) {
      expect(ids.length, `${table} has nothing published to test with`).toBeGreaterThan(0);
    }

    await seedDatabase(db);
    expect(await publishedByTable(db)).toEqual(before);

    await seedDatabase(db);
    expect(await publishedByTable(db)).toEqual(before);
  });
});
