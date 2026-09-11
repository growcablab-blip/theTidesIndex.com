import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { seedDatabase } from '@db/seed';
import { readSpecimenCertificate, transparencyDimensions } from '@/server/public/certificate';
import { readQualityTopic } from '@/server/public/quality-topic';
import { withPublicSession } from '@/server/db/session';
import type { Database } from '@/server/db/types';
import {
  closeTestDb,
  createTestDb,
  query,
  rejectionMessage,
  resultRows,
  truncateContent,
  type TestDb,
} from '../support/test-db';

/**
 * Certificates (Phase C.5).
 *
 * Five things have to hold, and each one fails quietly:
 *
 *   a Q7 requirement for an API certificate must not become a universal one;
 *   a reported result must not become a verified one;
 *   a real certificate must not become public;
 *   a missing batch identifier must not become an inferred one;
 *   and the transparency dimensions must not become a score.
 */

const SPECIMEN = 'specimen-third-party-report';

describe('certificates', () => {
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

  const read = () => readSpecimenCertificate(db, SPECIMEN, { preview: true });

  // --- Q7 scope ------------------------------------------------------------
  it('binds every certificate-content requirement to a document type', async () => {
    const rows = await query<{ claim_key: string; certificate_type_scope: string | null }>(
      db,
      `select claim_key, certificate_type_scope from claims
       where claim_category like 'certificate-content%'`,
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.certificate_type_scope, row.claim_key).not.toBeNull();
    }
  });

  it('refuses a certificate requirement that names no document type', async () => {
    const [topic] = await query<{ id: string }>(
      db,
      `select id from quality_topics where quality_key = 'coa-literacy'`,
    );

    // The single careless sentence this constraint exists to stop: a Q7
    // requirement written down without the scope that makes it true.
    const message = await rejectionMessage(
      query(
        db,
        `insert into claims (claim_key, quality_topic_id, claim_text, claim_category)
         values ('COA-UNSCOPED', $1, 'Every certificate must list acceptance limits.',
                 'certificate-content')`,
        [topic!.id],
      ),
    );
    expect(message).toMatch(/claims_certificate_scope_declared/);
  });

  it('scopes the Q7 claims to API and repacker certificates, not to everything', async () => {
    const rows = await query<{ claim_key: string; certificate_type_scope: string }>(
      db,
      `select claim_key, certificate_type_scope from claims
       where claim_key like 'COA-%' and certificate_type_scope is not null
       order by claim_key`,
    );
    const scopes = new Set(rows.map((r) => r.certificate_type_scope));

    expect(scopes.has('manufacturer_coa')).toBe(true);
    expect(scopes.has('supplier_repacker_certificate')).toBe(true);
    // Nothing claims to govern a finished product or a laboratory's own report,
    // because Q7 does not.
    expect(scopes.has('finished_product_release')).toBe(false);
    expect(scopes.has('third_party_test_report')).toBe(false);
  });

  it('records the document types it cannot speak to as gaps', async () => {
    const topic = await readQualityTopic(db, 'certificate-of-analysis', { preview: true });
    const statements = (topic?.gaps ?? []).map((g) => g.statement.toLowerCase()).join(' | ');

    expect(statements).toMatch(/finished drug product/);
    expect(statements).toMatch(/third-party analytical laboratory/);
    expect(statements).toMatch(/research-use/);
  });

  // --- Reported is not verified -------------------------------------------
  it('reports every result as reported, never as verified', async () => {
    const certificate = await read();

    expect(certificate?.tests.length).toBeGreaterThan(0);
    for (const test of certificate?.tests ?? []) {
      expect(test.independentlyVerified, test.testName).toBe(false);
    }
  });

  it('refuses to mark a result verified without saying what was checked', async () => {
    const message = await rejectionMessage(
      query(db, `update certificate_tests set independently_verified = true`),
    );
    // Verification is a claim about work performed. It must name the work.
    expect(message).toMatch(/certificate_tests_verification_explained/);
  });

  it('does not let an HPLC entry on a certificate assert identity', async () => {
    const certificate = await read();
    const hplc = certificate?.tests.find((t) => /hplc/i.test(t.testName));
    const identity = certificate?.tests.find((t) => /identity/i.test(t.testName));

    // Two separate entries, pointing at two separate topics. A purity result
    // never stands in for the identity question. The identity entry leads to the
    // identity topic rather than to the instrument that produced it: the reader's
    // question is what the result establishes, not which machine was used.
    expect(hplc?.qualityTopicSlug).toBe('hplc-purity');
    expect(identity?.qualityTopicSlug).toBe('identity-testing');
    expect(hplc?.qualityTopicSlug).not.toBe(identity?.qualityTopicSlug);
  });

  // --- Separate identities -------------------------------------------------
  it('keeps laboratory, manufacturer and distributor as separate parties', async () => {
    const certificate = await read();

    // Q7 §11.43 and §11.44 hold these apart, so the model does too. The specimen
    // names a laboratory and a distributor and no manufacturer at all — which is
    // the common and instructive case.
    expect(certificate?.laboratoryName).not.toBeNull();
    expect(certificate?.distributorName).not.toBeNull();
    expect(certificate?.manufacturerName).toBeNull();
    expect(certificate?.manufacturerIdentityEstablished).toBe(false);
  });

  it('leaves a missing batch identifier missing rather than inferring one', async () => {
    const certificate = await read();

    // The document states its own batch number and no manufacturer's batch
    // number. The second is not filled in from the first.
    expect(certificate?.batchNumber).toBe('EXB-0000');
    expect(certificate?.manufacturerBatchNumber).toBeNull();
    expect(certificate?.batchLinkage).toBe('stated_only');
  });

  it('does not treat a stated lot number as an established chain', async () => {
    const certificate = await read();
    expect(certificate?.batchLinkage).not.toBe('established');
    expect(certificate?.chainOfCustodyKnown).toBe(false);
  });

  // --- No score ------------------------------------------------------------
  it('produces dimensions and no total', async () => {
    const certificate = await read();
    const dimensions = transparencyDimensions(certificate!);

    expect(dimensions.length).toBeGreaterThan(4);
    for (const dimension of dimensions) {
      expect(['present', 'partial', 'absent']).toContain(dimension.state);
      // No numeric field of any kind on a dimension: nothing to add up, and
      // nothing a reader could mistake for a rating of the material.
      for (const value of Object.values(dimension)) {
        expect(typeof value).not.toBe('number');
      }
    }
  });

  it('counts per-test coverage rather than calling a partial document empty', async () => {
    const certificate = await read();
    const dimensions = transparencyDimensions(certificate!);
    const method = dimensions.find((d) => d.key === 'method-information');

    // Three of the specimen's five tests state a method. Reporting that as
    // "none stated" was a real defect, found by reading the rendered page.
    // The content entry states none — recorded as null, because a field the
    // document does not carry is absent rather than a string saying so.
    expect(method?.state).toBe('partial');
    expect([...method!.present, ...method!.absent].join(' ')).toMatch(/3 of 5/);
  });

  // --- What can reach the public ------------------------------------------
  it('never exposes a certificate that is not a declared specimen', async () => {
    await query(
      db,
      `insert into certificates (certificate_key, certificate_type, document_title,
                                 manufacturer_name, batch_number, is_specimen)
       values ('real-supplier-coa', 'manufacturer_coa', 'Acme Peptides Certificate of Analysis',
               'Acme Peptides Ltd', 'REAL-BATCH-1', false)`,
    );

    const visible = await withPublicSession(db as unknown as Database, (tx) =>
      tx.execute(`select certificate_key from public_v_certificates`),
    );
    const keys = resultRows<{ certificate_key: string }>(visible).map((r) => r.certificate_key);

    // A real certificate names a supplier, a batch and a laboratory that are not
    // this index's to publish. There is no state in which one reaches a reader.
    expect(keys).not.toContain('real-supplier-coa');
    expect(keys).toContain(SPECIMEN);
  });

  it('never exposes a real certificate’s test rows either', async () => {
    const [certificate] = await query<{ id: string }>(
      db,
      `insert into certificates (certificate_key, certificate_type, document_title, is_specimen)
       values ('private-report', 'third_party_test_report', 'Private report', false)
       returning id`,
    );
    await query(
      db,
      `insert into certificate_tests (certificate_id, test_name, result_text)
       values ($1, 'Purity', 'PRIVATE SUPPLIER RESULT')`,
      [certificate!.id],
    );

    const visible = await withPublicSession(db as unknown as Database, (tx) =>
      tx.execute(`select result_text from public_v_certificate_tests`),
    );
    const results = resultRows<{ result_text: string | null }>(visible).map((r) => r.result_text);
    expect(results.join(' ')).not.toContain('PRIVATE SUPPLIER RESULT');
  });

  it('refuses a specimen that does not declare itself in its own title', async () => {
    const message = await rejectionMessage(
      query(
        db,
        `insert into certificates (certificate_key, certificate_type, document_title, is_specimen)
         values ('undeclared', 'manufacturer_coa', 'Certificate of Analysis', true)`,
      ),
    );
    // An unlabelled fictional certificate is worse than an unlabelled real one.
    expect(message).toMatch(/certificates_specimen_declares_itself/);
  });

  it('keeps the specimen out of the production demonstration count', async () => {
    const [row] = await query<{ n: number }>(
      db,
      `select tides_demonstration_record_count() as n`,
    );
    // The specimen is published teaching content, not the local fixture. It must
    // not trip the guard that refuses a production database containing demo data.
    expect(row?.n).toBe(0);
  });

  it('counts a demonstration certificate when there is one', async () => {
    await query(
      db,
      `insert into certificates (certificate_key, certificate_type, document_title,
                                 is_specimen, is_demonstration)
       values ('demo-cert', 'manufacturer_coa', 'DEMONSTRATION certificate', true, true)`,
    );
    const [row] = await query<{ n: number }>(
      db,
      `select tides_demonstration_record_count() as n`,
    );
    expect(row?.n).toBe(1);
  });

  it('carries no real supplier information in the specimen at all', async () => {
    const certificate = await read();
    const serialised = JSON.stringify(certificate).toLowerCase();

    // Every party named must announce itself as invented.
    for (const named of [
      certificate?.issuingEntity,
      certificate?.laboratoryName,
      certificate?.distributorName,
      certificate?.statedMaterialName,
      certificate?.authorisedBy,
    ]) {
      if (named === null || named === undefined) continue;
      expect(named.toLowerCase(), named).toMatch(/fictional/);
    }
    expect(serialised).toContain('specimen');
  });

  // --- Source registration --------------------------------------------------
  it('rests the Q7 claims on the guideline, at a page that can be reopened', async () => {
    const rows = await query<{
      claim_key: string;
      source_key: string;
      page_start: number;
      offset: number | null;
      qc_status: string;
      access_status: string;
    }>(
      db,
      `select c.claim_key, s.source_key, l.page_start, s.printed_page_offset as offset,
              s.qc_status, s.access_status
       from claims c
       join claim_evidence e on e.claim_id = c.id
       join source_locations l on l.id = e.source_location_id
       join sources s on s.id = e.source_id
       where c.claim_key like 'COA-%'`,
    );

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.source_key, row.claim_key).toBe('SRC-017');
      expect(row.qc_status, row.claim_key).toBe('usable');
      expect(row.access_status, row.claim_key).toBe('held');
      expect(row.page_start, row.claim_key).toBeGreaterThan(0);
      // The held copy runs six pages ahead of the guideline's own numbering.
      expect(row.offset, row.claim_key).toBe(6);
    }
  });

  it('registers the compendial chapters it does not hold, and cites none of them', async () => {
    const usp = await query<{ source_key: string; qc_status: string; access_status: string }>(
      db,
      `select source_key, qc_status, access_status from sources
       where source_key in ('SRC-021','SRC-022','SRC-023','SRC-024','SRC-025','SRC-026')`,
    );
    expect(usp).toHaveLength(6);
    for (const source of usp) {
      expect(source.qc_status, source.source_key).toBe('pending');
      expect(source.access_status, source.source_key).toBe('subscription_required');
    }

    const cited = await query<{ n: number }>(
      db,
      `select count(*)::int as n from claim_evidence e
       join sources s on s.id = e.source_id
       where s.access_status <> 'held'`,
    );
    // Nothing rests on a source this index cannot open.
    expect(cited[0]?.n).toBe(0);
  });
});
