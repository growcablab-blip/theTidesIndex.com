import { readdirSync, readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ILLUSTRATIONS } from '@/components/illustrations';
import { LEARNING_JOURNEY } from '@/domain/learn/journey';

/**
 * The three editorial states, and the drawings, held to their rules.
 *
 * A Tides synthesis is the one kind of statement on the site that no single
 * source makes, which is exactly why it needs the tightest rules: it must name
 * at least two real claims, carry no numbers, add no dose or verdict, rest on
 * no claim that sources contradict, and show its working. The illustration
 * system has the same obligation in pictures: an accessible name, a basis made
 * of claims that exist, and no values drawn into it.
 */

interface Packet {
  topic?: { slug: string; topicKey: string };
  claims: { claimKey: string; evidence: { relationship?: string }[] }[];
}

const read = <T,>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const learning = readdirSync('data/seed/learning')
  .filter((f) => f.endsWith('.json'))
  .map((f) => read<Packet>(`data/seed/learning/${f}`));
const evidencePackets = readdirSync('data/seed/evidence')
  .filter((f) => f.endsWith('.json'))
  .map((f) => read<Packet>(`data/seed/evidence/${f}`));

const allClaims = new Map(
  [...learning, ...evidencePackets].flatMap((p) => p.claims.map((c) => [c.claimKey, c] as const)),
);
const topicKeys = new Set(learning.map((p) => p.topic?.topicKey).filter((k): k is string => k !== undefined));
const topicSlugs = new Set(learning.map((p) => p.topic?.slug).filter((k): k is string => k !== undefined));

interface Synthesis {
  synthesisKey: string;
  subject: { kind: string; key: string };
  claimKeys: string[];
  statement: string;
  plainLanguageText: string;
  reasoning: string;
  doesNotConclude: string;
}
const syntheses = read<Synthesis[]>('data/seed/syntheses/foundations.json');

describe('Tides syntheses', () => {
  it('each rests on at least two claims that exist', () => {
    expect(syntheses.length).toBeGreaterThan(0);
    for (const s of syntheses) {
      expect(s.claimKeys.length, s.synthesisKey).toBeGreaterThanOrEqual(2);
      for (const key of s.claimKeys) expect(allClaims.has(key), `${s.synthesisKey}: ${key}`).toBe(true);
    }
  });

  it('never invents a number', () => {
    for (const s of syntheses) {
      expect(s.statement, s.synthesisKey).not.toMatch(/[0-9]/);
      expect(s.plainLanguageText, s.synthesisKey).not.toMatch(/[0-9]/);
    }
  });

  it('adds no dose, recommendation or verdict of its own', () => {
    const forbidden = /\b(dose|doses|dosing|recommend\w*|should (take|use|try)|safe|unsafe|effective|efficacious|cures?)\b/i;
    for (const s of syntheses) {
      expect(s.statement, s.synthesisKey).not.toMatch(forbidden);
      expect(s.plainLanguageText, s.synthesisKey).not.toMatch(forbidden);
    }
  });

  it('never rests on a claim that carries contradicting evidence', () => {
    for (const s of syntheses) {
      for (const key of s.claimKeys) {
        const contradicted = allClaims.get(key)?.evidence.some((e) => e.relationship === 'contradicts');
        expect(contradicted, `${s.synthesisKey}: ${key}`).toBe(false);
      }
    }
  });

  it('shows its working: the reasoning names every claim it rests on, and a limit is stated', () => {
    for (const s of syntheses) {
      for (const key of s.claimKeys) expect(s.reasoning, `${s.synthesisKey}: ${key}`).toContain(key);
      expect(s.doesNotConclude.length, s.synthesisKey).toBeGreaterThan(20);
    }
  });

  it('attaches to a learning topic that exists', () => {
    for (const s of syntheses) {
      expect(s.subject.kind, s.synthesisKey).toBe('learning');
      expect(topicKeys.has(s.subject.key), s.synthesisKey).toBe(true);
    }
  });
});

describe('the illustration system', () => {
  for (const [key, Drawing] of Object.entries(ILLUSTRATIONS)) {
    describe(key, () => {
      const html = renderToStaticMarkup(<Drawing />);

      it('is one accessible image with a title and a description', () => {
        expect(html).toMatch(/<svg[^>]*role="img"/);
        expect(html).toMatch(/<title id="[^"]+-title">[^<]+<\/title>/);
        expect(html).toMatch(/<desc id="[^"]+-desc">[^<]+<\/desc>/);
      });

      it('states its basis, and every claim it names exists', () => {
        expect(html).toMatch(/Drawn from|How this index works/);
        const drawnFrom = /claims? <span class="tabular">([^<]+)<\/span>/.exec(html)?.[1];
        if (drawnFrom !== undefined) {
          for (const claimKey of drawnFrom.split(',').map((k) => k.trim())) {
            expect(allClaims.has(claimKey), `${key}: ${claimKey}`).toBe(true);
          }
        }
      });

      it('draws no values: no digit appears in any label', () => {
        const labels = [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
          .map((m) =>
            (m[1] ?? '')
              .replace(/<[^>]+>/g, '')
              .replace(/&#x?[0-9a-f]+;|&[a-z]+;/gi, ' '),
          )
          .join(' ');
        expect(labels).not.toMatch(/[0-9]/);
      });
    });
  }
});

describe('the learning journey', () => {
  it('has seven steps, each with somewhere to start', () => {
    expect(LEARNING_JOURNEY).toHaveLength(7);
    for (const step of LEARNING_JOURNEY) expect(step.start.href.startsWith('/')).toBe(true);
  });

  it('links only to learning topics that exist', () => {
    for (const step of LEARNING_JOURNEY) {
      for (const link of [step.start, ...step.more]) {
        if (!link.href.startsWith('/learn/')) continue;
        expect(topicSlugs.has(link.href.slice('/learn/'.length)), link.href).toBe(true);
      }
    }
  });
});
