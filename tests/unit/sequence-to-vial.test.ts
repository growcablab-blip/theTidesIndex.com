import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SEQUENCE_TO_VIAL_STAGES,
  SEQUENCE_TO_VIAL_TOPICS,
  referencedClaimKeys,
} from '@/domain/quality/sequence-to-vial';

interface Packet {
  qualityKey: string;
  locations: { key: string; sourceKey: string }[];
  claims: { claimKey: string; plainLanguageText: string | null; evidence: { locationKey: string }[] }[];
}

const packets: Packet[] = SEQUENCE_TO_VIAL_TOPICS.map(
  (key) => JSON.parse(readFileSync(`data/seed/evidence/${key}.json`, 'utf8')) as Packet,
);
const claims = new Map(packets.flatMap((p) => p.claims.map((c) => [c.claimKey, { claim: c, packet: p }] as const)));
const manifest = JSON.parse(readFileSync('SOURCE_MANIFEST.json', 'utf8')) as {
  sources: { source_key: string; qc_status: string }[];
};

describe('From sequence to final vial', () => {
  it('references only claims that exist in its packets', () => {
    const missing = referencedClaimKeys().filter((key) => !claims.has(key));
    expect(missing).toEqual([]);
  });

  it('gives every referenced claim a plain-language version for simple mode', () => {
    const without = referencedClaimKeys().filter((key) => claims.get(key)?.claim.plainLanguageText == null);
    expect(without).toEqual([]);
  });

  it('marks every stage without claims with a stated reason rather than leaving it blank', () => {
    for (const stage of SEQUENCE_TO_VIAL_STAGES) {
      if (stage.claimKeys.length === 0) expect(stage.missing, stage.key).toBeTruthy();
    }
  });

  it('keeps the unsourced stages unsourced — nothing here describes the finished vial', () => {
    const unsourced = SEQUENCE_TO_VIAL_STAGES.filter((s) => s.claimKeys.length === 0).map((s) => s.key);
    expect(unsourced).toEqual(['formulation', 'fill-finish', 'lyophilisation', 'release']);
  });

  it('cites no source the registry marks for replacement', () => {
    const replace = new Set(manifest.sources.filter((s) => s.qc_status !== 'usable').map((s) => s.source_key));
    for (const packet of packets) {
      for (const location of packet.locations) {
        expect(replace.has(location.sourceKey), `${packet.qualityKey}:${location.key}`).toBe(false);
      }
    }
  });

  it('resolves every evidence link to a location in the same packet', () => {
    for (const packet of packets) {
      const keys = new Set(packet.locations.map((l) => l.key));
      for (const claim of packet.claims) {
        for (const evidence of claim.evidence) {
          expect(keys.has(evidence.locationKey), `${claim.claimKey}:${evidence.locationKey}`).toBe(true);
        }
      }
    }
  });
});
