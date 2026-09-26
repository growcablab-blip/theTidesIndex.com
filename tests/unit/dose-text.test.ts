import { describe, expect, it } from 'vitest';
import { findDoses } from '@/domain/presentation/dose-text';

/**
 * What counts as a dose, and what does not.
 *
 * This rule is shared by `npm run qa:doses` and by the integration suite that
 * renders every published compound in simple mode, so it is worth pinning both
 * directions: the amounts it must catch, and the four kinds of number that look
 * like amounts and are not.
 */

describe('finding dose-shaped text', () => {
  it('catches an amount with a unit', () => {
    const hits = findDoses({ claimText: 'given 500 mcg twice daily' });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.path).toBe('.claimText');
    expect(hits[0]?.context).toContain('500 mcg');
  });

  it('catches an amount with no space, a range, and a per-basis', () => {
    expect(findDoses({ a: '250mcg' })).toHaveLength(1);
    expect(findDoses({ a: '0.5 - 0.75 ml intra-articularly' })).toHaveLength(1);
    expect(findDoses({ a: '10 mg/kg' })).toHaveLength(1);
  });

  it('finds them however deeply nested, and says where', () => {
    const hits = findDoses({ claims: [{ notes: 'nothing' }, { notes: 'then 1.6 mg weekly' }] });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.path).toBe('.claims[1].notes');
  });

  it('does not read a molecular weight as a dose', () => {
    // The one that caught a record out: "molecular weight 1815.1 g/mol".
    expect(findDoses({ m: 'molecular weight 1815.1 g/mol' })).toEqual([]);
    expect(findDoses({ m: 'MW 3051.3 gm/mol' })).toEqual([]);
    expect(findDoses({ m: 'a 4493 kDa protein' })).toEqual([]);
  });

  it('does not read a measured concentration as a dose', () => {
    // A result somebody measured is not an amount anybody was given.
    expect(findDoses({ r: 'IGF-1 rose by 181 micrograms per litre' })).toEqual([]);
  });

  it('does not read an identifier as a dose', () => {
    // A uuid is not content. Keys ending in Id or _id are skipped entirely.
    expect(findDoses({ id: '500mg-not-a-dose', peptideId: '250 mcg', source_id: '10 ml' })).toEqual([]);
  });

  it('ignores a bare number and a number with no unit of amount', () => {
    expect(findDoses({ a: '342 adults on a gluten-free diet' })).toEqual([]);
    expect(findDoses({ a: 'for 12 weeks, five days out of seven' })).toEqual([]);
    expect(findDoses({ a: '26% fewer symptoms' })).toEqual([]);
  });

  it('survives a cycle in the payload', () => {
    const node: Record<string, unknown> = { text: 'clean' };
    node.self = node;
    expect(findDoses(node)).toEqual([]);
  });
});
