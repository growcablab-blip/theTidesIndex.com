/**
 * The mechanism diagram's provenance guarantee.
 *
 * A pathway drawn as boxes and arrows is the most persuasive object this
 * reference can render, so the binding between a box and a record has to be
 * checked rather than trusted. These tests hold the claim texts as the BPC-157
 * record publishes them and assert that every node is a verbatim phrase from
 * the claim it names — and that a node disappears when its record does.
 *
 * If a claim is reworded upstream, this suite fails. That is the point: the
 * alternative is a diagram that keeps asserting something no record says.
 */
import { describe, expect, it } from 'vitest';
import {
  BPC157_PATHWAY,
  PATHWAY_STAGES,
  pathwayHasHumanEvidence,
  resolvePathway,
  type ClaimLike,
} from '@/domain/presentation/mechanism-pathway';

/** The four records the diagram is built from, verbatim. */
const CLAIMS: ClaimLike[] = [
  {
    claimKey: 'BPC-004',
    claimText:
      'The sources describe BPC-157 as angiomodulatory rather than simply pro-angiogenic: reported to increase blood vessel formation where needed and decrease it where not, including in tumour metastasis, and to stimulate nitric oxide production and the angiogenic cytokines VEGF, FGF and TGF-β.',
    evidence: [{ evidenceClass: 'preclinical' }],
  },
  {
    claimKey: 'BPC-013',
    claimText:
      'In fibroblasts cultured from rat Achilles tendon, BPC-157 increased growth hormone receptor expression at both mRNA and protein level, rising with concentration and with time over three days. When growth hormone was added to cells pretreated with BPC-157, the number of viable cells, PCNA expression and JAK2 phosphorylation increased.',
    evidence: [{ evidenceClass: 'preclinical' }],
  },
  {
    claimKey: 'BPC-003',
    claimText:
      'The healing effects reported in laboratory studies include accelerated wound and tissue healing across tendon, ligament, bone, muscle, skin and gastric mucosa, with reported mechanisms including improved tissue granulation, fibroblast recruitment and collagen formation.',
    evidence: [{ evidenceClass: 'reference_opinion' }],
  },
  {
    claimKey: 'BPC-012',
    claimText:
      'In male rats with a surgically created quadriceps myotendinous-junction defect, which the authors report does not heal on its own, BPC-157 given by intraperitoneal injection or in drinking water was reported to abolish the leg contracture seen in every control animal, to improve walking and motor-function indices, to shrink the defect and prevent muscle atrophy, and to improve collagen organisation and vascularity at the junction over 42 days, with lower oxidative-stress and nitric-oxide levels, higher eNOS mRNA and lower COX-2 mRNA in the tissue than in controls.',
    evidence: [{ evidenceClass: 'preclinical' }],
  },
];

describe('the BPC-157 pathway definition', () => {
  it.each(BPC157_PATHWAY.map((n) => [n.claimKey, n.phrase] as const))(
    '%s contains the phrase "%s" verbatim',
    (claimKey, phrase) => {
      const claim = CLAIMS.find((c) => c.claimKey === claimKey);
      expect(claim, `no held claim ${claimKey}`).toBeDefined();
      expect(claim?.claimText).toContain(phrase);
    },
  );

  it('names only claims the record actually publishes', () => {
    const known = new Set(CLAIMS.map((c) => c.claimKey));
    for (const node of BPC157_PATHWAY) expect(known).toContain(node.claimKey);
  });

  it('places every node in a declared stage', () => {
    const stages = new Set(PATHWAY_STAGES.map((s) => s.key));
    for (const node of BPC157_PATHWAY) expect(stages).toContain(node.stage);
  });
});

describe('resolvePathway', () => {
  it('builds the stages in reading order', () => {
    const stages = resolvePathway('bpc-157', CLAIMS);
    expect(stages.map((s) => s.key)).toEqual(['signal', 'molecular', 'cellular', 'observed']);
    expect(stages.flatMap((s) => s.nodes)).toHaveLength(BPC157_PATHWAY.length);
  });

  it('drops a node whose claim is no longer published', () => {
    const without013 = CLAIMS.filter((c) => c.claimKey !== 'BPC-013');
    const stages = resolvePathway('bpc-157', without013);
    const keys = stages.flatMap((s) => s.nodes.map((n) => n.claimKey));
    expect(keys).not.toContain('BPC-013');
    expect(keys.length).toBeGreaterThan(0);
  });

  it('drops a node whose claim no longer contains its phrase', () => {
    const reworded = CLAIMS.map((c) =>
      c.claimKey === 'BPC-004' ? { ...c, claimText: 'Something else entirely.' } : c,
    );
    const stages = resolvePathway('bpc-157', reworded);
    expect(stages.flatMap((s) => s.nodes.map((n) => n.claimKey))).not.toContain('BPC-004');
  });

  it('drops a stage that loses all of its nodes', () => {
    // Every 'signal' node comes from BPC-013 or BPC-004.
    const remaining = CLAIMS.filter((c) => !['BPC-013', 'BPC-004'].includes(c.claimKey));
    const stages = resolvePathway('bpc-157', remaining);
    expect(stages.map((s) => s.key)).not.toContain('signal');
  });

  it('returns nothing for a compound with no pathway', () => {
    expect(resolvePathway('tb-500', CLAIMS)).toEqual([]);
  });

  it('carries each node its own claim evidence lane', () => {
    const stages = resolvePathway('bpc-157', CLAIMS);
    const node = stages.flatMap((s) => s.nodes).find((n) => n.claimKey === 'BPC-003');
    expect(node?.evidenceClass).toBe('reference_opinion');
  });

  it('reports that no step rests on human evidence', () => {
    // The whole diagram is animal and cell work; the section says so, and this
    // is the check that keeps that statement true.
    expect(pathwayHasHumanEvidence(resolvePathway('bpc-157', CLAIMS))).toBe(false);
  });
});
