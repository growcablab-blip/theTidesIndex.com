import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readPeptidePagePreview } from '@/server/public/queries';
import { sectionHintsFor } from '@/server/search/section-routing';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * An authoritative source is not automatic proof that a secondary source is
 * wrong.
 *
 * The previous sprint traced the FDA labelling for tesamorelin, found five
 * places where it differed from a practitioner handbook, and recorded all five
 * as the label correcting an error. Four were not errors: two products, two
 * chemical forms, a frequency threshold, and a regulatory document being more
 * specific than a clinical one. The fifth was this index misreading the
 * handbook.
 *
 * Every test here guards one of the distinctions that failure destroyed. None
 * of them can be satisfied by prose — each requires the difference to be
 * *represented*, because a note in an interpretation field is exactly what was
 * there before and exactly what did not survive contact with the next editor.
 */

describe('source reconciliation', () => {
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

  // --- Pharmacokinetics are not flattened ----------------------------------

  it('keeps a pharmacokinetic value bound to the product it was measured on', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const halfLives = page!.pharmacokinetics.filter((o) => /half-life/i.test(o.parameter));

    // Four figures are on the record. If that ever collapses to one, something
    // has decided which product tesamorelin "really" is.
    expect(halfLives.length).toBeGreaterThanOrEqual(3);

    const values = new Set(halfLives.map((o) => o.valueText));
    expect(values.size).toBeGreaterThan(1);

    for (const observation of halfLives) {
      expect(observation.population, observation.observationKey).toBeTruthy();
      expect(
        ['single_dose', 'repeat_dose', 'not_stated'],
        observation.observationKey,
      ).toContain(observation.administration);
    }

    // The decisive pair: two FDA labels, same population, same route, different
    // products, different numbers. Neither is the half-life of the molecule.
    const labelled = halfLives.filter((o) => o.evidenceTypeLabel.toLowerCase().includes('label'));
    expect(labelled.length).toBeGreaterThanOrEqual(2);
    expect(new Set(labelled.map((o) => o.productName)).size).toBeGreaterThan(1);
    expect(new Set(labelled.map((o) => o.valueText)).size).toBeGreaterThan(1);
  });

  it('has no single half-life field anywhere on the compound', async () => {
    // The structural version of the assertion above: a column would be a place
    // for the flattening to come back.
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n
         from information_schema.columns
        where table_name = 'peptides'
          and (column_name like '%half_life%' or column_name like '%halflife%')`,
    );
    expect(Number(row!.n)).toBe(0);
  });

  // --- Chemical form -------------------------------------------------------

  it('records two molecular weights as two chemical forms, not as a conflict', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    expect(page!.forms.length).toBeGreaterThanOrEqual(2);

    const weights = page!.forms
      .filter((f) => f.molecularWeight !== null)
      .map((f) => Number(f.molecularWeight));
    expect(weights.length).toBeGreaterThanOrEqual(2);
    expect(new Set(weights).size).toBe(weights.length);

    // The difference is one acetate: 60.052 g/mol. Asserted numerically, because
    // this is the fact that makes "not a contradiction" checkable rather than
    // asserted.
    const spread = Math.max(...weights) - Math.min(...weights);
    expect(Math.abs(spread - 60.052)).toBeLessThan(0.5);

    for (const form of page!.forms) {
      if (form.molecularWeight === null) continue;
      expect(form.weightBasis, form.formKey).toBeTruthy();
    }
  });

  it('refuses a molecular weight with no basis stated', async () => {
    // The constraint is what stops the next form record repeating the mistake.
    await expect(
      query(
        db,
        `insert into compound_forms (form_key, peptide_id, chemical_form, molecular_weight, source_id)
         select 'test-unbased', p.id, 'unspecified', 1234.5, s.id
           from peptides p, sources s
          where p.peptide_key = 'tesamorelin' and s.source_key = 'SRC-002'`,
      ),
    ).rejects.toThrow(/compound_forms_weight_has_basis/i);
  });

  // --- Reporting thresholds ------------------------------------------------

  it('does not treat absence from a frequency table as a finding of absence', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const adverse = page!.disagreements.find((d) =>
      /adverse|side effect/i.test(d.topic),
    );
    expect(adverse, 'the adverse-effect difference is not recorded').toBeDefined();
    expect(adverse!.resolution).toBe('resolved_different_reporting_threshold');
    expect(adverse!.candidateExplanation).toBe('reporting_threshold');

    // And the claim itself says what a threshold means rather than implying a
    // denial: the handbook's rash is in the label's own table below 5%.
    const safety = page!.claims.find((c) => /above 5%|>5%/i.test(c.claimText));
    expect(safety).toBeDefined();
    const prose = `${safety!.interpretationNotes ?? ''} ${safety!.uncertaintyText ?? ''}`;
    expect(prose).toMatch(/not reported at that threshold|threshold|below/i);

    /*
     * "…and not that it does not occur" is the correct sentence and a naive
     * substring check flags it, the same use/mention problem the absence
     * wording hit. Each occurrence is checked for a negator in front of it.
     */
    const lower = prose.toLowerCase();
    const NEGATED = /(?:^|[^a-z])(?:not|never|rather than|nor)[^.]{0,40}$/;
    for (const phrase of ['does not occur', 'proves it does not', 'disproves']) {
      let from = 0;
      for (;;) {
        const at = lower.indexOf(phrase, from);
        if (at === -1) break;
        expect(
          NEGATED.test(lower.slice(Math.max(0, at - 60), at)),
          `asserts "${phrase}" as a finding: …${prose.slice(Math.max(0, at - 80), at + 40)}…`,
        ).toBe(true);
        from = at + phrase.length;
      }
    }
  });

  // --- Resolved is distinguishable from contradicted -----------------------

  it('keeps a resolved difference distinguishable from an open contradiction', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const resolutions = new Map(page!.disagreements.map((d) => [d.resolution, d]));

    // Both states are present on this compound, which is the whole point: if
    // everything were resolved the field would be decorative.
    expect(resolutions.has('unresolved')).toBe(true);
    expect([...resolutions.keys()].filter((r) => r !== 'unresolved').length).toBeGreaterThan(2);

    for (const disagreement of page!.disagreements) {
      if (disagreement.resolution === 'unresolved') {
        expect(disagreement.resolutionBasis, disagreement.topic).toBeNull();
        // An open conflict still has to say what would settle it.
        expect(disagreement.resolutionRequirement, disagreement.topic).toBeTruthy();
      } else {
        expect(disagreement.resolutionBasis, disagreement.topic).toBeTruthy();
        expect(disagreement.resolvedAt, disagreement.topic).toBeTruthy();
      }
    }
  });

  it('refuses to mark a disagreement resolved without saying what resolved it', async () => {
    await expect(
      query(
        db,
        `update disagreements
            set resolution = 'source_error_confirmed', resolution_basis = null
          where disagreement_key = 'TESA-D-001'`,
      ),
    ).rejects.toThrow(/disagreements_resolution_shows_working/i);
  });

  it('records the jurisdiction error against this index, not against the source', async () => {
    /*
     * The correction of a correction. The handbook states the US FDA approval
     * on the page after the one this index read; the error was the extraction,
     * and the first attempt at fixing it attributed the mistake to the
     * handbook. `index_error_confirmed` exists so that distinction is in the
     * data rather than in a sentence somebody may rewrite.
     */
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const jurisdiction = page!.disagreements.find((d) => /jurisdiction|country|approved/i.test(d.topic));
    expect(jurisdiction).toBeDefined();
    expect(jurisdiction!.resolution).toBe('index_error_confirmed');

    // And no difference on this compound is recorded as the handbook being
    // wrong, because after the re-examination none of them is.
    const blamed = page!.disagreements.filter((d) => d.resolution === 'source_error_confirmed');
    expect(blamed.map((d) => d.topic)).toEqual([]);
  });

  it('keeps the regulatory source authoritative without calling the other wrong', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    const malignancy = page!.disagreements.find((d) => /malignancy|neoplasm|cancer/i.test(d.topic));
    expect(malignancy).toBeDefined();
    expect(malignancy!.resolution).toBe('regulatory_source_more_specific');
    expect(malignancy!.resolutionBasis).toMatch(/govern|control|more specific/i);
  });

  // --- Products ------------------------------------------------------------

  it('keeps the marketed products distinct from the molecule', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'practitioner');
    expect(page!.products.length).toBeGreaterThanOrEqual(3);

    const doses = page!.products.map((p) => p.labelledDoseText).filter((d) => d !== null);
    expect(new Set(doses).size).toBe(doses.length);

    for (const product of page!.products) {
      expect(product.substitutabilityNote ?? product.notes, product.productKey).toBeTruthy();
    }

    // The product context has to remain visible on the regulatory presentation:
    // an approval belongs to products, and a page that says "approved" without
    // saying of what has lost the distinction this table exists for.
    const approved = page!.regulatoryStatuses.filter((s) => s.status === 'approved');
    expect(approved.length).toBeGreaterThan(0);
    for (const status of approved) {
      expect(status.authority, status.jurisdiction).toBeTruthy();
      expect(status.citation?.sourceKey, status.jurisdiction).toBeTruthy();
    }
  });

  it('gives patient mode no product strength, dose or reconstitution', async () => {
    const page = await readPeptidePagePreview(db, 'tesamorelin', 'simple');
    expect(page!.products.length).toBeGreaterThan(0);
    for (const product of page!.products) {
      expect(product.strengthText, product.productKey).toBeNull();
      expect(product.labelledDoseText, product.productKey).toBeNull();
      expect(product.reconstitutionText, product.productKey).toBeNull();
      // The editorial note is where a strength ends up when nobody is watching.
      expect(product.notes, product.productKey).toBeNull();
      // And the name itself must not carry one.
      expect(product.productName, 'product name carries a strength').not.toMatch(
        /\d+(\.\d+)?\s*(mg|mcg|µg|ml)/i,
      );
    }

    for (const observation of page!.pharmacokinetics) {
      expect(observation.doseContext, observation.observationKey).toBeNull();
      expect(observation.notes, observation.observationKey).toBeNull();
      // What a patient keeps: the conditions, which are the explanation.
      expect(observation.population, observation.observationKey).toBeTruthy();
    }
  });

  it('gives patient mode no evidence annotation, which is where doses hide', async () => {
    for (const slug of ['tesamorelin', 'bpc-157']) {
      const simple = await readPeptidePagePreview(db, slug, 'simple');
      for (const claim of simple!.claims) {
        for (const evidence of claim.evidence) {
          expect(evidence.interpretation, `${slug}/${claim.claimKey}`).toBeNull();
          expect(evidence.formulation, `${slug}/${claim.claimKey}`).toBeNull();
          // The evidence itself is not hidden: class, type and citation stay.
          expect(evidence.evidenceTypeLabel).toBeTruthy();
          expect(evidence.citation.sourceKey).toBeTruthy();
        }
      }
    }
  });

  // --- Practitioner claims stay separate from the primary evidence ---------

  it('keeps a practitioner claim distinct from the primary work behind it', async () => {
    const page = await readPeptidePagePreview(db, 'bpc-157', 'practitioner');

    // The crosswalk claim: what the handbook cites, and what it does not reach.
    const crosswalk = page!.claims.find((c) => /references the practitioner handbook cites/i.test(c.claimText));
    expect(crosswalk, 'no citation crosswalk claim').toBeDefined();
    expect(crosswalk!.claimText).toMatch(/preclinical|review/i);

    // A practitioner reference and a human study may never share an evidence
    // type, which is how "a handbook says" becomes "a study shows".
    for (const claim of page!.claims) {
      for (const evidence of claim.evidence) {
        if (evidence.evidenceTypeKey === 'practitioner_reference') {
          expect(evidence.evidenceClass, claim.claimKey).toBe('reference_opinion');
          expect(evidence.isHumanEvidence, claim.claimKey).toBe(false);
        }
      }
    }
  });

  // --- Search --------------------------------------------------------------

  it('routes a query to the section it is asking about', () => {
    const hint = (term: string): readonly string[] =>
      sectionHintsFor(term).map((h) => h.id);

    // A bare compound name asks nothing more specific than the record itself.
    expect(hint('Tesamorelin')).toEqual([]);
    expect(hint('BPC-157')).toEqual([]);

    expect(hint('BPC protocols')).toContain('protocols');
    expect(hint('Tesamorelin protocols')).toContain('protocols');
    expect(hint('BPC-157 human evidence')).toContain('literature');
    expect(hint('Tesamorelin human trials')).toContain('literature');
    expect(hint('Tesamorelin FDA')).toContain('regulatory');
    expect(hint('BPC routes')).toContain('routes');
    expect(hint('BPC cancer')).toContain('disagreements');
    expect(hint('tesamorelin half-life')).toContain('pharmacokinetics');
    expect(hint('egrifta formulation')).toContain('products');

    // Never more than a short row of suggestions.
    for (const term of ['BPC-157 human evidence dose route cancer fda half-life']) {
      expect(sectionHintsFor(term).length).toBeLessThanOrEqual(3);
    }
  });

  it('returns no search result field that could carry a practitioner dose', async () => {
    /*
     * The search index stores `body_text`, which concatenates the practitioner
     * summary — doses and all. The guarantee is that the service never selects
     * it, so a result snippet cannot contain one. Asserted against the shape of
     * what search returns rather than against today's data, because the data
     * changes and the shape is the promise.
     */
    const [row] = await query<{ n: number }>(
      db,
      `select count(*)::int as n from search_documents where body_text is not null`,
    );
    expect(Number(row!.n)).toBeGreaterThanOrEqual(0);

    const { search } = await import('@/server/search/search-service');
    const results = await search(db, 'peptide', { limit: 5 });
    for (const result of results) {
      expect(Object.keys(result)).not.toContain('bodyText');
      expect(Object.keys(result)).not.toContain('body_text');
      const snippet = `${result.title} ${result.subtitle ?? ''}`;
      expect(snippet, result.title).not.toMatch(/\d+(\.\d+)?\s*(mcg|µg)\b/i);
      expect(snippet, result.title).not.toMatch(/\b\d+(\.\d+)?\s*mg\s*(daily|per day|bid|twice)/i);
    }
  });
});
