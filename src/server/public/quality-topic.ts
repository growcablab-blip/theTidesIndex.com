import { sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/types';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';
import {
  CITATION_SELECT,
  relationshipEvidenceStatus,
  rows,
  str,
  toCitation,
  type Citation,
  type CitationRow,
  type EvidenceGap,
  type EvidenceRecord,
  type PublicClaim,
  type TopicRelationship,
} from './shapes';

/**
 * Assembling a quality topic for reading.
 *
 * Free of `server-only` and taking a database handle, so what a reader is shown
 * can be tested against a real database rather than asserted about in prose —
 * the same arrangement as the staff review packet.
 *
 * One assembly serves two surfaces. The public site reads the `public_v_*`
 * views as `anon`; a development preview reads the base tables so an unpublished
 * topic can be looked at before anyone is asked to approve it. The queries are
 * identical apart from the relation names, which is deliberate: two separately
 * maintained versions of this would drift, and the one that drifts is always the
 * one nobody is reading.
 *
 * Every column is named. Nothing here selects `*`, so a private column cannot
 * arrive by accident when the preview path reads a base table —
 * `extracted_text_private` in particular never leaves the database.
 */

export interface QualityTopicRecordState {
  readonly version: number;
  readonly publishedAt: string | null;
  readonly lastReviewedAt: string | null;
  readonly evidenceCutoffAt: string | null;
  readonly reviewState: string;
  readonly needsUpdate: boolean;
  /** True only for the development preview of an unpublished record. */
  readonly isPreview: boolean;
  readonly publicationState: string;
}

export interface QualityTopicReading extends QualityTopicRecordState {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string | null;
  readonly simpleSummary: string | null;
  readonly practitionerSummary: string | null;
  readonly whatItProves: string | null;
  readonly whatItDoesNotProve: string | null;
  readonly commonMisinterpretations: string | null;
  readonly claims: readonly PublicClaim[];
  readonly gaps: readonly EvidenceGap[];
  readonly relationships: readonly TopicRelationship[];
}

interface Relations {
  topics: SQL;
  claims: SQL;
  claimEvidence: SQL;
  sources: SQL;
  sourceTypes: SQL;
  evidenceTypes: SQL;
  locations: SQL;
  gaps: SQL;
  relationships: SQL;
}

const PUBLIC_RELATIONS: Relations = {
  topics: sql`public_v_quality_topics`,
  claims: sql`public_v_claims`,
  claimEvidence: sql`public_v_claim_evidence`,
  sources: sql`public_v_sources`,
  sourceTypes: sql`public_v_source_types`,
  evidenceTypes: sql`public_v_evidence_types`,
  locations: sql`public_v_source_locations`,
  gaps: sql`public_v_evidence_gaps`,
  relationships: sql`public_v_quality_relationships`,
};

const BASE_RELATIONS: Relations = {
  topics: sql`quality_topics`,
  claims: sql`claims`,
  claimEvidence: sql`claim_evidence`,
  sources: sql`sources`,
  sourceTypes: sql`source_types`,
  evidenceTypes: sql`evidence_types`,
  locations: sql`source_locations`,
  gaps: sql`evidence_gaps`,
  relationships: sql`quality_relationships`,
};

export async function readQualityTopic(
  tx: Database,
  slug: string,
  options: { preview?: boolean } = {},
): Promise<QualityTopicReading | null> {
  const preview = options.preview === true;
  const r = preview ? BASE_RELATIONS : PUBLIC_RELATIONS;

  const topicRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, quality_key, name, slug, short_description, simple_summary,
             practitioner_summary, what_it_proves, what_it_does_not_prove,
             common_misinterpretations, version, needs_update, review_state,
             published_at::text as published_at,
             last_reviewed_at::text as last_reviewed_at,
             evidence_cutoff_at::text as evidence_cutoff_at,
             ${preview ? sql`publication_state` : sql`'published'::text as publication_state`}
      from ${r.topics}
      where slug = ${slug}
    `),
  );
  const topic = topicRows[0];
  if (topic === undefined) return null;

  const topicId = String(topic.id);

  const claimRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, claim_key, claim_text, plain_language_text, claim_category,
             importance, certificate_type_scope, interpretation_notes, uncertainty_text,
             is_editorial_non_evidentiary, needs_update,
             last_reviewed_at::text as last_reviewed_at
      from ${r.claims}
      where quality_topic_id = ${topicId}
      order by claim_key
    `),
  );

  const evidenceRows = rows<CitationRow & Record<string, unknown>>(
    await tx.execute(sql`
      select ce.id, ce.claim_id, ce.evidence_type_key, ce.relationship,
             ce.population_model, ce.route_key, null::text as route_name,
             ce.formulation, ce.interpretation, ce.primary_source_verified,
             ce.primary_trace,
             et.public_label as evidence_type_label, et.evidence_class,
             et.is_human_evidence, et.is_interpretive,
             ${CITATION_SELECT}
      from ${r.claimEvidence} ce
      join ${r.claims} c on c.id = ce.claim_id
      join ${r.evidenceTypes} et on et.key = ce.evidence_type_key
      join ${r.sources} s on s.id = ce.source_id
      join ${r.sourceTypes} st on st.key = s.source_type_key
      left join ${r.locations} l on l.id = ce.source_location_id
      where c.quality_topic_id = ${topicId}
      -- Deterministic to the last column. Evidence type and source alone leave
      -- two passages from the same source in arbitrary order, so a reader could
      -- see the citations under a claim reorder between one render and the next.
      order by et.sort_order, s.source_key, l.page_start nulls last, ce.id
    `),
  );

  const evidenceByClaim = new Map<string, EvidenceRecord[]>();
  for (const row of evidenceRows) {
    const claimId = String(row.claim_id);
    const list = evidenceByClaim.get(claimId) ?? [];
    list.push({
      id: String(row.id),
      evidenceTypeKey: String(row.evidence_type_key),
      evidenceTypeLabel: String(row.evidence_type_label),
      evidenceClass: row.evidence_class as EvidenceClass,
      isHumanEvidence: Boolean(row.is_human_evidence),
      isInterpretive: Boolean(row.is_interpretive),
      relationship: String(row.relationship),
      populationModel: str(row.population_model),
      routeKey: str(row.route_key),
      routeName: null,
      formulation: str(row.formulation),
      interpretation: str(row.interpretation),
      primarySourceVerified: Boolean(row.primary_source_verified),
      primaryTrace: String(row.primary_trace),
      citation: toCitation(row),
    });
    evidenceByClaim.set(claimId, list);
  }

  const gapRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select id, gap_type, statement, why_not_supported, what_would_resolve_it,
             verification_issue_key, sort_order
      from ${r.gaps}
      where quality_topic_id = ${topicId}
      order by sort_order
    `),
  );

  // In preview the view's join is not available, so the target's name and state
  // are fetched the same way the view computes them.
  const relationshipRows = rows<Record<string, unknown>>(
    await tx.execute(
      preview
        ? sql`
            select rel.id, rel.relationship_type, rel.rationale, rel.claim_key,
                   rel.gap_key, rel.is_editorial_navigational, rel.sort_order,
                   t.name as to_name, t.slug as to_slug,
                   (t.publication_state = 'published') as to_is_published
            from quality_relationships rel
            join quality_topics t on t.id = rel.to_topic_id
            where rel.from_topic_id = ${topicId}
            order by rel.sort_order
          `
        : sql`
            select id, relationship_type, rationale, claim_key, gap_key,
                   is_editorial_navigational, sort_order,
                   to_name, to_slug, to_is_published
            from public_v_quality_relationships
            where from_topic_id = ${topicId}
            order by sort_order
          `,
    ),
  );

  return {
    id: topicId,
    slug: String(topic.slug),
    name: String(topic.name),
    shortDescription: str(topic.short_description),
    simpleSummary: str(topic.simple_summary),
    practitionerSummary: str(topic.practitioner_summary),
    whatItProves: str(topic.what_it_proves),
    whatItDoesNotProve: str(topic.what_it_does_not_prove),
    commonMisinterpretations: str(topic.common_misinterpretations),

    version: Number(topic.version),
    publishedAt: str(topic.published_at),
    lastReviewedAt: str(topic.last_reviewed_at),
    evidenceCutoffAt: str(topic.evidence_cutoff_at),
    reviewState: String(topic.review_state),
    publicationState: String(topic.publication_state),
    needsUpdate: Boolean(topic.needs_update),
    isPreview: preview && topic.publication_state !== 'published',

    claims: claimRows.map((c) => ({
      id: String(c.id),
      claimKey: String(c.claim_key),
      claimText: String(c.claim_text),
      plainLanguageText: str(c.plain_language_text),
      claimCategory: str(c.claim_category),
      importance: String(c.importance),
      certificateTypeScope: str(c.certificate_type_scope),
      interpretationNotes: str(c.interpretation_notes),
      uncertaintyText: str(c.uncertainty_text),
      isEditorialNonEvidentiary: Boolean(c.is_editorial_non_evidentiary),
      needsUpdate: Boolean(c.needs_update),
      lastReviewedAt: str(c.last_reviewed_at),
      evidence: evidenceByClaim.get(String(c.id)) ?? [],
    })),

    gaps: gapRows.map((g) => ({
      id: String(g.id),
      gapType: String(g.gap_type),
      statement: String(g.statement),
      whyNotSupported: String(g.why_not_supported),
      whatWouldResolveIt: str(g.what_would_resolve_it),
      verificationIssueKey: str(g.verification_issue_key),
      // Quality topics carry no research questions yet. The shape is shared
      // with compounds, so the fields are present and null rather than absent.
      researchQuestion: null,
      opportunityType: null,
    })),

    relationships: relationshipRows.map((rel) => ({
      id: String(rel.id),
      relationshipType: String(rel.relationship_type),
      rationale: String(rel.rationale),
      evidenceStatus: relationshipEvidenceStatus({
        relationship_type: rel.relationship_type,
        claim_key: rel.claim_key,
        gap_key: rel.gap_key,
      }),
      claimKey: str(rel.claim_key),
      gapKey: str(rel.gap_key),
      toName: String(rel.to_name),
      toSlug: String(rel.to_slug),
      toIsPublished: Boolean(rel.to_is_published),
    })),
  };
}

export type { Citation };
