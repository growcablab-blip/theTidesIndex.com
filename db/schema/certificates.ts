import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import {
  certificateAuthenticityState,
  certificateType,
  chainLinkageState,
  testedMaterialScope,
} from './enums';
import { qualityTopics } from './quality';

/**
 * A certificate or analytical test report, as a document.
 *
 * The question this table exists to answer is not "what does the number say".
 * It is: **does this document actually describe the material in question?**
 *
 * Everything else follows from taking that seriously. The identities are held
 * apart rather than collapsed into one "supplier" field, because Q7 §11.43 and
 * §11.44 hold them apart: the original manufacturer, the repacker who reissued
 * the certificate, and the laboratory that performed the analysis can be three
 * different parties, and which one a document names changes what it establishes.
 *
 * Absent information is stored as null and reported as absent. A field this
 * index does not know is never filled in from a plausible guess, because the
 * whole use of the record is to show a reader what is missing.
 */
export const certificates = pgTable(
  'certificates',
  {
    id: uuid().primaryKey().defaultRandom(),
    certificateKey: text().notNull().unique(),

    // --- Document identity ------------------------------------------------
    certificateType: certificateType().notNull().default('other_unknown'),
    documentTitle: text(),
    /** The party that issued the document. Not necessarily who tested. */
    issuingEntity: text(),
    /** The laboratory that performed the analysis, where the document says. */
    laboratoryName: text(),
    laboratoryAddress: text(),
    laboratoryContact: text(),
    /** The original manufacturer, where identified (Q7 §11.43). */
    manufacturerName: text(),
    manufacturerAddress: text(),
    /** A repacker, agent, broker or distributor in the chain (Q7 §17). */
    distributorName: text(),
    documentDate: date(),
    reportNumber: text(),
    /** How this index came by the document. Never inferred. */
    provenanceNotes: text(),

    // --- Material identity ------------------------------------------------
    statedMaterialName: text(),
    statedGrade: text(),
    statedStrength: text(),
    /** The batch the document claims to describe. */
    batchNumber: text(),
    /** The manufacturer's own batch number, where distinct (Q7 §17.20). */
    manufacturerBatchNumber: text(),
    /** The laboratory's identifier for what it received. */
    sampleIdentifier: text(),
    submittedSampleIdentifier: text(),
    expiryDate: date(),
    retestDate: date(),

    // --- Chain and scope --------------------------------------------------
    testedMaterialScope: testedMaterialScope().notNull().default('unknown'),
    submittedBy: text(),
    /** Null where nothing is known, rather than false. */
    chainOfCustodyKnown: boolean(),
    /**
     * Whether the tested sample is actually tied to the batch in question.
     *
     * A lot number printed on a report is a statement by its issuer, not a
     * demonstrated chain, and the difference is the point of the whole page.
     */
    batchLinkage: chainLinkageState().notNull().default('unknown'),
    manufacturerIdentityEstablished: boolean().notNull().default(false),

    // --- Authorisation ----------------------------------------------------
    /** Signature or named quality personnel, where the document carries one. */
    authorisedBy: text(),

    // --- What it does and does not show -----------------------------------
    whatItDemonstrates: text(),
    whatItDoesNotDemonstrate: text(),
    provenanceGaps: text(),
    /** Fields a document of this type would normally carry and this one lacks. */
    missingFields: jsonb().notNull().default(sql`'[]'::jsonb`),
    unverifiedRelationships: text(),

    // --- Authenticity -----------------------------------------------------
    authenticityState: certificateAuthenticityState().notNull().default('not_checked'),
    authenticityNotes: text(),

    /**
     * A fictional teaching document, published deliberately and labelled as such
     * on every surface that shows it. Distinct from `isDemonstration`, which
     * marks the local editorial fixture and is barred from production.
     */
    isSpecimen: boolean().notNull().default(false),
    isDemonstration: boolean().notNull().default(false),

    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /**
     * A fictional document must say so. The one failure mode worse than an
     * unlabelled real certificate is an unlabelled fake one.
     */
    check(
      'certificates_specimen_declares_itself',
      sql`not ${t.isSpecimen} or ${t.documentTitle} ilike '%specimen%' or ${t.documentTitle} ilike '%demonstration%'`,
    ),
    /** Claiming a verified authenticity state requires saying how it was checked. */
    check(
      'certificates_authenticity_explained',
      sql`authenticity_state = 'not_checked' or ${t.authenticityNotes} is not null`,
    ),
    index('certificates_type_idx').on(t.certificateType),
    index('certificates_batch_idx').on(t.batchNumber),
    index('certificates_specimen_idx').on(t.isSpecimen),
  ],
);

/**
 * One test entry on a certificate.
 *
 * `independentlyVerified` is the field that keeps two very different statements
 * apart: *the document reports this result* and *this index has checked this
 * result*. Every certificate entry is the first. Nothing here has ever been the
 * second, and the default makes that the resting state rather than something an
 * editor must remember to set.
 */
export const certificateTests = pgTable(
  'certificate_tests',
  {
    id: uuid().primaryKey().defaultRandom(),
    certificateId: uuid()
      .notNull()
      .references(() => certificates.id, { onDelete: 'cascade' }),

    testName: text().notNull(),
    analyticalMethod: text(),
    /** The method or reference standard the document names, if any. */
    methodReference: text(),
    referenceStandard: text(),

    /** The acceptance criterion as the document states it. Null = not stated. */
    specificationText: text(),

    resultNumeric: numeric(),
    resultUnit: text(),
    /** For a result that is not a number: "complies", "conforms", "passes". */
    resultText: text(),
    /** A chromatogram or spectrum the document refers to. */
    attachmentReference: text(),
    testDate: date(),

    /** The quality topic this test belongs to, so a result leads to an explainer. */
    qualityTopicId: uuid().references(() => qualityTopics.id, { onDelete: 'restrict' }),

    /**
     * False for everything, always, until someone does the work of checking a
     * reported result against something other than the document reporting it.
     */
    independentlyVerified: boolean().notNull().default(false),
    verificationNotes: text(),

    sortOrder: integer().notNull().default(0),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Verification is a claim about work performed, so it must say what work.
    check(
      'certificate_tests_verification_explained',
      sql`not ${t.independentlyVerified} or ${t.verificationNotes} is not null`,
    ),
    index('certificate_tests_certificate_idx').on(t.certificateId),
    index('certificate_tests_quality_topic_idx').on(t.qualityTopicId),
  ],
);
