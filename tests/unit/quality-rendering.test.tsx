import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  ChromatographyFlowFigure,
  QualityDimensionsFigure,
} from '@/components/public/quality-figures';
import {
  EvidenceGapList,
  EvidenceLegend,
  RelatedTopicMap,
} from '@/components/public/quality-evidence';
import {
  EvidenceCutoff,
  PreviewBanner,
  ReviewStatusPanel,
  reviewRung,
} from '@/components/public/record-status';
import type { EvidenceGap, TopicRelationship } from '@/server/public/shapes';
import type { QualityTopicRecordState } from '@/server/public/quality-topic';
import { previewAllowed, previewRefusal } from '@/server/public/preview-gate';

/**
 * What the quality page actually renders (Phase C.4).
 *
 * The evidence architecture underneath is only worth anything if it survives
 * presentation. Four distinctions have to reach the screen intact:
 *
 *   a sourced statement is not a gap;
 *   a gap is not a claim about the world;
 *   a navigational link claims nothing;
 *   and a record nobody has reviewed does not read as a reviewed one.
 *
 * Each is cheap to break with a styling change and expensive to notice, so each
 * is asserted against the rendered markup rather than against intent.
 */

const GAP: EvidenceGap = {
  id: 'gap-1',
  gapType: 'source_missing',
  statement: 'A chromatographic purity result says nothing about whether a preparation is sterile.',
  whyNotSupported: 'No compendial or regulatory source on sterility testing is held at all.',
  whatWouldResolveIt: 'A current compendial sterility chapter.',
  researchQuestion: null,
  opportunityType: null,
  verificationIssueKey: 'V-015',
  resolutionState: 'open',
  resolutionNote: null,
  resolutionCheckedAt: null,
};

function relationship(overrides: Partial<TopicRelationship> = {}): TopicRelationship {
  return {
    id: 'rel-1',
    relationshipType: 'not_addressed_by',
    rationale: 'Sterility is a microbiological question.',
    evidenceStatus: 'evidence_gap',
    claimKey: null,
    gapKey: 'hplc-purity-gap-01',
    toName: 'Sterility',
    toSlug: 'sterility',
    toIsPublished: false,
    ...overrides,
  };
}

function state(overrides: Partial<QualityTopicRecordState> = {}): QualityTopicRecordState {
  return {
    version: 2,
    publishedAt: null,
    lastReviewedAt: null,
    evidenceCutoffAt: null,
    reviewState: 'ready_for_scientific_review',
    needsUpdate: false,
    isPreview: true,
    publicationState: 'unpublished',
    ...overrides,
  };
}

describe('evidence semantics survive rendering', () => {
  it('words a gap as a statement about this index, not a finding about the world', () => {
    const html = renderToStaticMarkup(<EvidenceGapList gaps={[GAP]} />);

    expect(html).toContain('Not established by current sources');
    expect(html).toContain('Why this index does not say it');
    // The phrasing that would turn an absence of evidence into evidence of
    // absence. A gap never claims the test cannot do something.
    expect(html).not.toMatch(/HPLC (cannot|can never|does not)/i);
  });

  it('never gives a gap the styling or wording of a sourced statement', () => {
    const gapHtml = renderToStaticMarkup(
      <RelatedTopicMap relationships={[relationship()]} />,
    );
    const sourcedHtml = renderToStaticMarkup(
      <RelatedTopicMap
        relationships={[
          relationship({
            id: 'rel-2',
            relationshipType: 'commonly_conflated',
            evidenceStatus: 'evidence_backed',
            claimKey: 'HPLC-002',
            gapKey: null,
            toName: 'Identity testing',
            toSlug: 'identity-testing',
          }),
        ]}
      />,
    );

    expect(gapHtml).toContain('Not established by current sources');
    expect(gapHtml).not.toContain('Supported by a named source');

    expect(sourcedHtml).toContain('Supported by a named source');
    expect(sourcedHtml).not.toContain('Not established by current sources');

    // And the two are not distinguished by colour alone: the container classes
    // differ in border style as well as hue, and the label differs in words.
    expect(gapHtml).not.toBe(sourcedHtml);
  });

  it('marks a navigational link as claiming nothing', () => {
    const html = renderToStaticMarkup(
      <RelatedTopicMap
        relationships={[
          relationship({
            relationshipType: 'other_attribute',
            evidenceStatus: 'structural',
            claimKey: null,
            gapKey: null,
            rationale: 'A separate attribute with its own testing.',
            toName: 'Residual solvents',
            toSlug: 'residual-solvents',
          }),
        ]}
      />,
    );

    expect(html).toContain('Navigational link — no evidence claimed');
    expect(html).toContain('border-dashed');
    expect(html).not.toContain('Supported by a named source');
  });

  it('names an unpublished related topic instead of hiding or linking it', () => {
    const html = renderToStaticMarkup(<RelatedTopicMap relationships={[relationship()]} />);

    expect(html).toContain('Sterility');
    expect(html).toContain('Reference page in preparation');
    // No link, because there is nothing to read. The name still appears, so the
    // reader learns the question exists.
    expect(html).not.toContain('href="/quality/sterility"');
  });

  it('links a related topic that is published', () => {
    const html = renderToStaticMarkup(
      <RelatedTopicMap
        relationships={[relationship({ toIsPublished: true, toSlug: 'identity-testing' })]}
      />,
    );
    expect(html).toContain('href="/quality/identity-testing"');
    expect(html).not.toContain('Reference page in preparation');
  });

  it('explains all three treatments in the legend', () => {
    const html = renderToStaticMarkup(<EvidenceLegend />);
    expect(html).toContain('Supported by a named source');
    expect(html).toContain('Not established by current sources');
    expect(html).toContain('Navigational link — no evidence claimed');
    expect(html).toContain('a statement about this library');
  });
});

describe('review state cannot read as stronger than it is', () => {
  it('calls the ready rung "awaiting scientific review" and never "reviewed"', () => {
    const rung = reviewRung('ready_for_scientific_review');

    expect(rung.label).toBe('Awaiting scientific review');
    expect(rung.reviewed).toBe(false);
    expect(rung.label).not.toMatch(/\breviewed\b/i);
    expect(rung.meaning).toMatch(/No scientist has yet read this/i);
  });

  it('treats every unreviewed rung as unreviewed', () => {
    for (const key of [
      'unreviewed',
      'captured',
      'source_checked',
      'primary_source_checked',
      'ready_for_scientific_review',
      'rejected',
    ]) {
      expect(reviewRung(key).reviewed, key).toBe(false);
    }
    for (const key of ['scientific_reviewed', 'clinical_reviewed', 'compliance_reviewed']) {
      expect(reviewRung(key).reviewed, key).toBe(true);
    }
  });

  it('says on the page that no scientist has read it', () => {
    const html = renderToStaticMarkup(<ReviewStatusPanel state={state()} />);

    expect(html).toContain('Awaiting scientific review');
    expect(html).toContain('Not published');
    expect(html).toMatch(/No scientist has yet read this page/);
  });

  it('puts an unmistakable banner above an unpublished preview', () => {
    const html = renderToStaticMarkup(<PreviewBanner state={state()} />);

    expect(html).toContain('Unpublished preview — not live');
    // The banner explains what the gate does and does not require. Since the
    // 2026-09-24 separation it must not claim review is still a precondition.
    expect(html).toContain('exact location in a citable source');
    expect(html).not.toMatch(/refuses publication without a human/i);
    // Not carried by colour: a dashed border and a worded heading survive print
    // and forced-colours mode.
    expect(html).toContain('border-dashed');
  });

  it('shows no banner once a record is genuinely published', () => {
    const html = renderToStaticMarkup(
      <PreviewBanner
        state={state({
          isPreview: false,
          publicationState: 'published',
          reviewState: 'scientific_reviewed',
        })}
      />,
    );
    expect(html).toBe('');
  });

  it('says an evidence cutoff is absent rather than omitting the field', () => {
    const html = renderToStaticMarkup(<EvidenceCutoff value={null} />);
    // Leaving it blank would let "last reviewed" stand in for how current the
    // evidence is, which is a different and much weaker fact.
    expect(html).toMatch(/no literature survey has been carried out/i);
  });
});

describe('the figures', () => {
  const flow = renderToStaticMarkup(<ChromatographyFlowFigure />);
  const dimensions = renderToStaticMarkup(<QualityDimensionsFigure />);

  it('give every figure an accessible name and description', () => {
    for (const [name, html] of [
      ['flow', flow],
      ['dimensions', dimensions],
    ] as const) {
      expect(html, name).toContain('role="img"');
      expect(html, name).toContain('aria-labelledby=');
      expect(html, name).toMatch(/<title id="[^"]+">/);
      expect(html, name).toMatch(/<desc id="[^"]+">/);
    }
  });

  it('draw real text rather than outlines, so the figures scale and can be read', () => {
    expect(flow).toMatch(/<text/);
    expect(dimensions).toMatch(/<text/);
    expect(flow).not.toMatch(/<image/);
    expect(dimensions).not.toMatch(/<image/);
  });

  it('put no numbers in the chromatography figure', () => {
    // An axis scale would imply a precision no source here supports.
    const labels = [...flow.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1] ?? '');
    for (const label of labels) {
      expect(label, `figure label "${label}"`).not.toMatch(/\d/);
    }
  });

  it('states that the quality figure is not a checklist', () => {
    // The misreading it would otherwise invite: that every product is required
    // to be tested for all of these. No source here establishes that.
    expect(dimensions).toMatch(/not a checklist/i);
    expect(dimensions).toMatch(/this index holds no regulatory source/i);
    expect(dimensions).not.toMatch(/required for every|all batches must|✓|✔/);
  });

  it('keeps a wide figure scrollable inside its own container', () => {
    expect(flow).toContain('overflow-x-auto');
    expect(dimensions).toContain('overflow-x-auto');
  });
});

describe('the unpublished preview gate', () => {
  it('is closed in a production build even with the flag set', () => {
    // The condition that matters. A misconfigured deployment must not be one
    // environment variable away from serving unreviewed medical content.
    expect(previewAllowed({ nodeEnv: 'production', flag: '1' })).toBe(false);
    expect(previewRefusal({ nodeEnv: 'production', flag: '1' })).toMatch(/production build/);
  });

  it('is closed in development unless switched on explicitly', () => {
    expect(previewAllowed({ nodeEnv: 'development', flag: undefined })).toBe(false);
    expect(previewAllowed({ nodeEnv: 'development', flag: '0' })).toBe(false);
    expect(previewAllowed({ nodeEnv: 'test', flag: 'true' })).toBe(false);
  });

  it('opens only when both conditions hold', () => {
    expect(previewAllowed({ nodeEnv: 'development', flag: '1' })).toBe(true);
    expect(previewRefusal({ nodeEnv: 'development', flag: '1' })).toBeNull();
  });
});
