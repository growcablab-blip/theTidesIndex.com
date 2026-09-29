/**
 * Ranking a record's prose for reading.
 *
 * The property that matters is losslessness. This function exists only to
 * decide which sentence the eye lands on first; if it can drop, add or reorder
 * a word it has stopped being typography and become editing, which nothing on
 * a public record is allowed to do without a reviewer.
 */
import { describe, expect, it } from 'vitest';
import { rankProse, splitSentences } from '@/domain/presentation/prose';

/** Claim texts as the BPC-157 record actually holds them. */
const EVIDENCE_QUALITY =
  'None of the three identified human studies had a control group, a randomisation procedure or blinding; all three were conducted at private clinics and published in the same journal, and two of the three were retrospective chart reviews. In at least two, what was administered is not established by the report: in one the material came from a 503A compounding pharmacy the authors do not name, with no certificate of analysis or identity or purity testing reported, and another gave a second peptide to part of the cohort. The interstitial cystitis report states no ethics committee approval for the study it reports.';

const PHARMACOKINETICS =
  'In rats and beagle dogs given BPC-157 intravenously or by intramuscular injection, intact peptide peaked in plasma within minutes, was eliminated with a half-life under 30 minutes, and could not be detected 4 hours after dosing. Absolute bioavailability after intramuscular injection was reported as about 14–19% in rats and 45–51% in dogs. In rats, radiolabelled peptide was broken down into smaller peptide fragments and amino acids, with urine the main route of excretion. Oral and subcutaneous administration were not studied.';

const SYSTEMATIC_REVIEW =
  'A systematic review written from an orthopaedic sports-medicine perspective (Vasireddi et al., HSS Journal, 2025), searching PubMed, Cochrane and Embase to 3 June 2024 with two reviewers, identified 544 records and included 36 studies: 35 preclinical and 1 clinical. It reports preclinical improvements in muscle, tendon, ligament and bone injury models, describes the included studies as level IV and level V evidence, and states that it found no clinical safety data.';

describe('splitSentences', () => {
  it.each([
    ['evidence quality', EVIDENCE_QUALITY],
    ['pharmacokinetics', PHARMACOKINETICS],
    ['systematic review', SYSTEMATIC_REVIEW],
  ])('loses nothing from the %s record', (_label, text) => {
    expect(splitSentences(text).join('')).toBe(text);
  });

  it('finds the sentence boundaries in a real record', () => {
    expect(splitSentences(PHARMACOKINETICS)).toHaveLength(4);
  });

  it('does not split inside a decimal or a range', () => {
    const text = 'Bioavailability was 14–19% in rats. A half-life of 0.5 hours was reported.';
    expect(splitSentences(text)).toHaveLength(2);
  });

  it('does not split after an abbreviation', () => {
    // "et al." ends in a stop and is followed by a capital, which is exactly
    // the shape of a sentence boundary. It is not one, so the text stays whole.
    const text = 'Reported by Vasireddi et al. The review included 36 studies.';
    expect(splitSentences(text)).toEqual([text]);
  });

  it('does not split between initials', () => {
    expect(splitSentences('Reported by J. F. Tremblay in 2019.')).toHaveLength(1);
  });

  it('keeps a run of terminators with its sentence', () => {
    expect(splitSentences('Was it replicated?! Nothing held says so.')).toEqual([
      'Was it replicated?! ',
      'Nothing held says so.',
    ]);
  });

  it('returns a text with no boundary unchanged, as one piece', () => {
    expect(splitSentences('No source states a duration')).toEqual(['No source states a duration']);
  });

  it('returns nothing for an empty string', () => {
    expect(splitSentences('')).toEqual([]);
  });
});

describe('rankProse', () => {
  it('leads with the finding and keeps the remainder', () => {
    const { lead, rest } = rankProse(PHARMACOKINETICS);
    expect(lead.startsWith('In rats and beagle dogs')).toBe(true);
    expect(lead.endsWith('4 hours after dosing.')).toBe(true);
    expect(rest.length).toBeGreaterThan(0);
  });

  it('never drops or reorders a word', () => {
    for (const text of [EVIDENCE_QUALITY, PHARMACOKINETICS, SYSTEMATIC_REVIEW]) {
      const { lead, rest } = rankProse(text);
      const words = [lead, ...rest].join(' ').split(/\s+/).filter(Boolean);
      expect(words).toEqual(text.split(/\s+/).filter(Boolean));
    }
  });

  it('leaves a short statement whole rather than breaking it up', () => {
    const short = 'No approved product containing BPC-157 exists in any jurisdiction.';
    expect(rankProse(short)).toEqual({ lead: short, rest: [] });
  });

  it('leaves a long single sentence whole', () => {
    const long = `${'A single unbroken clause about the evidence, '.repeat(8)}and nothing more.`;
    const { lead, rest } = rankProse(long);
    expect(rest).toEqual([]);
    expect(lead).toBe(long);
  });
});
