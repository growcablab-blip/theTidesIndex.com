import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedData } from '@db/seed/seed-data';
import { closeTestDb, createTestDb, query, type TestDb } from '../support/test-db';

describe('seeding', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
    await seedDatabase(db);
  });

  afterAll(async () => {
    await closeTestDb(db);
  });


  it('is idempotent', async () => {
    await seedDatabase(db);
    const [row] = await query<{ count: string }>(db, 'select count(*)::text from peptides');
    expect(row?.count).toBe(String(seedData.peptides.length));
  });

  it('covers exactly the vocabulary shipped in evidence_taxonomy.json', () => {
    // evidence_taxonomy.json is the handoff's authoritative key list. The
    // labelled seed files must cover it exactly, so neither file can drift.
    const seededEvidence = seedData.evidenceTypes.map((t) => t.key).sort();
    const seededSources = seedData.sourceTypes.map((t) => t.key).sort();

    expect(seededEvidence).toEqual([...seedData.evidenceTaxonomy.evidence_types].sort());
    expect(seededSources).toEqual([...seedData.evidenceTaxonomy.source_types].sort());
  });

  it('never classifies preclinical evidence as human evidence', async () => {
    const rows = await query<{ key: string }>(
      db,
      `select key from evidence_types
       where evidence_class <> 'human' and is_human_evidence`,
    );
    expect(rows).toEqual([]);
  });

  it('loads the source registry with QC status intact', async () => {
    const rows = await query<{ source_key: string; qc_status: string; is_citable: boolean }>(
      db,
      `select source_key, qc_status, is_citable from sources order by source_key`,
    );
    expect(rows.length).toBe(seedData.sourceManifest.sources.length);

    // The three corrupted or table-of-contents-only copies must not be citable.
    for (const key of ['SRC-013', 'SRC-014', 'SRC-015']) {
      const row = rows.find((r) => r.source_key === key);
      expect(row?.qc_status, key).toBe('replace');
      expect(row?.is_citable, key).toBe(false);
    }
  });

  it('records the seed cohort with no fabricated medical content', async () => {
    const rows = await query<{
      peptide_key: string;
      simple_summary: string | null;
      practitioner_summary: string | null;
      editorial_state: string;
    }>(
      db,
      `select peptide_key, simple_summary, practitioner_summary, editorial_state
       from peptides order by peptide_key`,
    );

    expect(rows.length).toBe(10);
    for (const row of rows) {
      expect(row.simple_summary, row.peptide_key).toBeNull();
      expect(row.practitioner_summary, row.peptide_key).toBeNull();
      expect(row.editorial_state, row.peptide_key).toBe('unreviewed');
    }
  });

  it('records TB-500 as related but distinct, not as a synonym', async () => {
    const [row] = await query<{ alias_type: string; notes: string | null }>(
      db,
      `select alias_type, notes from peptide_aliases where alias = 'TB-500'`,
    );
    expect(row?.alias_type).toBe('related_but_distinct');
    expect(row?.notes).toMatch(/V-001/);
  });

  it('loads the open verification queue', async () => {
    const rows = await query<{ issue_key: string; status: string }>(
      db,
      `select issue_key, status from verification_issues order by issue_key`,
    );
    expect(rows.map((r) => r.issue_key)).toContain('V-013');
    expect(rows.every((r) => r.status === 'open')).toBe(true);
  });
});
