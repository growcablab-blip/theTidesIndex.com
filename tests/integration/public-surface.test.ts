import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { closeTestDb, createTestDb, query, type TestDb } from '../support/test-db';
import {
  attachProtocolSource,
  createPeptide,
  createProtocol,
  createSource,
  createSourceLocation,
  createStaff,
  publishProtocol,
  type Staff,
} from '../support/fixtures';

/**
 * ACCEPTANCE_TESTS.md sections B and G — the public read surface.
 *
 * The assertions here are structural rather than behavioural on purpose. A test
 * that renders a page and checks no dose appears would pass right up until
 * someone adds a field to a component. A test that the column does not exist in
 * the patient-facing relation cannot be defeated that way.
 */

const DOSING_COLUMNS = [
  'amount_reported',
  'amount_unit',
  'amount_min_numeric',
  'amount_max_numeric',
  'frequency_text',
  'timing_text',
  'duration_text',
  'cycle_text',
  'titration_text',
];

describe('public read surface', () => {
  let db: TestDb;
  let staff: Staff;
  let peptideId: string;

  beforeAll(async () => {
    db = await createTestDb();
    await seedDatabase(db);
    staff = await createStaff(db);

    peptideId = await createPeptide(db, {
      key: 'surface-test',
      name: 'Surface Test Compound',
      slug: 'surface-test-compound',
    });

    const sourceId = await createSource(db, {
      key: 'SRC-SURFACE',
      title: 'A practitioner handbook',
      sourceType: 'practitioner_handbook',
    });
    const locationId = await createSourceLocation(db, sourceId, 'p. 88');

    const protocolId = await createProtocol(db, {
      key: 'P-SURFACE',
      peptideId,
      objectiveContext: 'Recovery support, as described by the source.',
      amountReported: '500 mcg',
      frequencyText: 'twice daily',
      patientVisibility: true,
    });
    await attachProtocolSource(db, { protocolId, sourceId, sourceLocationId: locationId });
    await publishProtocol(db, protocolId, staff);
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  describe('patient mode cannot receive a dose', () => {
    it('has no dosing columns in the simple protocol relation at all', async () => {
      const rows = await query<{ column_name: string }>(
        db,
        `select column_name from information_schema.columns
         where table_name = 'public_v_protocol_simple'`,
      );
      const columns = rows.map((r) => r.column_name);

      expect(columns.length).toBeGreaterThan(0);
      for (const forbidden of DOSING_COLUMNS) {
        expect(columns, `simple view must not expose ${forbidden}`).not.toContain(forbidden);
      }
    });

    it('omits free-text clinical fields that routinely carry embedded numbers', async () => {
      const rows = await query<{ column_name: string }>(
        db,
        `select column_name from information_schema.columns
         where table_name = 'public_v_protocol_simple'`,
      );
      const columns = rows.map((r) => r.column_name);

      for (const forbidden of ['monitoring_text', 'contraindications_text', 'safety_notes']) {
        expect(columns, `simple view must not expose ${forbidden}`).not.toContain(forbidden);
      }
      // Their presence is still signalled, so the interface can say guidance
      // exists and point the reader at a clinician.
      expect(columns).toContain('has_monitoring_guidance');
      expect(columns).toContain('has_safety_guidance');
    });

    it('still returns the record, attributed and contextualised', async () => {
      const rows = await query<{ objective_context: string; route_key: string }>(
        db,
        `select objective_context, route_key from public_v_protocol_simple where peptide_id = $1`,
        [peptideId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.route_key).toBe('subcutaneous');
    });

    it('exposes the same record with full detail to practitioner mode', async () => {
      const rows = await query<{ amount_reported: string; frequency_text: string }>(
        db,
        `select amount_reported, frequency_text from public_v_protocol_practitioner
         where peptide_id = $1`,
        [peptideId],
      );
      expect(rows).toHaveLength(1);
      expect(rows[0]?.amount_reported).toBe('500 mcg');
    });
  });

  describe('private columns never reach a public relation', () => {
    it('exposes no *_private column on any public view', async () => {
      const rows = await query<{ table_name: string; column_name: string }>(
        db,
        `select table_name, column_name from information_schema.columns
         where table_schema = 'public'
           and table_name like 'public\\_v\\_%'
           and column_name like '%\\_private'`,
      );
      expect(rows).toEqual([]);
    });

    it('excludes verbatim extracted source text from the evidence view', async () => {
      const rows = await query<{ column_name: string }>(
        db,
        `select column_name from information_schema.columns
         where table_name = 'public_v_claim_evidence'`,
      );
      const columns = rows.map((r) => r.column_name);
      expect(columns).not.toContain('extracted_text_private');
      expect(columns).not.toContain('reviewer_notes');
      expect(columns).not.toContain('interpretation_concerns');
    });

    it('excludes the private source filename and checksum from the sources view', async () => {
      const rows = await query<{ column_name: string }>(
        db,
        `select column_name from information_schema.columns
         where table_name = 'public_v_sources'`,
      );
      const columns = rows.map((r) => r.column_name);
      expect(columns).not.toContain('local_private_filename');
      expect(columns).not.toContain('local_file_sha256');
      expect(columns).not.toContain('copyright_access_notes');
    });
  });

  describe('anonymous privileges', () => {
    it('grants the anonymous role nothing on any base table', async () => {
      const rows = await query<{ table_name: string; privilege_type: string }>(
        db,
        `select table_name, privilege_type
         from information_schema.role_table_grants g
         where grantee = 'anon'
           and table_schema = 'public'
           and table_name not like 'public\\_v\\_%'`,
      );
      expect(rows).toEqual([]);
    });

    it('refuses a direct base-table read from the anonymous role', async () => {
      await query(db, 'set role anon');
      try {
        await expect(query(db, 'select * from claims limit 1')).rejects.toThrow(/permission/i);
        await expect(query(db, 'select * from claim_evidence limit 1')).rejects.toThrow(
          /permission/i,
        );
        await expect(query(db, 'select * from sources limit 1')).rejects.toThrow(/permission/i);
      } finally {
        await query(db, 'reset role');
      }
    });

    it('allows the anonymous role to read the published views', async () => {
      await query(db, 'set role anon');
      try {
        const rows = await query(db, 'select * from public_v_protocol_practitioner');
        expect(rows.length).toBeGreaterThan(0);
      } finally {
        await query(db, 'reset role');
      }
    });
  });

  describe('unpublished records are not public', () => {
    it('omits seeded but unreviewed compounds from the public view', async () => {
      const [internal] = await query<{ count: string }>(
        db,
        `select count(*)::text from peptides`,
      );
      const [publicCount] = await query<{ count: string }>(
        db,
        `select count(*)::text from public_v_peptides`,
      );

      expect(Number(internal?.count)).toBeGreaterThan(0);
      expect(publicCount?.count).toBe('0');
    });
  });
});
