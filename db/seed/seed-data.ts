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
  /**
   * How far this passage has been traced back to the research itself. The
   * default is the honest one: nobody has looked.
   */
  primaryTrace: z
    .enum([
      'not_attempted',
      'cited_not_obtained',
      'abstract_only',
      'full_text_supports',
      'full_text_partially_supports',
      'full_text_does_not_support',
      'full_text_different_context',
      'primary_source_is_cited',
    ])
    .default('not_attempted'),
  primaryTraceNote: z.string().nullable().default(null),
});

/**
 * Who funded the study behind a source.
 *
 * Attaches to a source rather than to a claim, because it is a property of the
 * study. Recorded as context: nothing scores a finding by its sponsor.
 */
const packetFundingSchema = z.object({
  fundingKey: z.string().min(1),
  sourceKey: z.string().min(1),
  /** Where the disclosure was read. Required unless nobody has checked. */
  locationKey: z.string().nullable().default(null),
  funderKind: z.enum([
    'industry',
    'government',
    'academic_institution',
    'foundation_or_charity',
    'mixed',
    'none_declared',
    'not_reported_in_source',
    'not_checked',
  ]),
  sponsorName: z.string().nullable().default(null),
  manufacturerInvolved: z.boolean().nullable().default(null),
  institution: z.string().nullable().default(null),
  grantReference: z.string().nullable().default(null),
  disclosureText: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
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
  /**
   * What it would be useful for somebody to study, derived from this absence.
   *
   * Both fields or neither — a database constraint enforces it. The wording
   * must describe what would be useful to *study*, never what somebody should
   * personally try; that line is the difference between a research platform
   * and a recommendation engine.
   */
  researchQuestion: z.string().min(1).nullable().default(null),
  opportunityType: z
    .enum([
      'identity_clarification',
      'human_evidence',
      'human_safety',
      'human_pharmacokinetics',
      'route_comparison',
      'formulation_comparison',
      'dose_response',
      'independent_replication',
      'long_term_outcomes',
      'mechanism_confirmation',
      'protocol_validation',
      'product_characterisation',
      'regulatory_position',
    ])
    .nullable()
    .default(null),
  /**
   * What later evidence did to this absence (migration 0026). A gap is never
   * deleted when evidence arrives; it changes state and says why.
   */
  resolution: z
    .object({
      state: z.enum(['open', 'partially_resolved', 'resolved', 'superseded']),
      note: z.string().min(1),
      checkedAt: z.string().min(1),
    })
    .nullable()
    .default(null),
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
  /** When in the day, or relative to what: "AM", "before bedtime". */
  timingText: z.string().nullable().default(null),
  durationText: z.string().nullable().default(null),
  /** On/off structure as reported: "3 months on, 1 month off". */
  cycleText: z.string().nullable().default(null),
  titrationText: z.string().nullable().default(null),
  /** What the source reports it alongside. Never an endorsement of the pairing. */
  combinationsText: z.string().nullable().default(null),
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

const packetDisagreementSchema = z
  .object({
    disagreementKey: z.string().min(1),
    topic: z.string().min(1),
    plainLanguageText: z.string().min(1),
    candidateExplanation: z
      .enum([
        'route',
        'formulation',
        'population',
        'dose',
        'study_design',
        'terminology',
        'date',
        'chemical_form',
        'reporting_threshold',
        'unresolved',
      ])
      .default('unresolved'),
    explanationNotes: z.string().min(1),
    /**
     * Whether the difference has been settled. Separate from the axis above:
     * two sources can differ on formulation with nobody having established
     * that formulation is why.
     */
    resolution: z
      .enum([
        'unresolved',
        'resolved_different_formulation',
        'resolved_different_population',
        'resolved_different_study_condition',
        'resolved_different_chemical_form',
        'resolved_different_reporting_threshold',
        'source_error_confirmed',
        'secondary_source_less_precise',
        'regulatory_source_more_specific',
        'index_error_confirmed',
      ])
      .default('unresolved'),
    /** What settled it. Required for any resolution but `unresolved`. */
    resolutionBasis: z.string().min(1).nullable().default(null),
    resolvedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .default(null),
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
  })
  .refine((d) => d.resolution === 'unresolved' || d.resolutionBasis !== null, {
    message:
      'a resolved disagreement must carry resolutionBasis: what established it',
    path: ['resolutionBasis'],
  });

/**
 * A marketed product of the compound.
 *
 * Kept apart from the molecule because strength, reconstitution, storage, dose
 * and pharmacokinetics belong to the product, and three tesamorelin products
 * differ in all five while sharing one active substance.
 */
/**
 * One source's statement about what a name refers to.
 *
 * `nameUsed` is the name exactly as the source writes it. Normalising it would
 * destroy the evidence, because the whole subject here is that one name is used
 * by different sources for different molecules.
 */
const packetIdentitySchema = z.object({
  identityKey: z.string().min(1),
  nameUsed: z.string().min(1),
  chemicalForm: z.string().nullable().default(null),
  sequence: z.string().nullable().default(null),
  residueCount: z.number().int().nullable().default(null),
  molecularWeight: z.number().nullable().default(null),
  weightBasis: z.string().nullable().default(null),
  form: z
    .enum(['full_length', 'fragment', 'analogue', 'preparation', 'unspecified'])
    .default('unspecified'),
  verification: z
    .enum([
      'analytically_characterised',
      'stated_by_primary_source',
      'stated_by_secondary_source',
      'asserted_without_detail',
      'contradicted',
    ])
    .default('asserted_without_detail'),
  /** Where the source is using the name. Never omitted. */
  usageContext: z.string().min(1),
  notes: z.string().nullable().default(null),
  evidenceTypeKey: z.string().min(1),
  locationKey: z.string().min(1),
});

/**
 * How far a finding has been repeated, and by whom.
 *
 * `basis` is required. A replication claim with no working shown is an opinion
 * wearing a taxonomy, and the database refuses the two independent states
 * without at least two groups behind them.
 */
const packetReplicationSchema = z.object({
  assessmentKey: z.string().min(1),
  finding: z.string().min(1),
  state: z
    .enum([
      'single_study',
      'repeated_same_group',
      'independent_group',
      'independent_multiple_countries',
      'confirmed_in_humans',
      'conflicting_replication',
      'failed_replication',
      'not_assessed',
    ])
    .default('not_assessed'),
  studyCount: z.number().int().nullable().default(null),
  groupCount: z.number().int().nullable().default(null),
  countryCount: z.number().int().nullable().default(null),
  models: z.string().nullable().default(null),
  humanConfirmed: z.boolean().default(false),
  basis: z.string().min(1),
  limitations: z.string().nullable().default(null),
  supportingRecords: z.string().nullable().default(null),
});

const packetProductSchema = z.object({
  productKey: z.string().min(1),
  productName: z.string().min(1),
  proprietaryName: z.string().nullable().default(null),
  manufacturer: z.string().nullable().default(null),
  authority: z.string().nullable().default(null),
  jurisdiction: z.string().nullable().default(null),
  applicationNumber: z.string().nullable().default(null),
  marketingStatus: z.string().nullable().default(null),
  presentation: z.string().nullable().default(null),
  strengthText: z.string().nullable().default(null),
  reconstitutionText: z.string().nullable().default(null),
  labelledDoseText: z.string().nullable().default(null),
  storageText: z.string().nullable().default(null),
  excipientsText: z.string().nullable().default(null),
  substitutabilityNote: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  locationKey: z.string().min(1),
});

/** A chemical form and the weight that belongs to it. */
const packetFormSchema = z.object({
  formKey: z.string().min(1),
  chemicalForm: z.string().min(1),
  molecularFormula: z.string().nullable().default(null),
  molecularWeight: z.number().nullable().default(null),
  /** Required whenever a weight is given: what the weight is the weight of. */
  weightBasis: z.string().nullable().default(null),
  /** False when the source gave a number without saying which form it meant. */
  formStatedBySource: z.boolean().default(true),
  notes: z.string().nullable().default(null),
  locationKey: z.string().min(1),
});

/** One PK result with the conditions that produced it. */
const packetPkSchema = z.object({
  observationKey: z.string().min(1),
  productKey: z.string().nullable().default(null),
  parameter: z.string().min(1),
  valueText: z.string().min(1),
  doseContext: z.string().nullable().default(null),
  administration: z.enum(['single_dose', 'repeat_dose', 'not_stated']).default('not_stated'),
  /** Never omitted. A PK value with no population is a value about nobody. */
  population: z.string().min(1),
  routeKey: z.string().nullable().default(null),
  studyCondition: z.string().nullable().default(null),
  evidenceTypeKey: z.string().min(1),
  notes: z.string().nullable().default(null),
  locationKey: z.string().min(1),
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
  products: z.array(packetProductSchema).default([]),
  forms: z.array(packetFormSchema).default([]),
  pharmacokinetics: z.array(packetPkSchema).default([]),
  identities: z.array(packetIdentitySchema).default([]),
  replication: z.array(packetReplicationSchema).default([]),
  funding: z.array(packetFundingSchema).default([]),
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
  // Sterility, endotoxin and lyophilisation: added from the 14 September 2026
  // intake, resting on EU GMP Annex 1, FDA ORA.007, USP research copies and an
  // open-access freeze-drying review.
  'evidence/sterility.json',
  'evidence/bacterial-endotoxin.json',
  'evidence/lyophilization.json',
  // Formulation: the registered book is not held; answered from an open-access
  // formulation review and ICH Q1A(R2)/Q5C, each cited as itself.
  'evidence/formulation-excipients.json',
  'evidence/coa-literacy.json',
  'evidence/identity-testing.json',
  'evidence/peptide-content-assay.json',
  'evidence/peptide-synthesis-spps.json',
  'evidence/purification.json',
  'evidence/storage-stability.json',
  'evidence/batch-traceability.json',
  'evidence/transport-excursions.json',
] as const;

/**
 * A literature screen: a search, its criteria, and every record it returned.
 *
 * Generated by `scripts/literature/screen-bpc-157.py` rather than written by
 * hand, so that the classification can be reproduced from the query instead of
 * trusted. `resultCount` is the size of the universe, never a count of studies —
 * the distinction the previous sprint identified and this file makes checkable.
 */
const screenRecordSchema = z.object({
  pmid: z.string().min(1),
  title: z.string().min(1),
  year: z.string(),
  journal: z.string(),
  publicationTypes: z.array(z.string()).default([]),
  studyType: z.enum([
    'human_interventional',
    'human_observational',
    'case_report',
    'human_pk_safety',
    'animal_in_vivo',
    'ex_vivo',
    'in_vitro',
    'review',
    'commentary_editorial',
    'other_peripheral',
    'withdrawn',
    'human_biomarker',
    'analytical_method',
    'false_match',
  ]),
  evidenceClass: z.enum(['human', 'preclinical', 'not_evidence']),
  included: z.boolean(),
  primaryOrSecondary: z.enum(['primary', 'secondary']),
  peptideIdentityCertainty: z.string().min(1),
  fullTextStatus: z.string().min(1),
  classifiedBy: z.enum(['rule', 'manual']),
  reason: z.string().min(1),
  country: z.string().nullable().default(null),
  language: z.string().nullable().default(null),
  researchGroup: z.string().nullable().default(null),
});

const literatureScreenSchema = z.object({
  screenKey: z.string().min(1),
  peptideKey: z.string().min(1),
  database: z.string().min(1),
  query: z.string().min(1),
  searchDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resultCount: z.number().int().nonnegative(),
  /** How many the ledger classifies. Equal to resultCount for a census. */
  screenedCount: z.number().int().nonnegative().nullable().default(null),
  /** Required when the two differ: which part of the result set was taken. */
  stratum: z.string().min(1).nullable().default(null),
  deduplication: z.string().min(1),
  inclusionCriteria: z.string().min(1),
  humanPrimaryCriteria: z.string().min(1),
  records: z.array(screenRecordSchema).min(1),
});

export type LiteratureScreen = z.infer<typeof literatureScreenSchema>;

const LITERATURE_SCREEN_FILES = [
  'literature/bpc-157-screen.json',
  'literature/thymosin-beta-4-screen.json',
  'literature/tb-500-screen.json',
  'literature/retatrutide-screen.json',
  'literature/ghk-cu-screen.json',
  'literature/cjc-1295-screen.json',
  'literature/ipamorelin-screen.json',
  'literature/mots-c-screen.json',
  'literature/semax-screen.json',
  'literature/selank-screen.json',
] as const;

const COMPOUND_PACKET_FILES = [
  'evidence/tesamorelin.json',
  'evidence/bpc-157.json',
  // Two packets for what practitioner sources treat as one compound. The
  // analytical literature says they are two molecules, so they are two records
  // and no evidence crosses between them.
  'evidence/thymosin-beta-4.json',
  'evidence/tb-500.json',
  'evidence/retatrutide.json',
  'evidence/ghk-cu.json',
  'evidence/cjc-1295.json',
  // Two records for what practitioner sources call one compound with and
  // without DAC. The originator's CJC-1295 is the albumin-binding molecule;
  // the 29-residue core sold as "without DAC" is a different peptide.
  'evidence/mod-grf-1-29.json',
  'evidence/ipamorelin.json',
  'evidence/mots-c.json',
  'evidence/semax.json',
  'evidence/selank.json',
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
  /*
   * `abstract_held` is the state a journal record sits in after a literature
   * screen: the bibliographic record and the abstract have been retrieved and
   * read, and the full text has not been obtained.
   *
   * It exists because the alternatives were both wrong. Calling it `held`
   * claims a copy that is not there; calling it `public_not_yet_retrieved`
   * says nobody has read it, and would put it under the rule that nothing may
   * rest on a source this index cannot open — which is the right rule and the
   * wrong application of it, since the abstract is what is cited and the
   * abstract is open.
   */
  access_status: z
    .enum([
      'held',
      'abstract_held',
      'subscription_required',
      'public_not_yet_retrieved',
      'unavailable',
      'unknown',
    ])
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
  // Identifiers. Recorded in the manifest since the literature screens, and not
  // carried to the database until trials needed to resolve a registry number
  // to the sources that report it.
  doi: z.string().nullable().default(null),
  pmid: z.string().nullable().default(null),
  trial_registry_id: z.string().nullable().default(null),
  canonical_url: z.string().nullable().default(null),
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

// --- Trials, artifacts and learning topics (migration 0026) -----------------

const trialDocumentSchema = z.object({
  sourceKey: z.string().min(1),
  role: z.enum([
    'primary_publication',
    'substudy_publication',
    'post_hoc_publication',
    'secondary_publication',
    'registry_record',
    'posted_results',
    'protocol',
    'statistical_analysis_plan',
    'supplement',
    'conference_material',
  ]),
  linkBasis: z.enum([
    'registry_and_publication',
    'stated_in_registry',
    'stated_in_publication',
    'posted_to_registry',
    'unconfirmed',
  ]),
  depth: z.enum(['full_text_held', 'abstract_only', 'structured_record_held', 'not_held']),
  versionLabel: z.string().nullable().default(null),
  // A calendar date: the column is `date`, so a month alone fails at insert.
  documentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .default(null),
  answers: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

const trialComparisonSchema = z.object({
  comparisonKey: z.string().min(1),
  topic: z.string().min(1),
  locationAKey: z.string().min(1),
  aReports: z.string().min(1),
  locationBKey: z.string().min(1),
  bReports: z.string().min(1),
  state: z.enum(['agree', 'differ', 'only_one_reports', 'not_comparable']),
  knownExplanation: z.string().min(1),
  whyItMatters: z.string().nullable().default(null),
  doseSpecific: z.boolean().default(false),
});

const trialSchema = z.object({
  trialKey: z.string().min(1),
  registryName: z.string().min(1),
  registryId: z.string().min(1),
  sponsorProtocolId: z.string().nullable().default(null),
  acronym: z.string().nullable().default(null),
  officialTitle: z.string().min(1),
  phase: z.string().min(1),
  design: z.string().min(1),
  population: z.string().min(1),
  comparator: z.string().nullable().default(null),
  enrolmentText: z.string().nullable().default(null),
  countries: z.string().nullable().default(null),
  siteCount: z.number().int().nullable().default(null),
  durationText: z.string().nullable().default(null),
  primaryOutcome: z.string().nullable().default(null),
  secondaryOutcomes: z.string().nullable().default(null),
  analysisPopulations: z.string().nullable().default(null),
  statisticalPlan: z.string().nullable().default(null),
  oversight: z.string().nullable().default(null),
  doseArmsText: z.string().nullable().default(null),
  sponsor: z.string().min(1),
  registryStatus: z.string().min(1),
  startDate: z.string().nullable().default(null),
  primaryCompletionDate: z.string().nullable().default(null),
  completionDate: z.string().nullable().default(null),
  resultsPostedDate: z.string().nullable().default(null),
  registryLastUpdate: z.string().nullable().default(null),
  registryCheckedAt: z.string().min(1),
  notes: z.string().nullable().default(null),
  documents: z.array(trialDocumentSchema).min(1),
  comparisons: z.array(trialComparisonSchema).default([]),
});

const trialPacketSchema = z.object({
  packetKey: z.string().min(1),
  peptideKey: z.string().min(1),
  note: z.string().min(1),
  trials: z.array(trialSchema).min(1),
});
export type TrialPacket = z.infer<typeof trialPacketSchema>;

const sourceArtifactSchema = z.object({
  artifactKey: z.string().min(1),
  sourceKey: z.string().min(1),
  artifactKind: z.enum([
    'publisher_version',
    'issuer_download',
    'registry_document',
    'registry_snapshot',
    'research_copy_unverified_distribution',
    'owner_transcription',
    'partial_translated_copy',
    'machine_translated_derivative',
    'index_only',
    'advertisement',
    'mislabelled_file',
    'duplicate',
    'supplementary_material',
  ]),
  disposition: z.enum(['working_copy', 'retained_reference', 'not_retained', 'rejected']),
  verification: z.enum([
    'matched_to_issuer',
    'title_page_verified',
    'abstract_verified_body_unverified',
    'transcription_unverified',
    'not_verified',
    'identity_refuted',
  ]),
  filename: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  bytes: z.number().int().nullable().default(null),
  pageCount: z.number().int().nullable().default(null),
  language: z.string().nullable().default(null),
  acquiredFrom: z.string().min(1),
  acquiredAt: z.string().nullable().default(null),
  duplicateOfArtifactKey: z.string().nullable().default(null),
  distributionProvenance: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
  publicNote: z.string().nullable().default(null),
});
export type SourceArtifactSeed = z.infer<typeof sourceArtifactSchema>;

const intakeRegisterSchema = z.object({
  intakeDate: z.string(),
  files: z.array(
    z
      .object({ file: z.string(), artifact: sourceArtifactSchema.optional() })
      .passthrough(),
  ),
});

const learningPacketSchema = z.object({
  packetKey: z.string().min(1),
  note: z.string().min(1),
  topic: z.object({
    topicKey: z.string().min(1),
    slug: z.string().min(1),
    title: z.string().min(1),
    publicationChapter: z.string().nullable().default(null),
    summary: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
  }),
  locations: z.array(packetLocationSchema).min(1),
  claims: z.array(packetClaimSchema).min(1),
  notYetSupported: z.array(packetGapSchema).default([]),
});
export type LearningPacket = z.infer<typeof learningPacketSchema>;

const LEARNING_PACKET_FILES = [
  'learning/pharmacology-receptors.json',
  'learning/peptides-as-medicines.json',
  // Foundations from permissively licensed sources (D-26: OpenStax excluded).
  'learning/what-is-a-peptide.json',
  'learning/amino-acids-to-proteins.json',
  'learning/peptides-in-the-body.json',
  'learning/peptide-signalling.json',
  'learning/receptor-pharmacology.json',
  'learning/pharmacokinetic-concepts.json',
  'learning/routes-of-administration.json',
] as const;
const TRIAL_PACKET_FILES = ['trials/retatrutide-trials.json'] as const;
const INTAKE_REGISTER_FILES = ['source-artifacts/intake-2026-09-14.json'] as const;

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
  trialPackets: TRIAL_PACKET_FILES.map((file) => trialPacketSchema.parse(loadJson(file))),
  learningPackets: LEARNING_PACKET_FILES.map((file) => learningPacketSchema.parse(loadJson(file))),
  sourceArtifacts: INTAKE_REGISTER_FILES.flatMap((file) =>
    intakeRegisterSchema
      .parse(loadJson(file))
      .files.flatMap((row) => (row.artifact === undefined ? [] : [row.artifact])),
  ),
  literatureScreens: LITERATURE_SCREEN_FILES.map((file) =>
    literatureScreenSchema.parse(loadJson(file)),
  ),
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
