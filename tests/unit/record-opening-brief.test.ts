import { describe, expect, it } from 'vitest';
import { restAfterFirstParagraph, summaryAfterBrief } from '@/components/public/record-opening';

/**
 * The opening brief and the overview beneath it must read as one text: every
 * word of the summary appears exactly once across the two, in order.
 */
describe('the compound opening brief', () => {
  const practitioner =
    'First sentence about the record. Second sentence with a half-life of 5.8 days in one study. Third sentence continues. Fourth.\n\nA later paragraph.';

  it('continues a practitioner summary from where a two-sentence brief stops', () => {
    expect(summaryAfterBrief(practitioner, false)).toBe('Third sentence continues. Fourth.\n\nA later paragraph.');
  });

  it('never splits a sentence at a decimal point', () => {
    const rest = summaryAfterBrief(practitioner, false) ?? '';
    expect(rest.startsWith('8 days')).toBe(false);
    expect(rest).not.toContain('5.8');
  });

  it('continues a simple summary at the next paragraph', () => {
    expect(summaryAfterBrief('Plain opening. More plain words. And more.\n\nNext.', true)).toBe('Next.');
  });

  it('shows nothing more when the brief was the whole summary', () => {
    expect(summaryAfterBrief('One. Two.', false)).toBeNull();
    expect(restAfterFirstParagraph('Only one paragraph.')).toBeNull();
    expect(summaryAfterBrief(null, false)).toBeNull();
  });
});
