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

  it('says no human study is recorded here, never that none exists', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const prose = [
      page!.simpleSummary,
      page!.practitionerSummary,
      page!.unknownsSummary,
      ...page!.claims.map((c) => `${c.claimText} ${c.interpretationNotes ?? ''}`),
      ...page!.gaps.map((g) => `${g.statement} ${g.whyNotSupported}`),
    ]
      .filter((t): t is string => typeof t === 'string')
      .join(' ');

    /*
     * The stronger claim would need a literature review this index has not
     * done. A bare substring match is not enough, because the record uses these
     * phrases *negated* — "does not assert that no human evidence exists" is the
     * correct sentence, and a naive check flags it. So each occurrence is
     * checked for a negator in front of it.
     */
    const lower = prose.toLowerCase();
    for (const overclaim of [
      'no human studies exist',
      'no human evidence exists',
      'there are no human studies',
      'has never been studied in humans',
    ]) {
      let from = 0;
      for (;;) {
        const at = lower.indexOf(overclaim, from);
        if (at === -1) break;
        const preceding = lower.slice(Math.max(0, at - 60), at);
        // Allowed two ways: a negator in front of it, or the phrase in quotes.
        // The record contrasts the two wordings explicitly, and a mention is
        // not a use.
        const quoted = /['‘“"]$/.test(prose.slice(Math.max(0, at - 1), at));
        expect(
          quoted || /(not|never|cannot|does not|doesn't|nor)/.test(preceding),
          `asserts "${overclaim}" without a negator: …${prose.slice(Math.max(0, at - 80), at + 60)}…`,
        ).toBe(true);
        from = at + overclaim.length;
      }
    }

    // And the bounded form is present and explicit about being about the register.
    expect(prose).toMatch(/recorded in the reviewed sources|held by this index|held by The Tides Index/i);
    expect(prose).toMatch(/statement about (this|the) register|not about the world|does not assert that no human evidence exists/i);
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

  it('records where the label contradicts the handbook rather than dropping one', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const contradicting = page!.claims.flatMap((c) =>
      c.evidence.filter((e) => e.relationship === 'contradicts'),
    );
    // Jurisdiction, half-life and the adverse-effect list all differ.
    expect(contradicting.length).toBeGreaterThanOrEqual(3);
    for (const evidence of contradicting) {
      expect(evidence.interpretation).toBeTruthy();
    }
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
      expect(row.locator_text).toMatch(/file p\./i);
    }
  });

  it('reports a route without implying it is recommended', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const oral = page!.routes.find((r) => r.routeKey === 'oral');
    expect(oral).toBeDefined();
    expect(oral!.limitationsNotes).toMatch(/not (a statement|establish)|least supported|does not/i);
  });
});
