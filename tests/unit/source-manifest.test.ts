import { describe, expect, it } from 'vitest';
import { buildSourceInventory, findBrokenEntries } from '@/server/sources/source-inventory';
import { seedData } from '@db/seed/seed-data';

/**
 * The source registry has to stay true to what is actually held. A registry
 * entry pointing at a file that is not there would produce citations nobody can
 * check, which is the one thing this platform cannot ship.
 */
describe('source registry', () => {
  it('has a unique key for every entry', () => {
    const keys = seedData.sourceManifest.sources.map((s) => s.source_key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('uses only recognised source types', () => {
    const known = new Set(seedData.sourceTypes.map((t) => t.key));
    for (const source of seedData.sourceManifest.sources) {
      expect(known.has(source.source_type), `${source.source_key}: ${source.source_type}`).toBe(
        true,
      );
    }
  });

  it('marks no copyrighted book in the archive as publishable full text', () => {
    for (const source of seedData.sourceManifest.sources) {
      expect(source.public_fulltext_allowed, source.source_key).toBe(false);
    }
  });

  it('binds every recorded filename to a file that exists', async () => {
    const inventory = await buildSourceInventory();
    const broken = findBrokenEntries(inventory);

    expect(
      broken.map((b) => `${b.sourceKey} -> ${b.expectedFilename ?? ''}`),
      'registry entries pointing at files that are not present',
    ).toEqual([]);
  });

  it('treats a source with no file recorded as pending, not broken', async () => {
    const inventory = await buildSourceInventory();
    const pending = inventory.entries.filter((e) => e.state === 'not_recorded');

    // SRC-016 is an external source stream that has not been captured.
    expect(pending.map((e) => e.sourceKey)).toEqual(['SRC-016']);
    for (const entry of pending) {
      const source = seedData.sourceManifest.sources.find((s) => s.source_key === entry.sourceKey);
      expect(source?.qc_status).toBe('pending');
    }
  });

  it('keeps corrupted and partial copies out of the citable set', async () => {
    const inventory = await buildSourceInventory();
    const byKey = new Map(inventory.entries.map((e) => [e.sourceKey, e]));

    for (const key of ['SRC-013', 'SRC-014', 'SRC-015']) {
      expect(byKey.get(key)?.isCitable, key).toBe(false);
    }
  });

  it('records SRC-011 under the editor confirmed by inspection, not the filename', () => {
    // The held copy's filename names Colin T. Mant, who wrote Chapter 1. Owner
    // inspection confirmed the work is edited by Gregg B. Fields. Aggregator
    // filenames are not bibliographic authority.
    const source = seedData.sourceManifest.sources.find((s) => s.source_key === 'SRC-011');
    expect(source?.authors).toEqual(['Gregg B. Fields (ed.)']);
    expect(source?.year).toBe(2007);
    expect(source?.publisher).toBe('Humana Press');
    expect(source?.authority_notes).toMatch(/Mant/);

    // The copy itself is still corrupted, so it cannot support published content.
    expect(source?.qc_status).toBe('replace');

    // The replacement remains an open task, and the audit that settled the
    // identity — and found five outright decoys — is recorded alongside it.
    expect(seedData.verificationIssues.find((i) => i.issueKey === 'V-013')).toBeDefined();
    expect(seedData.verificationIssues.find((i) => i.issueKey === 'V-014')?.topic).toMatch(
      /not the works they claim to be/i,
    );
  });
});
