'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireStaff } from '@/server/auth/session';
import {
  attachClaimEvidence,
  claimEvidenceInput,
  claimInput,
  createClaim,
  createSource,
  createSourceLocation,
  fail,
  ok,
  peptideSummaryInput,
  publishRecord,
  recordReview,
  reviewInput,
  setWorkflowStatus,
  sourceInput,
  sourceLocationInput,
  updateClaim,
  updatePeptideSummaries,
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

  const result = await createSource(session, parsed.data);
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

  const result = await createSourceLocation(session, parsed.data);
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

  const result = await updatePeptideSummaries(session, parsed.data);
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

  const result = await createClaim(session, parsed.data);
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

  const result = await updateClaim(session, claimId, parsed.data);
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

  const result = await attachClaimEvidence(session, parsed.data);
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

  const result = await recordReview(session, parsed.data);
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

  const result = await publishRecord(session, entityType.data, entityId.data);
  if (result.ok) {
    revalidatePath('/admin/review');
    revalidatePath('/admin');
  }
  return result;
}

const withdrawStatus = z.enum([
  'unreviewed',
  'captured',
  'needs_update',
  'superseded',
  'rejected',
]);

export async function setWorkflowStatusAction(
  _state: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireStaff();

  const entityType = publishableEntity.safeParse(text(formData, 'entityType'));
  const entityId = z.uuid().safeParse(text(formData, 'entityId'));
  const status = withdrawStatus.safeParse(text(formData, 'status'));

  if (!entityType.success || !entityId.success || !status.success) {
    return fail('That change could not be identified.');
  }

  const result = await setWorkflowStatus(session, entityType.data, entityId.data, status.data);
  if (result.ok) {
    revalidatePath('/admin/review');
    revalidatePath('/admin');
  }
  return result;
}
