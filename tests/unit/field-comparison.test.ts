import { describe, expect, it } from 'vitest';
import {
  FIELD_STATES,
  FIELD_STATE_TERM,
  absenceNote,
  classifyField,
  hasDistinctWordings,
  isNotReported,
  normaliseForComparison,
  wordingLetter,
} from '@/domain/protocols/field-comparison';
import {
  COMPARISON_FIELDS,
  compareProtocolFields,
  type ComparableProtocol,
} from '@/domain/protocols/protocol-comparison';

/**
 * Owner decision: "Not specified" does NOT count as a disagreement.
 * AGREEMENT, DIFFERENCE and NOT REPORTED are separate, and absence is never
 * converted into either of the other two.
 */

const v = (...values: (string | null)[]) => values.map((value, i) => ({ value, sourceKey: `SRC-${String(i)}` }));

describe('absence', () => {
  it.each([
    null,
    '',
    '   ',
    'Not specified.',
    'Not specified by the source.',
    'Not specified by the sources.',
    'Not stated',
    'Not stated by the source',
    'Not stated in this abstract',
    'not reported',
    'Unspecified',
    'N/A',
    '—',
  ])('reads %j as not reported', (value) => {
    expect(isNotReported(value)).toBe(true);
    expect(absenceNote(value)).toBeNull();
  });

  it.each([
    'Not specified by the source; a variant for women is described.',
    'Not specified by the source beyond the indication it describes.',
    'Not specified. The source gives amounts without describing a population or citing a study.',
  ])('reads a qualified placeholder as not reported and keeps its text: %j', (value) => {
    expect(isNotReported(value)).toBe(true);
    expect(absenceNote(value)).toBe(value);
  });

  it.each(['Not more than three months.', 'Not more than three months concurrently.', 'Unknown', '8 weeks', 'Nightly'])(
    'keeps %j as a reported value',
    (value) => {
      expect(isNotReported(value)).toBe(false);
    },
  );
});

describe('normalisation is presentation only', () => {
  it('ignores case, whitespace, sentence punctuation and unit spacing', () => {
    expect(normaliseForComparison('500mcg')).toBe(normaliseForComparison(' 500  MCG. '));
    expect(normaliseForComparison('Twice-daily')).toBe(normaliseForComparison('twice daily'));
    expect(normaliseForComparison('mg/kg')).toBe(normaliseForComparison('mg / kg'));
    expect(normaliseForComparison('1 – 2 mg')).toBe(normaliseForComparison('1-2 mg'));
  });

  it('never merges different quantities', () => {
    expect(normaliseForComparison('1-2 mg')).not.toBe(normaliseForComparison('12 mg'));
    expect(normaliseForComparison('0.5 mg')).not.toBe(normaliseForComparison('05 mg'));
    expect(normaliseForComparison('1,000 mcg')).not.toBe(normaliseForComparison('1000 mcg'));
    expect(normaliseForComparison('~500 mcg')).not.toBe(normaliseForComparison('500 mcg'));
    expect(normaliseForComparison('-20 °C')).not.toBe(normaliseForComparison('20 °C'));
  });

  it('attempts no semantic equivalence', () => {
    expect(normaliseForComparison('500 mcg')).not.toBe(normaliseForComparison('500 µg'));
    expect(normaliseForComparison('0.5 mg')).not.toBe(normaliseForComparison('500 mcg'));
    expect(normaliseForComparison('twice daily')).not.toBe(normaliseForComparison('every 12 hours'));
    expect(normaliseForComparison('SC')).not.toBe(normaliseForComparison('subcutaneous'));
  });
});

describe('field classification', () => {
  it('does not count "not specified" against a value as a difference', () => {
    const result = classifyField(v('250 mcg', 'Not specified by the source.'));
    expect(result.state).toBe('single');
    expect(result.cells.map((c) => c.state)).toEqual(['reported', 'not_reported']);
    expect(result.wordings).toHaveLength(1);
  });

  it('classifies two values identical after normalisation as agreement', () => {
    const result = classifyField(v('500mcg', '500 MCG.'));
    expect(result.state).toBe('agreement');
    expect(result.wordings).toHaveLength(1);
    // Each cell keeps its own source's words.
    expect(result.cells.map((c) => c.value)).toEqual(['500mcg', '500 MCG.']);
  });

  it('classifies two different values as difference', () => {
    const result = classifyField(v('250 mcg', '500 mcg'));
    expect(result.state).toBe('difference');
    expect(result.wordings.map((w) => w.letter)).toEqual(['A', 'B']);
    expect(result.acrossSources).toBe(true);
  });

  it('classifies one reported value as single, neither agreement nor difference', () => {
    const result = classifyField(v(null, 'Once daily', 'Not stated'));
    expect(result.state).toBe('single');
    expect(result.reportedCount).toBe(1);
    expect(result.notReportedColumns).toEqual([0, 2]);
  });

  it('classifies no reported value as none', () => {
    const result = classifyField(v(null, '', 'Not stated in this abstract'));
    expect(result.state).toBe('none');
    expect(result.wordings).toHaveLength(0);
  });

  it('keeps agreement when a third source is silent', () => {
    const result = classifyField(v('Subcutaneous', 'Not specified.', 'subcutaneous'));
    expect(result.state).toBe('agreement');
    expect(result.reportedCount).toBe(2);
    expect(result.notReportedCount).toBe(1);
    expect(result.cells[1]?.wording).toBeNull();
  });

  it('finds a difference among three sources regardless of silent ones', () => {
    const result = classifyField(v('8 weeks', null, '4 weeks', 'Not stated by the source'));
    expect(result.state).toBe('difference');
    expect(result.reportedCount).toBe(2);
    expect(result.notReportedColumns).toEqual([1, 3]);
  });

  it('letters distinct reported wordings left to right, skipping silent cells', () => {
    const result = classifyField(
      v('Not specified.', '500 mcg', '250 mcg', '500MCG', null, '1 mg'),
    );
    expect(result.state).toBe('difference');
    expect(result.cells.map((c) => c.wording)).toEqual([null, 0, 1, 0, null, 2]);
    expect(result.wordings.map((w) => [w.letter, w.value, w.columns])).toEqual([
      ['A', '500 mcg', [1, 3]],
      ['B', '250 mcg', [2]],
      ['C', '1 mg', [5]],
    ]);
  });

  it('classifies differing wordings from one source as within-source variation, not difference', () => {
    const result = classifyField([
      { value: '250 mcg', sourceKey: 'SRC-004' },
      { value: '500 mcg', sourceKey: 'SRC-004' },
      { value: null, sourceKey: 'SRC-009' },
    ]);
    expect(result.state).toBe('variation');
    expect(result.acrossSources).toBe(false);
    expect(result.reportingSourceCount).toBe(1);
    expect(result.sourcesWithVariation).toEqual(['SRC-004']);
    expect(result.wordings.map((w) => w.letter)).toEqual(['A', 'B']);
  });

  it('keeps a difference between sources a difference, and notes variation inside it', () => {
    const result = classifyField([
      { value: '250 mcg', sourceKey: 'SRC-004' },
      { value: '500 mcg', sourceKey: 'SRC-004' },
      { value: '250 mcg', sourceKey: 'SRC-009' },
    ]);
    expect(result.state).toBe('difference');
    expect(result.acrossSources).toBe(true);
    expect(result.sourcesWithVariation).toEqual(['SRC-004']);
  });

  it('never calls differing wordings from different sources variation, even when each source is internally consistent', () => {
    const result = classifyField([
      { value: '250 mcg', sourceKey: 'SRC-004' },
      { value: '250 mcg', sourceKey: 'SRC-004' },
      { value: '500 mcg', sourceKey: 'SRC-009' },
    ]);
    expect(result.state).toBe('difference');
    expect(result.sourcesWithVariation).toEqual([]);
  });

  it('treats records without a source key as separate sources, so they cannot pass for variation', () => {
    const result = classifyField([{ value: '250 mcg' }, { value: '500 mcg' }]);
    expect(result.state).toBe('difference');
    expect(result.sourcesWithVariation).toEqual([]);
  });

  it('keeps agreement within one source as agreement', () => {
    const result = classifyField([
      { value: 'Subcutaneous', sourceKey: 'SRC-005' },
      { value: 'subcutaneous.', sourceKey: 'SRC-005' },
    ]);
    expect(result.state).toBe('agreement');
    expect(result.acrossSources).toBe(false);
  });

  it('names the five states in the owner’s words', () => {
    expect(FIELD_STATES.map((s) => FIELD_STATE_TERM[s])).toEqual([
      'Agreement',
      'Difference',
      'Within-source variation',
      'One source only',
      'Not reported',
    ]);
    expect(hasDistinctWordings('difference')).toBe(true);
    expect(hasDistinctWordings('variation')).toBe(true);
    expect(hasDistinctWordings('agreement')).toBe(false);
  });

  it('keeps the note a qualified placeholder carries', () => {
    const result = classifyField(v('Adults', 'Not specified by the source; a variant for women is described.'));
    expect(result.state).toBe('single');
    expect(result.cells[1]?.note).toMatch(/variant for women/);
  });

  it('letters beyond Z without colliding with column numbers', () => {
    expect(wordingLetter(0)).toBe('A');
    expect(wordingLetter(25)).toBe('Z');
    expect(wordingLetter(26)).toBe('AA');
  });
});

describe('protocol adapter', () => {
  const base: ComparableProtocol = {
    id: 'p1',
    objectiveContext: 'Tissue repair',
    populationModel: 'Not specified by the source.',
    routeName: 'Subcutaneous',
    formulation: null,
    amountReported: '250',
    amountUnit: 'mcg',
    frequencyText: 'Twice daily',
    timingText: null,
    durationText: 'Not stated',
    titrationText: null,
    cycleText: null,
    combinationsText: null,
    monitoringText: null,
    contraindicationsText: null,
    regulatoryContext: null,
    sources: [{ sourceKey: 'SRC-001' }],
  };

  it('classifies every field, and never turns silence into a difference', () => {
    const other: ComparableProtocol = {
      ...base,
      id: 'p2',
      populationModel: 'Adults',
      amountReported: '250 mcg',
      amountUnit: null,
      frequencyText: 'twice daily.',
      durationText: '4 weeks',
      sources: [{ sourceKey: 'SRC-002' }],
    };
    const byKey = Object.fromEntries(
      compareProtocolFields([base, other]).map((c) => [c.field.key, c.state]),
    );
    expect(Object.keys(byKey)).toHaveLength(COMPARISON_FIELDS.length);
    expect(byKey.population).toBe('single');
    expect(byKey.duration).toBe('single');
    expect(byKey.route).toBe('agreement');
    // "250" + unit "mcg" is printed "250 mcg", which matches the other's wording.
    expect(byKey.amount).toBe('agreement');
    expect(byKey.frequency).toBe('agreement');
    expect(byKey.timing).toBe('none');
    expect(Object.values(byKey)).not.toContain('difference');
  });
});
