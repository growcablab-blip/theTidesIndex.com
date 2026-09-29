/**
 * Attributing a name in a combination note to a compound.
 *
 * The case that matters is BPC-157 with TB-500 and thymosin beta-4. The
 * register holds "TB-500" and "thymosin beta-4" as aliases of each other,
 * because sources use them interchangeably for a 43-amino-acid peptide and a
 * seven-amino-acid fragment of it. A matcher that resolved such a name to one
 * compound would put an attribution on the public site that the underlying
 * record does not support, so the rule under test is that it refuses to.
 */
import { describe, expect, it } from 'vitest';
import { attributeNames, matchTerms, mentions } from '@/server/public/stacks';

const BPC = 'id-bpc';
const TB500 = 'id-tb500';
const TB4 = 'id-tb4';

const names = new Map([
  [BPC, 'BPC-157'],
  [TB500, 'TB-500 (Ac-LKKTETQ)'],
  [TB4, 'Thymosin beta-4'],
]);

const terms = new Map([
  [BPC, matchTerms('BPC-157', ['BPC157', 'Body Protection Compound 157'])],
  [TB500, matchTerms('TB-500 (Ac-LKKTETQ)', ['TB500', 'Thymosin beta-4', 'Ac-LKKTETQ'])],
  [TB4, matchTerms('Thymosin beta-4', ['TB-500', 'TB4', 'Tbeta4'])],
]);

describe('mentions', () => {
  it('matches a name whether or not the hyphen is written', () => {
    expect(mentions('often stacked with BPC157', 'BPC-157')).toBe(true);
    expect(mentions('often stacked with BPC-157', 'BPC500')).toBe(false);
  });

  it('ignores case', () => {
    expect(mentions('combined with thymosin beta-4', 'Thymosin Beta-4')).toBe(true);
  });
});

describe('matchTerms', () => {
  it('drops terms too short to identify anything', () => {
    expect(matchTerms('X', ['ab'])).toEqual([]);
  });
});

describe('attributeNames', () => {
  it('attributes a name that belongs to exactly one compound', () => {
    const result = attributeNames('Commonly combined with BPC-157.', TB500, terms, names);
    expect(result.partnerNames).toEqual(['BPC-157']);
    expect(result.ambiguousNames).toEqual([]);
  });

  it('refuses to resolve a name that two compounds share', () => {
    const result = attributeNames(
      'Some patients received BPC-157 combined with thymosin beta-4.',
      BPC,
      terms,
      names,
    );
    expect(result.partnerNames).toEqual([]);
    expect(result.ambiguousNames).toHaveLength(1);
    expect([...(result.ambiguousNames[0]?.candidates ?? [])].sort()).toEqual([
      'TB-500 (Ac-LKKTETQ)',
      'Thymosin beta-4',
    ]);
  });

  it('does not report an ambiguity that the same text resolves elsewhere', () => {
    // "thymosin beta-4" is ambiguous on its own, but this note also names
    // Ac-LKKTETQ, which only TB-500 carries. The reader already knows.
    const result = attributeNames(
      'Given with thymosin beta-4, supplied as Ac-LKKTETQ.',
      BPC,
      terms,
      names,
    );
    expect(result.partnerNames).toEqual(['TB-500 (Ac-LKKTETQ)']);
    expect(result.ambiguousNames).toEqual([]);
  });

  it('ignores the compound whose own record carries the note', () => {
    const result = attributeNames('Dosed as BPC-157 alone.', BPC, terms, names);
    expect(result.partnerNames).toEqual([]);
    expect(result.ambiguousNames).toEqual([]);
  });

  it('finds nothing in a note about standard care', () => {
    const result = attributeNames(
      'Standard care including compression therapy, as described in the design paper.',
      TB4,
      terms,
      names,
    );
    expect(result.partnerNames).toEqual([]);
    expect(result.ambiguousNames).toEqual([]);
  });
});
