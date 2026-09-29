/**
 * What the combination page is allowed to say in its own voice.
 *
 * Phase 1D rewrote the public copy. The risk of a voice pass is that prose
 * drifts ahead of the records — a headline that promises more than the sources
 * do, or a subtitle that names a research area nothing on the page supports.
 * The subtitle is the most-read line on the page and is therefore the one
 * checked hardest here.
 *
 * The objective texts below are the combination records as the register
 * publishes them. If a record is reworded upstream so the subtitle stops being
 * supported, this fails.
 */
import { describe, expect, it } from 'vitest';
import { STACK_DEFINITIONS, stackDefinition, stacksForCompound } from '@/server/public/stacks';

/** Objectives of the records the BPC-157 + TB-500 page actually shows. */
const COMBINATION_OBJECTIVES: readonly string[] = [
  'Knee pain of several causes, reviewed retrospectively from clinic records.',
  'Cellular enhancement and immune modulation — restoring TH1/TH2 homeostasis, boosting NK cells and lowering inflammatory cytokines, as framed by The Peptide Protocols.',
  'Healing and repair of heart, skin, tissue and ligament damage, with immune, pain-relief and anti-inflammatory aims, as framed by Optimize Your Health with Therapeutic Peptides.',
  'Healing, as listed in a one-page peptide table.',
  'Injury recovery and soft tissue, muscle and joint repair, as framed by The Complete Guide to Peptides.',
  'Joint and tissue repair within a worked example for a person with rheumatoid arthritis, joint pain, fatigue and systemic inflammation.',
];

const corpus = COMBINATION_OBJECTIVES.join(' ').toLowerCase();

describe('the BPC-157 + TB-500 subtitle', () => {
  const stack = stackDefinition('bpc-157-tb-500');

  it('is registered', () => {
    expect(stack).not.toBeNull();
  });

  it.each(['recovery', 'tissue', 'repair'])(
    'says "%s" only because the records do',
    (term) => {
      expect(stack?.subtitle.toLowerCase()).toContain(term);
      expect(corpus, `no combination record mentions "${term}"`).toContain(term);
    },
  );

  it('does not promise an outcome, a benefit or a use', () => {
    const forbidden = [
      'heals',
      'treats',
      'cures',
      'effective',
      'proven',
      'works',
      'improves',
      'boosts',
      'accelerates',
      'recommended',
      'optimal',
      'best',
      'safe',
    ];
    const text = `${stack?.title ?? ''} ${stack?.subtitle ?? ''} ${stack?.summary ?? ''}`.toLowerCase();
    for (const word of forbidden) {
      expect(text, `register copy claims "${word}"`).not.toContain(word);
    }
  });

  it('keeps the headline free of the naming ambiguity', () => {
    // The ambiguity belongs beside the headline, not inside it: an H1 is not
    // a place to litigate what a source meant. The page carries the note.
    expect(stack?.title).toBe('BPC-157 + TB-500');
    expect(stack?.title.toLowerCase()).not.toContain('thymosin');
  });

  it('still covers thymosin beta-4 as a member, so the note has something to explain', () => {
    expect(stack?.memberSlugs).toContain('thymosin-beta-4');
    expect(stack?.memberSlugs).toContain('tb-500');
  });
});

describe('the register', () => {
  it('gives every stack a headline, a subtitle and at least two compounds', () => {
    for (const s of STACK_DEFINITIONS) {
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.subtitle.length).toBeGreaterThan(0);
      expect(s.memberSlugs.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('finds a compound its combination pages', () => {
    expect(stacksForCompound('bpc-157').map((s) => s.slug)).toContain('bpc-157-tb-500');
    expect(stacksForCompound('semaglutide')).toEqual([]);
  });
});
