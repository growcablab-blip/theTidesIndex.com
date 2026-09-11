import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readQualityTopic } from '@/server/public/quality-topic';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * Peptide content and assay (Phase C.8).
 *
 * The third corner. Purity and identity were each written against a specific
 * misreading; content has two, and they are the most consequential in the set.
 *
 * The first is arithmetic. "Gross mass times purity equals peptide content" is
 * an obvious-looking calculation that no source held here supports, and it would
 * arrive carrying this index's authority. The second is the label: a number
 * printed on a vial is a claim by whoever printed it, and a document can carry
 * both a label and a report while having measured neither.
 */

const SLUG = 'peptide-content-assay';

describe('peptide content and assay', () => {
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

  // --- The arithmetic that must not appear ---------------------------------
  it('publishes no calculation deriving an amount from a purity percentage', async () => {
    const topic = await read();
    const everything = [
      topic?.simpleSummary,
      topic?.practitionerSummary,
      topic?.whatItProves,
      topic?.whatItDoesNotProve,
      topic?.commonMisinterpretations,
      ...(topic?.claims ?? []).flatMap((c) => [
        c.claimText,
        c.plainLanguageText,
        c.interpretationNotes,
        c.uncertaintyText,
      ]),
    ]
      .filter((v): v is string => typeof v === 'string')
      .join(' ');

    // No formula, in any of the shapes it would take.
    expect(everything).not.toMatch(/×|multiplied by|times the purity/i);
    expect(everything).not.toMatch(/mass\s*[x*]\s*purity/i);
    expect(everything).not.toMatch(/purity[^.]{0,40}(gives|yields|equals)[^.]{0,30}(amount|content|mass)/i);
  });

  it('records the absence of that calculation as a gap, rather than saying nothing', async () => {
    const topic = await read();
    const gap = topic?.gaps.find((g) => /gross mass and a chromatographic purity/i.test(g.statement));

    expect(gap).toBeDefined();
    expect(gap?.whyNotSupported).toMatch(/no source held here establishes/i);
    expect(gap?.gapType).toBe('no_current_reviewed_evidence');
  });

  // --- Terminology ---------------------------------------------------------
  it('does not adopt "net peptide content" as a platform term', async () => {
    const topic = await read();
    const prose = [topic?.simpleSummary, topic?.practitionerSummary, topic?.whatItProves]
      .filter((v): v is string => typeof v === 'string')
      .join(' ');

    // The phrase appears nowhere in any source held. Adopting it would mean
    // defining it from commercial usage rather than from a source.
    expect(prose).not.toMatch(/net peptide content/i);

    const gap = topic?.gaps.find((g) => /net peptide content/i.test(g.statement));
    expect(gap?.gapType).toBe('terminology_unresolved');
  });

  it('does not equate content with potency', async () => {
    const topic = await read();
    const claims = (topic?.claims ?? []).map((c) => c.claimText).join(' ');

    expect(claims).not.toMatch(/potency|potent|biological activity/i);
    expect(topic?.whatItDoesNotProve).toMatch(/potency/i);

    const gap = topic?.gaps.find((g) => /biological potency/i.test(g.statement));
    expect(gap).toBeDefined();
  });

  // --- Purity and identity cannot populate content -------------------------
  it('keeps content separate from purity and from identity', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'CON-001');

    expect(claim?.importance).toBe('critical');
    expect(claim?.claimText).toMatch(/different analytical question/i);
    // Sourced from the technique table and the surrounding text, not inherited
    // from the purity page.
    expect(claim?.evidence.map((e) => e.citation.printedPage).sort()).toEqual([223, 224]);
  });

  it('does not claim amino acid analysis is the only valid assay', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'CON-002');

    expect(claim?.claimText).not.toMatch(/\bonly\b/i);
    expect(claim?.uncertaintyText).toMatch(/nothing about what method any product is required|not the only/i);

    const gap = topic?.gaps.find((g) => /required to use/i.test(g.statement));
    expect(gap?.gapType).toBe('scope_not_established');
  });

  it('records that quantitation is indirect, through constituent analysis', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'CON-003');

    // The mechanism matters: every limitation follows from it.
    expect(claim?.claimText).toMatch(/hydrolysis|broken into/i);
    expect(claim?.importance).toBe('critical');
  });

  // --- Numbers keep their basis --------------------------------------------
  it('preserves a reported figure with its unit and its method', async () => {
    const topic = await read();
    const claim = topic?.claims.find((c) => c.claimKey === 'CON-005');

    expect(claim?.claimText).toContain('100 pmol');
    // The basis, without which the number is meaningless and misapplied.
    expect(claim?.claimText).toMatch(/post-column ninhydrin/i);
    expect(claim?.uncertaintyText).toMatch(/not a general sensitivity limit|not an acceptance criterion/i);
  });

  it('records no acceptable tolerance between a label and a measurement', async () => {
    const topic = await read();
    const gap = topic?.gaps.find((g) => /tolerance between a stated label amount/i.test(g.statement));

    expect(gap).toBeDefined();
    expect(gap?.gapType).toBe('numerical_threshold_not_established');
  });

  // --- Label claim, reported result, verification --------------------------
  it('keeps a label claim apart from an analytical result on the specimen', async () => {
    const [certificate] = await query<{ stated_strength: string | null }>(
      db,
      `select stated_strength from certificates where certificate_key = 'specimen-third-party-report'`,
    );

    // The label says an amount. That is a claim, and the field says so.
    expect(certificate?.stated_strength).toMatch(/10 mg/);
    expect(certificate?.stated_strength).toMatch(/label claim, not a measured result/i);
  });

  it('shows a content entry that was never measured, rather than omitting it', async () => {
    const [row] = await query<{
      result_text: string | null;
      result_numeric: string | null;
      analytical_method: string | null;
      slug: string | null;
      verified: boolean;
    }>(
      db,
      `select t.result_text, t.result_numeric, t.analytical_method, q.slug,
              t.independently_verified as verified
       from certificate_tests t
       left join quality_topics q on q.id = t.quality_topic_id
       where t.test_name = 'Peptide content'`,
    );

    expect(row?.slug).toBe('peptide-content-assay');
    expect(row?.result_text).toBe('Not determined');
    // A field the document does not carry is null, not a string saying so.
    expect(row?.result_numeric).toBeNull();
    expect(row?.analytical_method).toBeNull();
    expect(row?.verified).toBe(false);
  });

  it('never lets the purity result stand in for the missing content result', async () => {
    const rows = await query<{ test_name: string; slug: string | null }>(
      db,
      `select t.test_name, q.slug from certificate_tests t
       left join quality_topics q on q.id = t.quality_topic_id
       where t.certificate_id = (
         select id from certificates where certificate_key = 'specimen-third-party-report')`,
    );
    const byName = new Map(rows.map((r) => [r.test_name, r.slug]));

    expect(byName.get('Purity by reversed-phase HPLC')).toBe('hplc-purity');
    expect(byName.get('Peptide content')).toBe('peptide-content-assay');
    expect(byName.get('Purity by reversed-phase HPLC')).not.toBe(byName.get('Peptide content'));
  });

  // --- The triangle ---------------------------------------------------------
  it('closes the triangle, with each edge resting on a claim', async () => {
    const rows = await query<{ from_key: string; to_key: string; type: string; claim: string | null }>(
      db,
      `select f.quality_key as from_key, t.quality_key as to_key,
              r.relationship_type as type, r.claim_key as claim
       from quality_relationships r
       join quality_topics f on f.id = r.from_topic_id
       join quality_topics t on t.id = r.to_topic_id
       where f.quality_key in ('hplc-purity','identity-testing','peptide-content-assay')
         and t.quality_key in ('hplc-purity','identity-testing','peptide-content-assay')`,
    );

    const edges = new Set(rows.map((r) => `${r.from_key}->${r.to_key}`));
    for (const expected of [
      'hplc-purity->identity-testing',
      'hplc-purity->peptide-content-assay',
      'identity-testing->hplc-purity',
      'identity-testing->peptide-content-assay',
      'peptide-content-assay->hplc-purity',
      'peptide-content-assay->identity-testing',
    ]) {
      expect(edges, expected).toContain(expected);
    }

    // Every edge among the three rests on a claim: these are the conflations
    // the section exists to prevent, and none may be asserted as navigation.
    for (const row of rows) {
      expect(row.claim, `${row.from_key}->${row.to_key}`).not.toBeNull();
    }
  });

  it('writes no assay claim into a relationship edge', async () => {
    const rows = await query<{ rationale: string }>(
      db,
      `select r.rationale from quality_relationships r
       join quality_topics f on f.id = r.from_topic_id
       where f.quality_key = 'peptide-content-assay'
         and r.claim_key is null and r.gap_key is null`,
    );
    for (const row of rows) {
      expect(row.rationale).not.toMatch(/\b(does not|cannot|never|proves|establishes|guarantees)\b/i);
    }
  });

  // --- Modes and publication ------------------------------------------------
  it('gives simple mode plain language without assay jargon', async () => {
    const topic = await read();

    expect(topic?.simpleSummary).not.toMatch(
      /hydrolys|ninhydrin|mole ratio|deamidat|derivatis|picomol|pmol/i,
    );
    for (const claim of topic?.claims ?? []) {
      expect(claim.plainLanguageText, claim.claimKey).not.toBeNull();
    }
  });

  it('stays unpublished and off the public surface', async () => {
    expect(await readQualityTopic(db, SLUG)).toBeNull();

    const [row] = await query<{ review_state: string; publication_state: string }>(
      db,
      `select review_state, publication_state from quality_topics where slug = $1`,
      [SLUG],
    );
    expect(row?.publication_state).toBe('unpublished');
    expect(row?.review_state).not.toBe('scientific_reviewed');
  });
});
