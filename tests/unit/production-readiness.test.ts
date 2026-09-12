import { describe, expect, it } from 'vitest';
import {
  isFixtureKey,
  productionBlockers,
  readyForProduction,
  type ProductionFacts,
} from '@/server/ops/production-readiness';

/**
 * The release gate (human review pilot, §13).
 *
 * This is the last thing standing between a development database and the public,
 * and the pressure on it will always be in one direction: development contains
 * demonstration records on purpose, so the gate fails constantly, so somebody
 * will eventually want it relaxed.
 *
 * These tests pin the opposite. A database that fails is the expected case; the
 * only passing result is one with nothing wrong with it.
 */

function facts(overrides: Partial<ProductionFacts> = {}): ProductionFacts {
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

describe('production readiness', () => {
  it('passes only a database with nothing wrong with it', () => {
    expect(readyForProduction(facts())).toBe(true);
    expect(productionBlockers(facts())).toEqual([]);
  });

  // --- The five refusals ----------------------------------------------------

  it('rejects a demonstration reviewer, whose approvals would open a real gate', () => {
    const blockers = productionBlockers(facts({ demonstrationRecords: 1 }));
    expect(blockers.map((b) => b.key)).toEqual(['demonstration_records']);
    expect(blockers[0]?.consequence).toContain('manufactured scientific review');
  });

  it('rejects reviews left behind by a demonstration reviewer', () => {
    // Deleting the profile is not enough: the review row survives with a null
    // reviewer, and a null reviewer is exactly what an unattributable approval
    // looks like.
    const blockers = productionBlockers(facts({ approvalsByDemonstrationReviewers: 3 }));
    expect(blockers.map((b) => b.key)).toEqual(['demonstration_approvals']);
  });

  it('rejects QA fixture records', () => {
    const blockers = productionBlockers(facts({ fixtureRecords: 1 }));
    expect(blockers.map((b) => b.key)).toEqual(['fixture_records']);
  });

  it('rejects a public view exposing a private source field', () => {
    const blockers = productionBlockers(
      facts({ privateColumnsExposed: ['public_v_sources.local_file_sha256'] }),
    );
    expect(blockers.map((b) => b.key)).toEqual(['private_source_exposure']);
    expect(blockers[0]?.summary).toContain('local_file_sha256');
  });

  it('rejects a published record with no standing human approval', () => {
    const blockers = productionBlockers(facts({ publishedWithoutStandingApproval: 1 }));
    expect(blockers.map((b) => b.key)).toEqual(['published_without_approval']);
    // The gates are triggers. A non-zero count is evidence one is broken.
    expect(blockers[0]?.consequence).toContain('missing, disabled, or was bypassed');
  });

  it('rejects preview in a production build, and permits it elsewhere', () => {
    expect(
      productionBlockers(facts({ previewEnabled: true, nodeEnv: 'production' })).map((b) => b.key),
    ).toEqual(['preview_enabled']);
    expect(productionBlockers(facts({ previewEnabled: true, nodeEnv: 'development' }))).toEqual([]);
  });

  it('reports every blocker at once rather than the first', () => {
    const blockers = productionBlockers(
      facts({
        demonstrationRecords: 2,
        approvalsByDemonstrationReviewers: 1,
        fixtureRecords: 4,
        privateColumnsExposed: ['public_v_sources.local_private_filename'],
        publishedWithoutStandingApproval: 1,
        previewEnabled: true,
      }),
    );
    expect(blockers).toHaveLength(6);
    // Demonstration data first: it is the one that fabricates a human approval.
    expect(blockers[0]?.key).toBe('demonstration_records');
  });

  it('is not softened for a development database', () => {
    // A development database has demonstration records by design and must still
    // fail. If this ever passes, the gate has been turned into a formality.
    expect(readyForProduction(facts({ demonstrationRecords: 1, nodeEnv: 'development' }))).toBe(
      false,
    );
  });

  // --- The fixture-key convention -------------------------------------------

  it('recognises a fixture key by segment, not by substring', () => {
    for (const key of ['TEST', 'TEST-001', 'GAP-REGISTER-TEST', 'HPLC-TEST-001', 'X-FIXTURE']) {
      expect(isFixtureKey(key), key).toBe(true);
    }
  });

  it('leaves legitimate keys alone', () => {
    // `SAMPLE` and `EXAMPLE` are deliberately not fixture markers: a certificate
    // specimen and a worked example are content. A check that cried wolf on
    // those would be switched off within a month.
    for (const key of [
      'HPLC-001',
      'SRC-006',
      'CON-004',
      'coa-literacy',
      'CERT-SPECIMEN-001',
      'V-017',
      'protest-001',
      'LATEST-001',
    ]) {
      expect(isFixtureKey(key), key).toBe(false);
    }
  });

  it('is case-insensitive', () => {
    expect(isFixtureKey('gap-register-test')).toBe(true);
    expect(isFixtureKey('Test-001')).toBe(true);
  });
});
