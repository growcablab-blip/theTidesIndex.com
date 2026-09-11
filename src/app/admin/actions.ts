'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/server/auth/session';
import { getStaffDb } from '@/server/db/client';
import {
  attachClaimEvidence,
  attachProtocolSource,
  claimEvidenceInput,
  claimInput,
  createClaim,
  createProtocol,
  createSource,
  createSourceLocation,
  createStaffProfile,
  fail,
  ok,
  peptideSummaryInput,
  protocolInput,
  protocolSourceInput,
  publishRecord,
  qualityTopicInput,
  recordReview,
  reviewInput,
  setStaffActive,
  setPublicationState,
  sourceInput,
  sourceLocationInput,
  staffProfileInput,
  updateClaim,
  updatePeptideSummaries,
  updateProtocol,
  updateQualityTopic,
  type ActionResult,
} from '@/server/editorial/mutations';

/**
 * Server actions for the editorial interface.
 *
 * Each one resolves the acting staff member, validates the submission, and
 * hands it to a service that runs under that person's database identity. None
 * of them decides authorisation: that is settled by the row-level security
 * policies, so a forged form field cannot buy access the user does not have.
 */

function flatten(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'form';
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return fieldErrors;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === 'string' ? value : '';
}

function optionalUuid(formData: FormData, name: string): string | null {
  const value = text(formData, name).trim();
  return value === '' ? null : value;
}

function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) !== null;
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export async function createSourceAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = sourceInput.safeParse({
    sourceKey: text(formData, 'sourceKey'),
    title: text(formData, 'title'),
    sourceTypeKey: text(formData, 'sourceTypeKey'),
    qcStatus: text(formData, 'qcStatus'),
    authors: text(formData, 'authors'),
    year: text(formData, 'year'),
    publisher: text(formData, 'publisher'),
    doi: text(formData, 'doi'),
    pmid: text(formData, 'pmid'),
    canonicalUrl: text(formData, 'canonicalUrl'),
    primaryRole: text(formData, 'primaryRole'),
    limitationsNotes: text(formData, 'limitationsNotes'),
    authorityNotes: text(formData, 'authorityNotes'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await createSource(getStaffDb(), session, parsed.data);
  if (!result.ok) return result;
  revalidatePath('/admin/sources');
  return ok();
}

export async function createSourceLocationAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = sourceLocationInput.safeParse({
    sourceId: text(formData, 'sourceId'),
    locatorText: text(formData, 'locatorText'),
    pageStart: text(formData, 'pageStart'),
    pageEnd: text(formData, 'pageEnd'),
    chapter: text(formData, 'chapter'),
    section: text(formData, 'section'),
    notes: text(formData, 'notes'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await createSourceLocation(getStaffDb(), session, parsed.data);
  if (!result.ok) return result;
  revalidatePath(`/admin/sources/${parsed.data.sourceId}`);
  return ok();
}

// ---------------------------------------------------------------------------
// Compounds
// ---------------------------------------------------------------------------

export async function updatePeptideSummariesAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = peptideSummaryInput.safeParse({
    peptideId: text(formData, 'peptideId'),
    shortDescription: text(formData, 'shortDescription'),
    simpleSummary: text(formData, 'simpleSummary'),
    practitionerSummary: text(formData, 'practitionerSummary'),
    unknownsSummary: text(formData, 'unknownsSummary'),
    sequence: text(formData, 'sequence'),
    molecularDescription: text(formData, 'molecularDescription'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await updatePeptideSummaries(getStaffDb(), session, parsed.data);
  if (result.ok) revalidatePath(`/admin/peptides/${parsed.data.peptideId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export async function createClaimAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = claimInput.safeParse({
    claimKey: text(formData, 'claimKey'),
    peptideId: optionalUuid(formData, 'peptideId'),
    qualityTopicId: optionalUuid(formData, 'qualityTopicId'),
    claimText: text(formData, 'claimText'),
    plainLanguageText: text(formData, 'plainLanguageText'),
    importance: text(formData, 'importance'),
    interpretationNotes: text(formData, 'interpretationNotes'),
    uncertaintyText: text(formData, 'uncertaintyText'),
    isEditorialNonEvidentiary: checkbox(formData, 'isEditorialNonEvidentiary'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await createClaim(getStaffDb(), session, parsed.data);
  if (!result.ok) return result;
  revalidatePath('/admin/claims');
  if (parsed.data.peptideId) revalidatePath(`/admin/peptides/${parsed.data.peptideId}`);
  return ok();
}

export async function updateClaimAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();
  const claimId = text(formData, 'claimId');

  const parsed = claimInput.omit({ claimKey: true }).safeParse({
    peptideId: optionalUuid(formData, 'peptideId'),
    qualityTopicId: optionalUuid(formData, 'qualityTopicId'),
    claimText: text(formData, 'claimText'),
    plainLanguageText: text(formData, 'plainLanguageText'),
    importance: text(formData, 'importance'),
    interpretationNotes: text(formData, 'interpretationNotes'),
    uncertaintyText: text(formData, 'uncertaintyText'),
    isEditorialNonEvidentiary: checkbox(formData, 'isEditorialNonEvidentiary'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await updateClaim(getStaffDb(), session, claimId, parsed.data);
  if (result.ok) revalidatePath(`/admin/claims/${claimId}`);
  return result;
}

export async function attachClaimEvidenceAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = claimEvidenceInput.safeParse({
    claimId: text(formData, 'claimId'),
    sourceId: text(formData, 'sourceId'),
    sourceLocationId: optionalUuid(formData, 'sourceLocationId'),
    evidenceTypeKey: text(formData, 'evidenceTypeKey'),
    relationship: text(formData, 'relationship'),
    populationModel: text(formData, 'populationModel'),
    routeKey: text(formData, 'routeKey'),
    formulation: text(formData, 'formulation'),
    interpretation: text(formData, 'interpretation'),
    extractedTextPrivate: text(formData, 'extractedTextPrivate'),
    primarySourceVerified: checkbox(formData, 'primarySourceVerified'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await attachClaimEvidence(getStaffDb(), session, parsed.data);
  if (!result.ok) return result;
  revalidatePath(`/admin/claims/${parsed.data.claimId}`);
  return ok();
}

// ---------------------------------------------------------------------------
// Review and publication
// ---------------------------------------------------------------------------

export async function recordReviewAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = reviewInput.safeParse({
    entityType: text(formData, 'entityType'),
    entityId: text(formData, 'entityId'),
    reviewType: text(formData, 'reviewType'),
    outcome: text(formData, 'outcome'),
    comments: text(formData, 'comments'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await recordReview(getStaffDb(), session, parsed.data);
  if (result.ok) {
    revalidatePath('/admin/review');
    revalidatePath(`/admin/${parsed.data.entityType}s/${parsed.data.entityId}`);
  }
  return result;
}

const publishableEntity = z.enum(['peptide', 'claim', 'protocol', 'quality_topic']);

export async function publishAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const entityType = publishableEntity.safeParse(text(formData, 'entityType'));
  const entityId = z.uuid().safeParse(text(formData, 'entityId'));

  if (!entityType.success || !entityId.success) {
    return fail('That record could not be identified.');
  }

  const result = await publishRecord(getStaffDb(), session, entityType.data, entityId.data);
  if (result.ok) {
    revalidatePath('/admin/review');
    revalidatePath('/admin');
  }
  return result;
}

const publicationStateChange = z.enum(['unpublished', 'withdrawn', 'superseded']);

export async function setPublicationStateAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const entityType = publishableEntity.safeParse(text(formData, 'entityType'));
  const entityId = z.uuid().safeParse(text(formData, 'entityId'));
  const state = publicationStateChange.safeParse(text(formData, 'state'));

  if (!entityType.success || !entityId.success || !state.success) {
    return fail('That change could not be identified.');
  }

  const reason = text(formData, 'reason').trim();
  const result = await setPublicationState(
    getStaffDb(),
    session,
    entityType.data,
    entityId.data,
    state.data,
    reason === '' ? undefined : reason,
  );
  if (result.ok) {
    revalidatePath('/admin/review');
    revalidatePath('/admin');
  }
  return result;
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

export async function createProtocolAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = protocolInput.safeParse({
    protocolKey: text(formData, 'protocolKey'),
    peptideId: optionalUuid(formData, 'peptideId'),
    combinationName: text(formData, 'combinationName'),
    objectiveContext: text(formData, 'objectiveContext'),
    populationModel: text(formData, 'populationModel'),
    routeKey: text(formData, 'routeKey'),
    formulation: text(formData, 'formulation'),
    regulatoryContext: text(formData, 'regulatoryContext'),
    evidenceTypeKey: text(formData, 'evidenceTypeKey'),
    amountReported: text(formData, 'amountReported'),
    amountUnit: text(formData, 'amountUnit'),
    frequencyText: text(formData, 'frequencyText'),
    timingText: text(formData, 'timingText'),
    durationText: text(formData, 'durationText'),
    cycleText: text(formData, 'cycleText'),
    titrationText: text(formData, 'titrationText'),
    monitoringText: text(formData, 'monitoringText'),
    contraindicationsText: text(formData, 'contraindicationsText'),
    safetyNotes: text(formData, 'safetyNotes'),
    adverseEventsText: text(formData, 'adverseEventsText'),
    outcomeContext: text(formData, 'outcomeContext'),
    patientVisibility: checkbox(formData, 'patientVisibility'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await createProtocol(getStaffDb(), session, parsed.data);
  if (!result.ok) return result;
  if (parsed.data.peptideId) revalidatePath(`/admin/peptides/${parsed.data.peptideId}`);
  return ok();
}

export async function updateProtocolAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();
  const protocolId = text(formData, 'protocolId');

  const parsed = protocolInput.omit({ protocolKey: true, peptideId: true }).safeParse({
    combinationName: text(formData, 'combinationName'),
    objectiveContext: text(formData, 'objectiveContext'),
    populationModel: text(formData, 'populationModel'),
    routeKey: text(formData, 'routeKey'),
    formulation: text(formData, 'formulation'),
    regulatoryContext: text(formData, 'regulatoryContext'),
    evidenceTypeKey: text(formData, 'evidenceTypeKey'),
    amountReported: text(formData, 'amountReported'),
    amountUnit: text(formData, 'amountUnit'),
    frequencyText: text(formData, 'frequencyText'),
    timingText: text(formData, 'timingText'),
    durationText: text(formData, 'durationText'),
    cycleText: text(formData, 'cycleText'),
    titrationText: text(formData, 'titrationText'),
    monitoringText: text(formData, 'monitoringText'),
    contraindicationsText: text(formData, 'contraindicationsText'),
    safetyNotes: text(formData, 'safetyNotes'),
    adverseEventsText: text(formData, 'adverseEventsText'),
    outcomeContext: text(formData, 'outcomeContext'),
    patientVisibility: checkbox(formData, 'patientVisibility'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await updateProtocol(getStaffDb(), session, protocolId, parsed.data);
  if (result.ok) revalidatePath(`/admin/protocols/${protocolId}`);
  return result;
}

export async function attachProtocolSourceAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = protocolSourceInput.safeParse({
    protocolId: text(formData, 'protocolId'),
    sourceId: text(formData, 'sourceId'),
    sourceLocationId: optionalUuid(formData, 'sourceLocationId'),
    sourceRole: text(formData, 'sourceRole'),
    notes: text(formData, 'notes'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await attachProtocolSource(getStaffDb(), session, parsed.data);
  if (result.ok) revalidatePath(`/admin/protocols/${parsed.data.protocolId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Quality topics
// ---------------------------------------------------------------------------

export async function updateQualityTopicAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = qualityTopicInput.safeParse({
    qualityTopicId: text(formData, 'qualityTopicId'),
    shortDescription: text(formData, 'shortDescription'),
    simpleSummary: text(formData, 'simpleSummary'),
    practitionerSummary: text(formData, 'practitionerSummary'),
    whatItProves: text(formData, 'whatItProves'),
    whatItDoesNotProve: text(formData, 'whatItDoesNotProve'),
    commonMisinterpretations: text(formData, 'commonMisinterpretations'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await updateQualityTopic(getStaffDb(), session, parsed.data);
  if (result.ok) revalidatePath(`/admin/quality-topics/${parsed.data.qualityTopicId}`);
  return result;
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export async function createStaffProfileAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const parsed = staffProfileInput.safeParse({
    userId: text(formData, 'userId'),
    displayName: text(formData, 'displayName'),
    email: text(formData, 'email'),
    role: text(formData, 'role'),
  });

  if (!parsed.success) {
    return fail('Check the highlighted fields.', flatten(parsed.error));
  }

  const result = await createStaffProfile(getStaffDb(), session, parsed.data);
  if (result.ok) revalidatePath('/admin/staff');
  return result;
}

export async function setStaffActiveAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const userId = z.uuid().safeParse(text(formData, 'userId'));
  if (!userId.success) return fail('That staff member could not be identified.');

  const result = await setStaffActive(getStaffDb(), session, userId.data, text(formData, 'isActive') === 'true');
  if (result.ok) revalidatePath('/admin/staff');
  return result;
}
