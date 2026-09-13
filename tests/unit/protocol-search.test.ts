import { describe, expect, it } from 'vitest';
import { protocolLibraryLinkFor, sectionHintsFor } from '@/server/search/section-routing';

/**
 * Protocol search routes to the protocol library, filtered by what the query
 * names — deterministically, from vocabulary, with no generated answer.
 */

function params(href: string | undefined): Record<string, string> {
  if (href === undefined) return {};
  const qs = href.split('?')[1] ?? '';
  return Object.fromEntries(new URLSearchParams(qs).entries());
}

describe('protocol search', () => {
  it('builds a filtered library link from the words in a regimen query', () => {
    expect(params(protocolLibraryLinkFor('BPC-157 protocols')?.href)).toEqual({ peptide: 'bpc-157' });
    expect(params(protocolLibraryLinkFor('TB-500 protocols')?.href)).toEqual({ peptide: 'tb-500' });
    expect(params(protocolLibraryLinkFor('Tesamorelin protocols')?.href)).toEqual({ peptide: 'tesamorelin' });
    expect(params(protocolLibraryLinkFor('subcutaneous protocols')?.href)).toEqual({ route: 'subcutaneous' });
    expect(params(protocolLibraryLinkFor('intranasal protocols')?.href)).toEqual({ route: 'intranasal' });
    expect(params(protocolLibraryLinkFor('Seeds protocols')?.href)).toEqual({ source: 'SRC-001' });
    expect(params(protocolLibraryLinkFor('LaValle protocols')?.href)).toEqual({ source: 'SRC-002' });
    expect(params(protocolLibraryLinkFor('human trial regimens')?.href)).toEqual({ evidence: 'human_rct' });
  });

  it('keeps TB-500 and thymosin beta-4 as different filters', () => {
    expect(params(protocolLibraryLinkFor('thymosin beta-4 protocols')?.href).peptide).toBe('thymosin-beta-4');
    expect(params(protocolLibraryLinkFor('TB500 dosing')?.href).peptide).toBe('tb-500');
  });

  it('offers nothing for a query that is not about regimens', () => {
    expect(protocolLibraryLinkFor('BPC-157')).toBeNull();
    expect(protocolLibraryLinkFor('TB-500 sequence')).toBeNull();
    expect(protocolLibraryLinkFor('Tesamorelin FDA')).toBeNull();
    expect(protocolLibraryLinkFor('')).toBeNull();
  });

  it('never phrases the link as a recommendation', () => {
    for (const query of ['BPC-157 protocols', 'best TB-500 dose', 'recommended tesamorelin dosing']) {
      const link = protocolLibraryLinkFor(query);
      expect(link, query).not.toBeNull();
      expect(link!.label, query).toMatch(/source-reported|every source-reported/i);
      expect(link!.label, query).not.toMatch(/recommend|best|optimal|should/i);
    }
  });

  it('still routes a regimen query on a compound page to its protocols section', () => {
    expect(sectionHintsFor('BPC-157 protocols').map((h) => h.id)).toContain('protocols');
  });
});
