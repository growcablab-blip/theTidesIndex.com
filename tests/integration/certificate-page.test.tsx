import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { seedDatabase } from '@db/seed';
import { readSpecimenCertificate, transparencyDimensions } from '@/server/public/certificate';
import { readQualityTopic } from '@/server/public/quality-topic';
import { closeTestDb, createTestDb, query, truncateContent, type TestDb } from '../support/test-db';

/**
 * The certificate page (Phase C.9).
 *
 * The page a reader most likely arrives at holding something in their hand, and
 * the one where a mistake reaches furthest: it is where a purity figure either
 * becomes one data point or becomes the verdict.
 *
 * Four things have to hold. The specimen must be unmistakably fictional. A
 * reported result must never read as a verified one. A Q7 requirement must carry
 * the document family it governs. And an absent field must be absent rather than
 * a string saying so.
 */

const SPECIMEN = 'specimen-third-party-report';
const TOPIC = 'certificate-of-analysis';

describe('the certificate page', () => {
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

  const certificate = () => readSpecimenCertificate(db, SPECIMEN, { preview: true });
  const topic = () => readQualityTopic(db, TOPIC, { preview: true });

  // --- Absence is absence --------------------------------------------------
  it('stores an unstated field as null, not as a string saying so', async () => {
    const c = await certificate();
    const content = c?.tests.find((t) => t.testName === 'Peptide content');

    expect(content?.analyticalMethod).toBeNull();
    expect(content?.specificationText).toBeNull();
    // The exception: what the document itself reports as its result is a
    // finding, and stays exactly as written.
    expect(content?.resultText).toBe('Not determined');
  });

  it('refuses a placeholder string in a structured metadata field', async () => {
    const message = await query(
      db,
      `update certificate_tests set analytical_method = 'N/A' where test_name = 'Sterility'`,
    ).then(
      () => 'accepted',
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );

    expect(message).not.toBe('accepted');
  });

  it('still accepts a source-reported negative in a result field', async () => {
    // "Not tested" in a result column is what the document says. Blocking it
    // would force a real finding to be recorded as a hole.
    await query(
      db,
      `update certificate_tests set result_text = 'Not tested' where test_name = 'Sterility'`,
    );
    const c = await certificate();
    expect(c?.tests.find((t) => t.testName === 'Sterility')?.resultText).toBe('Not tested');
  });

  // --- Reported is not verified --------------------------------------------
  it('has verified nothing, and says so on every result', async () => {
    const c = await certificate();

    expect(c?.tests.length).toBeGreaterThan(0);
    for (const test of c?.tests ?? []) {
      expect(test.independentlyVerified, test.testName).toBe(false);
      expect(test.verificationNotes, test.testName).toBeNull();
    }
  });

  it('cannot record verification without saying what was checked', async () => {
    const message = await query(
      db,
      `update certificate_tests set independently_verified = true where test_name = 'Sterility'`,
    ).then(
      () => 'accepted',
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    expect(message).not.toBe('accepted');
  });

  it('leaves authenticity unchecked rather than inferring it', async () => {
    const c = await certificate();
    expect(c?.authenticityState).toBe('not_checked');
    expect(c?.authenticityNotes).toBeNull();
  });

  // --- Each result leads to the question it addresses -----------------------
  it('sends each result to its own topic', async () => {
    const c = await certificate();
    const byName = new Map((c?.tests ?? []).map((t) => [t.testName, t.qualityTopicSlug]));

    expect(byName.get('Purity by reversed-phase HPLC')).toBe('hplc-purity');
    expect(byName.get('Identity by LC-MS')).toBe('identity-testing');
    expect(byName.get('Peptide content')).toBe('peptide-content-assay');
    expect(byName.get('Sterility')).toBe('sterility');

    // Four results, four different topics. None stands in for another.
    const slugs = [...byName.values()].filter((s): s is string => s !== null);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('marks a topic in preparation without exposing anything from it', async () => {
    const c = await certificate();
    const sterility = c?.tests.find((t) => t.testName === 'Sterility');

    expect(sterility?.qualityTopicIsPublished).toBe(false);
    expect(sterility?.qualityTopicName).toBe('Sterility');

    // The name and its state, and nothing that topic would say if written.
    const keys = Object.keys(sterility ?? {});
    for (const leaked of ['qualityTopicWhatItProves', 'qualityTopicSummary', 'qualityTopicBody']) {
      expect(keys).not.toContain(leaked);
    }
  });

  // --- Q7 scope travels with the requirement -------------------------------
  it('carries a document family on every certificate-content claim', async () => {
    const t = await topic();
    const contentClaims = (t?.claims ?? []).filter((c) =>
      (c.claimCategory ?? '').startsWith('certificate-content'),
    );

    expect(contentClaims.length).toBeGreaterThan(0);
    for (const claim of contentClaims) {
      // The database refuses this claim family without a scope; this asserts it
      // survives to the reader, which is the half that was lost once already.
      expect(claim.certificateTypeScope, claim.claimKey).not.toBeNull();
    }
  });

  it('states the API scope in the claim text itself, not only in a field', async () => {
    const t = await topic();
    const claim = t?.claims.find((c) => c.claimKey === 'COA-002');

    expect(claim?.claimText).toMatch(/active pharmaceutical ingredient or intermediate/i);
    expect(claim?.uncertaintyText).toMatch(/API and intermediate|finished-product/i);
  });

  it('records the document families it holds no requirements for', async () => {
    const t = await topic();
    const scoped = (t?.gaps ?? []).filter((g) => g.gapType === 'scope_not_established');
    expect(scoped.length).toBeGreaterThanOrEqual(3);
  });

  // --- No score ------------------------------------------------------------
  it('produces dimensions, never a score', async () => {
    const c = await certificate();
    const dimensions = transparencyDimensions(c!);

    expect(dimensions.length).toBeGreaterThan(0);
    for (const dimension of dimensions) {
      expect(['present', 'partial', 'absent']).toContain(dimension.state);
      // No number to add up, and nothing shaped like a grade.
      expect(dimension).not.toHaveProperty('score');
      expect(dimension).not.toHaveProperty('weight');
      expect(dimension.label).not.toMatch(/excellent|poor|good|grade|\/\s*100/i);
    }
    expect(dimensions as unknown as Record<string, unknown>).not.toHaveProperty('total');
  });

  it('reports partial coverage as a count rather than as absence', async () => {
    const c = await certificate();
    const method = transparencyDimensions(c!).find((d) => d.key === 'method-information');

    expect(method?.state).toBe('partial');
    expect([...method!.present, ...method!.absent].join(' ')).toMatch(/of 5 tests/);
  });

  // --- Identities stay apart ------------------------------------------------
  it('keeps laboratory, manufacturer and distributor separate, and a missing one missing', async () => {
    const c = await certificate();

    expect(c?.laboratoryName).toMatch(/Example Analytical Services/);
    expect(c?.distributorName).toMatch(/Example Peptide Supply/);
    // The specimen names no manufacturer, which is the lesson rather than an
    // oversight. It is null, not "Unknown".
    expect(c?.manufacturerName).toBeNull();
    expect(c?.manufacturerIdentityEstablished).toBe(false);
  });

  it('keeps batch linkage as stated rather than established', async () => {
    const c = await certificate();
    expect(c?.batchLinkage).toBe('stated_only');
    expect(c?.chainOfCustodyKnown).toBe(false);
  });

  // --- Demonstration safety -------------------------------------------------
  it('exposes only a declared specimen to the public', async () => {
    await query(
      db,
      `insert into certificates (certificate_key, certificate_type, document_title, batch_number)
       values ('real-supplier-doc', 'manufacturer_coa', 'A real supplier certificate', 'REAL-1')`,
    );

    const rows = await query<{ certificate_key: string }>(
      db,
      `select certificate_key from public_v_certificates`,
    );
    expect(rows.map((r) => r.certificate_key)).toEqual([SPECIMEN]);
  });

  it('declares itself fictional in its own title', async () => {
    const c = await certificate();
    expect(c?.documentTitle).toMatch(/specimen/i);
    expect(c?.isSpecimen).toBe(true);
  });

  it('is not counted as demonstration data barred from production', async () => {
    // The specimen is published teaching content, not the local editorial
    // fixture. Conflating the two would make the production guard refuse a
    // database that legitimately contains the teaching document.
    const [row] = await query<{ n: number }>(
      db,
      `select tides_demonstration_record_count() as n`,
    );
    expect(row?.n).toBe(0);
  });

  it('never links a specimen result to a real compound', async () => {
    const rows = await query<{ n: number }>(
      db,
      `select count(*)::int as n from certificate_tests t
       join certificates c on c.id = t.certificate_id
       where c.is_specimen and t.quality_topic_id in (
         select quality_topic_id from claims where peptide_id is not null)`,
    );
    expect(rows[0]?.n).toBe(0);
  });

  it('keeps the specimen out of the search index', async () => {
    const rows = await query<{ n: number }>(
      db,
      `select count(*)::int as n from search_documents
       where title ilike '%specimen%' or body_text ilike '%Example Analytical Services%'`,
    );
    expect(rows[0]?.n).toBe(0);
  });

  // --- What the page renders ------------------------------------------------
  it('labels the specimen as fictional wherever it appears', async () => {
    const { SpecimenNotice } = await import('@/components/public/certificate');
    const html = renderToStaticMarkup(<SpecimenNotice />);

    expect(html).toMatch(/Fictional specimen — not a real certificate/);
    expect(html).toMatch(/invented for this page/);
    expect(html).toContain('border-dashed');
  });

  it('names the one document family it holds requirements for', async () => {
    const { DocumentTypes } = await import(
      '@/app/(public)/quality/certificate-of-analysis/sections'
    );
    const html = renderToStaticMarkup(<DocumentTypes current="third_party_test_report" />);

    expect(html).toMatch(/ICH Q7/);
    expect(html).toMatch(/active pharmaceutical ingredients and intermediates only/);
    // And says plainly where it holds none, rather than leaving a blank.
    expect(html).toMatch(/holds no source stating what this kind of document should contain/);
  });

  it('renders an unstated value as a marked absence, never blank', async () => {
    const { CertificateTestList } = await import(
      '@/app/(public)/quality/certificate-of-analysis/sections'
    );
    const c = await certificate();
    const html = renderToStaticMarkup(
      <CertificateTestList tests={c!.tests} simple={false} />,
    );

    expect(html).toMatch(/Not stated on this document/);
    expect(html).toMatch(/Not checked — this index has not verified this result/);
  });

  it('gives simple mode fewer method fields than practitioner mode', async () => {
    const { CertificateTestList } = await import(
      '@/app/(public)/quality/certificate-of-analysis/sections'
    );
    const c = await certificate();
    const simple = renderToStaticMarkup(<CertificateTestList tests={c!.tests} simple />);
    const practitioner = renderToStaticMarkup(
      <CertificateTestList tests={c!.tests} simple={false} />,
    );

    expect(simple).not.toMatch(/Method reference/);
    expect(practitioner).toMatch(/Method reference/);
    // But the verification state is in both: it is not an advanced detail.
    expect(simple).toMatch(/Not checked/);
  });

  it('asks only questions a document answers, never implying a requirement', async () => {
    const { QuestionsToAsk } = await import(
      '@/app/(public)/quality/certificate-of-analysis/sections'
    );
    const html = renderToStaticMarkup(<QuestionsToAsk />);

    expect(html).toMatch(/Was an acceptance criterion stated/);
    // The question that would smuggle in a specification this index cannot source.
    expect(html).not.toMatch(/does it meet spec|is the purity high enough|should be at least/i);
  });
});
