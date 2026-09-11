import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Controlled vocabularies.
 *
 * The four dimensions the platform must never collapse (MASTER_BUILD_SPEC.md §10)
 * are represented separately:
 *   - what kind of source is it        -> source_types  (reference table)
 *   - what kind of evidence is it      -> evidence_types (reference table)
 *   - how far has editorial checked it -> reviewState (this file)
 *   - is it currently public            -> publicationState (this file)
 *   - what is its regulatory standing  -> regulatoryStatusValue (this file)
 *
 * Source and evidence types are reference tables rather than enums because the
 * public UI needs display labels and because evidence type carries an
 * evidence_class used for human/preclinical/practitioner filtering.
 */

/** Quality-control state of a registered source file (SOURCE_MANIFEST.json). */
export const sourceQcStatus = pgEnum('source_qc_status', [
  'usable',
  'incomplete',
  'replace',
  'pending',
  'exclude',
]);

/**
 * Verification state: how far editorial has checked a record.
 *
 * This is one of four dimensions the platform must never collapse
 * (MASTER_BUILD_SPEC.md §10). It says nothing about whether the record is
 * public — that is `publicationState` below.
 */
export const reviewState = pgEnum('review_state', [
  'unreviewed',
  'captured',
  'source_checked',
  'primary_source_checked',
  'ready_for_scientific_review',
  'scientific_reviewed',
  'clinical_reviewed',
  'compliance_reviewed',
  'rejected',
]);

/**
 * Who carried out a check.
 *
 * Automated work is legitimate and useful — extracting, structuring, comparing,
 * confirming that a citation resolves to what it claims — and recording it
 * honestly is better than pretending a person did it. What automation must
 * never do is stand in for a scientific, clinical or compliance approval, and
 * the publish gates enforce that by requiring `human` (docs/LOCKED_DECISIONS.md
 * #20).
 */
export const reviewPerformer = pgEnum('review_performer', ['human', 'automated']);

/**
 * Publication state: whether the record is currently public.
 *
 * Independent of verification state, because the combinations matter:
 * scientifically reviewed but unpublished; published but flagged for update;
 * previously published and now superseded. A single ladder cannot express
 * those, and flattening them loses information an editor needs.
 *
 * Coherence is enforced in the database rather than by convention: a record
 * cannot reach `published` without a verification state that permits it and
 * without passing its publish gate, and a rejected record cannot stay public.
 */
export const publicationState = pgEnum('publication_state_value', [
  'unpublished',
  'published',
  'withdrawn',
  'superseded',
]);

/**
 * Document lifecycle for assembled publications (books, handouts, guides).
 *
 * A document has an editing lifecycle of its own, distinct from the review and
 * publication state of the evidence records it draws on.
 */
export const documentStatus = pgEnum('document_status', [
  'draft',
  'in_review',
  'published',
  'needs_update',
  'superseded',
  'archived',
]);

/** How a piece of evidence relates to the claim it is attached to. */
export const evidenceRelationship = pgEnum('evidence_relationship', [
  'supports',
  'contradicts',
  'contextualizes',
  'cites',
]);

/**
 * The coarse separation that must survive into the UI and into search filters.
 * An animal study never becomes human evidence by reclassification.
 */
export const evidenceClass = pgEnum('evidence_class', [
  'human',
  'preclinical',
  'reference_opinion',
]);

/** Review gates from docs/REVIEW_WORKFLOW.md. */
export const reviewType = pgEnum('review_type', [
  'source_check',
  'primary_verification',
  'scientific',
  'clinical',
  'compliance',
]);

export const reviewOutcome = pgEnum('review_outcome', [
  'approved',
  'changes_requested',
  'rejected',
]);

/** Internal editorial roles. The public requires no account. */
export const staffRole = pgEnum('staff_role', [
  'admin',
  'editor',
  'scientific_reviewer',
  'clinical_reviewer',
  'compliance_reviewer',
]);

/** Entities that carry review history and revision history. */
export const reviewableEntityType = pgEnum('reviewable_entity_type', [
  'source',
  'peptide',
  'claim',
  'protocol',
  'peptide_route',
  'quality_topic',
  'regulatory_status',
  'disagreement',
  'publication',
  'publication_section',
]);

/** Whether a source originated a protocol or is repeating/commenting on one. */
export const protocolSourceRole = pgEnum('protocol_source_role', [
  'original',
  'secondary_reference',
  'commentary',
]);

export const claimImportance = pgEnum('claim_importance', ['low', 'medium', 'high', 'critical']);

/**
 * Alias semantics.
 *
 * `related_but_distinct` exists specifically for verification issue V-001:
 * practitioner sources treat "TB-500" and full-length Thymosin beta-4 as
 * interchangeable. The database must be able to record the relationship without
 * asserting identity. Alias resolution in search must never treat
 * `related_but_distinct` as a synonym.
 */
export const aliasType = pgEnum('alias_type', [
  'synonym',
  'abbreviation',
  'brand_name',
  'research_code',
  'chemical_name',
  'common_misnomer',
  'related_but_distinct',
]);

export const regulatoryStatusValue = pgEnum('regulatory_status_value', [
  'approved',
  'authorized_limited',
  'investigational_clinical',
  'preclinical',
  'discontinued',
  'withdrawn',
  'not_approved',
  'unknown',
]);

/**
 * Candidate explanation for a disagreement between sources (EDITORIAL_POLICY.md).
 * Disagreements are displayed, not averaged away.
 */
export const disagreementExplanation = pgEnum('disagreement_explanation', [
  'route',
  'formulation',
  'population',
  'dose',
  'study_design',
  'terminology',
  'date',
  'unresolved',
]);

export const publicationType = pgEnum('publication_type', [
  'book',
  'book_chapter',
  'article',
  'peptide_reference',
  'quality_topic',
  'patient_handout',
  'practitioner_guide',
  'methodology',
  'policy',
]);

export const audience = pgEnum('audience', ['patient', 'practitioner', 'both']);

/** Reading depth. Changes presentation only, never the underlying record. */
export const readingMode = pgEnum('reading_mode', ['simple', 'practitioner']);

export const searchEntityType = pgEnum('search_entity_type', [
  'peptide',
  'claim',
  'protocol',
  'quality_topic',
  'source',
  'publication',
]);

/** Content classes used to schedule staleness review (docs/REVIEW_WORKFLOW.md). */
export const reviewClockClass = pgEnum('review_clock_class', [
  'foundational_chemistry',
  'general_quality_science',
  'peptide_evidence',
  'investigational_program',
  'regulatory_status',
]);

export const correctionSeverity = pgEnum('correction_severity', [
  'typographical',
  'clarification',
  'substantive',
  'material_medical',
]);
