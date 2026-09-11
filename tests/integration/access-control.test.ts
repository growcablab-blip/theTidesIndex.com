import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { seedDatabase } from '@db/seed';
import { withPublicSession, withStaffSession } from '@/server/db/session';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  resultRows,
  type TestDb,
} from '../support/test-db';
import { createStaff, type Staff } from '../support/fixtures';

/**
 * ACCEPTANCE_TESTS.md section F — role-based access.
 *
 * These run through `withStaffSession`, which is how the editorial application
 * reaches the database. If a role policy can be bypassed by using the
 * application's own data layer, these fail.
 *
 * Note the asymmetry in how Postgres enforces row-level security: an INSERT
 * that fails `WITH CHECK` raises, while an UPDATE or DELETE whose `USING`
 * clause excludes the row simply affects nothing. Both are enforcement; only
 * one is loud. The editorial services must therefore check affected row counts
 * rather than treating "no error" as "it worked", and the tests below assert
 * the effect rather than the error for those cases.
 */
describe('role-scoped database sessions', () => {
  let db: TestDb;
  let staff: Staff;

  beforeAll(async () => {
    db = await createTestDb();
    await seedDatabase(db);
    staff = await createStaff(db);
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  it('lets an editor create a source', async () => {
    await withStaffSession(db, staff.editor, async (tx) => {
      await tx.execute(sql`
        insert into sources (source_key, title, source_type_key, qc_status)
        values ('SRC-EDITOR', 'Created by an editor', 'practitioner_handbook', 'usable')
      `);
    });

    const rows = await query(db, `select id from sources where source_key = 'SRC-EDITOR'`);
    expect(rows).toHaveLength(1);
  });

  it('refuses a content write from a reviewer', async () => {
    // Reviewers record decisions; they do not rewrite the record under review.
    const message = await rejectionMessage(
      withStaffSession(db, staff.scientific, async (tx) => {
        await tx.execute(sql`
          insert into sources (source_key, title, source_type_key, qc_status)
          values ('SRC-REVIEWER', 'Should not exist', 'practitioner_handbook', 'usable')
        `);
      }),
    );
    expect(message).toMatch(/row-level security|policy/i);

    const rows = await query(db, `select id from sources where source_key = 'SRC-REVIEWER'`);
    expect(rows).toHaveLength(0);
  });

  it('refuses a review recorded in someone else name', async () => {
    const [peptide] = await query<{ id: string; version: number }>(
      db,
      `select id, version from peptides where slug = 'bpc-157'`,
    );

    const message = await rejectionMessage(
      withStaffSession(db, staff.scientific, async (tx) => {
        await tx.execute(sql`
          insert into reviews (entity_type, entity_id, entity_version, review_type, reviewer_user_id, outcome)
          values ('peptide', ${peptide!.id}, ${peptide!.version}, 'scientific', ${staff.clinical}, 'approved')
        `);
      }),
    );
    expect(message).toMatch(/row-level security|policy/i);
  });

  it('refuses a review of a kind the role does not perform', async () => {
    const [peptide] = await query<{ id: string; version: number }>(
      db,
      `select id, version from peptides where slug = 'bpc-157'`,
    );

    // A scientific reviewer cannot sign the clinical gate. This is what stops
    // one account from assembling every approval a protocol needs.
    const message = await rejectionMessage(
      withStaffSession(db, staff.scientific, async (tx) => {
        await tx.execute(sql`
          insert into reviews (entity_type, entity_id, entity_version, review_type, reviewer_user_id, outcome)
          values ('peptide', ${peptide!.id}, ${peptide!.version}, 'clinical', ${staff.scientific}, 'approved')
        `);
      }),
    );
    expect(message).toMatch(/row-level security|policy/i);
  });

  it('accepts a review of the kind the role does perform', async () => {
    const [peptide] = await query<{ id: string; version: number }>(
      db,
      `select id, version from peptides where slug = 'bpc-157'`,
    );

    await withStaffSession(db, staff.clinical, async (tx) => {
      await tx.execute(sql`
        insert into reviews (entity_type, entity_id, entity_version, review_type, reviewer_user_id, outcome)
        values ('peptide', ${peptide!.id}, ${peptide!.version}, 'clinical', ${staff.clinical}, 'approved')
      `);
    });

    const rows = await query(
      db,
      `select id from reviews where entity_id = $1 and review_type = 'clinical'`,
      [peptide!.id],
    );
    expect(rows).toHaveLength(1);
  });

  it('stops an editor deleting a source and lets an admin do it', async () => {
    await withStaffSession(db, staff.editor, async (tx) => {
      await tx.execute(sql`
        insert into sources (source_key, title, source_type_key, qc_status)
        values ('SRC-DELETE-ME', 'Temporary', 'other', 'usable')
      `);
    });

    await withStaffSession(db, staff.editor, async (tx) => {
      await tx.execute(sql`delete from sources where source_key = 'SRC-DELETE-ME'`);
    });
    expect(
      await query(db, `select id from sources where source_key = 'SRC-DELETE-ME'`),
      'the editor delete must affect nothing',
    ).toHaveLength(1);

    await withStaffSession(db, staff.admin, async (tx) => {
      await tx.execute(sql`delete from sources where source_key = 'SRC-DELETE-ME'`);
    });
    expect(await query(db, `select id from sources where source_key = 'SRC-DELETE-ME'`)).toHaveLength(
      0,
    );
  });

  it('stops an editor changing a controlled vocabulary', async () => {
    // Reclassifying animal evidence as human evidence would silently rewrite the
    // meaning of every record referencing it. Only an admin may touch these.
    await withStaffSession(db, staff.editor, async (tx) => {
      await tx.execute(
        sql`update evidence_types set is_human_evidence = true where key = 'animal_in_vivo'`,
      );
    });

    const [row] = await query<{ is_human_evidence: boolean }>(
      db,
      `select is_human_evidence from evidence_types where key = 'animal_in_vivo'`,
    );
    expect(row?.is_human_evidence).toBe(false);
  });

  it('gives an unknown user no access at all', async () => {
    const stranger = '00000000-0000-4000-8000-000000000000';

    const message = await rejectionMessage(
      withStaffSession(db, stranger, async (tx) => {
        await tx.execute(sql`
          insert into sources (source_key, title, source_type_key, qc_status)
          values ('SRC-STRANGER', 'Should not exist', 'other', 'usable')
        `);
      }),
    );
    expect(message).toMatch(/row-level security|policy/i);

    const read = await withStaffSession(db, stranger, async (tx) => {
      return resultRows(await tx.execute(sql`select id from sources`));
    });
    expect(read).toHaveLength(0);
  });

  it('confines the public session to the published views', async () => {
    const message = await rejectionMessage(
      withPublicSession(db, async (tx) => {
        await tx.execute(sql`select * from claims limit 1`);
      }),
    );
    expect(message).toMatch(/permission/i);

    const rows = await withPublicSession(db, async (tx) => {
      return resultRows(
        await tx.execute(sql`select key from public_v_routes order by sort_order`),
      );
    });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('does not leak the acting identity beyond the transaction', async () => {
    await withStaffSession(db, staff.admin, async (tx) => {
      await tx.execute(sql`select 1`);
    });

    const [row] = await query<{ acting: string | null }>(
      db,
      `select tides_current_user_id()::text as acting`,
    );
    expect(row?.acting).toBeNull();
  });
});
