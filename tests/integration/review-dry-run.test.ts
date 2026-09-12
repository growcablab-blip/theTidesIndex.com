import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { productionBlockers, type ProductionFacts } from '@/server/ops/production-readiness';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';
import { approve, createStaff, type Staff } from '../support/fixtures';

/**
 * The first review, end to end (Phase C.10 §21).
 *
 * `review-lifecycle.test.ts` proves each mechanism separately. This walks one
 * topic the whole way — submitted, reviewed, approved, published, edited,
 * withdrawn — because a chain of individually correct links can still fail to
 * be a chain.
 *
 * It is a **dry run**, not a review. The reviewer here is a fixture; nothing it
 * does is a scientific opinion, and the last section of this file is the reason
 * that distinction is enforced rather than merely stated.
 */

describe('a review, from submission to withdrawal', () => {
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

  async function claim(key: string) {
    const [row] = await query<{
      id: string;
      version: number;
      review_state: string;
      publication_state: string;
      review_submitted_at: string | null;
    }>(
      db,
      `select id, version, review_state, publication_state, review_submitted_at
         from claims where claim_key = $1`,
      [key],
    );
    return row!;
  }

  // --- The submission clock -------------------------------------------------

  it('starts a clock when a record is handed to a reviewer', async () => {
    const before = await claim('HPLC-001');
    // Knock it back, then submit it again: the seeded rows predate the column
    // and are legitimately null, so the transition is what has to be exercised.
    await query(db, `update claims set review_state = 'captured' where id = $1`, [before.id]);
    expect((await claim('HPLC-001')).review_submitted_at).toBeNull();

    await query(
      db,
      `update claims set review_state = 'ready_for_scientific_review' where id = $1`,
      [before.id],
    );
    expect((await claim('HPLC-001')).review_submitted_at).not.toBeNull();
  });

  it('does not count starting the clock as an edit', async () => {
    const before = await claim('HPLC-002');
    await query(db, `update claims set review_state = 'captured' where id = $1`, [before.id]);
    await query(
      db,
      `update claims set review_state = 'ready_for_scientific_review' where id = $1`,
      [before.id],
    );
    // A version bump here would strand every approval the submission is
    // intended to collect, on the way in.
    expect((await claim('HPLC-002')).version).toBe(before.version);
  });

  it('restarts the clock when the record is rewritten', async () => {
    const original = await claim('HPLC-003');
    await query(db, `update claims set review_state = 'captured' where id = $1`, [original.id]);
    await query(
      db,
      `update claims set review_state = 'ready_for_scientific_review' where id = $1`,
      [original.id],
    );
    expect((await claim('HPLC-003')).review_submitted_at).not.toBeNull();

    // An edit knocks the record back to `captured`, and the wait that was being
    // measured was a wait to review different text.
    await query(db, `update claims set uncertainty_text = 'Rewritten.' where id = $1`, [
      original.id,
    ]);
    const after = await claim('HPLC-003');
    expect(after.review_state).toBe('captured');
    expect(after.review_submitted_at).toBeNull();
  });

  it('keeps the clock once the record advances past review', async () => {
    const target = await claim('HPLC-004');
    await query(db, `update claims set review_state = 'captured' where id = $1`, [target.id]);
    await query(
      db,
      `update claims set review_state = 'ready_for_scientific_review' where id = $1`,
      [target.id],
    );
    const submitted = String((await claim('HPLC-004')).review_submitted_at);

    await approve(db, {
      entityType: 'claim',
      entityId: target.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const after = await claim('HPLC-004');
    expect(after.review_state).toBe('scientific_reviewed');
    // Turnaround for a completed review is only computable if this survives.
    expect(String(after.review_submitted_at)).toBe(submitted);
  });

  // --- The whole chain ------------------------------------------------------

  it('carries one claim from submission to published and back out again', async () => {
    const target = await claim('HPLC-005');

    // 1. Submitted.
    await query(db, `update claims set review_state = 'captured' where id = $1`, [target.id]);
    await query(
      db,
      `update claims set review_state = 'ready_for_scientific_review' where id = $1`,
      [target.id],
    );
    expect((await claim('HPLC-005')).review_submitted_at).not.toBeNull();

    // 2. Reviewed by people, against the version they were shown. A claim
    //    needs the source check, the scientific approval and the compliance
    //    approval before its gate will open.
    for (const reviewType of ['source_check', 'scientific', 'compliance'] as const) {
      await approve(db, {
        entityType: 'claim',
        entityId: target.id,
        reviewType,
        reviewerId:
          reviewType === 'compliance'
            ? staff.compliance
            : reviewType === 'scientific'
              ? staff.scientific
              : staff.editor,
        table: 'claims',
        ...(reviewType === 'scientific'
          ? { comments: 'Reading is fair to the passage. Dry run only; not a scientific opinion.' }
          : {}),
      });
    }
    expect((await claim('HPLC-005')).review_state).toBe('compliance_reviewed');

    // 3. Published — which the gate permits only now.
    await query(db, `update claims set publication_state = 'published' where id = $1`, [target.id]);
    expect((await claim('HPLC-005')).publication_state).toBe('published');

    // 4. Edited. The approval was for different words.
    await query(
      db,
      `update claims set interpretation_notes = 'Revised after publication.' where id = $1`,
      [target.id],
    );

    const after = await claim('HPLC-005');
    expect(after.version).toBe(target.version + 1);
    expect(after.review_state).toBe('captured');
    // The gate withdraws it rather than leaving unreviewed wording public.
    expect(after.publication_state).not.toBe('published');
  });

  it('refuses to publish on a change request', async () => {
    const target = await claim('HPLC-006');
    await approve(db, {
      entityType: 'claim',
      entityId: target.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
      outcome: 'changes_requested',
      comments: 'The scope sentence claims more than the table supports.',
    });

    await expect(
      query(db, `update claims set publication_state = 'published' where id = $1`, [target.id]),
    ).rejects.toThrow();
  });

  // --- A demonstration reviewer is not a reviewer ---------------------------

  it('counts a demonstration reviewer as a production blocker', async () => {
    // The gate counts any human approval with a reviewer attached, by design —
    // teaching it to recognise a fake person would be a worse gate. So the
    // demonstration records are kept out of production instead, and this is the
    // check that makes that rule real rather than a comment on a function.
    await query(db, `update profiles set is_demonstration = true where user_id = $1`, [
      staff.scientific,
    ]);

    const [counts] = await query<{ n: number; approvals: number }>(
      db,
      `select tides_demonstration_record_count() as n,
              (select count(*)::int from reviews r
                 join profiles p on p.user_id = r.reviewer_user_id
                where p.is_demonstration) as approvals`,
    );
    expect(Number(counts!.n)).toBeGreaterThan(0);

    const blockers = productionBlockers(factsWith({ demonstrationRecords: Number(counts!.n) }));
    expect(blockers.map((b) => b.key)).toContain('demonstration_records');
  });

  it('names a demonstration reviewer’s approvals separately from the profile', async () => {
    const target = await claim('HPLC-007');
    await query(db, `update profiles set is_demonstration = true where user_id = $1`, [
      staff.scientific,
    ]);
    await approve(db, {
      entityType: 'claim',
      entityId: target.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const [row] = await query<{ approvals: number }>(
      db,
      `select count(*)::int as approvals from reviews r
         join profiles p on p.user_id = r.reviewer_user_id
        where p.is_demonstration`,
    );
    expect(Number(row!.approvals)).toBeGreaterThan(0);

    // Deleting the profile would leave the review row behind with a null
    // reviewer, so the two are reported as separate blockers.
    const blockers = productionBlockers(
      factsWith({ approvalsByDemonstrationReviewers: Number(row!.approvals) }),
    );
    expect(blockers.map((b) => b.key)).toContain('demonstration_approvals');
  });
});

function factsWith(overrides: Partial<ProductionFacts>): ProductionFacts {
  return {
    demonstrationRecords: 0,
    publishedWithoutStandingApproval: 0,
    approvalsByDemonstrationReviewers: 0,
    fixtureRecords: 0,
    privateColumnsExposed: [],
    previewEnabled: false,
    nodeEnv: 'production',
    ...overrides,
  };
}
