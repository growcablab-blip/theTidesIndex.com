import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { seedDatabase } from '@db/seed';
import { readPeptidePagePreview, type PractitionerProtocol } from '@/server/public/queries';
import { ProtocolComparison } from '@/components/public/protocol-comparison';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Peptide experience v2.
 *
 * Two additions to the record changed what has to be guarded. A regulatory
 * label now sits beside a practitioner handbook and disagrees with it, and a
 * comparison table now places five regimens side by side.
 *
 * The first creates a way to lose a distinction: a primary source and a
 * practitioner source have to stay separately attributed, or "the label says"
 * and "a handbook says" collapse into "it says". The second creates a way to
 * imply a recommendation: any ranking, any highlighted column, any consensus
 * row would be this index picking a dose.
 */

describe('peptide experience', () => {
  let db: TestDb;

  beforeAll(async () => {
    db = await createTestDb();
  });

  afterAll(async () => {
    await closeTestDb(db);
  });

  beforeEach(async () => {
    await truncateContent(db);
    await seedDatabase(db);
  });

  // --- Absence is bounded to this register ---------------------------------

  it('ties every statement about human evidence to the search that produced it', async () => {
    /*
     * This assertion has now been rewritten twice, and the history is the
     * point.
     *
     * First it required the record to say "no human study is recorded here"
     * rather than "none exists" — the right correction of an overclaim, and
     * still a statement about a library rather than about the literature.
     * Then the screen was run, and the answer came back the other way: three
     * primary human studies, in 230 records.
     *
     * So what has to hold now is stronger than either. Any statement the record
     * makes about human evidence must be bounded to a search somebody can
     * repeat — its database, its date, its criteria — and the record may never
     * assert that nothing exists anywhere, because PubMed is not the world.
     */
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const prose = [
      page!.simpleSummary,
      page!.practitionerSummary,
      page!.unknownsSummary,
      ...page!.claims.map((c) => `${c.claimText} ${c.interpretationNotes ?? ''} ${c.uncertaintyText ?? ''}`),
      ...page!.gaps.map((g) => `${g.statement} ${g.whyNotSupported}`),
    ]
      .filter((t): t is string => typeof t === 'string')
      .join(' ');

    // Nothing may claim an absence in the world.
    const lower = prose.toLowerCase();
    for (const overclaim of [
      'no human studies exist',
      'no human evidence exists',
      'there are no human studies',
      'has never been studied in humans',
      'no human research exists',
    ]) {
      let from = 0;
      for (;;) {
        const at = lower.indexOf(overclaim, from);
        if (at === -1) break;
        const preceding = lower.slice(Math.max(0, at - 60), at);
        // Allowed two ways: a negator in front of it, or the phrase in quotes,
        // because the record discusses these wordings as wordings.
        const quoted = /['‘“"]$/.test(prose.slice(Math.max(0, at - 1), at));
        expect(
          quoted || /(not|never|cannot|does not|doesn't|nor)/.test(preceding),
          `asserts "${overclaim}" without a negator: …${prose.slice(Math.max(0, at - 80), at + 60)}…`,
        ).toBe(true);
        from = at + overclaim.length;
      }
    }

    // And the screen it is bounded to is on the record, with everything needed
    // to run it again.
    const screen = page!.literatureScreens[0];
    expect(screen, 'no literature screen is recorded for BPC-157').toBeDefined();
    expect(screen!.databaseName).toMatch(/pubmed/i);
    expect(screen!.searchDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(screen!.queryText.length).toBeGreaterThan(10);
    expect(screen!.inclusionCriteria.length).toBeGreaterThan(40);
    expect(screen!.humanPrimaryCriteria.length).toBeGreaterThan(40);
    expect(screen!.deduplicationNotes.length).toBeGreaterThan(40);

    // The prose names the date, so a reader is not left to find it elsewhere.
    expect(prose).toContain(screen!.searchDate.slice(0, 4));
    expect(prose).toMatch(/pubmed/i);
  });

  it('never lets a result count become a count of evidence', async () => {
    /*
     * The specific failure this guards: "228 records" reading as weight. The
     * two numbers must stay far apart and must never be the same number.
     */
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const screen = page!.literatureScreens[0]!;

    expect(screen.resultCount).toBeGreaterThan(screen.includedCount);
    expect(screen.includedCount).toBeGreaterThan(screen.humanPrimaryCount);

    // Every classified record is in the ledger, so the counts cannot be
    // asserted independently of the rows they are counted from.
    const total = screen.typeCounts.reduce((n, t) => n + t.count, 0);
    expect(total).toBe(screen.resultCount);

    // And the record's own prose never presents the result count as studies.
    const prose = `${page!.simpleSummary ?? ''} ${page!.practitionerSummary ?? ''}`;
    const count = String(screen.resultCount);
    let from = 0;
    for (;;) {
      const at = prose.indexOf(count, from);
      if (at === -1) break;
      const following = prose.slice(at, at + 90).toLowerCase();
      expect(
        /records?/.test(following),
        `"${count}" is used without the word "records": …${prose.slice(at, at + 90)}…`,
      ).toBe(true);
      from = at + count.length;
    }
  });

  // --- Primary and practitioner sources stay distinct -----------------------

  it('keeps the regulatory label and the practitioner handbook separately attributed', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const keys = new Set(
      page!.claims.flatMap((c) => c.evidence.map((e) => e.citation.sourceKey)),
    );
    expect(keys.has('SRC-002')).toBe(true);
    expect(keys.has('SRC-027')).toBe(true);

    // A claim that cites both must not present them as one voice: the label is
    // approved-label evidence, the handbook is a practitioner reference.
    const mixed = page!.claims.filter((c) => {
      const s = new Set(c.evidence.map((e) => e.citation.sourceKey));
      return s.has('SRC-002') && s.has('SRC-027');
    });
    expect(mixed.length).toBeGreaterThan(0);
    for (const claim of mixed) {
      const classes = new Set(claim.evidence.map((e) => e.evidenceTypeLabel));
      expect(classes.size).toBeGreaterThan(1);
    }
  });

  it('records where sources differ rather than dropping one of them', async () => {
    /*
     * This assertion used to require at least three `contradicts` relationships
     * on the tesamorelin record, and it now requires none.
     *
     * That is the finding, not a weakened test. Four of the five differences
     * between the FDA labelling and the practitioner handbook turned out not to
     * be contradictions at all — they were different products, different
     * chemical forms, a frequency threshold, and a regulatory document being
     * more specific. The fifth was this index misreading the handbook. What has
     * to be guaranteed is that every difference is still *on the record* with
     * both sides attributed, which is what a disagreement row is for.
     */
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    expect(page!.disagreements.length).toBeGreaterThanOrEqual(5);

    for (const disagreement of page!.disagreements) {
      expect(disagreement.positions.length, disagreement.topic).toBeGreaterThanOrEqual(2);
      const sources = new Set(disagreement.positions.map((p) => p.citation.sourceKey));
      // A disagreement whose sides come from one source is legitimate — the
      // dose one does — but every side must still be separately located.
      for (const position of disagreement.positions) {
        expect(position.citation.sourceKey, disagreement.topic).toBeTruthy();
      }
      expect(sources.size, disagreement.topic).toBeGreaterThanOrEqual(1);
    }

    // And every difference that is still open says so, rather than being
    // quietly closed by the arrival of an authoritative source.
    const open = page!.disagreements.filter((d) => d.resolution === 'unresolved');
    expect(open.length).toBeGreaterThan(0);
  });

  it('requires authoritative provenance for an approved regulatory status', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const approved = page!.regulatoryStatuses.filter((r) => r.status === 'approved');
    expect(approved.length).toBeGreaterThan(0);

    for (const entry of approved) {
      // An approval recorded from a practitioner handbook is the failure this
      // guards: the authority, the jurisdiction and the date must all be real.
      expect(entry.authority).toMatch(/Food and Drug Administration|Medicines|Agency|EMA/i);
      expect(entry.jurisdiction).not.toMatch(/not established/i);
      expect(entry.checkedAt).toBeTruthy();
      expect(entry.citation?.sourceKey).toBe('SRC-027');
    }
  });

  it('does not record an approval for a compound with no regulatory source', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    for (const entry of page!.regulatoryStatuses) {
      expect(entry.status).not.toBe('approved');
      expect(entry.notes).toBeTruthy();
    }
  });

  // --- The comparison implies nothing --------------------------------------

  it('renders a comparison that ranks nothing and recommends nothing', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const protocols = page!.protocols as readonly PractitionerProtocol[];
    expect(protocols.length).toBeGreaterThanOrEqual(4);

    const html = renderToStaticMarkup(
      createElement(ProtocolComparison, { protocols, compoundName: 'BPC-157' }),
    );

    expect(html).toContain('No column is recommended');
    expect(html).toContain('Differs between sources');
    for (const forbidden of ['Recommended', 'Best', 'Preferred', 'Consensus', 'Typical dose']) {
      expect(html, `comparison implies ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('labels every regimen with the kind of evidence it rests on', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const protocols = page!.protocols as readonly PractitionerProtocol[];
    const html = renderToStaticMarkup(
      createElement(ProtocolComparison, { protocols, compoundName: 'BPC-157' }),
    );
    // A clinic must not read "reported by a handbook" as "validated in a trial".
    expect(html).toContain('Practitioner handbook');
    expect(html).not.toContain('Human trial regimen');
  });

  it('shows missing fields as missing, never as inferred from a neighbour', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const protocols = page!.protocols as readonly PractitionerProtocol[];
    const html = renderToStaticMarkup(
      createElement(ProtocolComparison, { protocols, compoundName: 'BPC-157' }),
    );
    expect(html).toContain('Not stated by this source');
  });

  it('never merges two sources into one regimen', async () => {
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from (
         select ps.protocol_id from protocol_sources ps
          group by ps.protocol_id having count(distinct ps.source_id) > 1
       ) merged`,
    );
    expect(Number(row!.n)).toBe(0);
  });

  // --- Patient mode, again, now that more can leak --------------------------

  it('keeps every dose, concentration and regimen detail out of patient mode', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'simple');
      const payload = JSON.stringify(page).replaceAll(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
        '',
      );

      for (const amount of [
        '250 mcg',
        '500 mcg',
        '300-600',
        '1-2 mg',
        '2 mg/mL',
        '1.4 mg',
        '0.35 mL',
        '2.1 mL',
      ]) {
        expect(payload, `${slug} patient payload contains ${amount}`).not.toContain(amount);
      }
      for (const position of page!.disagreements.flatMap((d) => d.positions)) {
        expect(position.positionText, slug).toBeNull();
      }
      for (const route of page!.routes) {
        expect(route.formulation, `${slug}/${route.routeKey}`).toBeNull();
        expect(route.pkNotes, `${slug}/${route.routeKey}`).toBeNull();
      }
    }
  });

  it('still tells a patient that protocol records exist', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'simple');
    expect(page!.protocolCountAll).toBeGreaterThan(0);
  });

  // --- Gaps and locators ----------------------------------------------------

  it('renders recorded gaps on both compound records', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'practitioner');
      expect(page!.gaps.length, slug).toBeGreaterThanOrEqual(5);
    }
  });

  it('preserves whether a locator is a printed page or a file page', async () => {
    const rows = await query<{ locator_text: string; page_start: number | null }>(
      db,
      `select locator_text, page_start from source_locations
        where location_key like 'hacksmith%'`,
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      // No printed page is claimed where none was verified, and the locator
      // says which kind of page it is rather than leaving a reader to guess.
      expect(row.page_start).toBeNull();
      // A single file page or a range of them; either way it says which kind.
      expect(row.locator_text).toMatch(/file pp?\./i);
    }
  });

  it('reports a route without implying it is recommended', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const oral = page!.routes.find((r) => r.routeKey === 'oral');
    expect(oral).toBeDefined();
    expect(oral!.limitationsNotes).toMatch(/not (a statement|establish)|least supported|does not/i);
  });
});
