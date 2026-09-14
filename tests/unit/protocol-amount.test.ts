import { describe, expect, it } from 'vitest';
import { amountAsReported } from '@/domain/protocols/amount';

/**
 * An amount in a dosing table must carry its unit, and carry it once.
 *
 * Both failures happened on this project: appending the unit column printed
 * "500 mcg mcg", and printing the wording alone showed "Amount 250" on the
 * BPC-157 record, whose source put the unit in a column heading.
 */
describe('amountAsReported', () => {
  it('adds the unit to a bare number or range', () => {
    expect(amountAsReported({ amountReported: '250', amountUnit: 'mcg' })).toBe('250 mcg');
    expect(amountAsReported({ amountReported: '300-600', amountUnit: 'mcg' })).toBe('300-600 mcg');
    expect(amountAsReported({ amountReported: '1-2', amountUnit: 'mg' })).toBe('1-2 mg');
  });

  it('never doubles a unit the source already wrote', () => {
    expect(amountAsReported({ amountReported: '500 mcg', amountUnit: 'mcg' })).toBe('500 mcg');
    expect(amountAsReported({ amountReported: '1.4 mg (0.35 mL)', amountUnit: 'mg' })).toBe(
      '1.4 mg (0.35 mL)',
    );
  });

  it('keeps the wording verbatim when no unit is recorded', () => {
    expect(amountAsReported({ amountReported: '250', amountUnit: null })).toBe('250');
  });

  it('returns null when there is no amount', () => {
    expect(amountAsReported({ amountReported: null, amountUnit: 'mcg' })).toBeNull();
    expect(amountAsReported({ amountReported: '  ', amountUnit: 'mcg' })).toBeNull();
  });
});
