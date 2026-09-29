/**
 * The comparison of source-reported regimens.
 *
 * What is under test is not wording but three rules the page depends on:
 * records of different kinds are never compared with each other, the patient
 * boundary removes dosing dimensions rather than blanking them, and silence is
 * reported as silence rather than as agreement.
 */
import { describe, expect, it } from 'vitest';
import { compareProtocols } from '@/domain/presentation/protocol-comparison';
import type { PractitionerProtocol } from '@/server/public/shapes';

function protocol(
  key: string,
  human: boolean,
  fields: Partial<PractitionerProtocol>,
): PractitionerProtocol {
  return {
    id: key,
    protocolKey: key,
    objectiveContext: 'Fixture objective',
    populationModel: null,
    routeName: null,
    regulatoryContext: null,
    evidenceTypeLabel: human ? 'Human observational study' : 'Practitioner reference',
    isHumanEvidence: human,
    hasMonitoringGuidance: false,
    hasSafetyGuidance: false,
    sources: [],
    formulation: null,
    amountReported: null,
    amountUnit: null,
    frequencyText: null,
    timingText: null,
    durationText: null,
    cycleText: null,
    combinationsText: null,
    titrationText: null,
    monitoringText: null,
    contraindicationsText: null,
    safetyNotes: null,
    adverseEventsText: null,
    outcomeContext: null,
    ...fields,
  };
}

const texts = (points: readonly { text: string }[]): string => points.map((p) => p.text).join(' | ');

describe('compareProtocols', () => {
  it('reports unanimity within a kind as agreement', () => {
    const result = compareProtocols(
      [
        protocol('a', false, { routeName: 'Subcutaneous' }),
        protocol('b', false, { routeName: 'Subcutaneous' }),
      ],
      { includeDosing: true },
    );
    expect(texts(result.agree)).toContain('report the same route: Subcutaneous');
    expect(result.differ).toHaveLength(0);
  });

  it('never compares a human record with a practitioner source', () => {
    // Same field, different values, different kinds. If the two kinds were
    // pooled this would read as a disagreement between them; it is not one.
    const result = compareProtocols(
      [
        protocol('trial', true, { routeName: 'Intravenous' }),
        protocol('handbook', false, { routeName: 'Subcutaneous' }),
      ],
      { includeDosing: true },
    );
    const routeDiffs = result.differ.filter((p) => p.key.endsWith(':route'));
    expect(routeDiffs).toHaveLength(0);
    expect(result.agree.map((p) => p.group).sort()).toEqual(['human', 'reported']);
  });

  it('separates the two kinds into their own groups', () => {
    const result = compareProtocols(
      [
        protocol('t1', true, { routeName: 'Intravenous' }),
        protocol('t2', true, { routeName: 'Oral' }),
        protocol('h1', false, { routeName: 'Subcutaneous' }),
        protocol('h2', false, { routeName: 'Subcutaneous' }),
      ],
      { includeDosing: true },
    );
    expect(result.differ.some((p) => p.group === 'human' && p.key.endsWith(':route'))).toBe(true);
    expect(result.agree.some((p) => p.group === 'reported' && p.key.endsWith(':route'))).toBe(true);
  });

  it('drops dosing dimensions entirely when they are excluded', () => {
    const withDosing = compareProtocols(
      [
        protocol('a', false, { amountReported: '250', frequencyText: 'Twice a day' }),
        protocol('b', false, { amountReported: '500', frequencyText: 'Once a day' }),
      ],
      { includeDosing: true },
    );
    const withoutDosing = compareProtocols(
      [
        protocol('a', false, { amountReported: '250', frequencyText: 'Twice a day' }),
        protocol('b', false, { amountReported: '500', frequencyText: 'Once a day' }),
      ],
      { includeDosing: false },
    );
    const all = (r: ReturnType<typeof compareProtocols>): string =>
      [...r.agree, ...r.differ, ...r.unknown].map((p) => `${p.key} ${p.text}`).join(' | ');

    expect(all(withDosing)).toContain('amount');
    // Not "the sources differ on amount" either: the dimension is absent.
    expect(all(withoutDosing)).not.toContain('amount');
    expect(all(withoutDosing)).not.toContain('frequency');
    expect(all(withoutDosing)).not.toContain('250');
  });

  it('never leaks a dose figure when dosing is excluded', () => {
    const result = compareProtocols(
      [
        protocol('a', false, { amountReported: '250', amountUnit: 'mcg' }),
        protocol('b', false, { amountReported: '500', amountUnit: 'mcg' }),
      ],
      { includeDosing: false },
    );
    const rendered = [...result.agree, ...result.differ, ...result.unknown]
      .map((p) => p.text)
      .join(' ');
    expect(rendered).not.toMatch(/\d+\s*(mcg|mg|iu|ml)/i);
  });

  it('reports a field no record states as unsettled, not as agreement', () => {
    const result = compareProtocols(
      [protocol('a', false, { routeName: 'Oral' }), protocol('b', false, { routeName: 'Oral' })],
      { includeDosing: true },
    );
    expect(texts(result.unknown)).toContain('None of the 2 reporting sources states a titration.');
    expect(texts(result.agree)).not.toContain('titration');
  });

  it('says how many records stay silent when only some state a field', () => {
    const result = compareProtocols(
      [
        protocol('a', false, { formulation: 'Lyophilised powder' }),
        protocol('b', false, { formulation: 'Lyophilised powder' }),
        protocol('c', false, {}),
      ],
      { includeDosing: true },
    );
    expect(texts(result.agree)).toContain('1 of them does not state it');
  });

  it('always records that no source reports how its regimen was arrived at', () => {
    const result = compareProtocols([protocol('a', false, {})], { includeDosing: true });
    expect(result.unknown.some((p) => p.key === 'derivation')).toBe(true);
  });

  it('returns nothing at all for an empty set', () => {
    const result = compareProtocols([], { includeDosing: true });
    expect(result).toEqual({ total: 0, agree: [], differ: [], unknown: [] });
  });
});
