import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  UNDERSTANDING_PEPTIDES_CHAPTERS,
  VOLUMES,
} from '@/domain/publications/volumes';

/**
 * The web description of the publications must not drift from the publications.
 *
 * `/learn/publications` tells a reader which chapters of the patient volume are
 * written and which are still briefs. That is a claim about the product, and
 * the cheapest way for it to become false is for someone to write a chapter and
 * forget this list. So the list is checked against the volume itself.
 */
describe('the publication family described on the web', () => {
  const book = readFileSync('src/publishing/books/understanding-peptides.tsx', 'utf8');

  /** Chapter titles in the order the volume declares them, with their written state. */
  function chaptersInBook(): { title: string; written: boolean }[] {
    const start = book.indexOf('const CHAPTERS: readonly ChapterPlan[] = [');
    const end = book.indexOf('\n];', start);
    const block = book.slice(start, end);
    return [...block.matchAll(/\{\s*\n\s*number: '([^']+)',\s*\n\s*title: '([^']+)',([\s\S]*?)\n {2}\}/g)].map(
      (match) => ({
        title: (match[2] ?? '').replace(/\\'/g, "'"),
        written: /\n\s*written: '/.test(match[3] ?? ''),
      }),
    );
  }

  it('lists the same chapters, in the same order, as the volume itself', () => {
    const actual = chaptersInBook();
    expect(actual.length).toBeGreaterThan(0);
    expect(UNDERSTANDING_PEPTIDES_CHAPTERS.map((c) => c.title)).toEqual(actual.map((c) => c.title));
  });

  it('agrees with the volume about which chapters are written', () => {
    const actual = new Map(chaptersInBook().map((c) => [c.title, c.written]));
    for (const chapter of UNDERSTANDING_PEPTIDES_CHAPTERS) {
      expect(chapter.written, `${chapter.title} written state`).toBe(actual.get(chapter.title));
    }
  });

  it('describes every volume with an audience, what it holds and a status', () => {
    expect(VOLUMES.length).toBe(5);
    for (const volume of VOLUMES) {
      expect(volume.audience.length, volume.key).toBeGreaterThan(0);
      expect(volume.holds.length, volume.key).toBeGreaterThan(0);
      expect(volume.status.length, volume.key).toBeGreaterThan(0);
    }
  });

  it('claims nothing is published, because nothing is', () => {
    for (const volume of VOLUMES) {
      expect(volume.status.toLowerCase(), volume.key).not.toMatch(/\bpublished\b(?!.*not)/);
    }
  });
});
