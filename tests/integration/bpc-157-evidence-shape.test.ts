import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { seedData } from '@db/seed/seed-data';
import { readPeptidePagePreview } from '@/server/public/queries';
import { countEvidenceRecords } from '@/domain/evidence/evidence-counts';
import { closeTestDb, createTestDb, truncateContent, type TestDb } from '../support/test-db';

/**
 * BPC-157's evidence shape, as the seeded page counts it.
 *
 * The data-level rules live in tests/unit/bpc-157-evidence-shape.test.ts. This
 * suite asserts what a reader is actually shown after seeding: a human lane and
 * a preclinical lane that are both non-empty, the systematic review counted as
 * a reference source only, and registered trials present on the record without
 * a result and without a lane.
 */

const DOSE =
  /\b\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:mcg|µg|ug|micrograms?|mg|milligrams?|grams?|g|ml|mL|IU|units)\b/;

const REGISTRY_IDS = ['NCT02637284', 'NCT07437547', 'NCT07803250', 'NCT07752381'];

const sources = seedData.sourceManifest.sources;
const primaryPreclinicalKeys = sources
  .filter((s) =>
    ['10.3390/biomedicines9111547', '10.3390/molecules191119066', '10.3389/fphar.2022.1026182'].includes(s.doi ?? ''),
  )
  .map((s) => s.source_key);
const registryKeys = sources
  .filter((s) => s.source_type === 'clinical_trial_registry' && REGISTRY_IDS.includes(s.trial_registry_id ?? ''))
  .map((s) => s.source_key);

describe('BPC-157 evidence shape on the seeded record', () => {
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

  it('counts human and preclinical evidence records, both non-zero', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    expect(page).not.toBeNull();
    const counts = countEvidenceRecords(page!.claims);

    expect(counts.human).toBeGreaterThan(0);
    expect(counts.preclinical).toBeGreaterThan(0);
    expect(counts.statements.preclinical).toBeGreaterThan(0);

    expect(primaryPreclinicalKeys).toHaveLength(3);
    for (const key of primaryPreclinicalKeys) {
      expect(counts.sourceKeys.preclinical, key).toContain(key);
    }
  });

  it('counts the systematic review as a reference source, never as primary evidence', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const counts = countEvidenceRecords(page!.claims);

    expect(counts.sourceKeys.reference).toContain('SRC-032');
    expect(counts.sourceKeys.preclinical).not.toContain('SRC-032');
    expect(counts.sourceKeys.human).not.toContain('SRC-032');

    for (const claim of page!.claims) {
      for (const evidence of claim.evidence) {
        if (evidence.citation.sourceKey !== 'SRC-032') continue;
        expect(evidence.evidenceClass, claim.claimKey).toBe('reference_opinion');
        expect(evidence.isHumanEvidence, claim.claimKey).toBe(false);
      }
    }
  });

  it('shows registered trials without results, and counts none of them as evidence', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const registered = page!.trials.filter((t) => REGISTRY_IDS.includes(t.registryId));
    expect(registered).toHaveLength(REGISTRY_IDS.length);
    for (const trial of registered) {
      expect(trial.resultsPostedDate, trial.registryId).toBeNull();
      expect(trial.documents.every((d) => d.role === 'registry_record'), trial.registryId).toBe(true);
    }

    expect(registryKeys).toHaveLength(REGISTRY_IDS.length);
    const counts = countEvidenceRecords(page!.claims);
    for (const key of registryKeys) {
      expect(counts.sourceKeys.human, key).not.toContain(key);
      expect(counts.sourceKeys.preclinical, key).not.toContain(key);
      expect(counts.sourceKeys.reference, key).not.toContain(key);
    }
  });

  it('gives patient mode the new records without an amount', async () => {
    const simple = await readPeptidePagePreview(db, 'bpc-157', 'simple');
    expect(simple).not.toBeNull();
    const trials = simple!.trials.filter((t) => REGISTRY_IDS.includes(t.registryId));
    expect(trials).toHaveLength(REGISTRY_IDS.length);
    for (const trial of trials) expect(trial.doseArmsText, trial.registryId).toBeNull();
    expect(JSON.stringify(trials)).not.toMatch(DOSE);

    const repaired = simple!.claims.filter((c) => ['BPC-011', 'BPC-012', 'BPC-013', 'BPC-014'].includes(c.claimKey));
    expect(repaired).toHaveLength(4);
    const payload = JSON.stringify(repaired).replaceAll(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
      '',
    );
    expect(payload).not.toMatch(DOSE);
  });
});
