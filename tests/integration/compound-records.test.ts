import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readPeptidePagePreview } from '@/server/public/queries';
import { DOSING_FIELD_NAMES, assertPatientSafe } from '@/domain/presentation/reading-mode';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * The two real compound records.
 *
 * Tesamorelin and BPC-157 were extracted together because they fail in opposite
 * directions. Tesamorelin has an approved product, named Phase III trials and a
 * regulatory position — the risk there is *inflation*: reporting a trial result
 * as though this index had read the trial, or letting an approval for one
 * indication read as evidence for another. BPC-157 has no approved product, no
 * human study in anything held here, and three sources giving three different
 * regimens — the risk there is *volume reading as weight*, and a dose reaching
 * someone who should not be given one.
 *
 * These assert the separations that keep both honest.
 */

describe('the compound evidence records', () => {
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

  // --- Patient mode carries no amount --------------------------------------

  it('shows no dose anywhere in a patient payload, for either compound', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'simple');
      expect(page, slug).not.toBeNull();

      // Identifiers are not content; a UUID containing '250' is not a dose.
      const payload = JSON.stringify(page).replaceAll(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
        '',
      );

      for (const amount of ['250 mcg', '500 mcg', '300-600', '300-500', '1-2 mg', '2 mg']) {
        expect(payload, `${slug} patient payload contains ${amount}`).not.toContain(amount);
      }
      // And the structural check: no dosing field may exist on any protocol.
      for (const protocol of page!.protocols) {
        for (const field of DOSING_FIELD_NAMES) {
          expect(
            Object.prototype.hasOwnProperty.call(protocol, field),
            `${slug}: patient protocol carries ${field}`,
          ).toBe(false);
        }
      }
      assertPatientSafe(page!.protocols);
    }
  });

  it('suppresses the text of a disagreement position in patient mode', async () => {
    /*
     * The leak this exists for. A disagreement about a dose states the doses in
     * its positions — "gives 250 mcg twice a day" — and the positions were
     * being read in both modes. The protocol path had been suppressed since the
     * beginning; this one had nothing to leak until a compound with dose-level
     * disagreements existed.
     */
    const simple = await readPeptidePagePreview(db, 'bpc-157', 'simple');
    const practitioner = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');

    const simplePositions = simple!.disagreements.flatMap((d) => d.positions);
    const practitionerPositions = practitioner!.disagreements.flatMap((d) => d.positions);

    expect(simplePositions.length).toBeGreaterThan(0);
    expect(simplePositions.length).toBe(practitionerPositions.length);

    // A patient still learns that sources disagree, how many, and what kind.
    for (const position of simplePositions) {
      expect(position.positionText).toBeNull();
      expect(position.citation.sourceTitle.length).toBeGreaterThan(0);
    }
    for (const position of practitionerPositions) {
      expect(position.positionText).not.toBeNull();
    }
  });

  // --- Evidence classes stay apart -----------------------------------------

  it('holds BPC-157 human evidence that is uncontrolled, and never presents it otherwise', async () => {
    /*
     * This assertion used to be `expect(classes).not.toContain('human')`, with a
     * note saying that if a human class ever appeared it would be because a
     * human source had been added and the test should be updated deliberately.
     * That is what happened. A PubMed screen identified three primary human
     * studies, and the record now carries them.
     *
     * What replaces the old assertion is the thing that actually needs
     * guarding. "There are human studies" and "there is human evidence for this
     * use" are different statements, and the distance between them is every
     * one of these studies being uncontrolled. A page that listed the human
     * evidence without that would be worse than the page that said there was
     * none.
     */
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const human = page!.claims.flatMap((c) =>
      c.evidence.filter((e) => e.evidenceClass === 'human'),
    );
    expect(human.length).toBeGreaterThan(0);

    // None of it may be recorded as controlled or randomised evidence.
    for (const evidence of human) {
      expect(
        ['human_rct', 'human_controlled_nonrandomized'],
        `BPC-157 carries ${evidence.evidenceTypeKey} as human evidence`,
      ).not.toContain(evidence.evidenceTypeKey);
    }

    // And the limitation is stated on the record, not left to a reader.
    const quality = page!.claims.find((c) => c.claimCategory === 'evidence-quality');
    expect(quality, 'no claim states what the human studies cannot establish').toBeDefined();
    expect(quality!.claimText).toMatch(/control|randomi|blind/i);

    const text = `${page!.simpleSummary ?? ''} ${page!.unknownsSummary ?? ''}`;
    expect(text).toMatch(/comparison group|uncontrolled|no control/i);
  });

  it('keeps tesamorelin’s human evidence scoped to the population it was found in', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const trialClaim = page!.claims.find((c) => c.claimText.includes('Phase III'));
    expect(trialClaim).toBeDefined();

    // The scope claim exists as its own record rather than as a caveat, because
    // the inference from "reduces visceral fat in HIV lipodystrophy" to
    // "reduces visceral fat" is the likeliest misreading on the record.
    const scopeClaim = page!.claims.find((c) => c.claimText.includes('confined to a specific'));
    expect(scopeClaim).toBeDefined();
    expect(trialClaim!.uncertaintyText).toMatch(/not been opened|primary/i);
  });

  // --- Protocols are attributed, never merged -------------------------------

  it('keeps every reported regimen separate and attributed', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    expect(page!.protocols.length).toBeGreaterThanOrEqual(4);

    for (const protocol of page!.protocols) {
      // A regimen with no source is a recommendation, and this index makes none.
      expect(protocol.sources.length).toBeGreaterThan(0);
      expect(protocol.regulatoryContext).toBeTruthy();
    }

    // Three sources, and no row that merges them.
    const sourceTitles = new Set(
      page!.protocols.flatMap((p) => p.sources.map((s) => s.sourceTitle)),
    );
    expect(sourceTitles.size).toBeGreaterThanOrEqual(3);
  });

  it('records the regimens as differing rather than resolving them', async () => {
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from disagreements d
         join peptides p on p.id = d.peptide_id
        where p.peptide_key = 'bpc-157'`,
    );
    expect(Number(row!.n)).toBeGreaterThanOrEqual(2);

    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');
    const doseDisagreement = page!.disagreements.find((d) => d.topic.includes('How much'));
    expect(doseDisagreement).toBeDefined();
    expect(doseDisagreement!.positions.length).toBeGreaterThanOrEqual(3);
    expect(doseDisagreement!.resolutionRequirement).toBeTruthy();
  });

  // --- The two compounds do not share a regulatory framing ------------------

  it('gives the two compounds different regulatory framings', async () => {
    const tesa = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const bpc = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');

    expect(tesa!.regulatoryStatuses.map((r) => r.status)).toContain('approved');
    expect(bpc!.regulatoryStatuses.map((r) => r.status)).not.toContain('approved');

    // And both say where the statement came from and when it was checked.
    for (const entry of [...tesa!.regulatoryStatuses, ...bpc!.regulatoryStatuses]) {
      expect(entry.checkedAt).toBeTruthy();
      expect(entry.notes).toBeTruthy();
    }
  });

  // --- A route reported is not a route recommended --------------------------

  it('records every route with its evidence type and its limitations', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'practitioner');
      expect(page!.routes.length, slug).toBeGreaterThan(0);
      for (const route of page!.routes) {
        expect(route.limitationsNotes, `${slug}/${route.routeKey}`).toBeTruthy();
        expect(route.evidenceTypeLabel).toBeTruthy();
        expect(route.citation.sourceTitle.length).toBeGreaterThan(0);
      }
    }
  });

  // --- Every claim keeps its provenance -------------------------------------

  it('resolves every compound claim to an exact location in a citable source', async () => {
    const [row] = await query<{ total: number; located: number }>(
      db,
      `select count(*)::int as total,
              count(*) filter (where ce.source_location_id is not null)::int as located
         from claim_evidence ce
         join claims c on c.id = ce.claim_id
         join peptides p on p.id = c.peptide_id
        where p.peptide_key in ('tesamorelin', 'bpc-157')`,
    );
    expect(Number(row!.total)).toBeGreaterThan(0);
    expect(Number(row!.located)).toBe(Number(row!.total));
  });

  it('records what the sources do not settle, for both', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const page = await readPeptidePagePreview(db, slug, 'practitioner');
      expect(page!.gaps.length, slug).toBeGreaterThanOrEqual(5);
      for (const gap of page!.gaps) {
        expect(gap.statement).toBeTruthy();
        expect(gap.whyNotSupported).toBeTruthy();
      }
    }
  });

  // --- Neither is published -------------------------------------------------

  it('publishes neither', async () => {
    const rows = await query<{ peptide_key: string; publication_state: string }>(
      db,
      `select peptide_key, publication_state from peptides
        where peptide_key in ('tesamorelin', 'bpc-157')`,
    );
    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row.publication_state, row.peptide_key).toBe('unpublished');
    }
  });
});
