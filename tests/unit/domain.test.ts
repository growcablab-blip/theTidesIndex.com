import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_STATEMENT_TEXT,
  isConsistent,
  isHumanEvidence,
  summariseEvidence,
  wouldOverstateAsHuman,
  type EvidenceTypeDescriptor,
} from '@/domain/evidence/evidence-types';
import {
  evaluateClaimPublishGate,
  evaluateProtocolPublishGate,
  evaluateQualityTopicPublishGate,
  outstandingReviews,
} from '@/domain/publishing/gates';
import {
  assertPatientSafe,
  PatientSafetyViolationError,
  toSimpleProtocolView,
  type PractitionerProtocolView,
} from '@/domain/presentation/reading-mode';
import { seedData } from '@db/seed/seed-data';

const humanRct: EvidenceTypeDescriptor = {
  key: 'human_rct',
  publicLabel: 'Randomised human trial',
  evidenceClass: 'human',
  isHumanEvidence: true,
  isInterpretive: false,
};

const animalStudy: EvidenceTypeDescriptor = {
  key: 'animal_in_vivo',
  publicLabel: 'Animal study',
  evidenceClass: 'preclinical',
  isHumanEvidence: false,
  isInterpretive: false,
};

const practitionerReference: EvidenceTypeDescriptor = {
  key: 'practitioner_reference',
  publicLabel: 'Practitioner reference',
  evidenceClass: 'reference_opinion',
  isHumanEvidence: false,
  isInterpretive: true,
};

describe('evidence semantics', () => {
  it('never treats preclinical evidence as human evidence', () => {
    expect(isHumanEvidence(animalStudy)).toBe(false);
    expect(isHumanEvidence(practitionerReference)).toBe(false);
    expect(isHumanEvidence(humanRct)).toBe(true);
  });

  it('flags a body of evidence that would overstate as human', () => {
    expect(wouldOverstateAsHuman([animalStudy, practitionerReference])).toBe(true);
    expect(wouldOverstateAsHuman([animalStudy, humanRct])).toBe(false);
    // Nothing recorded is not an overstatement; it is an absence.
    expect(wouldOverstateAsHuman([])).toBe(false);
  });

  it('summarises without collapsing evidence into a score', () => {
    const snapshot = summariseEvidence([animalStudy, animalStudy, practitionerReference]);
    expect(snapshot.hasHumanEvidence).toBe(false);
    expect(snapshot.preclinicalCount).toBe(2);
    expect(snapshot.statement).toBe('preclinical_with_reference');
    expect(EVIDENCE_STATEMENT_TEXT[snapshot.statement]).toMatch(/do not establish/i);

    // No numeric rating is produced anywhere in the snapshot.
    expect(Object.keys(snapshot)).not.toContain('score');
    expect(Object.keys(snapshot)).not.toContain('rating');
  });

  it('distinguishes a single human study from a body of human evidence', () => {
    expect(summariseEvidence([humanRct]).statement).toBe('limited_human_evidence');
    expect(summariseEvidence([humanRct, humanRct]).statement).toBe('human_evidence_present');
  });

  it('reports an empty record honestly rather than as weak evidence', () => {
    const snapshot = summariseEvidence([]);
    expect(snapshot.statement).toBe('no_evidence_recorded');
    expect(EVIDENCE_STATEMENT_TEXT[snapshot.statement]).toMatch(/has not been done/i);
  });

  it('holds for every evidence type shipped in the seed vocabulary', () => {
    for (const type of seedData.evidenceTypes) {
      expect(isConsistent(type), type.key).toBe(true);
    }
  });
});

describe('claim publish gate', () => {
  const reviewed = ['source_check', 'scientific'] as const;

  it('refuses a claim with no evidence', () => {
    const result = evaluateClaimPublishGate({
      importance: 'medium',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported.',
      uncertaintyText: null,
      evidence: [],
      approvedReviews: [...reviewed],
    });
    expect(result.canPublish).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('missing_provenance');
    expect(result.failures[0]?.message).toMatch(/no evidence link/i);
  });

  it('names the locator problem specifically when the source is fine', () => {
    const result = evaluateClaimPublishGate({
      importance: 'medium',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported.',
      uncertaintyText: null,
      evidence: [{ hasSourceLocation: false, sourceIsCitable: true }],
      approvedReviews: [...reviewed],
    });
    expect(result.failures[0]?.message).toMatch(/exact source location/i);
  });

  it('refuses a source marked for replacement', () => {
    const result = evaluateClaimPublishGate({
      importance: 'medium',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported.',
      uncertaintyText: null,
      evidence: [{ hasSourceLocation: true, sourceIsCitable: false }],
      approvedReviews: [...reviewed],
    });
    expect(result.canPublish).toBe(false);
    expect(result.failures[0]?.message).toMatch(/not citable/i);
  });

  it('requires stated uncertainty for high-impact claims', () => {
    const result = evaluateClaimPublishGate({
      importance: 'critical',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported.',
      uncertaintyText: '   ',
      evidence: [{ hasSourceLocation: true, sourceIsCitable: true }],
      approvedReviews: [...reviewed],
    });
    const codes = result.failures.map((f) => f.code);
    expect(codes).toContain('missing_uncertainty');
  });

  /*
   * The 2026-09-24 separation, asserted from the outside.
   *
   * Provenance still decides publication. Review no longer does — it is
   * reported separately, so the page can say which it has.
   */
  it('publishes a provenance-complete claim that no one has reviewed', () => {
    const result = evaluateClaimPublishGate({
      importance: 'low',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported in the cited source.',
      uncertaintyText: null,
      evidence: [{ hasSourceLocation: true, sourceIsCitable: true }],
      approvedReviews: [],
    });
    expect(result.canPublish).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('still refuses a claim with no provenance, reviewed or not', () => {
    const result = evaluateClaimPublishGate({
      importance: 'low',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported.',
      uncertaintyText: null,
      evidence: [],
      approvedReviews: [...reviewed],
    });
    expect(result.canPublish).toBe(false);
    expect(result.failures.map((f) => f.code)).toContain('missing_provenance');
  });

  it('reports the reviews a claim still lacks without blocking it', () => {
    expect(outstandingReviews('claim', [])).toEqual(['source_check', 'scientific']);
    expect(outstandingReviews('claim', [], 'critical')).toEqual([
      'source_check',
      'scientific',
      'compliance',
    ]);
    expect(outstandingReviews('claim', ['source_check', 'scientific'])).toEqual([]);
  });

  it('passes a fully supported claim', () => {
    const result = evaluateClaimPublishGate({
      importance: 'high',
      isEditorialNonEvidentiary: false,
      interpretationNotes: 'Read as reported in the cited trial.',
      uncertaintyText: 'Single trial, narrow population, not replicated.',
      evidence: [{ hasSourceLocation: true, sourceIsCitable: true }],
      approvedReviews: ['source_check', 'scientific', 'compliance'],
    });
    expect(result.canPublish).toBe(true);
    expect(result.failures).toEqual([]);
  });

  it('exempts editorial copy from provenance', () => {
    const result = evaluateClaimPublishGate({
      importance: 'low',
      isEditorialNonEvidentiary: true,
      interpretationNotes: null,
      uncertaintyText: null,
      evidence: [],
      approvedReviews: [],
    });
    expect(result.canPublish).toBe(true);
  });
});

describe('protocol publish gate', () => {
  it('requires provenance, population, route and framing', () => {
    const result = evaluateProtocolPublishGate({
      populationModel: null,
      routeKey: null,
      regulatoryContext: null,
      sources: [],
      approvedReviews: [],
    });
    const codes = result.failures.map((f) => f.code);
    expect(codes).toEqual([
      'missing_provenance',
      'missing_population',
      'missing_route',
      'missing_regulatory_context',
    ]);
  });

  /*
   * A source-reported regimen is the highest-consequence thing this index
   * publishes, so the protections that keep it attributable are the ones that
   * must not move: a citable source at an exact location, the population it was
   * reported in, a route, and the framing that says whether it is labelling, a
   * study regimen or practice. Review is reported beside it, not in front of it.
   */
  it('publishes an attributable regimen that no clinician has reviewed', () => {
    const result = evaluateProtocolPublishGate({
      populationModel: 'Adult humans, as described by the source',
      routeKey: 'subcutaneous',
      regulatoryContext: 'Practitioner-described regimen. Not approved labelling.',
      sources: [{ hasSourceLocation: true, sourceIsCitable: true }],
      approvedReviews: [],
    });
    expect(result.canPublish).toBe(true);
  });

  it('still refuses a regimen whose source is not citable', () => {
    const result = evaluateProtocolPublishGate({
      populationModel: 'Adult humans',
      routeKey: 'subcutaneous',
      regulatoryContext: 'Practitioner-described regimen.',
      sources: [{ hasSourceLocation: true, sourceIsCitable: false }],
      approvedReviews: ['source_check', 'scientific', 'clinical', 'compliance'],
    });
    expect(result.canPublish).toBe(false);
  });

  it('reports all four outstanding protocol reviews without blocking publication', () => {
    expect(outstandingReviews('protocol', [])).toEqual([
      'source_check',
      'scientific',
      'clinical',
      'compliance',
    ]);
  });

  it('passes a fully documented, fully reviewed protocol', () => {
    const result = evaluateProtocolPublishGate({
      populationModel: 'Adult humans, as described by the source',
      routeKey: 'subcutaneous',
      regulatoryContext: 'Practitioner-described regimen. Not approved labelling.',
      sources: [{ hasSourceLocation: true, sourceIsCitable: true }],
      approvedReviews: ['source_check', 'scientific', 'clinical', 'compliance'],
    });
    expect(result.canPublish).toBe(true);
  });
});

describe('quality topic publish gate', () => {
  it('insists on what a test cannot establish, not only what it can', () => {
    const result = evaluateQualityTopicPublishGate({
      whatItProves: 'Chromatographic purity of the analysed sample.',
      whatItDoesNotProve: null,
      approvedReviews: ['scientific'],
    });
    expect(result.canPublish).toBe(false);
    expect(result.failures[0]?.code).toBe('missing_what_it_does_not_prove');
    expect(result.failures[0]?.message).toMatch(/sterility/i);
  });
});

describe('patient-safe output', () => {
  const practitionerRecord: PractitionerProtocolView = {
    id: 'p1',
    protocolKey: 'P-001',
    peptideId: 'pep1',
    combinationName: null,
    objectiveContext: 'Recovery support, as described by the source.',
    populationModel: 'Adult humans',
    routeKey: 'subcutaneous',
    regulatoryContext: 'Practitioner-described regimen.',
    evidenceTypeKey: 'practitioner_reference',
    hasMonitoringGuidance: true,
    hasSafetyGuidance: true,
    formulation: 'Lyophilised powder',
    amountReported: '500 mcg',
    amountUnit: 'mcg',
    frequencyText: 'twice daily',
    timingText: 'morning and evening',
    durationText: '4 weeks',
    cycleText: null,
    titrationText: null,
    combinationsText: null,
    monitoringText: 'Review at four weeks.',
    contraindicationsText: 'As described by the source.',
    safetyNotes: 'As described by the source.',
    adverseEventsText: null,
    outcomeContext: null,
  };

  it('rejects any payload carrying a dosing field', () => {
    expect(() => assertPatientSafe(practitionerRecord)).toThrow(PatientSafetyViolationError);
  });

  it('names every offending field so the data path can be fixed', () => {
    try {
      assertPatientSafe({ protocol: practitionerRecord });
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(PatientSafetyViolationError);
      const fields = (error as PatientSafetyViolationError).offendingFields;
      expect(fields).toContain('payload.protocol.amountReported');
      expect(fields).toContain('payload.protocol.frequencyText');
    }
  });

  it('catches a dosing field nested inside an array', () => {
    expect(() => assertPatientSafe({ protocols: [practitionerRecord] })).toThrow(
      PatientSafetyViolationError,
    );
  });

  it('catches snake_case fields arriving straight from a query', () => {
    expect(() => assertPatientSafe({ amount_reported: '500 mcg' })).toThrow(
      PatientSafetyViolationError,
    );
  });

  it('narrows a practitioner record to a patient-safe shape', () => {
    const simple = toSimpleProtocolView(practitionerRecord);

    expect(Object.keys(simple).sort()).toEqual([
      'combinationName',
      'evidenceTypeKey',
      'hasMonitoringGuidance',
      'hasSafetyGuidance',
      'id',
      'objectiveContext',
      'peptideId',
      'populationModel',
      'protocolKey',
      'regulatoryContext',
      'routeKey',
    ]);
    expect(simple.hasSafetyGuidance).toBe(true);
    expect(() => assertPatientSafe(simple)).not.toThrow();
  });

  it('accepts a record with nothing to hide', () => {
    expect(() => assertPatientSafe({ title: 'What is a peptide?', body: 'Plain text.' })).not.toThrow();
  });
});
