import { describe, expect, it } from 'vitest';
import {
  OPPORTUNITY_TYPES,
  RESEARCH_CATEGORIES,
  categoryFor,
  countByCategory,
  groupByCategory,
} from '@/domain/research/categories';
import { OPPORTUNITY_LABELS } from '@/components/public/research-figures';

/**
 * The research page groups thirteen opportunity types into nine categories. A
 * type in no category would vanish from the agenda; a type in two would be
 * counted twice in the tally. Both are provenance faults, not layout ones.
 */

describe('research categories', () => {
  it('maps every opportunity type to exactly one category', () => {
    for (const type of OPPORTUNITY_TYPES) {
      const homes = RESEARCH_CATEGORIES.filter((c) => c.opportunityTypes.includes(type));
      expect(homes.map((c) => c.key), type).toHaveLength(1);
    }
  });

  it('holds no opportunity type the database does not accept', () => {
    const known = new Set<string>(OPPORTUNITY_TYPES);
    const all = RESEARCH_CATEGORIES.flatMap((c) => c.opportunityTypes);
    expect(all.filter((type) => !known.has(type))).toEqual([]);
    expect(all).toHaveLength(OPPORTUNITY_TYPES.length);
  });

  it('agrees with the opportunity vocabulary the compound pages render', () => {
    expect([...OPPORTUNITY_TYPES].sort()).toEqual(Object.keys(OPPORTUNITY_LABELS).sort());
  });

  it('gives each category its own key, words and drawn mark', () => {
    // Never colour alone: two categories sharing a glyph would be told apart
    // only by tint.
    for (const field of ['key', 'label', 'plainLabel', 'glyph'] as const) {
      const values = RESEARCH_CATEGORIES.map((c) => c[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it('describes kinds of question, never anything a reader could try', () => {
    for (const c of RESEARCH_CATEGORIES) {
      for (const text of [c.label, c.plainLabel, c.describes]) {
        expect(text, c.key).not.toMatch(
          /\byou\b|\btry\b|\btake\b|should (try|take|use|start)|recommended dose/i,
        );
      }
    }
  });

  it('files an unknown type under a heading rather than dropping it', () => {
    expect(categoryFor('a_type_added_later').key).toBe('identity-regulatory');
  });

  it('groups and counts without losing or reordering anything', () => {
    const items = [
      { id: 'a', opportunityType: 'dose_response' },
      { id: 'b', opportunityType: 'human_evidence' },
      { id: 'c', opportunityType: 'protocol_validation' },
      { id: 'd', opportunityType: 'long_term_outcomes' },
    ];
    const groups = groupByCategory(items);
    expect(groups.map((g) => g.category.key)).toEqual(['human-evidence', 'protocol']);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['b', 'd']);
    expect(groups[1]?.items.map((i) => i.id)).toEqual(['a', 'c']);
    expect(groups.flatMap((g) => g.items)).toHaveLength(items.length);

    const counts = countByCategory(items);
    expect(counts.get('human-evidence')).toBe(2);
    expect(counts.get('protocol')).toBe(2);
    expect(counts.get('safety')).toBe(0);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(items.length);
  });
});
