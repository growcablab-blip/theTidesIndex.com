import { describe, expect, it } from 'vitest';
import { seedData } from '@db/seed/seed-data';
import { buildSourceInventory } from '@/server/sources/source-inventory';

/**
 * Source integrity (verification issue V-014).
 *
 * The audit found that five of sixteen registered files are not the works they
 * claim to be — an aggregator cover page carrying the right title and ISBN,
 * followed by unrelated text. Three of them were previously recorded as
 * "genuine content after promotional pages", which would have let them be cited.
 *
 * These tests hold the chain the registry depends on:
 *
 *   file identity -> bibliographic identity -> QC status -> citability
 *
 * They are assertions about the registry, not about the files, so they run fast
 * and fail loudly if someone edits a QC status without doing the work behind it.
 */

const DECOYS = ['SRC-008', 'SRC-009', 'SRC-010', 'SRC-014', 'SRC-015'];
const PARTIAL = ['SRC-011', 'SRC-013'];

function source(key: string) {
  const found = seedData.sourceManifest.sources.find((s) => s.source_key === key);
  if (!found) throw new Error(`${key} is not in the registry`);
  return found;
}

describe('source integrity', () => {
  it('has inspected the title page of every source that has a file', () => {
    const unverified = seedData.sourceManifest.sources
      .filter((s) => s.known_local_filename !== null)
      .filter((s) => !s.title_page_verified)
      .map((s) => s.source_key);

    expect(unverified, 'every held file must have had its front matter read').toEqual([]);
  });

  it('records a file measurement for every source that has a file', () => {
    for (const s of seedData.sourceManifest.sources) {
      if (s.known_local_filename === null) continue;
      expect(s.local_file_sha256, `${s.source_key} hash`).toMatch(/^[0-9a-f]{64}$/);
      expect(s.page_count, `${s.source_key} page count`).toBeGreaterThan(0);
    }
  });

  it('never treats a file whose bibliographic identity is unconfirmed as citable', () => {
    // This is the rule that would have caught the decoys before they were cited.
    for (const s of seedData.sourceManifest.sources) {
      if (s.bibliographic_verified) continue;
      expect(
        ['replace', 'exclude', 'pending'],
        `${s.source_key}: identity unconfirmed, so it must not be citable`,
      ).toContain(s.qc_status);
    }
  });

  it('marks every decoy as requiring replacement and records why', () => {
    for (const key of DECOYS) {
      const s = source(key);
      expect(s.qc_status, key).toBe('replace');
      expect(s.bibliographic_verified, key).toBe(false);
      expect(s.integrity_notes, key).toMatch(/NOT THE REGISTERED WORK/);
      expect(s.limitations_notes, key).toMatch(/[Cc]annot support/);
    }
  });

  it('distinguishes a partial copy of the right work from a decoy', () => {
    for (const key of PARTIAL) {
      const s = source(key);
      expect(s.qc_status, key).toBe('replace');
      // The work is identified even though the copy is unusable — which is what
      // makes the replacement task actionable.
      expect(s.bibliographic_verified, key).toBe(true);
      expect(s.integrity_notes, key).not.toMatch(/NOT THE REGISTERED WORK/);
    }
  });

  it('records the confirmed identity of SRC-011 rather than the filename’s claim', () => {
    const s = source('SRC-011');
    expect(s.authors).toEqual(['Gregg B. Fields (ed.)']);
    expect(s.publisher).toBe('Humana Press');
    expect(s.publication_name).toMatch(/Methods in Molecular Biology/);
    expect(s.year).toBe(2007);
    expect(s.isbn).toBe('978-1-58829-550-7');
    // Identity settled; the copy is still unusable.
    expect(s.qc_status).toBe('replace');
    expect(s.integrity_notes).toMatch(/Mant/);
  });

  it('confirms the analytical source the quality section depends on', () => {
    // SRC-006 is the one complete, clean analytical reference held. If its QC
    // status ever changes, the quality section loses its spine and the claims
    // resting on it are withdrawn automatically.
    const s = source('SRC-006');
    expect(s.qc_status).toBe('usable');
    expect(s.bibliographic_verified).toBe(true);
    expect(s.authors).toEqual(['Gregory A. Grant (ed.)']);
    expect(s.publisher).toBe('Oxford University Press');
    expect(s.year).toBe(2002);
    expect(s.isbn).toBe('0-19-513261-0');
    expect(s.page_count).toBeGreaterThan(390);
  });

  it('leaves no source claiming its full text may be published', () => {
    for (const s of seedData.sourceManifest.sources) {
      expect(s.public_fulltext_allowed, s.source_key).toBe(false);
    }
  });

  it('still binds every recorded filename to a file on disk', async () => {
    const inventory = await buildSourceInventory();
    const missing = inventory.entries
      .filter((e) => e.state === 'missing')
      .map((e) => e.sourceKey);
    expect(missing).toEqual([]);
  });

  it('keeps V-014 open while replacements are outstanding', () => {
    const outstanding = seedData.sourceManifest.sources.filter(
      (s) => s.qc_status === 'replace',
    ).length;
    expect(outstanding, 'expected the audit to have found replacements needed').toBeGreaterThan(0);

    const issue = seedData.verificationIssues.find((i) => i.issueKey === 'V-014');
    expect(issue, 'V-014 must remain in the queue while any source needs replacing').toBeDefined();
  });
});
