import { describe, expect, it } from 'vitest';
import { seedData } from '@db/seed/seed-data';
import { findDoses } from '@/domain/presentation/dose-text';

/**
 * Rules the compound library has to keep as it grows.
 *
 * The Section 4 expansion took the library from twelve compounds to twenty-one,
 * mostly from one practitioner handbook, and every one of these tests exists
 * because the expansion made the corresponding mistake easy — or, in one case,
 * because it actually made it.
 *
 * They run against the seed data rather than the database, so a bad packet fails
 * before it is ever seeded.
 */

const peptides = seedData.peptides;
const packets = seedData.compoundPackets;
const evidenceTypes = new Map(seedData.evidenceTypes.map((t) => [t.key, t]));
const compoundTypes = new Map(seedData.compoundTypes.map((t) => [t.key, t]));

describe('compound identity', () => {
  it('has no duplicate key, slug or canonical name', () => {
    for (const field of ['peptideKey', 'slug', 'canonicalName'] as const) {
      const seen = new Map<string, string>();
      for (const p of peptides) {
        const value = p[field].toLowerCase();
        expect(seen.has(value), `${field} "${p[field]}" is used twice`).toBe(false);
        seen.set(value, p.peptideKey);
      }
    }
  });

  /**
   * An alias may name another compound — "Modified GRF (1-29)" is an alias of
   * CJC-1295 — but only when its type says the two are not the same thing.
   * A plain `synonym` pointing at another record's canonical name would merge
   * two scientific identities by implication.
   */
  it('never claims another compound as a synonym', () => {
    const canonical = new Map(peptides.map((p) => [p.canonicalName.toLowerCase(), p.peptideKey]));
    const separating = new Set(['related_but_distinct', 'common_misnomer', 'brand_name']);

    for (const p of peptides) {
      for (const alias of p.aliases ?? []) {
        const collides = canonical.get(alias.alias.toLowerCase());
        if (collides === undefined || collides === p.peptideKey) continue;
        expect(
          separating.has(alias.aliasType),
          `${p.peptideKey} lists "${alias.alias}" — the canonical name of ${collides} — as ${alias.aliasType}`,
        ).toBe(true);
      }
    }
  });

  it('gives every compound a type that exists, and never calls a small molecule a peptide', () => {
    for (const p of peptides) {
      const type = compoundTypes.get(p.compoundTypeKey);
      expect(type, `${p.peptideKey} has unknown compound type ${p.compoundTypeKey}`).toBeDefined();
      if (type === undefined) continue;
      // The flag is the guarantee. A compound recorded as a small molecule must
      // not carry a peptide type merely because it appears in a peptide index.
      if (type.key === 'small_molecule' || type.key === 'protein') {
        expect(type.isPeptide, `${type.key} must not be flagged as a peptide`).toBe(false);
      }
    }
  });
});

describe('packet provenance', () => {
  it('resolves every protocol to a declared source location', () => {
    for (const packet of packets) {
      const locations = new Set(packet.locations.map((l) => l.key));
      for (const protocol of packet.protocols ?? []) {
        expect(
          locations.has(protocol.locationKey),
          `${packet.packetKey}: protocol ${protocol.protocolKey} cites unknown location ${protocol.locationKey}`,
        ).toBe(true);
      }
    }
  });

  it('resolves every claim evidence link to a declared source location', () => {
    for (const packet of packets) {
      const locations = new Set(packet.locations.map((l) => l.key));
      for (const claim of packet.claims) {
        for (const evidence of claim.evidence) {
          expect(
            locations.has(evidence.locationKey),
            `${packet.packetKey}: claim ${claim.claimKey} cites unknown location ${evidence.locationKey}`,
          ).toBe(true);
        }
      }
    }
  });
});

describe('practitioner evidence stays practitioner evidence', () => {
  /**
   * The rule the expansion exists to test. Nine of the twenty-one records rest
   * mainly on a practitioner handbook, and the handbooks routinely describe
   * trials. A handbook describing a trial is not a trial, and the evidence type
   * is where that distinction is kept.
   */
  it('never classes a practitioner reference as human evidence', () => {
    for (const packet of packets) {
      for (const claim of packet.claims) {
        for (const evidence of claim.evidence) {
          const type = evidenceTypes.get(evidence.evidenceTypeKey);
          expect(type, `${packet.packetKey}: unknown evidence type ${evidence.evidenceTypeKey}`).toBeDefined();
          if (type === undefined) continue;
          if (type.key === 'practitioner_reference' || type.key === 'expert_commentary') {
            expect(
              type.isHumanEvidence,
              `${type.key} must never be human evidence (${packet.packetKey} ${claim.claimKey})`,
            ).toBe(false);
            expect(type.evidenceClass).toBe('reference_opinion');
          }
        }
      }
    }
  });
});

describe('patient payload', () => {
  /**
   * This one is here because the Section 4 tranche broke it.
   *
   * Dose suppression is enforced on the protocol relation, which has no dosing
   * columns in simple mode. A dose written into a claim's text goes round that
   * entirely — claims render in both reading depths — and three records were
   * published with dosing schedules in their claim text before `qa:doses`
   * caught it. The amounts belong on the protocol, where the mode boundary can
   * hold them.
   */
  /*
   * The rule is imported, not written here. It was written here once, and the
   * copy drifted: a Section 4 record recording a molecular weight of
   * "3051.3 g/mol" tripped this test while `npm run qa:doses` passed, because
   * the standing scan knows a molecular weight is not a dose and this file did
   * not. One definition, in `src/domain/presentation/dose-text.ts`.
   */

  it('keeps dose-shaped strings out of claim text', () => {
    for (const packet of packets) {
      for (const claim of packet.claims) {
        expect(
          findDoses(claim.claimText).map((d) => d.context),
          `${packet.packetKey} ${claim.claimKey}: claim text carries a dose — put it on the protocol`,
        ).toEqual([]);
      }
    }
  });

  it('keeps dose-shaped strings out of plain-language claim text', () => {
    for (const packet of packets) {
      for (const claim of packet.claims) {
        if (claim.plainLanguageText === null || claim.plainLanguageText === undefined) continue;
        expect(
          findDoses(claim.plainLanguageText).map((d) => d.context),
          `${packet.packetKey} ${claim.claimKey}: plain-language text carries a dose`,
        ).toEqual([]);
      }
    }
  });

  it('keeps dose-shaped strings out of the simple summary', () => {
    for (const packet of packets) {
      const simple = packet.compound.simpleSummary;
      if (simple === null || simple === undefined) continue;
      expect(
        findDoses(simple).map((d) => d.context),
        `${packet.packetKey}: simple summary carries a dose`,
      ).toEqual([]);
    }
  });
});
