import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedData } from '@db/seed/seed-data';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Tides syntheses in the database (migration 0027).
 *
 * A synthesis is a conclusion no single source states, so the database holds
 * what it can of the rules around it: no numerals, exactly one subject, and no
 * publication while it rests on fewer than two claims or on any claim that is
 * not itself published. Unpublished syntheses, and learning-topic claims whose
 * topic is unpublished, never appear through the public views.
 */
describe('Tides syntheses', () => {
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

  it('seeds every synthesis, linked to the claims it names', async () => {
    const rows = await query<{ synthesis_key: string; linked: number }>(
      db,
      `select s.synthesis_key, count(l.claim_id)::int as linked
         from editorial_syntheses s
         left join editorial_synthesis_claims l on l.synthesis_id = s.id
        group by s.synthesis_key`,
    );
    expect(rows.length).toBe(seedData.syntheses.length);
    for (const seed of seedData.syntheses) {
      const row = rows.find((r) => r.synthesis_key === seed.synthesisKey);
      expect(row?.linked, seed.synthesisKey).toBe(seed.claimKeys.length);
    }
  });

  it('refuses a synthesis that carries a numeral', async () => {
    const [topic] = await query<{ id: string }>(db, `select id from learning_topics limit 1`);
    await expect(
      query(
        db,
        `insert into editorial_syntheses (synthesis_key, learning_topic_id, statement,
           plain_language_text, reasoning, does_not_conclude)
         values ('SYN-TEST-01', $1, 'Half of them, about 50%, do this.', 'Plain.', 'Because.', 'Nothing more.')`,
        [topic!.id],
      ),
    ).rejects.toThrow();
  });

  it('refuses a synthesis with no subject, or with two', async () => {
    const [topic] = await query<{ id: string }>(db, `select id from learning_topics limit 1`);
    const [quality] = await query<{ id: string }>(db, `select id from quality_topics limit 1`);
    await expect(
      query(
        db,
        `insert into editorial_syntheses (synthesis_key, statement, plain_language_text, reasoning, does_not_conclude)
         values ('SYN-TEST-02', 'A statement.', 'Plain.', 'Because.', 'Nothing more.')`,
      ),
    ).rejects.toThrow();
    await expect(
      query(
        db,
        `insert into editorial_syntheses (synthesis_key, learning_topic_id, quality_topic_id, statement,
           plain_language_text, reasoning, does_not_conclude)
         values ('SYN-TEST-03', $1, $2, 'A statement.', 'Plain.', 'Because.', 'Nothing more.')`,
        [topic!.id, quality!.id],
      ),
    ).rejects.toThrow();
  });

  it('will not publish a synthesis ahead of the claims it rests on', async () => {
    // Seeded claims are unpublished, so publication must be refused.
    await expect(
      query(
        db,
        `update editorial_syntheses set publication_state = 'published' where synthesis_key = 'SYN-BODY-01'`,
      ),
    ).rejects.toThrow(/unpublished/);
  });

  it('will not publish a synthesis resting on fewer than two claims', async () => {
    const [topic] = await query<{ id: string }>(db, `select id from learning_topics limit 1`);
    await expect(
      query(
        db,
        `insert into editorial_syntheses (synthesis_key, learning_topic_id, statement,
           plain_language_text, reasoning, does_not_conclude, publication_state)
         values ('SYN-TEST-04', $1, 'A statement.', 'Plain.', 'Because.', 'Nothing more.', 'published')`,
        [topic!.id],
      ),
    ).rejects.toThrow(/at least two claims/);
  });

  it('keeps unpublished syntheses, topics and their claims out of the public views', async () => {
    const [syntheses] = await query<{ n: number }>(db, `select count(*)::int as n from public_v_editorial_syntheses`);
    const [topics] = await query<{ n: number }>(db, `select count(*)::int as n from public_v_learning_topics`);
    const [claims] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from public_v_claims where learning_topic_id is not null`,
    );
    const [gaps] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from public_v_evidence_gaps where learning_topic_id is not null`,
    );
    expect(syntheses!.n).toBe(0);
    expect(topics!.n).toBe(0);
    expect(claims!.n).toBe(0);
    expect(gaps!.n).toBe(0);
  });
});
