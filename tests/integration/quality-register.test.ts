import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { seedDatabase } from '@db/seed';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';
import { approve, createStaff, type Staff } from '../support/fixtures';

/**
 * The quality index reports the database, not a picture of it (Phase C.10 §23).
 *
 * `/quality` lists every registered topic with how far it has got, including
 * fifteen that are unwritten. That only works if the state shown is derived. The
 * failure it replaced was a hand-maintained idea of what was ready, and the
 * failure it could become is a hand-maintained idea of what is blocked.
 *
 * So: every state on that page must move when the record moves, and the state
 * shown for an unwritten topic must come from the verification queue rather than
 * from a list in a React component.
 */

interface RegisterRow {
  slug: string;
  name: string;
  family: string | null;
  review_state: string;
  is_published: boolean;
  needs_update: boolean;
  claim_count: number;
  gap_count: number;
  open_issue_key: string | null;
}

describe('the quality register', () => {
  let db: TestDb;
  let staff: Staff;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
    staff = await createStaff(db);
  });

  async function register(): Promise<RegisterRow[]> {
    return query<RegisterRow>(
      db,
      `select slug, name, family, review_state, is_published, needs_update,
              claim_count, gap_count, open_issue_key
         from public_v_quality_register order by sort_order, name`,
    );
  }

  async function entry(slug: string): Promise<RegisterRow> {
    const rows = await register();
    const row = rows.find((r) => r.slug === slug);
    expect(row, `no register entry for ${slug}`).toBeDefined();
    return row!;
  }

  // --- It lists everything, not only what is finished -----------------------

  it('carries every registered topic, written or not', async () => {
    const [count] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from quality_topics`,
    );
    expect((await register()).length).toBe(Number(count!.n));
  });

  it('groups every topic into a family the page knows how to render', async () => {
    // A topic with no family, or an unrecognised one, silently disappears from
    // the index: the page renders per family and drops what it cannot place.
    const FAMILIES = [
      'analytical',
      'microbiological',
      'chemical-physical',
      'manufacturing',
      'handling',
      'documents',
    ];
    for (const row of await register()) {
      expect(FAMILIES, `${row.slug} has family ${String(row.family)}`).toContain(row.family);
    }
  });

  it('carries no prose for an unpublished topic', async () => {
    // A description is unreviewed content until the topic publishes, and the
    // register is read by `anon`.
    const result = await db.execute(sql`select * from public_v_quality_register limit 1`);
    const row = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows)[0] as Record<
      string,
      unknown
    >;
    for (const field of [
      'short_description',
      'simple_summary',
      'practitioner_summary',
      'what_it_proves',
      'what_it_does_not_prove',
    ]) {
      expect(Object.keys(row)).not.toContain(field);
    }
  });

  // --- The states move with the records -------------------------------------

  it('counts the claims and gaps actually attached', async () => {
    const before = await entry('hplc-purity');
    expect(before.claim_count).toBeGreaterThan(0);
    expect(before.gap_count).toBeGreaterThan(0);

    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where slug = 'hplc-purity'`,
    );
    await query(
      db,
      `insert into evidence_gaps (quality_topic_id, gap_key, gap_type, statement,
                                  why_not_supported, sort_order)
       values ($1, 'GAP-REGISTER-TEST', 'source_missing'::evidence_gap_type,
               'A statement this index does not make.',
               'Nothing in the register supports it.', 99)`,
      [topic!.id],
    );

    const after = await entry('hplc-purity');
    expect(after.gap_count).toBe(before.gap_count + 1);
    expect(after.claim_count).toBe(before.claim_count);
  });

  it('does not report anything as awaiting review on a freshly seeded database', async () => {
    /*
     * Worth pinning, because it surprised us. Loading a packet is data;
     * *submitting* it is an action the database insists on attributing to a
     * named editor, so `seedDatabase` cannot perform it and does not try.
     *
     * A clean database therefore shows four written topics reading "evidence
     * captured", not "awaiting scientific review" — the development database
     * only reads otherwise because `npm run evidence:submit` was run against it
     * by hand. That step is part of standing an environment up, and this is the
     * test that stops it being rediscovered.
     */
    for (const row of await register()) {
      expect(row.review_state).not.toBe('ready_for_scientific_review');
    }
  });

  it('follows the topic out of the ready state when it is edited', async () => {
    await query(
      db,
      `update quality_topics set review_state = 'ready_for_scientific_review'
         where slug = 'hplc-purity'`,
    );
    expect((await entry('hplc-purity')).review_state).toBe('ready_for_scientific_review');

    await query(
      db,
      `update quality_topics set short_description = 'Edited.' where slug = 'hplc-purity'`,
    );

    // The page reads this as "evidence captured" rather than "awaiting review",
    // which is the truth: the version a reviewer would have been asked about no
    // longer exists.
    expect((await entry('hplc-purity')).review_state).toBe('captured');
  });

  it('reports publication only once the record is actually published', async () => {
    expect((await entry('hplc-purity')).is_published).toBe(false);

    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where slug = 'hplc-purity'`,
    );
    for (const reviewType of ['source_check', 'scientific', 'compliance'] as const) {
      await approve(db, {
        entityType: 'quality_topic',
        entityId: topic!.id,
        reviewType,
        reviewerId: reviewType === 'compliance' ? staff.compliance : staff.scientific,
        table: 'quality_topics',
      });
    }
    await query(db, `update quality_topics set publication_state = 'published' where id = $1`, [
      topic!.id,
    ]);

    expect((await entry('hplc-purity')).is_published).toBe(true);
  });

  it('surfaces a re-review flag rather than hiding it', async () => {
    await query(
      db,
      `update quality_topics set needs_update = true, needs_update_reason = 'New edition issued'
         where slug = 'hplc-purity'`,
    );
    expect((await entry('hplc-purity')).needs_update).toBe(true);
  });

  // --- The unwritten topics read from the queue -----------------------------

  it('derives an unwritten topic’s recorded question from the queue', async () => {
    // Sterility reads "open question recorded" because the verification queue
    // names it — not because a component holds a list of blocked subjects.
    const sterility = await entry('sterility');
    expect(sterility.open_issue_key).not.toBeNull();
    expect(sterility.claim_count).toBe(0);
  });

  it('stops naming an issue once every issue for that topic is resolved', async () => {
    // More than one open issue can name a topic, and the field reports the
    // lowest-numbered one. Resolving that one reveals the next rather than
    // clearing the state, which is correct and is the reason this asserts on
    // the whole set rather than on one key.
    await query(
      db,
      `update verification_issues set status = 'resolved', resolved_at = current_date,
              resolution_notes = 'Subscription obtained.'
         where related_keys ? 'quality_topic:sterility'`,
    );
    expect((await entry('sterility')).open_issue_key).toBeNull();
  });

  it('reports an open question against a written topic too, and the page ignores it', async () => {
    /*
     * The reason this field is not called `blocking_issue_key` any more.
     *
     * V-008 ("purity versus identity versus content") names hplc-purity, which
     * is written and blocked by nothing. The field reports the queue faithfully;
     * it is the page that decides an open question only describes a topic that
     * has no claims.
     */
    const written = await entry('hplc-purity');
    expect(written.claim_count).toBeGreaterThan(0);
    expect(written.open_issue_key).not.toBeNull();
  });
});
