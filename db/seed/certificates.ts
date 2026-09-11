import { eq, sql } from 'drizzle-orm';
import * as schema from '../schema';
import type { SeedDb } from './index';
import { seedData } from './seed-data';

/**
 * Loads the specimen certificate.
 *
 * A teaching document has to be fictional and has to say so, on every surface
 * that shows it and in its own title — a check constraint enforces the second
 * part, because an unlabelled fake certificate is worse than an unlabelled real
 * one.
 *
 * It is deliberately imperfect. A tidy specimen would teach a reader to look for
 * tidiness; this one omits the manufacturer, states no limit for two of its four
 * results, lists a test that was never performed, and rests its batch linkage on
 * the word of the party selling the material. The omissions are the lesson.
 *
 * Every test entry loads with `independentlyVerified` false. Nothing in this
 * index has checked a reported result against anything but the document
 * reporting it, and the column defaults to false so that staying honest is the
 * resting state rather than something an editor must remember.
 */
export async function loadSpecimenCertificate(db: SeedDb): Promise<number> {
  const spec = seedData.specimenCertificate;

  const topics = await db
    .select({ id: schema.qualityTopics.id, qualityKey: schema.qualityTopics.qualityKey })
    .from(schema.qualityTopics);
  const topicIds = new Map(topics.map((t) => [t.qualityKey, t.id]));

  const [certificate] = await db
    .insert(schema.certificates)
    .values({
      certificateKey: spec.certificateKey,
      certificateType: spec.certificateType,
      documentTitle: spec.documentTitle,
      issuingEntity: spec.issuingEntity,
      laboratoryName: spec.laboratoryName,
      laboratoryAddress: spec.laboratoryAddress,
      laboratoryContact: spec.laboratoryContact,
      manufacturerName: spec.manufacturerName,
      manufacturerAddress: spec.manufacturerAddress,
      distributorName: spec.distributorName,
      documentDate: spec.documentDate,
      reportNumber: spec.reportNumber,
      provenanceNotes: spec.provenanceNotes,
      statedMaterialName: spec.statedMaterialName,
      statedGrade: spec.statedGrade,
      statedStrength: spec.statedStrength,
      batchNumber: spec.batchNumber,
      manufacturerBatchNumber: spec.manufacturerBatchNumber,
      sampleIdentifier: spec.sampleIdentifier,
      submittedSampleIdentifier: spec.submittedSampleIdentifier,
      expiryDate: spec.expiryDate,
      retestDate: spec.retestDate,
      testedMaterialScope: spec.testedMaterialScope,
      submittedBy: spec.submittedBy,
      chainOfCustodyKnown: spec.chainOfCustodyKnown,
      batchLinkage: spec.batchLinkage,
      manufacturerIdentityEstablished: spec.manufacturerIdentityEstablished,
      authorisedBy: spec.authorisedBy,
      whatItDemonstrates: spec.whatItDemonstrates,
      whatItDoesNotDemonstrate: spec.whatItDoesNotDemonstrate,
      provenanceGaps: spec.provenanceGaps,
      missingFields: spec.missingFields,
      unverifiedRelationships: spec.unverifiedRelationships,
      authenticityState: spec.authenticityState,
      authenticityNotes: spec.authenticityNotes,
      // Published teaching content, not the local editorial fixture. The
      // production guard counts `isDemonstration`, and this must not trip it.
      isSpecimen: true,
      isDemonstration: false,
    })
    .onConflictDoUpdate({
      target: schema.certificates.certificateKey,
      set: {
        documentTitle: sql`excluded.document_title`,
        whatItDemonstrates: sql`excluded.what_it_demonstrates`,
        whatItDoesNotDemonstrate: sql`excluded.what_it_does_not_demonstrate`,
        provenanceGaps: sql`excluded.provenance_gaps`,
        missingFields: sql`excluded.missing_fields`,
        unverifiedRelationships: sql`excluded.unverified_relationships`,
        batchLinkage: sql`excluded.batch_linkage`,
      },
    })
    .returning({ id: schema.certificates.id });

  if (certificate === undefined) return 0;

  // Replaced wholesale rather than merged: the tests are the document, and a
  // half-updated document is a different document.
  await db
    .delete(schema.certificateTests)
    .where(eq(schema.certificateTests.certificateId, certificate.id));

  const rows = spec.tests.map((test) => ({
    certificateId: certificate.id,
    testName: test.testName,
    analyticalMethod: test.analyticalMethod,
    methodReference: test.methodReference,
    referenceStandard: test.referenceStandard,
    specificationText: test.specificationText,
    resultNumeric: test.resultNumeric,
    resultUnit: test.resultUnit,
    resultText: test.resultText,
    attachmentReference: test.attachmentReference,
    testDate: test.testDate,
    qualityTopicId: topicIds.get(test.qualityKey) ?? null,
    independentlyVerified: false,
    verificationNotes: null,
    sortOrder: test.sortOrder,
  }));

  if (rows.length > 0) await db.insert(schema.certificateTests).values(rows);
  return rows.length;
}
