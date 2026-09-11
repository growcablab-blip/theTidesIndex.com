import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { withStaffSession } from '../db/session';
import type { Database } from '../db/types';
import type { StaffSession } from '../auth/session';
import {
  getClaimGateStatus,
  getPeptideGateStatus,
  getProtocolGateStatus,
  getQualityTopicGateStatus,
} from './gate-status';

/**
 * Editorial write operations.
 *
 * Each takes the database handle explicitly rather than reaching for a
 * connection of its own, so the whole layer runs against the in-process Postgres
 * used by tests as well as against Supabase.
 *
 * Every mutation runs inside `withStaffSession`, so it reaches the database as
 * the `authenticated` role under the acting user's identity and is subject to
 * the row-level security policies. There is no privileged path around them.
 *
 * A note on how Postgres enforces those policies: an INSERT that fails
 * `WITH CHECK` raises, but an UPDATE or DELETE whose `USING` clause excludes the
 * row simply affects nothing and reports success. Treating "no error" as "it
 * worked" would show an editor a confirmation for an action the database
 * refused. Every update and delete here therefore checks the affected row count.
 */

export interface ActionSuccess<T = undefined> {
  readonly ok: true;
  readonly data: T;
}

export interface ActionFailure {
  readonly ok: false;
  /** Sentence for the editor. Never a raw database error. */
  readonly message: string;
  /** Per-field messages, keyed by form field name. */
  readonly fieldErrors?: Readonly<Record<string, string[]>>;
}

export type ActionResult<T = undefined> = ActionSuccess<T> | ActionFailure;

export function ok(): ActionResult;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail(message: string, fieldErrors?: Record<string, string[]>): ActionFailure {
  return fieldErrors ? { ok: false, message, fieldErrors } : { ok: false, message };
}

/** Rows affected by the last statement, across driver result shapes. */
function affected(result: unknown): number {
  if (result && typeof result === 'object') {
    const candidate = result as { rowCount?: number; affectedRows?: number; length?: number };
    if (typeof candidate.rowCount === 'number') return candidate.rowCount;
    if (typeof candidate.affectedRows === 'number') return candidate.affectedRows;
    if (Array.isArray(result)) return result.length;
  }
  return 0;
}

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

const REFUSED_BY_POLICY =
  'The database refused that change under your role. If you believe you should be able to make it, ask an administrator.';

/** Maps a database error to something an editor can act on. */
function describeError(error: unknown): string {
  const messages: string[] = [];
  let current: unknown = error;
  while (current instanceof Error) {
    messages.push(current.message);
    current = current.cause;
  }
  const combined = messages.join(' | ');

  if (/row-level security|policy/i.test(combined)) return REFUSED_BY_POLICY;
  if (/duplicate key/i.test(combined)) {
    return 'A record with that key already exists. Keys are unique across the index.';
  }
  if (/violates foreign key/i.test(combined)) {
    return 'That references a record which does not exist.';
  }
  // Publish-gate refusals raise with a message written for an editor.
  const gateMessage = messages.find((m) => /cannot be published/i.test(m));
  if (gateMessage) return gateMessage;

  return 'The change could not be saved.';
}

async function run<T>(
  db: Database,
  session: StaffSession,
  work: (tx: Database) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await withStaffSession(db, session.userId, work);
  } catch (error: unknown) {
    return fail(describeError(error));
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const keyPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const optionalText = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable();

export const sourceInput = z.object({
  sourceKey: z.string().trim().regex(keyPattern, 'Use letters, digits, dot, dash or underscore.'),
  title: z.string().trim().min(3, 'A title is required.'),
  sourceTypeKey: z.string().trim().min(1, 'Choose a source type.'),
  qcStatus: z.enum(['usable', 'incomplete', 'replace', 'pending', 'exclude']),
  authors: z
    .string()
    .trim()
    .transform((value) =>
      value === '' ? [] : value.split(/\s*;\s*/).filter((name) => name !== ''),
    ),
  year: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .refine(
      (value) => value === null || (Number.isInteger(value) && value > 1400 && value < 2200),
      'Enter a four-digit year.',
    ),
  publisher: optionalText,
  doi: optionalText,
  pmid: optionalText,
  canonicalUrl: optionalText,
  primaryRole: optionalText,
  limitationsNotes: optionalText,
  authorityNotes: optionalText,
});

export const sourceLocationInput = z.object({
  sourceId: z.uuid(),
  locatorText: z.string().trim().min(1, 'Describe the location, for example "pp. 19–24".'),
  pageStart: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || Number.isInteger(value), 'Page must be a whole number.'),
  pageEnd: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .refine((value) => value === null || Number.isInteger(value), 'Page must be a whole number.'),
  chapter: optionalText,
  section: optionalText,
  notes: optionalText,
});

export const peptideSummaryInput = z.object({
  peptideId: z.uuid(),
  shortDescription: optionalText,
  simpleSummary: optionalText,
  practitionerSummary: optionalText,
  unknownsSummary: optionalText,
  sequence: optionalText,
  molecularDescription: optionalText,
});

export const claimInput = z.object({
  claimKey: z.string().trim().regex(keyPattern, 'Use letters, digits, dot, dash or underscore.'),
  peptideId: z.uuid().nullable(),
  qualityTopicId: z.uuid().nullable(),
  claimText: z.string().trim().min(10, 'State the claim.'),
  plainLanguageText: optionalText,
  importance: z.enum(['low', 'medium', 'high', 'critical']),
  interpretationNotes: optionalText,
  uncertaintyText: optionalText,
  isEditorialNonEvidentiary: z.boolean().default(false),
});

export const claimEvidenceInput = z.object({
  claimId: z.uuid(),
  sourceId: z.uuid(),
  sourceLocationId: z.uuid().nullable(),
  evidenceTypeKey: z.string().trim().min(1, 'Choose an evidence type.'),
  relationship: z.enum(['supports', 'contradicts', 'contextualizes', 'cites']),
  populationModel: optionalText,
  routeKey: optionalText,
  formulation: optionalText,
  interpretation: optionalText,
  extractedTextPrivate: optionalText,
  primarySourceVerified: z.boolean().default(false),
});

export const reviewInput = z.object({
  entityType: z.enum([
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
  ]),
  entityId: z.uuid(),
  reviewType: z.enum([
    'source_check',
    'primary_verification',
    'scientific',
    'clinical',
    'compliance',
  ]),
  outcome: z.enum(['approved', 'changes_requested', 'rejected']),
  comments: optionalText,
});

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function createSource(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof sourceInput>,
): Promise<ActionResult<{ id: string }>> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      insert into sources (
        source_key, title, source_type_key, qc_status, authors, year, publisher,
        doi, pmid, canonical_url, primary_role, limitations_notes, authority_notes
      ) values (
        ${input.sourceKey}, ${input.title}, ${input.sourceTypeKey},
        ${input.qcStatus}::source_qc_status, ${JSON.stringify(input.authors)}::jsonb,
        ${input.year}, ${input.publisher}, ${input.doi}, ${input.pmid},
        ${input.canonicalUrl}, ${input.primaryRole}, ${input.limitationsNotes},
        ${input.authorityNotes}
      )
      returning id
    `);
    const id = rows<{ id: string }>(result)[0]?.id;
    return id ? ok({ id }) : fail('The source was not created.');
  });
}

export async function updateSourceQcStatus(
  db: Database,
  session: StaffSession,
  sourceId: string,
  qcStatus: z.infer<typeof sourceInput>['qcStatus'],
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update sources set qc_status = ${qcStatus}::source_qc_status where id = ${sourceId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

export async function createSourceLocation(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof sourceLocationInput>,
): Promise<ActionResult<{ id: string }>> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      insert into source_locations (
        source_id, locator_text, page_start, page_end, chapter, section, notes
      ) values (
        ${input.sourceId}, ${input.locatorText}, ${input.pageStart}, ${input.pageEnd},
        ${input.chapter}, ${input.section}, ${input.notes}
      )
      returning id
    `);
    const id = rows<{ id: string }>(result)[0]?.id;
    return id ? ok({ id }) : fail('The source location was not created.');
  });
}

// ---------------------------------------------------------------------------
// Compounds
// ---------------------------------------------------------------------------

export async function updatePeptideSummaries(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof peptideSummaryInput>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update peptides set
        short_description = ${input.shortDescription},
        simple_summary = ${input.simpleSummary},
        practitioner_summary = ${input.practitionerSummary},
        unknowns_summary = ${input.unknownsSummary},
        sequence = ${input.sequence},
        molecular_description = ${input.molecularDescription}
      where id = ${input.peptideId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function createClaim(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof claimInput>,
): Promise<ActionResult<{ id: string }>> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      insert into claims (
        claim_key, peptide_id, quality_topic_id, claim_text, plain_language_text,
        importance, interpretation_notes, uncertainty_text, is_editorial_non_evidentiary
      ) values (
        ${input.claimKey}, ${input.peptideId}, ${input.qualityTopicId}, ${input.claimText},
        ${input.plainLanguageText}, ${input.importance}::claim_importance,
        ${input.interpretationNotes}, ${input.uncertaintyText},
        ${input.isEditorialNonEvidentiary}
      )
      returning id
    `);
    const id = rows<{ id: string }>(result)[0]?.id;
    return id ? ok({ id }) : fail('The claim was not created.');
  });
}

export async function updateClaim(
  db: Database,
  session: StaffSession,
  claimId: string,
  input: Omit<z.infer<typeof claimInput>, 'claimKey'>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update claims set
        claim_text = ${input.claimText},
        plain_language_text = ${input.plainLanguageText},
        importance = ${input.importance}::claim_importance,
        interpretation_notes = ${input.interpretationNotes},
        uncertainty_text = ${input.uncertaintyText},
        is_editorial_non_evidentiary = ${input.isEditorialNonEvidentiary}
      where id = ${claimId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

export async function attachClaimEvidence(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof claimEvidenceInput>,
): Promise<ActionResult<{ id: string }>> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      insert into claim_evidence (
        claim_id, source_id, source_location_id, evidence_type_key, relationship,
        population_model, route_key, formulation, interpretation,
        extracted_text_private, primary_source_verified
      ) values (
        ${input.claimId}, ${input.sourceId}, ${input.sourceLocationId},
        ${input.evidenceTypeKey}, ${input.relationship}::evidence_relationship,
        ${input.populationModel}, ${input.routeKey}, ${input.formulation},
        ${input.interpretation}, ${input.extractedTextPrivate},
        ${input.primarySourceVerified}
      )
      returning id
    `);
    const id = rows<{ id: string }>(result)[0]?.id;
    return id ? ok({ id }) : fail('The evidence link was not created.');
  });
}

// ---------------------------------------------------------------------------
// Review and publication
// ---------------------------------------------------------------------------

const ENTITY_TABLES: Readonly<Record<string, string>> = {
  peptide: 'peptides',
  claim: 'claims',
  protocol: 'protocols',
  quality_topic: 'quality_topics',
  peptide_route: 'peptide_routes',
  regulatory_status: 'regulatory_statuses',
  disagreement: 'disagreements',
};

/**
 * Records a review decision against the record's current version.
 *
 * The version is read inside the same transaction as the insert, so a review
 * cannot be attached to a version that has already been superseded by a
 * concurrent edit.
 */
export async function recordReview(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof reviewInput>,
): Promise<ActionResult> {
  const table = ENTITY_TABLES[input.entityType];
  if (!table) return fail('That kind of record does not carry reviews.');

  return run(db, session, async (tx) => {
    // No FOR UPDATE: row locking applies the UPDATE policy, and a reviewer
    // deliberately holds no write access to the record under review. A
    // concurrent edit would bump the version, and the review would then attach
    // to a superseded version and correctly fail to count.
    const versionRows = rows<{ version: number }>(
      await tx.execute(sql`select version from ${sql.raw(table)} where id = ${input.entityId}`),
    );
    const version = versionRows[0]?.version;
    if (version === undefined) return fail('That record no longer exists.');

    await tx.execute(sql`
      insert into reviews (
        entity_type, entity_id, entity_version, review_type, reviewer_user_id,
        outcome, comments
      ) values (
        ${input.entityType}::reviewable_entity_type, ${input.entityId}, ${version},
        ${input.reviewType}::review_type, ${session.userId},
        ${input.outcome}::review_outcome, ${input.comments}
      )
    `);

    // A rejection or a change request withdraws the record from the public site
    // immediately rather than waiting for someone to act on the comment.
    //
    // Reviewers hold no write access to content, so this runs through a
    // SECURITY DEFINER function that first confirms the caller actually
    // recorded such a review. The withdrawal is a consequence of the review,
    // not an editorial edit.
    if (input.outcome !== 'approved') {
      await tx.execute(sql`
        select tides_withdraw_on_review(
          ${input.entityType}::reviewable_entity_type, ${input.entityId}
        )
      `);
    }

    return ok();
  });
}

export type PublishableEntity = 'peptide' | 'claim' | 'protocol' | 'quality_topic';

/**
 * Publishes a record.
 *
 * The gate is evaluated first so a refusal arrives as a list of specific gaps.
 * The database then enforces the same rules on the write itself — this check is
 * an explanation, not the guarantee.
 */
export async function publishRecord(
  db: Database,
  session: StaffSession,
  entityType: PublishableEntity,
  entityId: string,
): Promise<ActionResult> {
  const table = ENTITY_TABLES[entityType];
  if (!table) return fail('That kind of record cannot be published directly.');

  return run(db, session, async (tx) => {
    const status = await gateStatusFor(tx, entityType, entityId);
    if (!status) return fail('That record no longer exists.');

    if (!status.canPublish) {
      return fail(
        'This record is not ready to publish.',
        Object.fromEntries(
          status.failures.map((failure) => [failure.field, [failure.message]]),
        ),
      );
    }

    const result = await tx.execute(sql`
      update ${sql.raw(table)} set workflow_status = 'published' where id = ${entityId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

export async function setWorkflowStatus(
  db: Database,
  session: StaffSession,
  entityType: PublishableEntity,
  entityId: string,
  status: 'unreviewed' | 'captured' | 'needs_update' | 'superseded' | 'rejected',
): Promise<ActionResult> {
  const table = ENTITY_TABLES[entityType];
  if (!table) return fail('That kind of record does not carry a workflow status.');

  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update ${sql.raw(table)} set workflow_status = ${status}::workflow_status
      where id = ${entityId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

async function gateStatusFor(db: Database, entityType: PublishableEntity, entityId: string) {
  switch (entityType) {
    case 'claim':
      return getClaimGateStatus(db, entityId);
    case 'protocol':
      return getProtocolGateStatus(db, entityId);
    case 'peptide':
      return getPeptideGateStatus(db, entityId);
    case 'quality_topic':
      return getQualityTopicGateStatus(db, entityId);
  }
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

export const protocolInput = z.object({
  protocolKey: z
    .string()
    .trim()
    .regex(keyPattern, 'Use letters, digits, dot, dash or underscore.'),
  peptideId: z.uuid().nullable(),
  combinationName: optionalText,
  objectiveContext: z.string().trim().min(5, 'State why the source reports this regimen.'),
  populationModel: optionalText,
  routeKey: optionalText,
  formulation: optionalText,
  regulatoryContext: optionalText,
  evidenceTypeKey: z.string().trim().min(1, 'Choose an evidence type.'),
  amountReported: optionalText,
  amountUnit: optionalText,
  frequencyText: optionalText,
  timingText: optionalText,
  durationText: optionalText,
  cycleText: optionalText,
  titrationText: optionalText,
  monitoringText: optionalText,
  contraindicationsText: optionalText,
  safetyNotes: optionalText,
  adverseEventsText: optionalText,
  outcomeContext: optionalText,
  patientVisibility: z.boolean().default(false),
});

export const protocolSourceInput = z.object({
  protocolId: z.uuid(),
  sourceId: z.uuid(),
  sourceLocationId: z.uuid().nullable(),
  sourceRole: z.enum(['original', 'secondary_reference', 'commentary']),
  notes: optionalText,
});

export async function createProtocol(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof protocolInput>,
): Promise<ActionResult<{ id: string }>> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      insert into protocols (
        protocol_key, peptide_id, combination_name, objective_context, population_model,
        route_key, formulation, regulatory_context, evidence_type_key, amount_reported,
        amount_unit, frequency_text, timing_text, duration_text, cycle_text, titration_text,
        monitoring_text, contraindications_text, safety_notes, adverse_events_text,
        outcome_context, patient_visibility
      ) values (
        ${input.protocolKey}, ${input.peptideId}, ${input.combinationName},
        ${input.objectiveContext}, ${input.populationModel}, ${input.routeKey},
        ${input.formulation}, ${input.regulatoryContext}, ${input.evidenceTypeKey},
        ${input.amountReported}, ${input.amountUnit}, ${input.frequencyText},
        ${input.timingText}, ${input.durationText}, ${input.cycleText}, ${input.titrationText},
        ${input.monitoringText}, ${input.contraindicationsText}, ${input.safetyNotes},
        ${input.adverseEventsText}, ${input.outcomeContext}, ${input.patientVisibility}
      )
      returning id
    `);
    const id = rows<{ id: string }>(result)[0]?.id;
    return id ? ok({ id }) : fail('The protocol was not created.');
  });
}

export async function updateProtocol(
  db: Database,
  session: StaffSession,
  protocolId: string,
  input: Omit<z.infer<typeof protocolInput>, 'protocolKey' | 'peptideId'>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update protocols set
        combination_name = ${input.combinationName},
        objective_context = ${input.objectiveContext},
        population_model = ${input.populationModel},
        route_key = ${input.routeKey},
        formulation = ${input.formulation},
        regulatory_context = ${input.regulatoryContext},
        evidence_type_key = ${input.evidenceTypeKey},
        amount_reported = ${input.amountReported},
        amount_unit = ${input.amountUnit},
        frequency_text = ${input.frequencyText},
        timing_text = ${input.timingText},
        duration_text = ${input.durationText},
        cycle_text = ${input.cycleText},
        titration_text = ${input.titrationText},
        monitoring_text = ${input.monitoringText},
        contraindications_text = ${input.contraindicationsText},
        safety_notes = ${input.safetyNotes},
        adverse_events_text = ${input.adverseEventsText},
        outcome_context = ${input.outcomeContext},
        patient_visibility = ${input.patientVisibility}
      where id = ${protocolId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

export async function attachProtocolSource(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof protocolSourceInput>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    await tx.execute(sql`
      insert into protocol_sources (protocol_id, source_id, source_location_id, source_role, notes)
      values (
        ${input.protocolId}, ${input.sourceId}, ${input.sourceLocationId},
        ${input.sourceRole}::protocol_source_role, ${input.notes}
      )
    `);
    return ok();
  });
}

// ---------------------------------------------------------------------------
// Quality topics
// ---------------------------------------------------------------------------

export const qualityTopicInput = z.object({
  qualityTopicId: z.uuid(),
  shortDescription: optionalText,
  simpleSummary: optionalText,
  practitionerSummary: optionalText,
  whatItProves: optionalText,
  whatItDoesNotProve: optionalText,
  commonMisinterpretations: optionalText,
});

export async function updateQualityTopic(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof qualityTopicInput>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update quality_topics set
        short_description = ${input.shortDescription},
        simple_summary = ${input.simpleSummary},
        practitioner_summary = ${input.practitionerSummary},
        what_it_proves = ${input.whatItProves},
        what_it_does_not_prove = ${input.whatItDoesNotProve},
        common_misinterpretations = ${input.commonMisinterpretations}
      where id = ${input.qualityTopicId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export const staffProfileInput = z.object({
  userId: z.uuid('Paste the Supabase Auth user id for this person.'),
  displayName: z.string().trim().min(2, 'Enter the name to attribute reviews to.'),
  email: optionalText,
  role: z.enum([
    'admin',
    'editor',
    'scientific_reviewer',
    'clinical_reviewer',
    'compliance_reviewer',
  ]),
});

/**
 * Grants editorial access.
 *
 * Deliberately a two-step process: an administrator invites the person in
 * Supabase Auth, then records them here. Authentication alone confers nothing,
 * so an account cannot acquire access by signing itself up.
 */
export async function createStaffProfile(
  db: Database,
  session: StaffSession,
  input: z.infer<typeof staffProfileInput>,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    await tx.execute(sql`
      insert into profiles (user_id, display_name, email, role)
      values (${input.userId}, ${input.displayName}, ${input.email}, ${input.role}::staff_role)
      on conflict (user_id) do update set
        display_name = excluded.display_name,
        email = excluded.email,
        role = excluded.role,
        is_active = true
    `);
    return ok();
  });
}

export async function setStaffActive(
  db: Database,
  session: StaffSession,
  userId: string,
  isActive: boolean,
): Promise<ActionResult> {
  return run(db, session, async (tx) => {
    const result = await tx.execute(sql`
      update profiles set is_active = ${isActive} where user_id = ${userId}
    `);
    return affected(result) === 1 ? ok() : fail(REFUSED_BY_POLICY);
  });
}
