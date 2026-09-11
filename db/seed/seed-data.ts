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

/**
 * Parses a packet, naming the file and the field when it is malformed.
 *
 * A raw validation dump says `path: ["topic","whatItProves"]` against an
 * unnamed object, which tells an editor nothing about which of several packet
 * files to open. The same principle as the quality-map loader: an error should
 * name the line somebody has to go and fix.
 */
const NEWLINE = String.fromCharCode(10);

function parsePacket(file: string): EvidencePacket {
  const result = evidencePacketSchema.safeParse(loadJson(file));
  if (result.success) return result.data;

  const problems = result.error.issues
    .map((issue) => `  data/seed/${file} → ${issue.path.join('.')}: ${issue.message}`)
    .join(NEWLINE);
  throw new Error(`Evidence packet is incomplete.${NEWLINE}${problems}`);
}

/** Packets are listed explicitly: adding one is an editorial decision. */
const EVIDENCE_PACKET_FILES = [
  'evidence/hplc-purity.json',
  'evidence/coa-literacy.json',
  'evidence/identity-testing.json',
  'evidence/peptide-content-assay.json',
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
  analyticalMethod: z.string().nullable().default(null),
  methodReference: z.string().nullable().default(null),
  referenceStandard: z.string().nullable().default(null),
  specificationText: z.string().nullable().default(null),
  resultNumeric: z.string().nullable().default(null),
  resultUnit: z.string().nullable().default(null),
  resultText: z.string().nullable().default(null),
  attachmentReference: z.string().nullable().default(null),
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
  issuingEntity: z.string().nullable().default(null),
  laboratoryName: z.string().nullable().default(null),
  laboratoryAddress: z.string().nullable().default(null),
  laboratoryContact: z.string().nullable().default(null),
  manufacturerName: z.string().nullable().default(null),
  manufacturerAddress: z.string().nullable().default(null),
  distributorName: z.string().nullable().default(null),
  documentDate: z.string().nullable().default(null),
  reportNumber: z.string().nullable().default(null),
  provenanceNotes: z.string().nullable().default(null),
  statedMaterialName: z.string().nullable().default(null),
  statedGrade: z.string().nullable().default(null),
  statedStrength: z.string().nullable().default(null),
  batchNumber: z.string().nullable().default(null),
  manufacturerBatchNumber: z.string().nullable().default(null),
  sampleIdentifier: z.string().nullable().default(null),
  submittedSampleIdentifier: z.string().nullable().default(null),
  expiryDate: z.string().nullable().default(null),
  retestDate: z.string().nullable().default(null),
  testedMaterialScope: z.enum(['api', 'intermediate', 'bulk_material', 'finished_product', 'unknown']),
  submittedBy: z.string().nullable().default(null),
  chainOfCustodyKnown: z.boolean().nullable().default(null),
  batchLinkage: z.enum(['established', 'stated_only', 'not_established', 'unknown']),
  manufacturerIdentityEstablished: z.boolean().default(false),
  authorisedBy: z.string().nullable().default(null),
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
