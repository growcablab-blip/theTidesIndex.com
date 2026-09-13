import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedDemoData } from '@db/seed/demo';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * A demonstration record is not public (migration 0021).
 *
 * The fixture exists so the compound pages have something to render, and it
 * flows through the real publish gates, which is the point of it. What nobody
 * checked was where it surfaced: it was the only published compound, so the
 * public directory listed it, search returned it, and the front page counted it
 * as "1 compound published".
 *
 * That last one is the serious version. The single sentence this index makes to
 * a reader is that a published statement has been traced and reviewed. It was
 * telling them one had, and none had.
 *
 * These assertions are the guard. They are deliberately written against the
 * *views* rather than against a page, because a page can be changed by anyone
 * and the view is where the rule lives.
 */

describe('demonstration records are excluded from every public surface', () => {
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
    // Flagged, as every caller but one takes it.
    await seedDemoData(db);
  });

  async function count(relation: string, where = ''): Promise<number> {
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from ${relation} ${where}`,
    );
    return Number(row!.n);
  }

  it('publishes the fixture through the real gates, so the exclusion is doing the work', async () => {
    // If this stopped being true the rest of the file would pass vacuously: the
    // record would be absent because it was never published, not because it is
    // excluded.
    expect(await count('peptides', "where is_demonstration and publication_state = 'published'"))
      .toBeGreaterThan(0);
  });

  it('keeps it out of the published compound view', async () => {
    expect(await count('public_v_peptides')).toBe(0);
  });

  it('keeps it out of the compound register', async () => {
    const slugs = await query<{ slug: string }>(db, `select slug from public_v_peptide_register`);
    expect(slugs.map((r) => r.slug)).not.toContain('demonstration-compound');
  });

  it('keeps it out of the published quality topics and the quality register', async () => {
    expect(await count('public_v_quality_topics')).toBe(0);
    const keys = await query<{ quality_key: string }>(
      db,
      `select quality_key from public_v_quality_register`,
    );
    expect(keys.map((r) => r.quality_key)).not.toContain('demo-analytical-test');
  });

  it('keeps its claims out of the published claim view', async () => {
    expect(await count('public_v_claims')).toBe(0);
  });

  it('keeps its sources out of the source register', async () => {
    const keys = await query<{ source_key: string }>(db, `select source_key from public_v_sources`);
    expect(keys.some((r) => r.source_key.toUpperCase().includes('DEMO'))).toBe(false);
    expect(await count('sources', 'where is_demonstration')).toBeGreaterThan(0);
  });

  it('keeps it out of search results', async () => {
    // The index is built from everything; the public view is what may be
    // returned. Filtering at read time rather than at index time means a
    // fixture loaded after the index was built cannot leak.
    const indexed = await count('search_documents');
    const public_ = await count('public_v_search_documents');
    expect(indexed).toBeGreaterThan(public_);

    const titles = await query<{ title: string }>(
      db,
      `select title from public_v_search_documents`,
    );
    expect(titles.some((r) => r.title.toLowerCase().includes('demonstration'))).toBe(false);
  });

  it('counts nothing towards the coverage a reader is shown', async () => {
    const [row] = await query<{ peptides: number; topics: number; claims: number }>(
      db,
      `select (select count(*) from public_v_peptides)::int as peptides,
              (select count(*) from public_v_quality_topics)::int as topics,
              (select count(*) from public_v_claims)::int as claims`,
    );
    expect(row).toEqual({ peptides: 0, topics: 0, claims: 0 });
  });

  it('is still there, and still reachable to anything reading the base tables', async () => {
    // The fixture is not deleted. Removing it would take away the only way to
    // exercise the published path locally, which is what it is for.
    expect(await count('peptides', 'where is_demonstration')).toBe(1);
    expect(await count('profiles', 'where is_demonstration')).toBeGreaterThan(0);
  });

  it('can be created unflagged, and then it is public', async () => {
    // The escape hatch, asserted so it cannot rot: one suite needs a published
    // record that behaves like real content, and this is how it asks.
    await truncateContent(db);
    await seedDatabase(db);
    await seedDemoData(db, { markAsDemonstration: false });

    expect(await count('peptides', 'where is_demonstration')).toBe(0);
    expect(await count('public_v_peptides')).toBeGreaterThan(0);
  });
});
