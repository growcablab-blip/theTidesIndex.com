import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { reviewDiff } from '@/server/editorial/review-diff';
import { readQualityTopicReviewPacket } from '@/server/editorial/review-packet';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  truncateContent,
  type TestDb,
} from '../support/test-db';
import { approve, createStaff, type Staff } from '../support/fixtures';

/**
 * The scientific review lifecycle (Phase C.10).
 *
 * Twenty-seven claims are prepared and no person has reviewed one. The review
 * workflow is therefore the largest untested assumption in the project: every
 * gate, every packet and every publication rule depends on it behaving the way
 * it is documented to.
 *
 * This exercises the whole cycle — approve, revise, invalidate, re-approve — as
 * mechanics. It is explicitly **not** a scientific review, and the demonstration
 * reviewer it uses exists only in test data.
 */

describe('the review lifecycle', () => {
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
    const [row] = await query<{ id: string; version: number; review_state: string }>(
      db,
      `select id, version, review_state from claims where claim_key = $1`,
      [key],
    );
    return row!;
  }

  // --- Approvals are bound to a version ------------------------------------
  it('binds an approval to the exact version reviewed', async () => {
    const before = await claim('HPLC-001');
    await approve(db, {
      entityType: 'claim',
      entityId: before.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const [review] = await query<{ entity_version: number; outcome: string }>(
      db,
      `select entity_version, outcome from reviews
       where entity_id = $1 and review_type = 'scientific'`,
      [before.id],
    );
    expect(review?.entity_version).toBe(before.version);
    expect(review?.outcome).toBe('approved');
  });

  it('invalidates a prior approval when the record is revised', async () => {
    const before = await claim('HPLC-001');
    await approve(db, {
      entityType: 'claim',
      entityId: before.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    // An edit an editor would make in response to a change request.
    await query(
      db,
      `update claims set uncertainty_text = uncertainty_text || ' Revised after review.'
       where id = $1`,
      [before.id],
    );

    const after = await claim('HPLC-001');
    expect(after.version).toBeGreaterThan(before.version);

    // The approval still exists — history is not rewritten — but it no longer
    // describes the record as it now stands.
    const packet = await readQualityTopicReviewPacket(db, await topicId('hplc-purity'));
    const reviewed = packet.claims.find((c) => c.claimKey === 'HPLC-001');
    const scientific = reviewed?.history.find((h) => h.reviewType === 'scientific');

    expect(scientific).toBeDefined();
    expect(scientific?.entityVersion).toBe(before.version);
    expect(scientific?.appliesToCurrentVersion).toBe(false);
  });

  it('refuses publication on an approval that no longer applies', async () => {
    const before = await claim('HPLC-001');
    for (const type of ['source_check', 'scientific', 'compliance'] as const) {
      await approve(db, {
        entityType: 'claim',
        entityId: before.id,
        reviewType: type,
        reviewerId:
          type === 'source_check'
            ? staff.editor
            : type === 'scientific'
              ? staff.scientific
              : staff.compliance,
        table: 'claims',
      });
    }

    await query(db, `update claims set claim_text = claim_text || ' Edited.' where id = $1`, [
      before.id,
    ]);

    const message = await rejectionMessage(
      query(db, `update claims set publication_state = 'published' where id = $1`, [before.id]),
    );
    // Version-bound approvals mean an edit strands them. The record is refused
    // publication — here by the coherence check, which fires first because the
    // edit also demoted the verification state that the stranded approvals had
    // raised. Either way it cannot publish on a review of a version that no
    // longer exists.
    expect(message).toMatch(/cannot publish/i);
    expect(message).toMatch(/verification state|required at version/i);
  });

  // --- Requesting changes ---------------------------------------------------
  it('does not let a change request count as an approval', async () => {
    const target = await claim('HPLC-002');
    await query(
      db,
      `insert into reviews (entity_type, entity_id, entity_version, review_type,
                            performed_by, reviewer_user_id, outcome, comments)
       values ('claim', $1, $2, 'scientific', 'human', $3, 'changes_requested',
               'The scope is wider than the cited passage supports.')`,
      [target.id, target.version, staff.scientific],
    );

    const [gate] = await query<{ approved: boolean }>(
      db,
      `select tides_has_approved_review('claim', $1::uuid, $2::int, 'scientific') as approved`,
      [target.id, target.version],
    );
    expect(gate?.approved).toBe(false);
  });

  it('keeps the reviewer’s note against the record', async () => {
    const target = await claim('HPLC-002');
    await query(
      db,
      `insert into reviews (entity_type, entity_id, entity_version, review_type,
                            performed_by, reviewer_user_id, outcome, comments)
       values ('claim', $1, $2, 'scientific', 'human', $3, 'changes_requested',
               'The scope is wider than the cited passage supports.')`,
      [target.id, target.version, staff.scientific],
    );

    const packet = await readQualityTopicReviewPacket(db, await topicId('hplc-purity'));
    const entry = packet.claims
      .find((c) => c.claimKey === 'HPLC-002')
      ?.history.find((h) => h.outcome === 'changes_requested');

    expect(entry?.comments).toMatch(/wider than the cited passage/);
    expect(entry?.reviewerName).toBe('Test Scientific Reviewer');
  });

  // --- The full cycle -------------------------------------------------------
  it('completes the cycle: request, revise, invalidate, re-approve', async () => {
    const first = await claim('HPLC-004');

    // 1. A reviewer asks for a change.
    await query(
      db,
      `insert into reviews (entity_type, entity_id, entity_version, review_type,
                            performed_by, reviewer_user_id, outcome, comments)
       values ('claim', $1, $2, 'scientific', 'human', $3, 'changes_requested', 'Please qualify.')`,
      [first.id, first.version, staff.scientific],
    );

    // 2. An editor revises. The version moves.
    await query(
      db,
      `update claims set uncertainty_text = 'Qualified as requested.' where id = $1`,
      [first.id],
    );
    const second = await claim('HPLC-004');
    expect(second.version).toBeGreaterThan(first.version);

    // 3. The reviewer sees what changed.
    const diff = await reviewDiff(db, 'claims', 'claim', first.id, first.version);
    expect(diff?.unchanged).toBe(false);
    expect(diff?.changes.map((c) => c.field)).toContain('uncertainty_text');
    expect(diff?.changes.find((c) => c.field === 'uncertainty_text')?.after).toBe(
      'Qualified as requested.',
    );

    // 4. They approve the new version, and only the new version.
    await approve(db, {
      entityType: 'claim',
      entityId: first.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const [nowValid] = await query<{ approved: boolean }>(
      db,
      `select tides_has_approved_review('claim', $1::uuid, $2::int, 'scientific') as approved`,
      [first.id, second.version],
    );
    const [stillInvalid] = await query<{ approved: boolean }>(
      db,
      `select tides_has_approved_review('claim', $1::uuid, $2::int, 'scientific') as approved`,
      [first.id, first.version],
    );
    expect(nowValid?.approved).toBe(true);
    expect(stillInvalid?.approved).toBe(false);
  });

  // --- The diff -------------------------------------------------------------
  it('reports nothing changed when the version has not moved', async () => {
    const target = await claim('HPLC-005');
    const diff = await reviewDiff(db, 'claims', 'claim', target.id, target.version);
    expect(diff?.unchanged).toBe(true);
    expect(diff?.changes).toEqual([]);
  });

  it('does not strand an approval for a workflow-only edit', async () => {
    const target = await claim('HPLC-005');
    await approve(db, {
      entityType: 'claim',
      entityId: target.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    // Flagging a record for attention is workflow, not authorship. The version
    // bump deliberately ignores these columns, so an approval survives — which
    // is the difference between a system a reviewer can work with and one that
    // asks them to re-approve every time an editor ticks a box.
    await query(db, `update claims set needs_update = true, needs_update_reason = 'Chase source.'
                     where id = $1`, [target.id]);

    const after = await claim('HPLC-005');
    expect(after.version).toBe(target.version);

    const diff = await reviewDiff(db, 'claims', 'claim', target.id, target.version);
    expect(diff?.unchanged).toBe(true);
    expect(diff?.changes).toEqual([]);
  });

  it('says so when a version moved without touching a reviewed field', async () => {
    const target = await claim('HPLC-005');

    // A real content column whose change counts as authorship — so the version
    // bumps and approvals are stranded — but which no approval actually rests
    // on. A reviewer should be told that before being asked to read it again.
    await query(
      db,
      `update claims set is_editorial_non_evidentiary = true where id = $1`,
      [target.id],
    );

    const moved = await claim('HPLC-005');
    expect(moved.version).toBe(target.version + 1);

    const diff = await reviewDiff(db, 'claims', 'claim', target.id, target.version);
    expect(diff?.currentVersion).toBe(moved.version);
    expect(diff?.changes).toEqual([]);
    expect(diff?.note).toMatch(/none of the fields an approval rests on changed/i);
  });

  // --- Who may do what ------------------------------------------------------
  it('cannot record an automated scientific approval at all', async () => {
    const target = await claim('HPLC-001');
    // The structural half of "no fictional review": the role policies are
    // exercised under real sessions in access-control.test.ts, and this asserts
    // the thing no policy can be talked out of — an automated scientific
    // approval is unrepresentable, so automation cannot stand in for a reviewer.
    const message = await rejectionMessage(
      query(
        db,
        `insert into reviews (entity_type, entity_id, entity_version, review_type,
                              performed_by, automated_tool, outcome)
         values ('claim', $1, 1, 'scientific', 'automated', 'a-tool', 'approved')`,
        [target.id],
      ),
    );
    expect(message).toMatch(/reviews_automation_scope/);
  });

  it('records a disclosure state for a reviewer, including not having been asked', async () => {
    const [before] = await query<{ conflicts_disclosed: boolean | null }>(
      db,
      `select conflicts_disclosed from profiles where user_id = $1`,
      [staff.scientific],
    );
    // Nobody has asked. Different from a reviewer stating they have none.
    expect(before?.conflicts_disclosed).toBeNull();

    await query(
      db,
      `update profiles set conflicts_disclosed = false, disclosed_at = current_date
       where user_id = $1`,
      [staff.scientific],
    );
    const [after] = await query<{ conflicts_disclosed: boolean | null }>(
      db,
      `select conflicts_disclosed from profiles where user_id = $1`,
      [staff.scientific],
    );
    expect(after?.conflicts_disclosed).toBe(false);
  });

  it('refuses a declared conflict with nothing said about it', async () => {
    const message = await rejectionMessage(
      query(
        db,
        `update profiles set conflicts_disclosed = true, disclosed_at = current_date
         where user_id = $1`,
        [staff.scientific],
      ),
    );
    // "Yes, I have a conflict" with no note looks like a disclosure and carries
    // nothing.
    expect(message).toMatch(/profiles_disclosure_is_explained/);
  });

  it('refuses a disclosure with no date', async () => {
    const message = await rejectionMessage(
      query(db, `update profiles set conflicts_disclosed = false where user_id = $1`, [
        staff.scientific,
      ]),
    );
    expect(message).toMatch(/profiles_disclosure_is_dated/);
  });

  // --- What the public sees matches what was approved -----------------------
  it('shows a review state matching the approvals that actually exist', async () => {
    const target = await claim('HPLC-001');
    const [before] = await query<{ review_state: string }>(
      db,
      `select review_state from claims where id = $1`,
      [target.id],
    );
    expect(before?.review_state).not.toBe('scientific_reviewed');

    await approve(db, {
      entityType: 'claim',
      entityId: target.id,
      reviewType: 'scientific',
      reviewerId: staff.scientific,
      table: 'claims',
    });

    const [after] = await query<{ review_state: string }>(
      db,
      `select review_state from claims where id = $1`,
      [target.id],
    );
    expect(after?.review_state).toBe('scientific_reviewed');
  });

  async function topicId(slug: string): Promise<string> {
    const [row] = await query<{ id: string }>(
      db,
      `select id from quality_topics where slug = $1`,
      [slug],
    );
    return row!.id;
  }
});
