import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeTestDb, createTestDb, query, type TestDb } from '../support/test-db';

/**
 * Applies the real migration files to an in-process Postgres and asserts the
 * shape of the resulting schema. If this suite passes, the SQL that will run
 * against Supabase is known to be valid.
 */
describe('migrations', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });


  it('applies cleanly and creates the core evidence tables', async () => {
    const rows = await query<{ table_name: string }>(
      db,
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`,
    );
    const tables = rows.map((r) => r.table_name);

    for (const expected of [
      'sources',
      'source_locations',
      'peptides',
      'peptide_aliases',
      'claims',
      'claim_evidence',
      'protocols',
      'protocol_sources',
      'peptide_routes',
      'regulatory_statuses',
      'quality_topics',
      'disagreements',
      'disagreement_positions',
      'publications',
      'publication_sections',
      'publication_claims',
      'reviews',
      'revisions',
      'corrections',
      'verification_issues',
      'search_documents',
    ]) {
      expect(tables, `missing table ${expected}`).toContain(expected);
    }
  });

  it('derives source citability from QC status rather than storing it', async () => {
    const [row] = await query<{ is_generated: string }>(
      db,
      `select is_generated from information_schema.columns
       where table_name = 'sources' and column_name = 'is_citable'`,
    );
    expect(row?.is_generated).toBe('ALWAYS');
  });

  it('keeps source type and evidence type foreign-key constrained', async () => {
    const rows = await query<{ constraint_name: string }>(
      db,
      `select tc.constraint_name
       from information_schema.table_constraints tc
       join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_name = 'claim_evidence'
         and kcu.column_name = 'evidence_type_key'`,
    );
    expect(rows.length).toBeGreaterThan(0);
  });

  it('keeps verification state and publication state as separate columns', async () => {
    // The combinations matter: scientifically reviewed but unpublished,
    // published but flagged for update, previously published and superseded.
    // A single ladder cannot express those.
    const rows = await query<{ column_name: string; is_generated: string }>(
      db,
      `select column_name, is_generated from information_schema.columns
       where table_name = 'claims'
         and column_name in ('review_state', 'publication_state', 'needs_update', 'editorial_state')`,
    );
    const byName = new Map(rows.map((r) => [r.column_name, r.is_generated]));

    expect(byName.get('review_state')).toBe('NEVER');
    expect(byName.get('publication_state')).toBe('NEVER');
    expect(byName.get('needs_update')).toBe('NEVER');
    // The canonical label is derived, so it can never contradict the two
    // dimensions it summarises.
    expect(byName.get('editorial_state')).toBe('ALWAYS');
  });

  it('separates human from preclinical evidence as a queryable attribute', async () => {
    const rows = await query<{ column_name: string }>(
      db,
      `select column_name from information_schema.columns
       where table_name = 'evidence_types'`,
    );
    const columns = rows.map((r) => r.column_name);
    expect(columns).toContain('evidence_class');
    expect(columns).toContain('is_human_evidence');
  });

  it('installs the publish-gate triggers', async () => {
    const rows = await query<{ tgname: string }>(
      db,
      `select tgname from pg_trigger where not tgisinternal order by tgname`,
    );
    const triggers = rows.map((r) => r.tgname);

    for (const expected of [
      'claims_c_publish_gate',
      'protocols_c_publish_gate',
      'peptides_c_publish_gate',
      'quality_topics_c_publish_gate',
      'peptide_routes_c_publish_gate',
      'regulatory_statuses_c_publish_gate',
      'claims_b_coherence',
      'protocols_b_coherence',
      'peptides_b_coherence',
      'claims_revision',
      'protocols_revision',
      'claim_evidence_provenance_guard',
      'protocol_sources_provenance_guard',
      'sources_citability',
    ]) {
      expect(triggers, `missing trigger ${expected}`).toContain(expected);
    }
  });

  it('grants the public role read access to every public view', async () => {
    // A view added by a later migration and never granted is invisible until a
    // record is published, which is exactly when it must not fail.
    const rows = await query<{ table_name: string }>(
      db,
      `select table_name from information_schema.views
        where table_schema = 'public' and table_name like 'public\\_v\\_%'
          and not has_table_privilege('anon', 'public.' || table_name, 'SELECT')
        order by table_name`,
    );
    expect(rows.map((r) => r.table_name)).toEqual([]);
  });

  it('refuses to mark a restricted source copy as publishable full text', async () => {
    await expect(
      query(
        db,
        `insert into sources (source_key, title, source_type_key, qc_status, public_fulltext_allowed)
         values ('SRC-TEST-COPYRIGHT', 'Restricted copy', 'academic_textbook', 'replace', true)`,
      ),
    ).rejects.toThrow();
  });
});
