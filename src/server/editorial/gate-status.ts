import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import {
  evaluateClaimPublishGate,
  evaluatePeptidePublishGate,
  evaluateProtocolPublishGate,
  evaluateQualityTopicPublishGate,
  type EvidenceLinkState,
  type GateResult,
  type ReviewType,
} from '@/domain/publishing/gates';

/**
 * Reads the current state of a record and reports what still stands between it
 * and publication.
 *
 * The editorial interface uses this to show an editor a list of specific,
 * actionable gaps — "every evidence link needs an exact source location" —
 * instead of letting them press Publish and receive a constraint violation.
 *
 * The database remains the enforcement point. This is the explanation of it.
 */

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function approvedReviews(
  db: Database,
  entityType: string,
  entityId: string,
  version: number,
): Promise<ReviewType[]> {
  const result = await db.execute(sql`
    select distinct review_type
    from reviews
    where entity_type = ${entityType}::reviewable_entity_type
      and entity_id = ${entityId}
      and entity_version = ${version}
      and outcome = 'approved'
      and reviewer_user_id is not null
  `);
  return rows<{ review_type: ReviewType }>(result).map((r) => r.review_type);
}

export interface ClaimGateStatus extends GateResult {
  readonly version: number;
  readonly workflowStatus: string;
  readonly approvedReviews: readonly ReviewType[];
}

export async function getClaimGateStatus(
  db: Database,
  claimId: string,
): Promise<ClaimGateStatus | null> {
  const claimRows = rows<{
    version: number;
    workflow_status: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    is_editorial_non_evidentiary: boolean;
    interpretation_notes: string | null;
    uncertainty_text: string | null;
  }>(
    await db.execute(sql`
      select version, workflow_status, importance, is_editorial_non_evidentiary,
             interpretation_notes, uncertainty_text
      from claims where id = ${claimId}
    `),
  );

  const claim = claimRows[0];
  if (!claim) return null;

  const evidence = rows<{ has_source_location: boolean; source_is_citable: boolean }>(
    await db.execute(sql`
      select (ce.source_location_id is not null) as has_source_location,
             s.is_citable as source_is_citable
      from claim_evidence ce
      join sources s on s.id = ce.source_id
      where ce.claim_id = ${claimId}
    `),
  ).map<EvidenceLinkState>((row) => ({
    hasSourceLocation: row.has_source_location,
    sourceIsCitable: row.source_is_citable,
  }));

  const reviews = await approvedReviews(db, 'claim', claimId, claim.version);

  const result = evaluateClaimPublishGate({
    importance: claim.importance,
    isEditorialNonEvidentiary: claim.is_editorial_non_evidentiary,
    interpretationNotes: claim.interpretation_notes,
    uncertaintyText: claim.uncertainty_text,
    evidence,
    approvedReviews: reviews,
  });

  return {
    ...result,
    version: claim.version,
    workflowStatus: claim.workflow_status,
    approvedReviews: reviews,
  };
}

export interface ProtocolGateStatus extends GateResult {
  readonly version: number;
  readonly workflowStatus: string;
  readonly approvedReviews: readonly ReviewType[];
}

export async function getProtocolGateStatus(
  db: Database,
  protocolId: string,
): Promise<ProtocolGateStatus | null> {
  const protocolRows = rows<{
    version: number;
    workflow_status: string;
    population_model: string | null;
    route_key: string | null;
    regulatory_context: string | null;
  }>(
    await db.execute(sql`
      select version, workflow_status, population_model, route_key, regulatory_context
      from protocols where id = ${protocolId}
    `),
  );

  const protocol = protocolRows[0];
  if (!protocol) return null;

  const sources = rows<{ has_source_location: boolean; source_is_citable: boolean }>(
    await db.execute(sql`
      select (ps.source_location_id is not null) as has_source_location,
             s.is_citable as source_is_citable
      from protocol_sources ps
      join sources s on s.id = ps.source_id
      where ps.protocol_id = ${protocolId}
    `),
  ).map<EvidenceLinkState>((row) => ({
    hasSourceLocation: row.has_source_location,
    sourceIsCitable: row.source_is_citable,
  }));

  const reviews = await approvedReviews(db, 'protocol', protocolId, protocol.version);

  const result = evaluateProtocolPublishGate({
    populationModel: protocol.population_model,
    routeKey: protocol.route_key,
    regulatoryContext: protocol.regulatory_context,
    sources,
    approvedReviews: reviews,
  });

  return {
    ...result,
    version: protocol.version,
    workflowStatus: protocol.workflow_status,
    approvedReviews: reviews,
  };
}

export async function getPeptideGateStatus(
  db: Database,
  peptideId: string,
): Promise<(GateResult & { version: number; workflowStatus: string }) | null> {
  const peptideRows = rows<{
    version: number;
    workflow_status: string;
    simple_summary: string | null;
    unknowns_summary: string | null;
  }>(
    await db.execute(sql`
      select version, workflow_status, simple_summary, unknowns_summary
      from peptides where id = ${peptideId}
    `),
  );

  const peptide = peptideRows[0];
  if (!peptide) return null;

  const reviews = await approvedReviews(db, 'peptide', peptideId, peptide.version);

  return {
    ...evaluatePeptidePublishGate({
      simpleSummary: peptide.simple_summary,
      unknownsSummary: peptide.unknowns_summary,
      approvedReviews: reviews,
    }),
    version: peptide.version,
    workflowStatus: peptide.workflow_status,
  };
}

export async function getQualityTopicGateStatus(
  db: Database,
  topicId: string,
): Promise<(GateResult & { version: number; workflowStatus: string }) | null> {
  const topicRows = rows<{
    version: number;
    workflow_status: string;
    what_it_proves: string | null;
    what_it_does_not_prove: string | null;
  }>(
    await db.execute(sql`
      select version, workflow_status, what_it_proves, what_it_does_not_prove
      from quality_topics where id = ${topicId}
    `),
  );

  const topic = topicRows[0];
  if (!topic) return null;

  const reviews = await approvedReviews(db, 'quality_topic', topicId, topic.version);

  return {
    ...evaluateQualityTopicPublishGate({
      whatItProves: topic.what_it_proves,
      whatItDoesNotProve: topic.what_it_does_not_prove,
      approvedReviews: reviews,
    }),
    version: topic.version,
    workflowStatus: topic.workflow_status,
  };
}
