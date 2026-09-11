import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { loadEvidencePacket, submitEvidencePacketForReview } from '@db/seed/evidence-packets';
import { seedData } from '@db/seed/seed-data';
import { withPublicSession, withStaffSession } from '@/server/db/session';
import { readQualityTopicReviewPacket } from '@/server/editorial/review-packet';
import type { Database } from '@/server/db/types';
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
 * The HPLC packet, end to end (Phase C.2).
 *
 * The packet is the first piece of real extracted content in the index, and the
 * thing worth testing is not that it loads. It is where it stops.
 *
 * Automation did the extraction. Every locator was resolved against the file the
 * registry holds, which is a genuine source check and is recorded as one. What
 * automation cannot do is approve medical content, so the packet reaches
 * `ready_for_scientific_review` and halts there — visible to staff, invisible to
 * the public, waiting on a person.
 *
 * These tests assert that halt in both directions: that the packet really does
 * get that far, and that nothing gets it further.
 */

const PACKET_KEY = 'hplc-purity';
const TOOL = 'tides-extraction/test';

describe('the HPLC evidence packet', () => {
  let db: TestDb;
  let staff: Staff;

  const packet = requirePacket();

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

  async function submit(userId: string) {
    return withStaffSession(db as unknown as Database, userId, (tx) =>
      submitEvidencePacketForReview(tx as unknown as TestDb, packet, TOOL),
    );
  }

  // --- What the packet contains ------------------------------------------
  it('pins every claim to an exact location in the source it names', async () => {
    const rows = await query<{
      claim_key: string;
      source_key: string;
      locator_text: string;
      page_start: number;
      interpretation: string;
      qc_status: string;
    }>(
      db,
      `select c.claim_key, s.source_key, l.locator_text, l.page_start,
              e.interpretation, s.qc_status
       from claims c
       join claim_evidence e on e.claim_id = c.id
       join source_locations l on l.id = e.source_location_id
       join sources s on s.id = e.source_id
       where c.claim_key like 'HPLC-%'`,
    );

    expect(rows.length).toBeGreaterThanOrEqual(packet.claims.length);

    for (const row of rows) {
      // A page number, not a book. "Cite the source" is not good enough: a
      // reviewer has to be able to open the page and disagree.
      expect(row.page_start, `${row.claim_key} locator`).toBeGreaterThan(0);
      expect(row.locator_text, `${row.claim_key} locator`).toMatch(/p\./);
      // A citation with no reading attached is a pointer, not evidence.
      expect(row.interpretation.length, `${row.claim_key} reading`).toBeGreaterThan(20);
      // And the source must be one the audit cleared.
      expect(row.qc_status, `${row.claim_key} source`).toBe('usable');
    }
  });

  it('states what remains uncertain on every high-impact claim', async () => {
    const rows = await query<{ claim_key: string; uncertainty_text: string | null }>(
      db,
      `select claim_key, uncertainty_text from claims
       where claim_key like 'HPLC-%' and importance in ('high', 'critical')`,
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.uncertainty_text, `${row.claim_key}`).not.toBeNull();
    }
  });

  it('gives the topic both halves: what the test establishes and what it does not', async () => {
    const [topic] = await query<{
      what_it_proves: string | null;
      what_it_does_not_prove: string | null;
    }>(
      db,
      `select what_it_proves, what_it_does_not_prove from quality_topics
       where quality_key = 'hplc-purity'`,
    );

    expect(topic?.what_it_proves).not.toBeNull();
    expect(topic?.what_it_does_not_prove).not.toBeNull();
  });

  // --- What the packet could not support ---------------------------------
  it('records the statements the register cannot support, rather than making them', async () => {
    const gaps = await query<{ statement: string; why_not_supported: string }>(
      db,
      `select statement, why_not_supported from evidence_gaps g
       join quality_topics q on q.id = g.quality_topic_id
       where q.quality_key = 'hplc-purity'`,
    );

    // Sterility and endotoxin are the two statements everyone expects to find
    // on a page like this. SRC-006 is a synthetic chemistry text and supports
    // neither, so they are held as absences with a named reason (V-015).
    expect(gaps.some((g) => /steril/i.test(g.statement))).toBe(true);
    expect(gaps.some((g) => /endotoxin/i.test(g.statement))).toBe(true);

    for (const gap of gaps) {
      expect(gap.why_not_supported.length).toBeGreaterThan(40);
    }
  });

  it('never lets a gap statement be asserted as a claim', async () => {
    const claims = await query<{ claim_text: string }>(
      db,
      `select claim_text from claims where claim_key like 'HPLC-%'`,
    );
    const claimText = claims.map((c) => c.claim_text).join(' ');

    // The rule the whole gap table exists to keep: a statement with no source
    // behind it does not migrate into the claim layer just because it is true.
    expect(claimText).not.toMatch(/steril/i);
    expect(claimText).not.toMatch(/endotoxin/i);
  });

  // --- Where the packet stops --------------------------------------------
  it('reaches ready for scientific review on an automated source check', async () => {
    const result = await submit(staff.editor);

    expect(result.refused).toEqual([]);
    expect(result.advanced).toContain('HPLC-001');
    expect(result.advanced).toContain('hplc-purity');

    const rows = await query<{ claim_key: string; editorial_state: string }>(
      db,
      `select claim_key, editorial_state from claims where claim_key like 'HPLC-%'`,
    );
    for (const row of rows) {
      expect(row.editorial_state, row.claim_key).toBe('ready_for_scientific_review');
    }
  });

  it('attributes the check to the tool and to no one else', async () => {
    await submit(staff.editor);

    const rows = await query<{
      performed_by: string;
      automated_tool: string | null;
      reviewer_user_id: string | null;
      review_type: string;
    }>(db, `select performed_by, automated_tool, reviewer_user_id, review_type from reviews`);

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.performed_by).toBe('automated');
      expect(row.automated_tool).toBe(TOOL);
      // No name is attached, because no person made a judgement.
      expect(row.reviewer_user_id).toBeNull();
      expect(row.review_type).toBe('source_check');
    }
  });

  it('publishes nothing', async () => {
    await submit(staff.editor);

    const [counts] = await query<{ claims: number; topics: number }>(
      db,
      `select
         (select count(*) from claims where publication_state <> 'unpublished')::int as claims,
         (select count(*) from quality_topics where publication_state <> 'unpublished')::int as topics`,
    );

    expect(counts?.claims).toBe(0);
    expect(counts?.topics).toBe(0);
  });

  it('keeps the topic and its claims off the public surface entirely', async () => {
    await submit(staff.editor);

    const visible = await withPublicSession(db as unknown as Database, async (tx) => {
      const topics = await tx.execute(
        `select count(*)::int as n from public_v_quality_topics where quality_key = 'hplc-purity'`,
      );
      const gaps = await tx.execute(`select count(*)::int as n from public_v_evidence_gaps`);
      return { topics, gaps };
    });

    expect(rowCount(visible.topics)).toBe(0);
    // The gaps follow the topic. There is no state in which a topic is live and
    // its stated limits are not.
    expect(rowCount(visible.gaps)).toBe(0);
  });

  // --- What the reviewer is handed ---------------------------------------
  it('hands the reviewer the claim, the reading, the uncertainty and the page', async () => {
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'hplc-purity'`,
    );

    const assembled = await readQualityTopicReviewPacket(db, topic!.id);

    expect(assembled.claims).toHaveLength(packet.claims.length);
    expect(assembled.gaps).toHaveLength(packet.notYetSupported.length);

    for (const claim of assembled.claims) {
      // Nothing a reviewer needs may be missing, because a packet that arrives
      // incomplete wastes the one step in this system that cannot be automated.
      expect(claim.interpretationNotes, claim.claimKey).not.toBeNull();
      expect(claim.uncertaintyText, claim.claimKey).not.toBeNull();
      expect(claim.evidence.length, claim.claimKey).toBeGreaterThan(0);

      for (const evidence of claim.evidence) {
        expect(evidence.locatorText, claim.claimKey).not.toBeNull();
        expect(evidence.interpretation, claim.claimKey).not.toBeNull();
        // The printed page and the page of the held file, so the reviewer opens
        // the copy this index actually holds rather than re-deriving the offset.
        expect(evidence.pageStart, claim.claimKey).not.toBeNull();
        expect(evidence.filePage, claim.claimKey).toBe((evidence.pageStart ?? 0) + 11);
      }
    }
  });

  // --- What cannot be forced ---------------------------------------------
  it('refuses to record an automated scientific review at all', async () => {
    const claims = await query<{ id: string }>(
      db,
      `select id from claims where claim_key = 'HPLC-001'`,
    );
    const claimId = claims[0]?.id;
    expect(claimId).toBeDefined();

    // Through the function: refused with a reason.
    const [viaFunction] = await query<{ problem: string | null }>(
      db,
      `select tides_record_automated_check(
         'claim'::reviewable_entity_type, $1::uuid, 'scientific'::review_type, 'some-tool', null
       ) as problem`,
      [claimId],
    );
    expect(viaFunction?.problem).toMatch(/named person/);

    // And straight into the table, as the owner, bypassing every policy: the
    // constraint refuses it. An automated approval is not merely disallowed —
    // it cannot be written down.
    const message = await rejectionMessage(
      query(
        db,
        `insert into reviews (entity_type, entity_id, entity_version, review_type,
                              performed_by, automated_tool, outcome)
         values ('claim', $1::uuid, 1, 'scientific', 'automated', 'some-tool', 'approved')`,
        [claimId],
      ),
    );
    expect(message).toMatch(/reviews_automation_scope/);
  });

  it('refuses to publish a claim that only automation has checked', async () => {
    await submit(staff.editor);

    const claims = await query<{ id: string }>(
      db,
      `select id from claims where claim_key = 'HPLC-001'`,
    );
    const claimId = claims[0]!.id;

    // The automated check advanced the verification state and satisfied no gate.
    // The first refusal is the source check itself: `tides_has_approved_review`
    // counts human approvals only, so the state column says `source_checked`
    // while the gate says the source check has not been approved. Those are not
    // in conflict — one records what was done, the other records who stands
    // behind it.
    const first = await rejectionMessage(
      query(db, `update claims set publication_state = 'published' where id = $1`, [claimId]),
    );
    expect(first).toMatch(/source check is required/i);

    // Give it the human source check it was waiting for. The next refusal is
    // the one automation can never clear.
    await approve(db, {
      entityType: 'claim',
      entityId: claimId,
      reviewType: 'source_check',
      reviewerId: staff.editor,
      table: 'claims',
    });

    const second = await rejectionMessage(
      query(db, `update claims set publication_state = 'published' where id = $1`, [claimId]),
    );
    expect(second).toMatch(/scientific review is required/i);
  });

  it('will not let a non-editor record the check', async () => {
    const result = await submit(staff.scientific);

    expect(result.advanced).toEqual([]);
    expect(result.refused.length).toBeGreaterThan(0);
    expect(result.refused[0]?.reason).toMatch(/editor or an admin/);
  });

  // --- What happens when the ground moves --------------------------------
  it('refuses to extract from a source the audit disqualified', async () => {
    await query(db, `update sources set qc_status = 'replace' where source_key = 'SRC-006'`);

    const message = await rejectionMessage(loadEvidencePacket(db, packet));
    expect(message).toMatch(/cannot be extracted from/);
    expect(message).toMatch(/SRC-006/);
  });

  it('loads twice without duplicating a citation', async () => {
    const before = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claim_evidence`,
    );

    await loadEvidencePacket(db, packet);

    const after = await query<{ n: number }>(db, `select count(*)::int as n from claim_evidence`);
    expect(after[0]?.n).toBe(before[0]?.n);
  });
});

function requirePacket() {
  const found = seedData.evidencePackets.find((p) => p.packetKey === PACKET_KEY);
  if (found === undefined) throw new Error(`The ${PACKET_KEY} packet is not registered.`);
  return found;
}

function rowCount(result: unknown): number {
  const rows = Array.isArray(result) ? result : ((result as { rows?: unknown[] }).rows ?? []);
  const first = rows[0] as { n?: number } | undefined;
  return first?.n ?? -1;
}
