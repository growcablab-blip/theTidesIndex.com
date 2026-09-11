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

/** The source registry, as recorded in SOURCE_MANIFEST.json at the repo root. */
const manifestSourceSchema = z.object({
  source_key: z.string().min(1),
  title: z.string().min(1),
  authors: z.array(z.string()).default([]),
  year: z.number().int().nullable().default(null),
  source_type: z.string().min(1),
  priority: z.string().optional(),
  qc_status: z.enum(['usable', 'incomplete', 'replace', 'pending', 'exclude']),
  canonical_filename: z.string().nullable().default(null),
  known_local_filename: z.string().nullable().default(null),
  primary_role: z.string().nullable().default(null),
  public_fulltext_allowed: z.boolean(),
  authority_notes: z.string().nullable().default(null),
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
  sourceManifest: manifestSchema.parse(
    JSON.parse(
      readFileSync(fileURLToPath(new URL('../../SOURCE_MANIFEST.json', import.meta.url)), 'utf8'),
    ) as unknown,
  ),
};

export type SeedData = typeof seedData;
