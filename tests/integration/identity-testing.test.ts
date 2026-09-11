import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readQualityTopic } from '@/server/public/quality-topic';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Identity testing (Phase C.7).
 *
 * The topic exists because the purity page teaches that purity is not identity
 * and then linked to an empty room. Filling it introduces a new way to mislead:
 * identity is the attribute a reader most wants to believe has been settled, and
 * "LC-MS" on a document is the phrase most likely to be taken as settling it.
 *
 * These tests hold the three separations the topic depends on — purity from
 * identity, mass from sequence, and what a document reports from what anyone has
 * verified.
 */

const SLUG = 'identity-testing';

describe('identity testing', () => {
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

  const read = () => readQualityTopic(db, SLUG, { preview: true });

  // --- Purity is not identity ---------------------------------------------
  it('states the separation from its own side, not by reference to the purity page', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'ID-001');

    expect(claim?.claimText).toMatch(/separate|no information/i);
    // Sourced independently at p. 243, so a reader arriving here directly is not
    // relying on having read the purity topic first.
    expect(claim?.evidence[0]?.citation.printedPage).toBe(243);
    expect(claim?.evidence[0]?.citation.sourceKey).toBe('SRC-006');
  });

  it('never lets a purity result stand as an identity result', async () => {
    const claims = await query<{ claim_text: string; claim_key: string }>(
      db,
      `select claim_key, claim_text from claims where claim_key like 'ID-%'`,
    );
    const text = claims.map((c) => c.claim_text).join(' ');

    // No claim here says a purity figure establishes what a material is.
    expect(text).not.toMatch(/purity (figure|result)[^.]{0,40}(establishes|confirms|proves) (the )?identit/i);
  });

  // --- Mass is not sequence ------------------------------------------------
  it('keeps mass determination and sequence determination as different measurements', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'ID-006');

    expect(claim?.claimText).toMatch(/different measurement/i);
    expect(claim?.importance).toBe('critical');
    // Two passages, because the distinction is made in two places in the source.
    expect(claim?.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it('does not claim a matching mass establishes the sequence', async () => {
    const topic = await read();
    const claims = (topic?.claims ?? []).map((c) => c.claimText).join(' ');

    expect(claims).not.toMatch(/mass[^.]{0,60}(establishes|confirms|proves)[^.]{0,20}sequence/i);

    // It is recorded as an open question instead.
    const gap = topic?.gaps.find((g) => /matching molecular mass/i.test(g.statement));
    expect(gap).toBeDefined();
    expect(gap?.whyNotSupported).toMatch(/separate measurements|does not state/i);
  });

  it('records the specificity limit as unestablished rather than asserting it', async () => {
    const topic = await read();
    const gap = topic?.gaps.find((g) => /equal mass|isomer/i.test(g.statement));

    // "Mass spectrometry cannot distinguish positional isomers" is widely
    // understood, easy to write, and not in the pages that were read. Asserting
    // it would be a generalisation from intuition.
    expect(gap).toBeDefined();
    expect(gap?.whyNotSupported).toMatch(/not stated in the pages|depends on/i);

    const claims = (topic?.claims ?? []).map((c) => c.claimText).join(' ');
    expect(claims).not.toMatch(/cannot distinguish/i);
  });

  // --- Numbers keep their context -----------------------------------------
  it('preserves the worked example exactly, and never as an acceptance criterion', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'ID-005');

    // Unrounded and unconverted, as the source gives them.
    expect(claim?.claimText).toContain('4005.7');
    expect(claim?.claimText).toContain('4005.3');
    expect(claim?.claimText).toContain('4006.5');
    // With the context that makes them meaningful.
    expect(claim?.claimText).toMatch(/33-residue/);
    // And an explicit refusal to read them as a tolerance.
    expect(claim?.uncertaintyText).toMatch(/not an acceptance criterion|not a tolerance/i);
  });

  it('records that no acceptable mass difference is established', async () => {
    const topic = await read();
    const gap = topic?.gaps.find((g) => /how far an observed mass/i.test(g.statement));

    expect(gap).toBeDefined();
    expect(gap?.gapType).toBe('numerical_threshold_not_established');
  });

  // --- Secondary and primary stay distinct --------------------------------
  it('does not mark a claim primary-verified when no primary source was obtained', async () => {
    const rows = await query<{ claim_key: string; primary_source_verified: boolean }>(
      db,
      `select c.claim_key, e.primary_source_verified
       from claims c join claim_evidence e on e.claim_id = c.id
       where c.claim_key like 'ID-%'`,
    );

    expect(rows.length).toBeGreaterThan(0);
    // The trace was attempted and failed: both cited works are chapters in
    // out-of-print volumes with no lawful free text. Locating a citation is not
    // reading it.
    for (const row of rows) {
      expect(row.primary_source_verified, row.claim_key).toBe(false);
    }
  });

  it('records the failed trace as its own gap rather than as silence', async () => {
    const topic = await read();
    const gap = topic?.gaps.find((g) => g.gapType === 'primary_source_missing');

    expect(gap).toBeDefined();
    expect(gap?.statement).toMatch(/primary literature/i);
    expect(gap?.verificationIssueKey).toBe('V-022');
  });

  it('keeps every identity claim attributed to the secondary source that carries it', async () => {
    const topic = await read();
    for (const claim of topic?.claims ?? []) {
      for (const evidence of claim.evidence) {
        // Grant, not Hunt. The index cites what it has read.
        expect(evidence.citation.sourceKey, claim.claimKey).toBe('SRC-006');
        expect(evidence.evidenceTypeKey, claim.claimKey).toBe('academic_reference');
      }
    }
  });

  // --- Scope ---------------------------------------------------------------
  it('does not inherit the source’s strongest wording', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'ID-002');

    // Grant writes that a correct mass "proves in one step that the synthesis was
    // successful". That is scoped to a chemist checking their own synthesis of a
    // known sequence, and the claim records the narrower form.
    expect(claim?.claimText).not.toMatch(/proves in one step/i);
    expect(claim?.uncertaintyText).toMatch(/stronger than this index/i);
    expect(claim?.interpretationNotes).toMatch(/known|clinic|supplier/i);
  });

  it('carries no certificate scope, because these are not certificate-content claims', async () => {
    const topic = await read();
    for (const claim of topic?.claims ?? []) {
      expect(claim.certificateTypeScope, claim.claimKey).toBeNull();
    }
  });

  // --- Relationships -------------------------------------------------------
  it('points back at purity, so the path is no longer one-way', async () => {
    const topic = await read();
    const toPurity = topic?.relationships.find((r) => r.toSlug === 'hplc-purity');

    expect(toPurity?.relationshipType).toBe('commonly_conflated');
    expect(toPurity?.evidenceStatus).toBe('evidence_backed');
    expect(toPurity?.claimKey).toBe('ID-001');
  });

  it('shows each pair under one heading only', async () => {
    const rows = await query<{ from_key: string; to_key: string; n: number }>(
      db,
      `select f.quality_key as from_key, t.quality_key as to_key, count(*)::int as n
       from quality_relationships r
       join quality_topics f on f.id = r.from_topic_id
       join quality_topics t on t.id = r.to_topic_id
       where f.quality_key in ('identity-testing', 'hplc-purity')
       group by f.quality_key, t.quality_key having count(*) > 1`,
    );
    // A second edge between the same pair would put one topic under two
    // headings on the same page.
    expect(rows).toEqual([]);
  });

  it('writes no new assertion into a relationship edge', async () => {
    const rows = await query<{ rationale: string; claim_key: string | null; gap_key: string | null }>(
      db,
      `select r.rationale, r.claim_key, r.gap_key
       from quality_relationships r
       join quality_topics f on f.id = r.from_topic_id
       where f.quality_key = 'identity-testing'
         and r.claim_key is null and r.gap_key is null`,
    );

    const asserts = /\b(does not|cannot|never|proves|establishes|guarantees)\b/i;
    for (const row of rows) {
      expect(row.rationale).not.toMatch(asserts);
    }
  });

  // --- The certificate ------------------------------------------------------
  it('sends a certificate identity result to the topic, not to the instrument', async () => {
    const rows = await query<{ test_name: string; slug: string | null; verified: boolean }>(
      db,
      `select t.test_name, q.slug, t.independently_verified as verified
       from certificate_tests t
       left join quality_topics q on q.id = t.quality_topic_id
       where t.test_name ilike '%identity%'`,
    );

    expect(rows[0]?.slug).toBe('identity-testing');
    // The document reports a result. Nothing here has checked it.
    expect(rows[0]?.verified).toBe(false);
  });

  // --- Reading modes --------------------------------------------------------
  it('gives simple mode plain language, free of method vocabulary', async () => {
    const topic = await read();

    expect(topic?.simpleSummary).not.toBeNull();
    expect(topic?.simpleSummary).not.toMatch(
      /electrospray|MALDI|deconvolution|m\/z|collision-induced|monoisotopic/i,
    );
    for (const claim of topic?.claims ?? []) {
      expect(claim.plainLanguageText, claim.claimKey).not.toBeNull();
      expect(claim.plainLanguageText).not.toBe(claim.claimText);
    }
  });

  it('stays out of the public surface while unpublished', async () => {
    const published = await readQualityTopic(db, SLUG);
    expect(published).toBeNull();

    const [row] = await query<{ review_state: string; publication_state: string }>(
      db,
      `select review_state, publication_state from quality_topics where slug = $1`,
      [SLUG],
    );
    expect(row?.publication_state).toBe('unpublished');
    expect(row?.review_state).not.toBe('scientific_reviewed');
  });
});
