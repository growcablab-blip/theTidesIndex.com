import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Seed data is JSON on disk, validated at load time.
 *
 * Keeping the controlled vocabularies as data rather than code means an editor
 * can add a route or a source type without a migration, while the foreign keys
 * in the schema still make an unrecognised value impossible to store.
 */

const dataRoot = new URL('../../data/seed/', import.meta.url);

function loadJson(relativePath: string): unknown {
  const path = fileURLToPath(new URL(relativePath, dataRoot));
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

const evidenceClassSchema = z.enum(['human', 'preclinical', 'reference_opinion']);

const sourceTypeSchema = z.object({
  key: z.string().min(1),
  publicLabel: z.string().min(1),
  description: z.string().nullable().default(null),
  typicalEvidenceClass: evidenceClassSchema.nullable().default(null),
  sortOrder: z.number().int().default(0),
});

const evidenceTypeSchema = z.object({
  key: z.string().min(1),
  publicLabel: z.string().min(1),
  description: z.string().nullable().default(null),
  evidenceClass: evidenceClassSchema,
  isHumanEvidence: z.boolean(),
  isInterpretive: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const routeSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  descriptionSimple: z.string().nullable().default(null),
  descriptionPractitioner: z.string().nullable().default(null),
  generalLimitations: z.string().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

const compoundTypeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().default(null),
  isPeptide: z.boolean(),
  sortOrder: z.number().int().default(0),
});

const compoundCategorySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  description: z.string().nullable().default(null),
  sortOrder: z.number().int().default(0),
});

const qualityTopicSchema = z.object({
  qualityKey: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  /** Editorial navigation grouping. Never a scientific relationship. */
  family: z
    .enum([
      'analytical',
      'microbiological',
      'chemical-physical',
      'manufacturing',
      'handling',
      'documents',
    ])
    .nullable()
    .default(null),
  sortOrder: z.number().int().default(0),
});

const aliasSchema = z.object({
  alias: z.string().min(1),
  aliasType: z.enum([
    'synonym',
    'abbreviation',
    'brand_name',
    'research_code',
    'chemical_name',
    'common_misnomer',
    'related_but_distinct',
  ]),
  notes: z.string().nullable().default(null),
});

const peptideSchema = z.object({
  peptideKey: z.string().min(1),
  canonicalName: z.string().min(1),
  slug: z.string().min(1),
  compoundTypeKey: z.string().min(1),
  primaryCategoryKey: z.string().min(1),
  aliases: z.array(aliasSchema).default([]),
  notes: z.string().optional(),
});

const reviewClockSchema = z.object({
  contentClass: z.enum([
    'foundational_chemistry',
    'general_quality_science',
    'peptide_evidence',
    'investigational_program',
    'regulatory_status',
  ]),
  label: z.string().min(1),
  minMonths: z.number().int().positive(),
  maxMonths: z.number().int().positive(),
  notes: z.string().nullable().default(null),
});

const verificationIssueSchema = z.object({
  issueKey: z.string().min(1),
  topic: z.string().min(1),
  whyItMatters: z.string().min(1),
  currentSourceSignal: z.string().nullable().default(null),
  neededVerification: z.string().nullable().default(null),
  priority: z.string().default('high'),
  relatedKeys: z.array(z.string()).default([]),
});

/**
 * An evidence packet: the claims extracted from one source about one topic,
 * each pinned to an exact location, together with the statements the extraction
 * could not support.
 *
 * Packets are JSON on disk for the same reason the vocabularies are — the
 * material is editorial work, and it should be reviewable as a diff before it is
 * reviewable as a record.
 */
const packetLocationSchema = z.object({
  key: z.string().min(1),
  sourceKey: z.string().min(1),
  locatorText: z.string().min(1),
  pageStart: z.number().int().positive().nullable().default(null),
  pageEnd: z.number().int().positive().nullable().default(null),
  chapter: z.string().nullable().default(null),
  section: z.string().nullable().default(null),
  figure: z.string().nullable().default(null),
  tableNumber: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

const packetEvidenceSchema = z.object({
  locationKey: z.string().min(1),
  evidenceTypeKey: z.string().min(1),
  relationship: z
    .enum(['supports', 'contradicts', 'contextualizes', 'cites'])
    .default('supports'),
  /** How the platform reads this specific passage. Required: a citation with no
   *  reading attached is a pointer, not evidence. */
  interpretation: z.string().min(1),
  populationModel: z.string().nullable().default(null),
});

const packetClaimSchema = z.object({
  claimKey: z.string().min(1),
  claimText: z.string().min(1),
  plainLanguageText: z.string().nullable().default(null),
  claimCategory: z.string().nullable().default(null),
  importance: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  /**
   * Which kind of document a certificate-content requirement governs. Required
   * by the database for any `certificate-content` claim: a requirement with no
   * stated scope is how "Q7 says an API certificate should show X" becomes
   * "every certificate must show X".
   */
  certificateTypeScope: z
    .enum([
      'manufacturer_coa',
      'third_party_test_report',
      'finished_product_release',
      'supplier_repacker_certificate',
      'other_unknown',
    ])
    .nullable()
    .default(null),
  interpretationNotes: z.string().min(1),
  uncertaintyText: z.string().min(1),
  evidence: z.array(packetEvidenceSchema).min(1),
});

const packetGapSchema = z.object({
  gapType: z
    .enum([
      'source_missing',
      'source_inaccessible',
      'source_corrupted',
      'primary_source_missing',
      'no_current_reviewed_evidence',
      'scope_not_established',
      'numerical_threshold_not_established',
      'human_evidence_not_established',
      'route_not_established',
      'safety_not_established',
      'regulatory_status_unverified',
      'terminology_unresolved',
      'conflicting_sources',
      'formulation_unspecified',
      'chain_of_custody_unknown',
    ])
    .default('no_current_reviewed_evidence'),
  statement: z.string().min(1),
  why: z.string().min(1),
  whatWouldResolveIt: z.string().nullable().default(null),
  verificationIssueKey: z.string().nullable().default(null),
});

const packetTopicSchema = z.object({
  shortDescription: z.string().min(1),
  simpleSummary: z.string().min(1),
  practitionerSummary: z.string().min(1),
  whatItProves: z.string().min(1),
  whatItDoesNotProve: z.string().min(1),
  commonMisinterpretations: z.string().nullable().default(null),
});

const evidencePacketSchema = z.object({
  packetKey: z.string().min(1),
  qualityKey: z.string().min(1),
  note: z.string().min(1),
  topic: packetTopicSchema,
  locations: z.array(packetLocationSchema).min(1),
  claims: z.array(packetClaimSchema).min(1),
  notYetSupported: z.array(packetGapSchema).default([]),
});

export type EvidencePacket = z.infer<typeof evidencePacketSchema>;

// ---------------------------------------------------------------------------
// Compound evidence packets
// ---------------------------------------------------------------------------

/**
 * The same extraction discipline, applied to a compound.
 *
 * A quality topic and a compound need the same four things — located claims, a
 * recorded reading, a stated uncertainty, and a list of what the sources do not
 * settle — so those parts are shared verbatim rather than re-specified.
 *
 * What a compound adds is everything that can *differ between sources* about
 * the same substance: which routes have been reported, what regimens were
 * described and by whom, where sources disagree, and what a regulator has said
 * in which jurisdiction on which date. Each is a separate relation because each
 * has a different provenance and a different half-life, and because flattening
 * them into prose is exactly how "one source reported 250 mcg twice daily"
 * becomes "the dose is 500 mcg a day".
 */
const packetRouteSchema = z.object({
  routeKey: z.string().min(1),
  evidenceTypeKey: z.string().min(1),
  locationKey: z.string().min(1),
  /** Who or what it was reported in. Never omitted: a route without a
   *  population is a route for nobody in particular. */
  populationModel: z.string().min(1),
  formulation: z.string().nullable().default(null),
  pkNotes: z.string().nullable().default(null),
  limitationsNotes: z.string().min(1),
});

const packetProtocolSchema = z.object({
  protocolKey: z.string().min(1),
  /** The purpose the *source* framed it for, in the source's own terms. */
  objectiveContext: z.string().min(1),
  populationModel: z.string().min(1),
  routeKey: z.string().min(1),
  formulation: z.string().nullable().default(null),
  /**
   * What this regimen is and is not, stated on the record itself.
   *
   * Required, because a regimen rendered without it reads as a
   * recommendation — and none of these is one.
   */
  regulatoryContext: z.string().min(1),
  evidenceTypeKey: z.string().min(1),
  amountReported: z.string().nullable().default(null),
  amountUnit: z.string().nullable().default(null),
  frequencyText: z.string().nullable().default(null),
  durationText: z.string().nullable().default(null),
  monitoringText: z.string().nullable().default(null),
  contraindicationsText: z.string().nullable().default(null),
  safetyNotes: z.string().nullable().default(null),
  locationKey: z.string().min(1),
  /**
   * Always false in a packet, and not configurable.
   *
   * `patient_visibility` is what the simple-mode query filters on. A packet is
   * a bulk import; letting one set it would put a source-reported amount in
   * front of a patient because somebody typed `true` in a JSON file.
   */
  patientVisibility: z.literal(false).default(false),
});

const packetDisagreementSchema = z.object({
  disagreementKey: z.string().min(1),
  topic: z.string().min(1),
  plainLanguageText: z.string().min(1),
  candidateExplanation: z
    .enum(['route', 'formulation', 'population', 'dose', 'study_design', 'terminology', 'date', 'unresolved'])
    .default('unresolved'),
  explanationNotes: z.string().min(1),
  /** What would settle it. Never "more research": a kind of source. */
  resolutionRequirement: z.string().min(1),
  positions: z
    .array(
      z.object({
        locationKey: z.string().min(1),
        evidenceTypeKey: z.string().min(1),
        positionText: z.string().min(1),
      }),
    )
    .min(2),
});

const packetRegulatorySchema = z.object({
  jurisdiction: z.string().min(1),
  indicationContext: z.string().min(1),
  status: z.enum([
    'approved',
    'authorized_limited',
    'investigational_clinical',
    'preclinical',
    'discontinued',
    'withdrawn',
    'not_approved',
    'unknown',
  ]),
  authority: z.string().min(1),
  locationKey: z.string().min(1),
  /** The date the status was read from the source. Regulatory status decays. */
  checkedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().min(1),
});

const packetCompoundSchema = z.object({
  shortDescription: z.string().min(1),
  simpleSummary: z.string().min(1),
  practitionerSummary: z.string().min(1),
  /** What is not established. Required before a compound record can publish. */
  unknownsSummary: z.string().min(1),
  aliases: z.array(z.object({ alias: z.string().min(1), note: z.string().min(1) })).default([]),
  sequence: z.string().nullable().default(null),
  molecularDescription: z.string().nullable().default(null),
  naturalOrSynthetic: z.string().nullable().default(null),
  /** Naming problems a reader will meet elsewhere. Null where there are none. */
  nomenclatureNote: z.string().nullable().default(null),
});

const compoundPacketSchema = z.object({
  packetKey: z.string().min(1),
  peptideKey: z.string().min(1),
  note: z.string().min(1),
  compound: packetCompoundSchema,
  locations: z.array(packetLocationSchema).min(1),
  claims: z.array(packetClaimSchema).min(1),
  notYetSupported: z.array(packetGapSchema).default([]),
  routes: z.array(packetRouteSchema).default([]),
  protocols: z.array(packetProtocolSchema).default([]),
  disagreements: z.array(packetDisagreementSchema).default([]),
  regulatory: z.array(packetRegulatorySchema).default([]),
});

export type CompoundPacket = z.infer<typeof compoundPacketSchema>;

/**
 * Parses a packet, naming the file and the field when it is malformed.
 *
 * A raw validation dump says `path: ["topic","whatItProves"]` against an
 * unnamed object, which tells an editor nothing about which of several packet
 * files to open. The same principle as the quality-map loader: an error should
 * name the line somebody has to go and fix.
 */
const NEWLINE = String.fromCharCode(10);

/**
 * Strings that mean "this field is empty" and must not be stored as though it
 * were full.
 *
 * The same defect twice: a structured field carrying `"Not stated"` counted as
 * populated, because a string existed. Absence belongs in the database as NULL;
 * "Not stated" belongs in the presentation layer.
 */
const PLACEHOLDER_STRINGS = new Set([
  'n/a', 'na', 'n.a.', 'not stated', 'notstated', 'unknown', 'none',
  'not applicable', 'not available', 'not specified', 'not recorded',
  'tbd', 'tba', 'null', 'nil', '-', '--', '?', '',
]);

export function isPlaceholderString(value: string): boolean {
  return PLACEHOLDER_STRINGS.has(value.trim().toLowerCase());
}

/**
 * A structured metadata field: a value, or null, and never a string standing in
 * for null. Mirrors the database constraint so a fixture fails at load with a
 * readable message rather than at insert with a constraint name.
 *
 * Not for prose, and not for a source-reported result — `"Not determined"` in a
 * result field is what the document says, which is a finding rather than a hole.
 */
const structuredField = () =>
  z
    .string()
    .nullable()
    .default(null)
    .refine((v) => v === null || !isPlaceholderString(v), {
      message:
        'record absence as null, not as a placeholder string; the interface renders "Not stated"',
    });

function parsePacket(file: string): EvidencePacket {
  const result = evidencePacketSchema.safeParse(loadJson(file));
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  data/seed/${file} → ${issue.path.join('.')}: ${issue.message}`)
    .join(NEWLINE);
  throw new Error(`Evidence packet is incomplete.${NEWLINE}${problems}`);
}

function parseCompoundPacket(file: string): CompoundPacket {
  const result = compoundPacketSchema.safeParse(loadJson(file));
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  data/seed/${file} → ${issue.path.join(".")}: ${issue.message}`)
    .join(NEWLINE);
  throw new Error(`Compound evidence packet is incomplete.${NEWLINE}${problems}`);
}

/** Packets are listed explicitly: adding one is an editorial decision. */
const EVIDENCE_PACKET_FILES = [
  'evidence/hplc-purity.json',
  'evidence/coa-literacy.json',
  'evidence/identity-testing.json',
  'evidence/peptide-content-assay.json',
] as const;

const COMPOUND_PACKET_FILES = [
  'evidence/tesamorelin.json',
  'evidence/bpc-157.json',
] as const;

/**
 * The quality map: typed edges between quality topics.
 *
 * `claimKey` and `gapKey` are the edge's basis. The database refuses a
 * `commonly_conflated` or `not_addressed_by` edge that has neither, because
 * those two say something about what a test establishes and must resolve to the
 * evidence layer rather than restating it.
 */
const qualityEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  relationshipType: z.enum([
    'complementary',
    'commonly_conflated',
    'not_addressed_by',
    'same_process',
    'other_attribute',
    'scoped_by',
  ]),
  rationale: z.string().min(1),
  claimKey: z.string().nullable().default(null),
  gapKey: z.string().nullable().default(null),
  isEditorialNavigational: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
});

const qualityMapSchema = z.object({
  note: z.string().min(1),
  edges: z.array(qualityEdgeSchema).min(1),
});

export type QualityEdge = z.infer<typeof qualityEdgeSchema>;

/**
 * The specimen certificate: a fictional teaching document.
 *
 * Loaded as ordinary content rather than as demonstration data, because it is
 * meant to be published and read. What makes it safe is that it is fictional and
 * declares itself so in its own title — a database constraint enforces the
 * second part.
 */
const specimenTestSchema = z.object({
  testName: z.string().min(1),
  analyticalMethod: structuredField(),
  methodReference: structuredField(),
  referenceStandard: structuredField(),
  specificationText: structuredField(),
  resultNumeric: z.string().nullable().default(null),
  resultUnit: structuredField(),
  resultText: z.string().nullable().default(null),
  attachmentReference: structuredField(),
  testDate: z.string().nullable().default(null),
  qualityKey: z.string().min(1),
  sortOrder: z.number().int().default(0),
  /** Why this entry is on the specimen. Shown beside it, never as a finding. */
  teachingNote: z.string().min(1),
});

const specimenCertificateSchema = z.object({
  note: z.string().min(1),
  certificateKey: z.string().min(1),
  certificateType: z.enum([
    'manufacturer_coa',
    'third_party_test_report',
    'finished_product_release',
    'supplier_repacker_certificate',
    'other_unknown',
  ]),
  documentTitle: z.string().min(1),
  issuingEntity: structuredField(),
  laboratoryName: structuredField(),
  laboratoryAddress: structuredField(),
  laboratoryContact: structuredField(),
  manufacturerName: structuredField(),
  manufacturerAddress: structuredField(),
  distributorName: structuredField(),
  documentDate: z.string().nullable().default(null),
  reportNumber: structuredField(),
  provenanceNotes: z.string().nullable().default(null),
  statedMaterialName: structuredField(),
  statedGrade: structuredField(),
  statedStrength: structuredField(),
  batchNumber: structuredField(),
  manufacturerBatchNumber: structuredField(),
  sampleIdentifier: structuredField(),
  submittedSampleIdentifier: structuredField(),
  expiryDate: z.string().nullable().default(null),
  retestDate: z.string().nullable().default(null),
  testedMaterialScope: z.enum(['api', 'intermediate', 'bulk_material', 'finished_product', 'unknown']),
  submittedBy: structuredField(),
  chainOfCustodyKnown: z.boolean().nullable().default(null),
  batchLinkage: z.enum(['established', 'stated_only', 'not_established', 'unknown']),
  manufacturerIdentityEstablished: z.boolean().default(false),
  authorisedBy: structuredField(),
  whatItDemonstrates: z.string().min(1),
  whatItDoesNotDemonstrate: z.string().min(1),
  provenanceGaps: z.string().nullable().default(null),
  missingFields: z.array(z.string()).default([]),
  unverifiedRelationships: z.string().nullable().default(null),
  authenticityState: z.enum([
    'not_checked',
    'issuer_verified',
    'report_identifier_verified',
    'laboratory_verified',
    'retrieved_from_issuer',
    'discrepancy_detected',
    'unable_to_verify',
  ]),
  authenticityNotes: z.string().nullable().default(null),
  tests: z.array(specimenTestSchema).min(1),
});

export type SpecimenCertificate = z.infer<typeof specimenCertificateSchema>;

/** The source registry, as recorded in SOURCE_MANIFEST.json at the repo root. */
const manifestSourceSchema = z.object({
  source_key: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  year: z.number().int().nullable().default(null),
  source_type: z.string().min(1),
  publisher: z.string().nullable().default(null),
  publication_name: z.string().nullable().default(null),
  priority: z.string().optional(),
  qc_status: z.enum(['usable', 'incomplete', 'replace', 'pending', 'exclude']),
  canonical_filename: z.string().nullable().default(null),
  known_local_filename: z.string().nullable().default(null),
  primary_role: z.string().nullable().default(null),
  public_fulltext_allowed: z.boolean(),
  authority_notes: z.string().nullable().default(null),
  limitations_notes: z.string().nullable().default(null),
  isbn: z.string().nullable().default(null),
  edition: z.string().nullable().default(null),
  // Written by the source-integrity audit (verification issue V-014).
  local_file_sha256: z.string().nullable().default(null),
  local_file_bytes: z.number().int().nullable().default(null),
  page_count: z.number().int().nullable().default(null),
  /** Printed page + offset = page of the held file. Null where they agree. */
  printed_page_offset: z.number().int().nullable().default(null),
  /** Whether a copy is actually held, and why not where it is not. */
  access_status: z
    .enum(['held', 'subscription_required', 'public_not_yet_retrieved', 'unavailable', 'unknown'])
    .default('unknown'),
  access_notes: z.string().nullable().default(null),
  /** The source this copy was acquired to supersede, where it replaces one. */
  replaces_source_key: z.string().nullable().default(null),
  title_page_verified: z.boolean().default(false),
  bibliographic_verified: z.boolean().default(false),
  title_page_title: z.string().nullable().default(null),
  title_page_authors: z.string().nullable().default(null),
  integrity_notes: z.string().nullable().default(null),
  verified_at: z.string().nullable().default(null),
  verified_by: z.string().nullable().default(null),
});

const manifestSchema = z.object({
  project: z.string(),
  version: z.string(),
  sources: z.array(manifestSourceSchema),
});

/** The authoritative list of vocabulary keys shipped with the handoff. */
const evidenceTaxonomySchema = z.object({
  source_types: z.array(z.string()),
  evidence_types: z.array(z.string()),
  verification_statuses: z.array(z.string()),
});

export const seedData = {
  sourceTypes: z.array(sourceTypeSchema).parse(loadJson('taxonomy/source_types.json')),
  evidenceTypes: z.array(evidenceTypeSchema).parse(loadJson('taxonomy/evidence_types.json')),
  routes: z.array(routeSchema).parse(loadJson('taxonomy/routes.json')),
  compoundTypes: z.array(compoundTypeSchema).parse(loadJson('taxonomy/compound_types.json')),
  compoundCategories: z
    .array(compoundCategorySchema)
    .parse(loadJson('taxonomy/compound_categories.json')),
  qualityTopics: z.array(qualityTopicSchema).parse(loadJson('quality_topics.json')),
  peptides: z.array(peptideSchema).parse(loadJson('peptides.json')),
  reviewClocks: z.array(reviewClockSchema).parse(loadJson('review_clocks.json')),
  verificationIssues: z
    .array(verificationIssueSchema)
    .parse(loadJson('verification_issues.json')),
  evidenceTaxonomy: evidenceTaxonomySchema.parse(loadJson('evidence_taxonomy.json')),
  evidencePackets: EVIDENCE_PACKET_FILES.map((file) => parsePacket(file)),
  compoundPackets: COMPOUND_PACKET_FILES.map((file) => parseCompoundPacket(file)),
  qualityMap: qualityMapSchema.parse(loadJson('quality_map.json')),
  specimenCertificate: specimenCertificateSchema.parse(
    loadJson('certificates/specimen-coa.json'),
  ),
  sourceManifest: manifestSchema.parse(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url)), 'utf8'),
    ) as unknown,
  ),
};

export type SeedData = typeof seedData;
