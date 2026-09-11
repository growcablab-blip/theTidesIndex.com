import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { configureFuzzyMatching, search } from '@/server/search/search-service';
import { closeTestDb, createTestDb, truncateContent, query, type TestDb } from '../support/test-db';
import {
  approve,
  createStaff,
  setPublicationState,
  type Staff,
} from '../support/fixtures';

/**
 * ACCEPTANCE_TESTS.md section C — search.
 */
describe('search', () => {
  let db: TestDb;
  let staff: Staff;

  beforeAll(async () => {
    db = await createTestDb();
    // This suite asserts what the search index does and does not contain, so it
    // must start from an empty database rather than from whatever another suite
    // published. Every file shares one instance.
    await truncateContent(db);
    await seedDatabase(db);
    await configureFuzzyMatching(db);
    staff = await createStaff(db);

    // Publish two seeded compounds so there is something indexed. Summaries are
    // written here only because the publish gate requires them; in production
    // they arrive from reviewed extraction.
    for (const slug of ['bpc-157', 'thymosin-beta-4']) {
      const [row] = await query<{ id: string }>(db, `select id from peptides where slug = $1`, [
        slug,
      ]);
      const id = row!.id;

      await query(
        db,
        `update peptides set
           short_description = 'Test orientation line.',
           simple_summary = 'Plain-language placeholder written for this test.',
           practitioner_summary = 'Practitioner placeholder written for this test.',
           unknowns_summary = 'Human evidence has not been assessed in this fixture.'
         where id = $1`,
        [id],
      );

      for (const reviewType of ['scientific', 'compliance'] as const) {
        await approve(db, {
          entityType: 'peptide',
          entityId: id,
          reviewType,
          reviewerId: reviewType === 'scientific' ? staff.scientific : staff.compliance,
          table: 'peptides',
        });

      }
      await setPublicationState(db, 'peptides', id, 'published');
    }

    // Publish one quality topic.
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'hplc-purity'`,
    );
    await query(
      db,
      `update quality_topics set
         what_it_proves = 'Chromatographic purity of the sample that was analysed.',
         what_it_does_not_prove = 'It does not establish identity, the amount of peptide in a vial, sterility, or endotoxin status.'
       where id = $1`,
      [topic!.id],
    );
    await approve(db, {
      entityType: 'quality_topic',
      entityId: topic!.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'quality_topics',
    });
    await setPublicationState(db, 'quality_topics', topic!.id, 'published');
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  it('finds a compound by canonical name', async () => {
    const results = await search(db, 'BPC-157');
    expect(results[0]?.slug).toBe('bpc-157');
    expect(results[0]?.entityType).toBe('peptide');
  });

  it('finds a compound by a common alias', async () => {
    const results = await search(db, 'Body Protection Compound');
    expect(results.some((r) => r.slug === 'bpc-157')).toBe(true);
  });

  it('tolerates a misremembered spelling', async () => {
    const results = await search(db, 'BPC157');
    expect(results.some((r) => r.slug === 'bpc-157')).toBe(true);
  });

  it('surfaces the canonical record for a name that is related but not identical', async () => {
    // Searching TB-500 should reach Thymosin beta-4, because that is where the
    // discussion lives — while the alias itself stays labelled as unresolved
    // rather than being folded into the canonical name (verification issue V-001).
    const results = await search(db, 'TB-500');
    const match = results.find((r) => r.slug === 'thymosin-beta-4');
    expect(match).toBeDefined();
    expect(match?.aliasText).toMatch(/related but distinct/i);

    const [alias] = await query<{ alias_type: string }>(
      db,
      `select alias_type from public_v_peptide_aliases where alias = 'TB-500'`,
    );
    expect(alias?.alias_type).toBe('related_but_distinct');
  });

  it('finds quality topics such as chromatographic purity', async () => {
    const results = await search(db, 'HPLC purity');
    expect(results.some((r) => r.entityType === 'quality_topic')).toBe(true);
  });

  it('finds a registered source by title and author', async () => {
    const byTitle = await search(db, 'Synthetic Peptides', { entityTypes: ['source'] });
    expect(byTitle.length).toBeGreaterThan(0);

    const byAuthor = await search(db, 'Albericio', { entityTypes: ['source'] });
    expect(byAuthor.length).toBeGreaterThan(0);
  });

  it('filters by entity type', async () => {
    const results = await search(db, 'peptide', { entityTypes: ['quality_topic'] });
    expect(results.every((r) => r.entityType === 'quality_topic')).toBe(true);
  });

  it('filters to records with human evidence recorded', async () => {
    // No claims have been published in this fixture, so no compound carries
    // human evidence. The filter must return nothing rather than everything.
    const results = await search(db, 'BPC-157', { humanEvidenceOnly: true });
    expect(results).toEqual([]);
  });

  it('does not index unpublished records', async () => {
    const results = await search(db, 'Retatrutide');
    expect(results.some((r) => r.entityType === 'peptide')).toBe(false);
  });

  it('removes a record from the index when it is withdrawn', async () => {
    const [row] = await query<{ id: string }>(db, `select id from peptides where slug = 'semax'`);
    const before = await search(db, 'Semax');
    expect(before.some((r) => r.entityType === 'peptide')).toBe(false);

    await query(
      db,
      `update peptides set simple_summary = 'x', unknowns_summary = 'x' where id = $1`,
      [row!.id],
    );
    for (const reviewType of ['scientific', 'compliance'] as const) {
      await approve(db, {
        entityType: 'peptide',
        entityId: row!.id,
        reviewType,
        reviewerId: reviewType === 'scientific' ? staff.scientific : staff.compliance,
        table: 'peptides',
      });
    }
    await setPublicationState(db, 'peptides', row!.id, 'published');
    expect((await search(db, 'Semax')).some((r) => r.entityType === 'peptide')).toBe(true);

    await setPublicationState(db, 'peptides', row!.id, 'withdrawn');
    expect((await search(db, 'Semax')).some((r) => r.entityType === 'peptide')).toBe(false);
  });

  it('returns nothing for an empty query rather than everything', async () => {
    expect(await search(db, '')).toEqual([]);
    expect(await search(db, '   ')).toEqual([]);
  });
});
