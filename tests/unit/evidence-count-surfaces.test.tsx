import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import { RecordOpening } from '@/components/public/record-opening';
import { EvidenceAtAGlance } from '@/components/public/evidence-at-a-glance';
import { ClaimsByEvidenceClass, EvidenceSnapshot } from '@/components/public/evidence';
import { mixedClaims, peptidePage } from '../support/peptide-page-fixture';

/**
 * Owner brief: a reader counts studies, records and sources — not the index's
 * internal statements. No evidence-at-a-glance surface may use "statement(s)"
 * as its count noun, and every one uses the same noun for the same count.
 *
 * Fixture: human 2, preclinical 1, reference 3 evidence records; statements
 * 2 / 1 / 1 — so a surface still counting statements prints a different number.
 */

const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const COUNTED_STATEMENTS = /\d+\s+statements?\b/i;
const root = (path: string) => fileURLToPath(new URL(`../../${path}`, import.meta.url));

describe('evidence counts a reader sees', () => {
  it('the compound opening counts evidence records, in both reading depths', () => {
    for (const simple of [false, true]) {
      const out = text(renderToStaticMarkup(<RecordOpening peptide={peptidePage()} simple={simple} />));
      expect(out).toContain('2 human evidence records');
      expect(out).toContain('1 preclinical evidence record');
      expect(out).toContain('3 reference and practice sources');
      expect(out).not.toMatch(COUNTED_STATEMENTS);
      expect(out).toMatch(/not statements|not sentences/);
    }
  });

  it('the practitioner at-a-glance panel uses the same nouns, and a screen counts publications', () => {
    const plain = text(renderToStaticMarkup(<EvidenceAtAGlance peptide={peptidePage()} simple={false} />));
    expect(plain).toContain('2 human evidence records');
    expect(plain).toContain('1 preclinical evidence record');
    expect(plain).not.toMatch(COUNTED_STATEMENTS);

    const screened = peptidePage({
      literatureScreens: [
        {
          id: 'scr',
          screenKey: 'SCR',
          databaseName: 'PubMed placeholder',
          queryText: 'q',
          searchDate: '2026-01-01',
          resultCount: 40,
          screenedCount: 40,
          stratum: null,
          deduplicationNotes: '',
          inclusionCriteria: '',
          humanPrimaryCriteria: '',
          includedCount: 30,
          humanPrimaryCount: 4,
          typeCounts: [],
          humanRecords: [],
        },
      ],
    });
    const withScreen = text(renderToStaticMarkup(<EvidenceAtAGlance peptide={screened} simple={false} />));
    expect(withScreen).toContain('2 human evidence records');
    expect(withScreen).toContain('4 primary human publications');
    expect(withScreen).not.toMatch(/records in people|\d+ studies identified/);
  });

  it('an empty record says none, never a count of statements', () => {
    const empty = peptidePage({ claims: [] });
    const opening = text(renderToStaticMarkup(<RecordOpening peptide={empty} simple={false} />));
    expect(opening).toContain('none recorded');
    expect(opening).toContain('No human evidence record is held here');
    const glance = text(renderToStaticMarkup(<EvidenceAtAGlance peptide={empty} simple={false} />));
    expect(glance).toContain('None held');
  });

  it('the overview snapshot labels its numbers with the evidence-record nouns', () => {
    const out = text(renderToStaticMarkup(<EvidenceSnapshot claims={mixedClaims()} />));
    expect(out).toMatch(/Human evidence records 2/);
    expect(out).toMatch(/Preclinical evidence records 1/);
    expect(out).toMatch(/Reference and practice sources 3/);
  });

  it('statement counts appear only in the evidence section, labelled, and only at practitioner depth', () => {
    const practitioner = text(renderToStaticMarkup(<ClaimsByEvidenceClass claims={mixedClaims()} simple={false} />));
    expect(practitioner).toContain('How evidence is counted');
    expect(practitioner).toContain('2 statements');
    const simple = text(renderToStaticMarkup(<ClaimsByEvidenceClass claims={mixedClaims()} simple />));
    expect(simple).toContain('How evidence is counted');
    expect(simple).not.toMatch(COUNTED_STATEMENTS);
  });

  it('printed glance surfaces count through the same module and never print statements as the count', () => {
    const guide = readFileSync(root('src/publishing/books/reference-guide.tsx'), 'utf8');
    expect(guide).toContain("from '@/domain/evidence/evidence-counts'");
    const band = guide.slice(guide.indexOf('function OpeningBand'), guide.indexOf('// Monograph'));
    expect(band.length).toBeGreaterThan(0);
    expect(band).toContain('countEvidenceRecords(peptide.claims)');
    expect(band).not.toMatch(/statement/i);
    // The book no longer carries its own copy of the lane rule.
    expect(guide).not.toMatch(/claim\.evidence\.some\(\(e\) => e\.isHumanEvidence\)/);

    const sheet = readFileSync(root('src/publishing/reference-sheet.tsx'), 'utf8');
    expect(sheet).toContain("from '@/domain/evidence/evidence-counts'");
    expect(sheet).not.toMatch(/statements rest on/);
  });
});
