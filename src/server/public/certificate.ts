import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import { rows, str } from './shapes';

/**
 * Reading a certificate.
 *
 * The useful question about a certificate is not what its numbers say. It is
 * whether the document describes the material in front of the reader — and that
 * question is answered by fields most readers never look at: who issued it, who
 * tested, which sample, whose batch number, and whether anything but an
 * assertion connects them.
 *
 * Two rules hold this together and both are structural rather than editorial.
 * Only a declared specimen is ever returned to the public, because a real
 * certificate names a supplier and a batch that are not this index's to publish.
 * And a reported result is never a verified one: `independentlyVerified` is
 * carried through to the surface so the distinction cannot be lost in wording.
 */

export interface CertificateTestReading {
  readonly id: string;
  readonly testName: string;
  readonly analyticalMethod: string | null;
  readonly methodReference: string | null;
  readonly referenceStandard: string | null;
  /** The acceptance criterion as the document states it. Null means not stated. */
  readonly specificationText: string | null;
  readonly resultNumeric: string | null;
  readonly resultUnit: string | null;
  readonly resultText: string | null;
  readonly attachmentReference: string | null;
  readonly testDate: string | null;
  /** Where a reader goes to learn what this kind of result does and does not show. */
  readonly qualityTopicSlug: string | null;
  readonly qualityTopicName: string | null;
  readonly qualityTopicIsPublished: boolean;
  /**
   * Whether anyone has checked this result against something other than the
   * document reporting it. False everywhere, and kept visible for that reason.
   */
  readonly independentlyVerified: boolean;
  readonly verificationNotes: string | null;
}

export interface CertificateReading {
  readonly id: string;
  readonly certificateKey: string;
  readonly certificateType: string;
  readonly documentTitle: string | null;
  readonly issuingEntity: string | null;
  readonly laboratoryName: string | null;
  readonly laboratoryAddress: string | null;
  readonly laboratoryContact: string | null;
  readonly manufacturerName: string | null;
  readonly manufacturerAddress: string | null;
  readonly distributorName: string | null;
  readonly documentDate: string | null;
  readonly reportNumber: string | null;
  readonly provenanceNotes: string | null;

  readonly statedMaterialName: string | null;
  readonly statedGrade: string | null;
  readonly statedStrength: string | null;
  readonly batchNumber: string | null;
  readonly manufacturerBatchNumber: string | null;
  readonly sampleIdentifier: string | null;
  readonly submittedSampleIdentifier: string | null;
  readonly expiryDate: string | null;
  readonly retestDate: string | null;

  readonly testedMaterialScope: string;
  readonly submittedBy: string | null;
  readonly chainOfCustodyKnown: boolean | null;
  readonly batchLinkage: string;
  readonly manufacturerIdentityEstablished: boolean;
  readonly authorisedBy: string | null;

  readonly whatItDemonstrates: string | null;
  readonly whatItDoesNotDemonstrate: string | null;
  readonly provenanceGaps: string | null;
  readonly missingFields: readonly string[];
  readonly unverifiedRelationships: string | null;

  readonly authenticityState: string;
  readonly authenticityNotes: string | null;
  readonly isSpecimen: boolean;

  readonly tests: readonly CertificateTestReading[];
}

export async function readSpecimenCertificate(
  tx: Database,
  certificateKey: string,
  options: { preview?: boolean } = {},
): Promise<CertificateReading | null> {
  const preview = options.preview === true;
  const certificateRelation = preview ? sql`certificates` : sql`public_v_certificates`;

  const certificateRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, certificate_key, certificate_type, document_title, issuing_entity,
             laboratory_name, laboratory_address, laboratory_contact,
             manufacturer_name, manufacturer_address, distributor_name,
             document_date::text as document_date, report_number, provenance_notes,
             stated_material_name, stated_grade, stated_strength,
             batch_number, manufacturer_batch_number, sample_identifier,
             submitted_sample_identifier,
             expiry_date::text as expiry_date, retest_date::text as retest_date,
             tested_material_scope, submitted_by, chain_of_custody_known,
             batch_linkage, manufacturer_identity_established, authorised_by,
             what_it_demonstrates, what_it_does_not_demonstrate, provenance_gaps,
             missing_fields, unverified_relationships,
             authenticity_state, authenticity_notes, is_specimen
      from ${certificateRelation}
      where certificate_key = ${certificateKey}
    `),
  );
  const certificate = certificateRows[0];
  if (certificate === undefined) return null;

  const testRows = rows<Record<string, unknown>>(
    await tx.execute(
      preview
        ? sql`
            select t.id, t.test_name, t.analytical_method, t.method_reference,
                   t.reference_standard, t.specification_text, t.result_numeric,
                   t.result_unit, t.result_text, t.attachment_reference,
                   t.test_date::text as test_date, t.independently_verified,
                   t.verification_notes, t.sort_order,
                   q.slug as topic_slug, q.name as topic_name,
                   (q.publication_state = 'published') as topic_published
            from certificate_tests t
            left join quality_topics q on q.id = t.quality_topic_id
            where t.certificate_id = ${String(certificate.id)}
            order by t.sort_order
          `
        : sql`
            select t.id, t.test_name, t.analytical_method, t.method_reference,
                   t.reference_standard, t.specification_text, t.result_numeric,
                   t.result_unit, t.result_text, t.attachment_reference,
                   t.test_date::text as test_date, t.independently_verified,
                   t.verification_notes, t.sort_order,
                   q.slug as topic_slug, q.name as topic_name,
                   true as topic_published
            from public_v_certificate_tests t
            left join public_v_quality_topics q on q.id = t.quality_topic_id
            where t.certificate_id = ${String(certificate.id)}
            order by t.sort_order
          `,
    ),
  );

  return {
    id: String(certificate.id),
    certificateKey: String(certificate.certificate_key),
    certificateType: String(certificate.certificate_type),
    documentTitle: str(certificate.document_title),
    issuingEntity: str(certificate.issuing_entity),
    laboratoryName: str(certificate.laboratory_name),
    laboratoryAddress: str(certificate.laboratory_address),
    laboratoryContact: str(certificate.laboratory_contact),
    manufacturerName: str(certificate.manufacturer_name),
    manufacturerAddress: str(certificate.manufacturer_address),
    distributorName: str(certificate.distributor_name),
    documentDate: str(certificate.document_date),
    reportNumber: str(certificate.report_number),
    provenanceNotes: str(certificate.provenance_notes),

    statedMaterialName: str(certificate.stated_material_name),
    statedGrade: str(certificate.stated_grade),
    statedStrength: str(certificate.stated_strength),
    batchNumber: str(certificate.batch_number),
    manufacturerBatchNumber: str(certificate.manufacturer_batch_number),
    sampleIdentifier: str(certificate.sample_identifier),
    submittedSampleIdentifier: str(certificate.submitted_sample_identifier),
    expiryDate: str(certificate.expiry_date),
    retestDate: str(certificate.retest_date),

    testedMaterialScope: String(certificate.tested_material_scope),
    submittedBy: str(certificate.submitted_by),
    chainOfCustodyKnown:
      certificate.chain_of_custody_known === null
        ? null
        : Boolean(certificate.chain_of_custody_known),
    batchLinkage: String(certificate.batch_linkage),
    manufacturerIdentityEstablished: Boolean(certificate.manufacturer_identity_established),
    authorisedBy: str(certificate.authorised_by),

    whatItDemonstrates: str(certificate.what_it_demonstrates),
    whatItDoesNotDemonstrate: str(certificate.what_it_does_not_demonstrate),
    provenanceGaps: str(certificate.provenance_gaps),
    missingFields: Array.isArray(certificate.missing_fields)
      ? (certificate.missing_fields as string[])
      : [],
    unverifiedRelationships: str(certificate.unverified_relationships),

    authenticityState: String(certificate.authenticity_state),
    authenticityNotes: str(certificate.authenticity_notes),
    isSpecimen: Boolean(certificate.is_specimen),

    tests: testRows.map((t) => ({
      id: String(t.id),
      testName: String(t.test_name),
      analyticalMethod: str(t.analytical_method),
      methodReference: str(t.method_reference),
      referenceStandard: str(t.reference_standard),
      specificationText: str(t.specification_text),
      // numeric arrives as a string from the driver; guard the odd shape rather
      // than stringify an object into the page.
      resultNumeric: typeof t.result_numeric === 'string' || typeof t.result_numeric === 'number'
          ? String(t.result_numeric)
          : null,
      resultUnit: str(t.result_unit),
      resultText: str(t.result_text),
      attachmentReference: str(t.attachment_reference),
      testDate: str(t.test_date),
      qualityTopicSlug: str(t.topic_slug),
      qualityTopicName: str(t.topic_name),
      qualityTopicIsPublished: Boolean(t.topic_published),
      independentlyVerified: Boolean(t.independently_verified),
      verificationNotes: str(t.verification_notes),
    })),
  };
}

// ---------------------------------------------------------------------------
// Transparency dimensions
// ---------------------------------------------------------------------------

/**
 * How much a document tells you, broken out by kind — and deliberately never
 * summed.
 *
 * A total would be read as a quality score, and it would be wrong in both
 * directions: a fully documented certificate can describe poor material, and a
 * sparse one can carry a perfectly valid analytical result. There is no honest
 * way to add these up, so the type has no room for a total and nothing computes
 * one.
 *
 * What each dimension reports is which specific fields are present and which are
 * absent, so a reader ends up with questions to ask rather than a number to
 * trust.
 */
export type DimensionState = 'present' | 'partial' | 'absent';

export interface TransparencyDimension {
  readonly key: string;
  readonly label: string;
  readonly state: DimensionState;
  readonly question: string;
  readonly present: readonly string[];
  readonly absent: readonly string[];
}

function dimension(
  key: string,
  label: string,
  question: string,
  fields: readonly [string, unknown][],
): TransparencyDimension {
  const present = fields.filter(([, v]) => v !== null && v !== undefined && v !== '').map(([k]) => k);
  const absent = fields.filter(([, v]) => v === null || v === undefined || v === '').map(([k]) => k);
  const state: DimensionState =
    absent.length === 0 ? 'present' : present.length === 0 ? 'absent' : 'partial';
  return { key, label, question, state, present, absent };
}

/**
 * A dimension measured across the tests rather than across fields.
 *
 * Reported as a count, because "3 of 4 tests state a method" is the useful fact
 * and collapsing it to present/absent loses it in both directions — an earlier
 * version of this said "none of these are stated" about a document that stated
 * three of them.
 */
function perTestDimension(
  key: string,
  label: string,
  question: string,
  itemLabel: string,
  matching: number,
  total: number,
): TransparencyDimension {
  const state: DimensionState =
    total === 0 || matching === 0 ? 'absent' : matching === total ? 'present' : 'partial';
  const line = `${itemLabel}: stated for ${String(matching)} of ${String(total)} tests`;
  return {
    key,
    label,
    question,
    state,
    present: state === 'absent' ? [] : [line],
    absent: state === 'present' ? [] : [line],
  };
}

export function transparencyDimensions(
  certificate: CertificateReading,
): readonly TransparencyDimension[] {
  const tests = certificate.tests;
  const total = tests.length;
  const withMethod = tests.filter((t) => t.analyticalMethod !== null).length;
  const withSpec = tests.filter((t) => t.specificationText !== null).length;
  const withResult = tests.filter(
    (t) => t.resultNumeric !== null || t.resultText !== null,
  ).length;

  return [
    dimension('document-identity', 'Document identity', 'What kind of document is this, and who issued it?', [
      ['Document title', certificate.documentTitle],
      ['Issuing entity', certificate.issuingEntity],
      ['Document date', certificate.documentDate],
      ['Report or certificate number', certificate.reportNumber],
      ['Authorising signature', certificate.authorisedBy],
    ]),
    dimension('batch-linkage', 'Batch linkage', 'Which material does it claim to describe, and how firmly?', [
      ['Batch or lot number', certificate.batchNumber],
      ["Manufacturer's own batch number", certificate.manufacturerBatchNumber],
      ['Laboratory sample identifier', certificate.sampleIdentifier],
      [
        'Chain of custody from batch to sample',
        certificate.chainOfCustodyKnown === true ? 'known' : null,
      ],
      [
        'What was tested (API, bulk, finished product)',
        certificate.testedMaterialScope === 'unknown' ? null : certificate.testedMaterialScope,
      ],
    ]),
    dimension('laboratory-identity', 'Laboratory identity', 'Who performed the analysis?', [
      ['Laboratory name', certificate.laboratoryName],
      ['Laboratory address', certificate.laboratoryAddress],
      ['Laboratory contact', certificate.laboratoryContact],
    ]),
    perTestDimension(
      'method-information',
      'Method information',
      'How was each test carried out?',
      'Analytical method',
      withMethod,
      total,
    ),
    perTestDimension(
      'specification-information',
      'Specification information',
      'What did each result have to meet?',
      'Acceptance criterion',
      withSpec,
      total,
    ),
    perTestDimension(
      'result-information',
      'Result information',
      'What was actually obtained?',
      'Result',
      withResult,
      total,
    ),
    dimension('provenance', 'Provenance', 'Where did the material come from?', [
      ['Original manufacturer named', certificate.manufacturerName],
      ['Manufacturer address', certificate.manufacturerAddress],
      [
        'Manufacturer identity established',
        certificate.manufacturerIdentityEstablished ? 'established' : null,
      ],
      ['Who submitted the sample', certificate.submittedBy],
    ]),
  ];
}
