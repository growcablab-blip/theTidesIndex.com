import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedData } from '@db/seed/seed-data';
import { loadQualityMap } from '@db/seed/quality-map';
import { withPublicSession } from '@/server/db/session';
import type { Database } from '@/server/db/types';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  resultRows,
  truncateContent,
  type TestDb,
} from '../support/test-db';

/**
 * The quality map (Phase C.3).
 *
 * The map exists so that a certificate of analysis stops reading as one verdict:
 * for a given test it records what else relates to it, and what it does not
 * answer.
 *
 * The second half is the reason the map needs rules. "A purity figure says
 * nothing about sterility" is a statement about evidence, and a map free to
 * assert it would be a second place where medical content gets written — outside
 * the provenance chain, outside the publish gates, and much easier to edit than
 * a claim. These tests hold that door shut.
 */

const HUB = 'hplc-purity';

describe('the quality map', () => {
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

  async function hubId(): Promise<string> {
    const [row] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = $1`,
      [HUB],
    );
    return row!.id;
  }

  // --- What the map records ----------------------------------------------
  it('builds the hub out of the topics the reader would otherwise conflate', async () => {
    const edges = await query<{ to_key: string; relationship_type: string }>(
      db,
      `select t.quality_key as to_key, r.relationship_type
       from quality_relationships r
       join quality_topics f on f.id = r.from_topic_id
       join quality_topics t on t.id = r.to_topic_id
       where f.quality_key = $1
       order by r.sort_order`,
      [HUB],
    );

    const fromHub = seedData.qualityMap.edges.filter((e) => e.from === HUB);
    expect(edges).toHaveLength(fromHub.length);

    const byKey = new Map(edges.map((e) => [e.to_key, e.relationship_type]));
    // The two statements the packet actually supports.
    expect(byKey.get('identity-testing')).toBe('commonly_conflated');
    expect(byKey.get('peptide-content-assay')).toBe('commonly_conflated');
    // The two it cannot, held as absences instead.
    expect(byKey.get('sterility')).toBe('not_addressed_by');
    expect(byKey.get('bacterial-endotoxin')).toBe('not_addressed_by');
  });

  it('gives every edge a basis: a claim, a recorded gap, or a declaration that it is structural', async () => {
    const orphans = await query<{ to_key: string; relationship_type: string }>(
      db,
      `select t.quality_key as to_key, r.relationship_type
       from quality_relationships r
       join quality_topics t on t.id = r.to_topic_id
       where r.claim_key is null
         and r.gap_key is null
         and not r.is_editorial_navigational`,
    );
    expect(orphans, 'no edge may arrive with no basis at all').toEqual([]);
  });

  it('traces "says nothing about sterility" to the gap, not to a claim', async () => {
    const [edge] = await query<{ claim_key: string | null; gap_key: string | null }>(
      db,
      `select r.claim_key, r.gap_key
       from quality_relationships r
       join quality_topics t on t.id = r.to_topic_id
       where t.quality_key = 'sterility'`,
    );

    // The distinction the whole design turns on. The index does not know that
    // purity says nothing about sterility because a source told it; it knows
    // that no source it holds addresses sterility at all. Those are different
    // facts and the map points at the right one.
    expect(edge?.gap_key).toBe('hplc-purity-gap-01');
    expect(edge?.claim_key).toBeNull();
  });

  // --- What the map cannot do --------------------------------------------
  it('refuses an edge that asserts what a test does not establish without citing anything', async () => {
    const id = await hubId();
    const [target] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'gmp-cgmp'`,
    );

    const message = await rejectionMessage(
      query(
        db,
        `insert into quality_relationships
           (from_topic_id, to_topic_id, relationship_type, rationale, is_editorial_navigational)
         values ($1, $2, 'not_addressed_by', 'A purity figure says nothing about GMP status.', true)`,
        [id, target!.id],
      ),
    );

    // Declaring it navigational does not buy an exemption: the constraint reads
    // the relationship type, not the author's intention.
    expect(message).toMatch(/quality_relationships_basis/);
  });

  it('refuses an edge from a topic to itself', async () => {
    const id = await hubId();
    const message = await rejectionMessage(
      query(
        db,
        `insert into quality_relationships
           (from_topic_id, to_topic_id, relationship_type, rationale, is_editorial_navigational)
         values ($1, $1, 'complementary', 'Circular.', true)`,
        [id],
      ),
    );
    expect(message).toMatch(/quality_relationships_distinct/);
  });

  it('refuses an edge citing a claim or gap that does not exist', async () => {
    const id = await hubId();
    const [target] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'lyophilization'`,
    );

    const message = await rejectionMessage(
      query(
        db,
        `insert into quality_relationships
           (from_topic_id, to_topic_id, relationship_type, rationale, claim_key)
         values ($1, $2, 'commonly_conflated', 'Invented basis.', 'HPLC-999')`,
        [id, target!.id],
      ),
    );
    expect(message).toMatch(/claim_key|foreign key/i);
  });

  it('names the offending edge when the map file itself is wrong', async () => {
    // The constraint would catch these too, but a database-level error names a
    // table, not the line in the map file someone has to go and fix.
    //
    // The bad edges are passed in rather than written over `seedData`. Test
    // files share a worker process, so mutating a module singleton — even with a
    // `finally` to put it back — leaves every later suite one aborted test away
    // from reading a corrupted map.
    const template = seedData.qualityMap.edges[0]!;

    // An assertion about what a test does not establish, with nothing behind it.
    const unsourced = await rejectionMessage(
      loadQualityMap(db, [
        {
          ...template,
          to: 'sterility',
          relationshipType: 'not_addressed_by',
          claimKey: null,
          gapKey: null,
          isEditorialNavigational: false,
        },
      ]),
    );
    expect(unsourced).toMatch(/hplc-purity -> sterility \(not_addressed_by\)/);
    expect(unsourced).toMatch(/must cite the claim or the recorded gap/);

    // The same assertion, cited but relabelled as mere navigation. Citing it is
    // not enough: an edge of this type is never structural, because structural
    // edges are exempt from scrutiny the reader does not know they are getting.
    const mislabelled = await rejectionMessage(
      loadQualityMap(db, [
        {
          ...template,
          to: 'sterility',
          relationshipType: 'not_addressed_by',
          claimKey: null,
          gapKey: 'hplc-purity-gap-01',
          isEditorialNavigational: true,
        },
      ]),
    );
    expect(mislabelled).toMatch(/never mere navigation/);
  });

  // --- What the public sees ----------------------------------------------
  it('shows nothing while the topic it belongs to is unpublished', async () => {
    const visible = await withPublicSession(db as unknown as Database, (tx) =>
      tx.execute(`select count(*)::int as n from public_v_quality_relationships`),
    );
    expect(resultRows<{ n: number }>(visible)[0]?.n).toBe(0);
  });

  it('carries whether the target is readable, so an empty topic is named rather than hidden', async () => {
    // A reader on a published purity page should learn that sterility is a
    // separate question even though this index has nothing written about it.
    // Hiding the edge would leave purity looking like the whole story.
    const columns = await query<{ column_name: string }>(
      db,
      `select column_name from information_schema.columns
       where table_name = 'public_v_quality_relationships'`,
    );
    const names = columns.map((c) => c.column_name);
    expect(names).toContain('to_is_published');
    expect(names).toContain('to_slug');
    expect(names).toContain('to_name');
  });

  it('exposes no route from a relationship back to a draft topic’s content', async () => {
    const columns = await query<{ column_name: string }>(
      db,
      `select column_name from information_schema.columns
       where table_name = 'public_v_quality_relationships'`,
    );
    const names = columns.map((c) => c.column_name);
    for (const leaked of [
      'what_it_proves',
      'what_it_does_not_prove',
      'simple_summary',
      'practitioner_summary',
      'review_state',
    ]) {
      expect(names, `${leaked} must not travel with the edge`).not.toContain(leaked);
    }
  });
});
