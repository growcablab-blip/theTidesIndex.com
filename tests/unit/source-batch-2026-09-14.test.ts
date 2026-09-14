import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The 14 September 2026 source batch, held to the rules it was ingested under.
 *
 * Every rule here is one a careless later edit could quietly undo: a USP copy
 * relabelled as official, a transcription promoted to the article, an
 * advertisement becoming citable because the filename says "Lehninger", a
 * substudy counted as another trial, or an arm amount drifting into text a
 * patient receives. Each is asserted against the committed data, not against
 * intent.
 */

interface IntakeRow {
  file: string;
  classification: string;
  disposition: string;
  sourceKey?: string;
  artifact?: {
    artifactKey: string;
    sourceKey: string;
    artifactKind: string;
    disposition: string;
    verification: string;
    distributionProvenance: string | null;
    publicNote: string | null;
  };
}

interface ManifestSource {
  source_key: string;
  qc_status: string;
  access_status: string;
  known_local_filename: string | null;
  limitations_notes: string | null;
  access_notes: string | null;
  bibliographic_verified: boolean;
}

const read = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const intake = read<{ files: IntakeRow[] }>('data/seed/source-artifacts/intake-2026-09-14.json').files;
const manifest = read<{ sources: ManifestSource[] }>('SOURCE_MANIFEST.json').sources;
const source = (key: string): ManifestSource => {
  const found = manifest.find((s) => s.source_key === key);
  if (!found) throw new Error(`${key} missing from manifest`);
  return found;
};
const artifacts = intake.flatMap((row) => (row.artifact ? [row.artifact] : []));

const trials = read<{
  trials: {
    trialKey: string;
    population: string;
    design: string;
    comparator: string | null;
    notes: string | null;
    documents: { sourceKey: string; role: string }[];
    comparisons: { comparisonKey: string; aReports: string; bReports: string; doseSpecific: boolean }[];
  }[];
}>('data/seed/trials/retatrutide-trials.json').trials;

const retatrutide = read<{
  claims: { claimKey: string; claimText: string; plainLanguageText: string | null; uncertaintyText: string }[];
  notYetSupported: { statement: string; why: string; resolution: { state: string } | null }[];
}>('data/seed/evidence/retatrutide.json');

const AMOUNT = /\b\d+(?:\.\d+)?\s?(?:mg|mcg|µg|ug)\b/i;

describe('the 14 September 2026 intake register', () => {
  it('classifies every file it considered and gives each a disposition', () => {
    expect(intake.length).toBeGreaterThanOrEqual(35);
    for (const row of intake) {
      expect(row.classification, row.file).toBeTruthy();
      expect(row.disposition, row.file).toMatch(/^(working_copy|retained_reference|not_retained|rejected)$/);
    }
  });

  it('never labels a USP copy as an official artifact obtained from USP', () => {
    const usp = artifacts.filter((a) => a.sourceKey === 'SRC-022' || a.sourceKey === 'SRC-023');
    expect(usp.length).toBeGreaterThanOrEqual(3);
    for (const a of usp) {
      expect(a.distributionProvenance ?? '', a.artifactKey).toMatch(/not (a copy )?obtained from USP/i);
      expect(a.artifactKind, a.artifactKey).not.toBe('issuer_download');
    }
    for (const key of ['SRC-022', 'SRC-023']) {
      expect(source(key).limitations_notes).toMatch(/DISTRIBUTION PROVENANCE UNVERIFIED/);
      expect(source(key).limitations_notes).toMatch(/must never be described as one/);
    }
  });

  it('keeps the owner transcription a transcription', () => {
    const transcription = artifacts.find((a) => a.artifactKind === 'owner_transcription');
    expect(transcription?.sourceKey).toBe('SRC-029');
    expect(transcription?.verification).toBe('transcription_unverified');
    expect(transcription?.disposition).not.toBe('working_copy');
    expect(source('SRC-029').access_status).toBe('abstract_held');
    expect(source('SRC-029').known_local_filename).toBeNull();
  });

  it('refuses advertisements and mislabelled files as the works they name', () => {
    for (const key of ['ART-SRC120-ADVERT', 'ART-SRC014-ADVERT-2', 'ART-SRC031-MISLABELLED']) {
      const a = artifacts.find((x) => x.artifactKey === key);
      expect(a?.disposition, key).toBe('rejected');
      expect(a?.verification, key).toBe('identity_refuted');
    }
    expect(source('SRC-120').qc_status).toBe('pending');
    expect(source('SRC-120').known_local_filename).toBeNull();
    expect(source('SRC-014').qc_status).toBe('replace');
    expect(source('SRC-013').qc_status).toBe('replace');
    expect(source('SRC-013').limitations_notes).toMatch(/INDEX SOURCE ONLY/);
  });

  it('holds at most one working copy per source, and only a verified one', () => {
    const working = artifacts.filter((a) => a.disposition === 'working_copy');
    const keys = working.map((a) => a.sourceKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const a of working) {
      expect(['matched_to_issuer', 'title_page_verified'], a.artifactKey).toContain(a.verification);
    }
  });

  it('records the translated Rang and Dale sample as partial, and the English edition as still needed', () => {
    expect(source('SRC-121').qc_status).toBe('incomplete');
    expect(source('SRC-121').limitations_notes).toMatch(/PARTIAL AND TRANSLATED/);
    expect(source('SRC-122').qc_status).toBe('pending');
    expect(source('SRC-122').access_status).not.toBe('held');
  });
});

describe('sources not held, and what answers their questions instead', () => {
  interface Packet {
    locations: { key: string; sourceKey: string; pageStart?: number | null }[];
    claims: { claimKey: string; claimText: string; plainLanguageText: string | null; uncertaintyText: string }[];
  }
  const formulation = read<Packet>('data/seed/evidence/formulation-excipients.json');
  const routes = read<Packet>('data/seed/learning/peptides-as-medicines.json');

  it('records each unobtainable book as SOURCE NOT HELD, never as replaced by another work', () => {
    for (const key of ['SRC-014', 'SRC-120', 'SRC-122']) {
      expect(source(key).limitations_notes, key).toMatch(/SOURCE NOT HELD/);
      expect(source(key).limitations_notes, key).toMatch(/none is presented as this source/);
      // SRC-014 still names the rejected advertisement it was first registered
      // with; what matters is that nothing can cite it.
      expect(source(key).qc_status, key).not.toBe('usable');
      expect(source(key).access_status, key).not.toBe('held');
    }
    const third = artifacts.find((a) => a.artifactKey === 'ART-SRC014-ADVERT-3');
    expect(third?.disposition).toBe('rejected');
    expect(third?.verification).toBe('identity_refuted');
  });

  it('registers no OpenStax textbook: their pages forbid AI ingestion without permission (D-26)', () => {
    const records = read<{ sources: Record<string, unknown>[] }>('SOURCE_MANIFEST.json').sources;
    for (const s of records) {
      const fields = [s.title, s.publisher, s.canonical_url]
        .map((v) => (typeof v === 'string' ? v : ''))
        .join(' ');
      expect(fields, String(s.source_key)).not.toMatch(/openstax/i);
    }
  });

  it('rests the answers only on usable sources, never on the missing books or the off-topic review', () => {
    for (const packet of [formulation, routes]) {
      for (const loc of packet.locations) {
        expect(['SRC-014', 'SRC-120', 'SRC-122', 'SRC-144'], loc.key).not.toContain(loc.sourceKey);
        expect(source(loc.sourceKey).qc_status, loc.key).toBe('usable');
      }
    }
    // The ICH guidelines are PDFs held in full, so every locator carries a page.
    for (const loc of formulation.locations.filter((l) => ['SRC-147', 'SRC-148'].includes(l.sourceKey))) {
      expect(loc.pageStart, loc.key).toBeGreaterThan(0);
    }
  });

  it('keeps amounts out of every claim field simple mode receives, and gives each a plain version', () => {
    for (const packet of [formulation, routes]) {
      for (const claim of packet.claims) {
        for (const text of [claim.claimText, claim.plainLanguageText ?? '', claim.uncertaintyText]) {
          expect(text, claim.claimKey).not.toMatch(AMOUNT);
        }
        expect(claim.plainLanguageText, claim.claimKey).toBeTruthy();
      }
    }
  });
});

describe('Understanding Peptides chapter five', () => {
  it('names only receptor claims that exist in the learning-topic packet', () => {
    const chapter = readFileSync('src/publishing/books/understanding-peptides.tsx', 'utf8');
    const block = /CHAPTER_FIVE_CLAIMS = \[([\s\S]*?)\] as const/.exec(chapter)?.[1] ?? '';
    const named = [...block.matchAll(/'(RECEPT-\d{3})'/g)].map((m) => m[1]);
    expect(named.length).toBeGreaterThan(0);
    const packet = read<{ claims: { claimKey: string }[] }>(
      'data/seed/learning/pharmacology-receptors.json',
    );
    const keys = new Set(packet.claims.map((c) => c.claimKey));
    for (const key of named) expect(keys.has(key ?? ''), key).toBe(true);
  });
});

describe('retatrutide trials', () => {
  it('counts trials by registration, never by publication', () => {
    const ids = trials.map((t) => t.trialKey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(trials).toHaveLength(5);
    // The MASLD substudy and the post hoc analysis are documents of trials.
    const substudy = trials.flatMap((t) => t.documents).filter((d) => d.sourceKey === 'SRC-051');
    expect(substudy.map((d) => d.role)).toEqual(['substudy_publication']);
  });

  it('keeps arm amounts out of every trial field that simple mode receives', () => {
    for (const t of trials) {
      for (const text of [t.population, t.design, t.comparator ?? '', t.notes ?? '']) {
        expect(text, t.trialKey).not.toMatch(AMOUNT);
      }
      for (const c of t.comparisons) {
        if (AMOUNT.test(c.aReports) || AMOUNT.test(c.bReports)) {
          expect(c.doseSpecific, c.comparisonKey).toBe(true);
        }
      }
    }
  });

  it('keeps arm amounts out of claim text, plain language and uncertainty', () => {
    for (const claim of retatrutide.claims) {
      expect(claim.claimText, claim.claimKey).not.toMatch(AMOUNT);
      expect(claim.plainLanguageText ?? '', claim.claimKey).not.toMatch(AMOUNT);
      expect(claim.uncertaintyText, claim.claimKey).not.toMatch(AMOUNT);
    }
  });

  it('records what happened to every earlier gap instead of deleting it', () => {
    const earlier = retatrutide.notYetSupported.slice(0, 8);
    for (const gap of earlier) expect(gap.resolution?.state, gap.statement).toBeTruthy();
    expect(retatrutide.notYetSupported.some((g) => /FULL TEXT NOT HELD/.test(JSON.stringify(g)))).toBe(true);
  });
});
