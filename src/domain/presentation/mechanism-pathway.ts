/**
 * The mechanism diagram's nodes, and the rule that keeps them honest.
 *
 * A pathway drawn as boxes and arrows is the most persuasive thing a reference
 * like this can put on a page, and therefore the most dangerous. Two failures
 * are easy and both are fatal: drawing a step no source reports, and drawing a
 * preclinical step so confidently that it reads as established in people.
 *
 * Three rules answer that.
 *
 * 1. **Every node is a verbatim phrase from a held claim.** Not a paraphrase
 *    and not a summary — a substring. `tests/unit/mechanism-pathway.test.ts`
 *    asserts it against the claim texts themselves, so a record edited out from
 *    under this file fails the suite rather than leaving a label behind that
 *    nothing supports.
 * 2. **Every node carries the claim it came from**, and the component renders
 *    that key, so a reader can follow any box back to a record and a source.
 * 3. **A node whose claim is not on the page does not render.** The diagram
 *    cannot outlive its evidence: unpublish the claim and the box disappears.
 *
 * What remains authored is the *arrangement* — which phrase belongs to which
 * stage. That is presentation, it is the reason this file is scoped to one
 * compound rather than generalised, and it does not extend to the other
 * twenty-seven records.
 */

/** Stages, in the order a reader follows them. */
export const PATHWAY_STAGES = [
  {
    key: 'signal',
    label: 'What is reported to act',
    detail: 'Receptor and signalling changes the sources report.',
  },
  {
    key: 'molecular',
    label: 'Molecular response',
    detail: 'Mediators and transcripts reported to change.',
  },
  {
    key: 'cellular',
    label: 'Cellular response',
    detail: 'What the cells are reported to do next.',
  },
  {
    key: 'observed',
    label: 'Observed in the model',
    detail: 'What was measured in the animal or the culture.',
  },
] as const;

export type PathwayStageKey = (typeof PATHWAY_STAGES)[number]['key'];

export interface PathwayNode {
  readonly stage: PathwayStageKey;
  /** A verbatim phrase from the cited claim. Never a paraphrase. */
  readonly phrase: string;
  readonly claimKey: string;
}

/**
 * BPC-157's pathway, as the four held mechanism and effect records describe it.
 *
 * BPC-004 preclinical-mechanism · BPC-013 mechanism (rat tendon fibroblasts)
 * BPC-003 preclinical-effect    · BPC-012 preclinical-effect (rat model)
 */
export const BPC157_PATHWAY: readonly PathwayNode[] = [
  { stage: 'signal', phrase: 'increased growth hormone receptor expression', claimKey: 'BPC-013' },
  { stage: 'signal', phrase: 'stimulate nitric oxide production', claimKey: 'BPC-004' },

  { stage: 'molecular', phrase: 'the angiogenic cytokines VEGF, FGF and TGF-β', claimKey: 'BPC-004' },
  { stage: 'molecular', phrase: 'JAK2 phosphorylation', claimKey: 'BPC-013' },
  { stage: 'molecular', phrase: 'higher eNOS mRNA and lower COX-2 mRNA', claimKey: 'BPC-012' },

  { stage: 'cellular', phrase: 'fibroblast recruitment', claimKey: 'BPC-003' },
  { stage: 'cellular', phrase: 'the number of viable cells, PCNA expression', claimKey: 'BPC-013' },
  { stage: 'cellular', phrase: 'collagen formation', claimKey: 'BPC-003' },

  { stage: 'observed', phrase: 'improve collagen organisation and vascularity', claimKey: 'BPC-012' },
  { stage: 'observed', phrase: 'improved tissue granulation', claimKey: 'BPC-003' },
  {
    stage: 'observed',
    phrase: 'increase blood vessel formation where needed and decrease it where not',
    claimKey: 'BPC-004',
  },
];

/** The pathways this module holds, by compound slug. One, deliberately. */
const PATHWAYS: Readonly<Record<string, readonly PathwayNode[]>> = {
  'bpc-157': BPC157_PATHWAY,
};

export interface ResolvedNode extends PathwayNode {
  /** The claim's own evidence lane, so a node can never outrank its record. */
  readonly evidenceClass: string | null;
}

export interface ResolvedStage {
  readonly key: PathwayStageKey;
  readonly label: string;
  readonly detail: string;
  readonly nodes: readonly ResolvedNode[];
}

export interface ClaimLike {
  readonly claimKey: string;
  readonly claimText: string;
  readonly evidence: readonly { readonly evidenceClass: string }[];
}

/**
 * Resolve a compound's pathway against the claims actually on the page.
 *
 * A node survives only if its claim is present *and* still contains its
 * phrase. Both checks matter: the first drops a node when a record is
 * unpublished, the second when a record is reworded. Either way the diagram
 * shrinks rather than lying.
 */
export function resolvePathway(
  slug: string,
  claims: readonly ClaimLike[],
): readonly ResolvedStage[] {
  const nodes = PATHWAYS[slug];
  if (nodes === undefined) return [];

  const byKey = new Map(claims.map((c) => [c.claimKey, c]));

  return PATHWAY_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    detail: stage.detail,
    nodes: nodes
      .filter((n) => n.stage === stage.key)
      .flatMap((n) => {
        const claim = byKey.get(n.claimKey);
        if (claim === undefined) return [];
        if (!claim.claimText.includes(n.phrase)) return [];
        const classes = [...new Set(claim.evidence.map((e) => e.evidenceClass))];
        return [{ ...n, evidenceClass: classes[0] ?? null }];
      }),
  })).filter((stage) => stage.nodes.length > 0);
}

/** Whether any held record behind the diagram describes people. */
export function pathwayHasHumanEvidence(stages: readonly ResolvedStage[]): boolean {
  return stages.some((s) => s.nodes.some((n) => n.evidenceClass === 'human'));
}
