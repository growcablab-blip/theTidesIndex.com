import { describe, expect, it } from 'vitest';
import {
  countEvidenceRecords,
  EVIDENCE_RECORD_DEFINITION,
  EVIDENCE_RECORD_NOUN,
  formatEvidenceRecordCount,
  formatStatementCount,
  laneOfClaim,
  laneOfEvidence,
} from '@/domain/evidence/evidence-counts';
import { claim, evidence, mixedClaims } from '../support/peptide-page-fixture';

/**
 * The visible evidence-count unit: distinct sources per kind of evidence, never
 * statements. One module defines it for the site and for print.
 */
describe('evidence record counts', () => {
  it('counts distinct sources, not citations or statements', () => {
    const counts = countEvidenceRecords([
      claim('A', [evidence('SRC-1', 'human_rct')]),
      claim('B', [evidence('SRC-1', 'human_rct')]),
      claim('C', [evidence('SRC-1', 'human_rct')]),
    ]);
    expect(counts.human).toBe(1);
    expect(counts.statements.human).toBe(3);
    expect(counts.distinctSources).toBe(1);
  });

  it('places each source by its own citation, not by the statement it sits under', () => {
    // A review cited beside a trial is a reference source, not a human evidence record.
    const counts = countEvidenceRecords([
      claim('A', [evidence('SRC-1', 'human_rct'), evidence('SRC-9', 'academic_reference')]),
    ]);
    expect(counts.sourceKeys.human).toEqual(['SRC-1']);
    expect(counts.sourceKeys.reference).toEqual(['SRC-9']);
    expect(counts.statements).toEqual({ human: 1, preclinical: 0, reference: 0 });
  });

  it('counts a source in every lane it supplies, so lanes need not sum to the total', () => {
    const counts = countEvidenceRecords(mixedClaims());
    expect({ human: counts.human, preclinical: counts.preclinical, reference: counts.reference }).toEqual({
      human: 2,
      preclinical: 1,
      reference: 3,
    });
    expect(counts.sourceKeys.human).toContain('SRC-5');
    expect(counts.sourceKeys.reference).toContain('SRC-5');
    expect(counts.distinctSources).toBe(5);
    expect(counts.human + counts.preclinical + counts.reference).toBeGreaterThan(counts.distinctSources);
    expect(counts.statements).toEqual({ human: 2, preclinical: 1, reference: 1 });
  });

  it('returns empty lanes for no claims and for claims without citations', () => {
    for (const claims of [[], [claim('X', [])]]) {
      const counts = countEvidenceRecords(claims);
      expect([counts.human, counts.preclinical, counts.reference, counts.distinctSources]).toEqual([0, 0, 0, 0]);
      expect(counts.statements).toEqual({ human: 0, preclinical: 0, reference: 0 });
    }
  });

  it('uses the statement lane rule for each citation', () => {
    expect(laneOfEvidence(evidence('S', 'analytical_characterisation'))).toBe('preclinical');
    expect(laneOfEvidence(evidence('S', 'practitioner_reference'))).toBe('reference');
    expect(laneOfEvidence(evidence('S', 'human_case_report'))).toBe('human');
    expect(laneOfClaim(claim('X', []))).toBeNull();
    expect(laneOfClaim(claim('Y', [evidence('S', 'animal_in_vivo'), evidence('T', 'human_rct')]))).toBe('human');
  });

  it('prints one noun per lane, and "statements" only for statements', () => {
    expect(formatEvidenceRecordCount('human', 1)).toBe('1 human evidence record');
    expect(formatEvidenceRecordCount('human', 3)).toBe('3 human evidence records');
    expect(formatEvidenceRecordCount('preclinical', 2)).toBe('2 preclinical evidence records');
    expect(formatEvidenceRecordCount('reference', 1)).toBe('1 reference or practice source');
    expect(formatEvidenceRecordCount('reference', 4)).toBe('4 reference and practice sources');
    expect(formatStatementCount(1)).toBe('1 statement');
    for (const noun of Object.values(EVIDENCE_RECORD_NOUN)) {
      expect(`${noun.one} ${noun.many} ${noun.heading}`).not.toMatch(/statement|claim/i);
    }
  });

  it('defines the unit, including the multi-lane rule, at both reading depths', () => {
    expect(EVIDENCE_RECORD_DEFINITION.full).toMatch(/distinct sources/);
    expect(EVIDENCE_RECORD_DEFINITION.full).toMatch(/appears in both counts/);
    expect(EVIDENCE_RECORD_DEFINITION.full).toMatch(/not a study/);
    expect(EVIDENCE_RECORD_DEFINITION.short).toMatch(/not statements/);
    expect(EVIDENCE_RECORD_DEFINITION.simpleFull).toMatch(/under two headings/);
    expect(EVIDENCE_RECORD_DEFINITION.simpleShort).toMatch(/more than one heading/);
  });
});
