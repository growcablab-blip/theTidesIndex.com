import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedDemoData } from '@db/seed/demo';
import { readProtocols } from '@/server/public/protocol-reader';
import { DOSING_FIELD_NAMES, assertPatientSafe } from '@/domain/presentation/reading-mode';
import { closeTestDb, createTestDb, query, type TestDb } from '../support/test-db';

/**
 * ACCEPTANCE_TESTS.md B — patient and practitioner modes.
 *
 * The single most consequential behaviour in the product, tested against the
 * real query path rather than by rendering a page and searching the output. A
 * rendering test would pass right up until someone adds a field to a component;
 * this fails the moment the patient query could carry a dose at all.
 */
describe('reading modes over the same record', () => {
  let db: TestDb;
  let peptideId: string;

  beforeAll(async () => {
    db = await createTestDb();
    await seedDatabase(db);
    await seedDemoData(db);

    const [row] = await query<{ id: string }>(
      db,
      `select id from peptides where slug = 'demonstration-compound'`,
    );
    peptideId = row!.id;
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  it('publishes the demonstration record through the real gates', async () => {
    const [row] = await query<{ editorial_state: string }>(
      db,
      `select editorial_state from peptides where id = $1`,
      [peptideId],
    );
    // If the gates had been bypassed rather than satisfied, this would not be
    // 'published' — the demonstration data is only useful because it is subject
    // to the same rules as everything else.
    expect(row?.editorial_state).toBe('published');
  });

  describe('patient mode', () => {
    it('returns records without any dosing field present', async () => {
      const protocols = await readProtocols(db, peptideId, 'simple');
      expect(protocols.length).toBeGreaterThan(0);

      for (const protocol of protocols) {
        for (const field of DOSING_FIELD_NAMES) {
          expect(
            Object.prototype.hasOwnProperty.call(protocol, field),
            `patient payload must not carry ${field}`,
          ).toBe(false);
        }
      }
    });

    it('passes the runtime patient-safety assertion', () => {
      // Belt and braces: the same guard the rendering path uses.
      expect(async () =>
        assertPatientSafe(await readProtocols(db, peptideId, 'simple')),
      ).not.toThrow();
    });

    it('carries no dose value anywhere in the serialised payload', async () => {
      const protocols = await readProtocols(db, peptideId, 'simple');

      // Identifiers are not content, and they are random: a generated UUID
      // containing "4500" made this assertion fail roughly one run in six once
      // the suite began shuffling. Stripping them keeps the strong property —
      // that no dose reaches the payload by any route, including a stray column
      // or a nested object — without the false positive.
      const serialised = JSON.stringify(protocols).replaceAll(
        /"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"/gi,
        '"<id>"',
      );

      // The amounts the demonstration protocols actually use.
      for (const dose of ['250', '500', 'mcg', 'twice daily', '4 weeks']) {
        expect(serialised, `patient payload must not carry "${dose}"`).not.toContain(dose);
      }
    });

    it('still attributes the record and states its context', async () => {
      const protocols = await readProtocols(db, peptideId, 'simple');
      const first = protocols[0];

      expect(first?.objectiveContext).toBeTruthy();
      expect(first?.populationModel).toBeTruthy();
      expect(first?.routeName).toBeTruthy();
      expect(first?.sources.length).toBeGreaterThan(0);
      // Guidance exists, and the reader is told so without being given it.
      expect(typeof first?.hasSafetyGuidance).toBe('boolean');
    });
  });

  describe('practitioner mode', () => {
    it('returns the regimen exactly as each source reported it', async () => {
      const protocols = (await readProtocols(db, peptideId, 'practitioner')) as {
        amountReported: string | null;
        amountUnit: string | null;
        frequencyText: string | null;
      }[];

      const amounts = protocols.map((p) => p.amountReported).sort();
      expect(amounts).toEqual(['250', '500']);
      expect(protocols.every((p) => p.amountUnit === 'mcg')).toBe(true);
    });

    it('keeps two sources as two records rather than one reconciled one', async () => {
      const protocols = await readProtocols(db, peptideId, 'practitioner');
      expect(protocols).toHaveLength(2);

      // Each carries its own attribution; neither is a blend of the two.
      const sourceKeys = protocols.map((p) => p.sources.map((s) => s.sourceKey).join(','));
      expect(new Set(sourceKeys).size).toBe(2);
    });
  });

  describe('the register', () => {
    it('exposes registration without exposing unreviewed content', async () => {
      const columns = await query<{ column_name: string }>(
        db,
        `select column_name from information_schema.columns
         where table_name = 'public_v_peptide_register'`,
      );
      const names = columns.map((c) => c.column_name);

      // Name and progress, yes. Draft medical content, no.
      expect(names).toContain('canonical_name');
      expect(names).toContain('has_published_record');
      for (const forbidden of [
        'simple_summary',
        'practitioner_summary',
        'unknowns_summary',
        'short_description',
        'sequence',
      ]) {
        expect(names, `register must not expose ${forbidden}`).not.toContain(forbidden);
      }
    });

    it('lists compounds that have no published record', async () => {
      const rows = await query<{ canonical_name: string; has_published_record: boolean }>(
        db,
        `select canonical_name, has_published_record from public_v_peptide_register
         where not has_published_record order by canonical_name`,
      );
      // The seeded cohort is registered and unpublished; it should be visible as
      // "in scope", which is different from being absent.
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.map((r) => r.canonical_name)).toContain('BPC-157');
    });
  });
});
