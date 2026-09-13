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

  it('marks no copyrighted work in the archive as publishable full text', () => {
    /*
     * Narrowed when SRC-027 — the FDA-approved prescribing information —
     * entered the register.
     *
     * The flag was `false` on every source because every source was a
     * copyrighted book, and the assertion read as "nothing may be republished".
     * That is the right rule for a book and the wrong rule for a United States
     * government public record, which may be quoted in full and which is the
     * highest regulatory authority this index holds.
     *
     * So the rule is stated as what it always meant: a work under copyright may
     * not have its full text published, and a public record may.
     */
    const PUBLIC_RECORD_TYPES = new Set(['regulatory_label', 'regulatory_guidance']);

    for (const source of seedData.sourceManifest.sources) {
      if (source.public_fulltext_allowed === true) {
        expect(
          PUBLIC_RECORD_TYPES.has(source.source_type),
          `${source.source_key} claims publishable full text but is a ${source.source_type}`,
        ).toBe(true);
        continue;
      }
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

    // SRC-016 is an external source stream that has not been captured. The USP
    // general chapters joined it in C.5: registered, named, and behind a
    // subscription this index does not hold.
    expect(pending.map((e) => e.sourceKey)).toContain('SRC-016');

    for (const entry of pending) {
      const source = seedData.sourceManifest.sources.find((s) => s.source_key === entry.sourceKey);
      /*
       * A source with no file recorded is normally pending — nobody has
       * obtained a copy. SRC-027 is the exception the register did not
       * previously have: it is retrieved live from the regulator's own API and
       * pinned by a Structured Product Label set id and effective date, so
       * there is no file and nothing is outstanding. The distinction that
       * matters is not "is there a file" but "has anyone actually read it",
       * which `bibliographic_verified` records.
       */
      if (source?.access_status === 'held' && source.bibliographic_verified === true) {
        // Retrieved live and pinned by an identifier recorded in the notes,
        // rather than by a file on disk.
        expect(source.access_notes, entry.sourceKey).toBeTruthy();
        continue;
      }
      expect(source?.qc_status, entry.sourceKey).toBe('pending');
      // A source with no copy must say why there is no copy. "We should get it"
      // becoming "it says…" is the failure this closes, and an unexplained
      // absence is where that starts.
      expect(source?.access_status, entry.sourceKey).not.toBe('held');
      expect(source?.access_notes, entry.sourceKey).not.toBeNull();
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
