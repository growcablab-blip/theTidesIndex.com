import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { OPEN_QUESTIONS } from '@/publishing/books/understanding-peptides';

/**
 * The patient volume speaks plainly and keeps the record exact.
 *
 * Chapter pages translate evidence states into what we know, what remains
 * uncertain and what would answer it. The back matter prints each open question
 * verbatim, and these tests hold that printed text to the learning packets, and
 * hold the chapter pages free of the internal QA vocabulary.
 */
describe('Understanding Peptides for patients', () => {
  const book = readFileSync('src/publishing/books/understanding-peptides.tsx', 'utf8');

  it('prints every open question exactly as its learning packet records it', () => {
    const recorded = readdirSync('data/seed/learning')
      .filter((f) => f.endsWith('.json'))
      .flatMap((f) => {
        const packet = JSON.parse(readFileSync(`data/seed/learning/${f}`, 'utf8')) as {
          notYetSupported?: { statement: string; whatWouldResolveIt: string }[];
        };
        return packet.notYetSupported ?? [];
      });
    for (const q of OPEN_QUESTIONS) {
      const match = recorded.find((r) => r.statement === q.statement);
      expect(match, q.statement).toBeDefined();
      expect(match?.whatWouldResolveIt).toBe(q.whatWouldResolveIt);
    }
  });

  it('does not print the internal evidence-note vocabulary on chapter pages', () => {
    expect(book).not.toMatch(/<EvidenceNote/);
    expect(book).not.toMatch(/>\s*Source needed\s*</);
    expect(book).not.toMatch(/Extracted; awaiting scientific review"\s*\/>/);
  });

  it('does not print an unwritten chapter as a brief', () => {
    expect(book).not.toMatch(/<ChapterBrief/);
  });
});
