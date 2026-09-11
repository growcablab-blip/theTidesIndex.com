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
  interpretationNotes: z.string().min(1),
  uncertaintyText: z.string().min(1),
  evidence: z.array(packetEvidenceSchema).min(1),
});

const packetGapSchema = z.object({
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

/** Packets are listed explicitly: adding one is an editorial decision. */
const EVIDENCE_PACKET_FILES = ['evidence/hplc-purity.json'] as const;

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
  evidencePackets: EVIDENCE_PACKET_FILES.map((file) =>
    evidencePacketSchema.parse(loadJson(file)),
  ),
  sourceManifest: manifestSchema.parse(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url)), 'utf8'),
    ) as unknown,
  ),
};

export type SeedData = typeof seedData;
