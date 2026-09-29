/**
 * What the rewritten public copy must not do.
 *
 * Phase 1D changed the voice of both prototypes. A voice pass is the easiest
 * place in this project to do real damage: softening a qualifier is a one-word
 * edit that changes what the page asserts. These tests read the component
 * sources and hold the four lines the brief drew — no upgraded evidence, no
 * invented recommendation, no collapsed compound names, no lost attribution.
 *
 * Reading source text is a blunt instrument, and deliberately so: it catches a
 * careless edit in a string literal, which is exactly how this would go wrong.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const read = (p: string): string => readFileSync(join(root, p), 'utf8');

const COMPOUND = read('src/components/public/compound-experience.tsx');
const STACK = read('src/components/public/stack-experience.tsx');
const VISUALS = read('src/components/public/research-visuals.tsx');
const PROSE = [COMPOUND, STACK, VISUALS].join('\n');

describe('the public copy never creates a Tides recommendation', () => {
  it.each([
    'Tides protocol',
    'Tides dose',
    'recommended protocol',
    'recommended dose',
    'typical dose',
    'suggested dose',
    'optimal dose',
    'standard dose',
  ])('does not offer a "%s"', (phrase) => {
    const found = new RegExp(phrase.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i').exec(PROSE);
    // "There is no Tides dose" is the one legitimate use, and it is a denial.
    const isDenial =
      found !== null && /never averages|no Tides dose|there is no/i.test(PROSE.slice(Math.max(0, found.index - 80), found.index + 40));
    expect(found === null || isDenial, `copy offers "${phrase}"`).toBe(true);
  });

  it('still tells the reader that nothing is averaged', () => {
    expect(COMPOUND).toMatch(/never averages them into a single dose/i);
    expect(STACK).toMatch(/does not assemble one/i);
  });
});

describe('the public copy never upgrades evidence', () => {
  it.each([
    'clinically proven',
    'shown to work',
    'is effective',
    'proven to',
    'demonstrates that it works',
    'clinically validated',
  ])('does not claim "%s"', (phrase) => {
    expect(PROSE.toLowerCase(), `copy claims "${phrase}"`).not.toContain(phrase.toLowerCase());
  });

  it('keeps the mechanism diagram labelled as animal and laboratory research', () => {
    expect(VISUALS).toMatch(/every study behind this diagram is animal\s*\n?\s*or laboratory research/i);
    expect(VISUALS).toMatch(/reported next/i);
  });

  it('keeps the evidence lanes describing what each kind can show', () => {
    expect(COMPOUND).toMatch(/the only kind that can show what a compound does in a person/i);
    expect(COMPOUND).toMatch(/not a result in them/i);
    expect(COMPOUND).toMatch(/never a trial/i);
  });

  it('keeps the counts described as counts rather than a grade', () => {
    expect(COMPOUND).toMatch(/they are not a grade/i);
  });
});

describe('the combination page keeps its uncertainty', () => {
  it('never states the two names are the same compound', () => {
    for (const phrase of [
      'TB-500 is thymosin beta-4',
      'TB-500 and thymosin beta-4 are the same',
      'also known as thymosin beta-4',
    ]) {
      expect(STACK.toLowerCase(), `stack copy collapses the names via "${phrase}"`).not.toContain(
        phrase.toLowerCase(),
      );
    }
  });

  it('uses "interchangeable" only to deny it', () => {
    // The word appears once, in the note, negated. Anywhere else it would be
    // the page asserting the very thing it exists to refuse.
    const uses = [...STACK.matchAll(/interchangeable/gi)];
    expect(uses).toHaveLength(1);
    const at = uses[0]?.index ?? 0;
    expect(STACK.slice(Math.max(0, at - 90), at)).toMatch(/rather than assuming the terms are/i);
  });

  it('carries the note that sources do not distinguish them consistently', () => {
    expect(STACK).toMatch(/A note on TB-500/);
    expect(STACK).toMatch(/do not always distinguish TB-500 from thymosin beta-4 consistently/i);
    expect(STACK).toMatch(/rather than assuming the terms are interchangeable/i);
  });

  it('still says which compound was used cannot be determined', () => {
    expect(STACK).toMatch(/cannot be determined from the\s*\n?\s*report/i);
    expect(STACK).toMatch(/Tides does not choose for it/i);
  });

  it('still says no study compares the combination against either compound alone', () => {
    expect(STACK).toMatch(/No study compares the combination against either compound alone/i);
  });
});

describe('attribution survives the rewrite', () => {
  it('heads every reported protocol with its source name', () => {
    expect(VISUALS).toMatch(/sourceName/);
    expect(COMPOUND).toMatch(/sourceName=\{protocolSourceName\(protocol\)\}/);
    expect(STACK).toMatch(/sourceName=\{protocolSourceName\(protocol\)\}/);
  });

  it('keeps the source drawer on protocol and combination cards', () => {
    expect(VISUALS).toMatch(/citations\.length === 0 \? null/);
    expect(STACK).toMatch(/report\.citations\.length === 0 \? null/);
  });

  it('keeps each combination report attributed to the compound it was reported for', () => {
    expect(STACK).toMatch(/Reported for \{report\.memberName\}/);
  });
});
