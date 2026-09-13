import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readProtocolLibrary } from '@/server/public/protocol-library';
import { closeTestDb, createTestDb, truncateContent, type TestDb } from '../support/test-db';

/**
 * The protocol library: every source-reported regimen across compounds.
 *
 * The page a clinic will use most, and the one where the patient boundary is
 * easiest to break, because the whole of its content is regimens. These tests
 * assert against the reader's return value — the payload — rather than the
 * rendered page, because "the component does not render it" is exactly the
 * kind of protection that has failed here eight times.
 */

const DOSING_FIELDS = [
  'amountReported',
  'amountUnit',
  'frequencyText',
  'timingText',
  'durationText',
  'cycleText',
  'titrationText',
  'formulation',
] as const;

describe('protocol library', () => {
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

  it('gives patient mode counts and no regimen rows', async () => {
    const library = await readProtocolLibrary(db, 'simple', {}, { preview: true });

    expect(library.totalCount).toBeGreaterThan(0);
    expect(library.protocols).toEqual([]);

    // And nothing dose-shaped anywhere in the payload, not only in the rows.
    const payload = JSON.stringify(library);
    expect(payload).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:mcg|µg|mg|gram)\b/i);
    for (const field of DOSING_FIELDS) {
      expect(payload, `patient payload carries ${field}`).not.toContain(`"${field}"`);
    }

    // What a patient does get: which compounds have regimens, from how many
    // sources, on what kind of evidence.
    expect(library.compounds.length).toBeGreaterThan(0);
    for (const compound of library.compounds) {
      expect(compound.protocolCount, compound.slug).toBeGreaterThan(0);
      expect(compound.evidenceLabels.length, compound.slug).toBeGreaterThan(0);
    }
  });

  it('still returns no rows in patient mode when a compound is selected', async () => {
    const library = await readProtocolLibrary(db, 'simple', { peptide: 'bpc-157' }, { preview: true });
    expect(library.filteredCount).toBeGreaterThan(0);
    expect(library.protocols).toEqual([]);
  });

  it('returns every regimen with exactly one attributed source in practitioner mode', async () => {
    const library = await readProtocolLibrary(db, 'practitioner', {}, { preview: true });

    expect(library.protocols.length).toBe(library.totalCount);
    for (const protocol of library.protocols) {
      expect(protocol.sources.length, protocol.protocolKey).toBe(1);
      expect(protocol.evidenceTypeLabel, protocol.protocolKey).toBeTruthy();
      expect(protocol.regulatoryContext, protocol.protocolKey).toBeTruthy();
    }

    // The three compounds the brief names are all represented.
    const compounds = new Set(library.protocols.map((p) => p.peptideSlug));
    for (const slug of ['bpc-157', 'tesamorelin', 'thymosin-beta-4', 'tb-500']) {
      expect(compounds.has(slug), slug).toBe(true);
    }
  });

  it('narrows by compound, source, route and evidence context', async () => {
    const all = await readProtocolLibrary(db, 'practitioner', {}, { preview: true });

    const byCompound = await readProtocolLibrary(db, 'practitioner', { peptide: 'tb-500' }, { preview: true });
    expect(byCompound.protocols.length).toBeGreaterThan(0);
    expect(byCompound.protocols.every((p) => p.peptideSlug === 'tb-500')).toBe(true);

    const bySource = await readProtocolLibrary(db, 'practitioner', { source: 'SRC-001' }, { preview: true });
    expect(bySource.protocols.length).toBeGreaterThan(0);
    expect(bySource.protocols.every((p) => p.sources[0]?.sourceKey === 'SRC-001')).toBe(true);

    const byRoute = await readProtocolLibrary(db, 'practitioner', { route: 'subcutaneous' }, { preview: true });
    expect(byRoute.protocols.every((p) => p.routeKey === 'subcutaneous')).toBe(true);

    const byEvidence = await readProtocolLibrary(
      db,
      'practitioner',
      { evidence: 'approved_label_evidence' },
      { preview: true },
    );
    expect(byEvidence.protocols.every((p) => p.evidenceTypeKey === 'approved_label_evidence')).toBe(true);

    // Facets describe the whole register whatever the filter, so the filter
    // controls can always offer every option.
    expect(byCompound.facets.peptides.length).toBe(all.facets.peptides.length);
    expect(byCompound.totalCount).toBe(all.totalCount);
  });

  it('keeps a regimen attributed to the compound name its source uses', async () => {
    /*
     * The handbooks that give 300 mcg to 1 gram name the compound "Thymosin
     * beta 4" or "TB4", so their regimens sit on that record. The sources that
     * say "TB-500" sit on the fragment's. A library that pooled them under one
     * heading would be making the identity merge the compound pages refuse.
     */
    const tb4 = await readProtocolLibrary(db, 'practitioner', { peptide: 'thymosin-beta-4' }, { preview: true });
    const tb500 = await readProtocolLibrary(db, 'practitioner', { peptide: 'tb-500' }, { preview: true });

    const tb4Sources = new Set(tb4.protocols.map((p) => p.sources[0]?.sourceKey));
    const tb500Sources = new Set(tb500.protocols.map((p) => p.sources[0]?.sourceKey));
    expect(tb4Sources.has('SRC-001')).toBe(true);
    expect(tb4Sources.has('SRC-002')).toBe(true);
    expect(tb500Sources.has('SRC-003')).toBe(true);
    expect(tb500Sources.has('SRC-005')).toBe(true);
    expect(tb500Sources.has('SRC-002')).toBe(false);
  });

  it('ranks nothing: the order carries no judgement', async () => {
    const library = await readProtocolLibrary(db, 'practitioner', {}, { preview: true });
    const names = library.protocols.map((p) => p.peptideName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});
