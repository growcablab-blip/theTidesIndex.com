import 'server-only';
import { sql } from 'drizzle-orm';
import { getStaffDb } from '../db/client';
import { withStaffSession } from '../db/session';
import type { StaffSession } from '../auth/session';
import type { Database } from '../db/types';

/**
 * Read queries for the editorial surfaces.
 *
 * Every read runs under the acting user's staff session, so what an editor sees
 * is exactly what the row-level security policies permit them to see. A reader
 * with no active staff profile gets empty results rather than a partial view.
 */

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export function asStaff<T>(
  session: StaffSession,
  work: (tx: Database) => Promise<T>,
): Promise<T> {
  return withStaffSession(getStaffDb(), session.userId, work);
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardCounts {
  readonly sources: number;
  readonly citableSources: number;
  readonly peptides: number;
  readonly publishedPeptides: number;
  readonly claims: number;
  readonly publishedClaims: number;
  readonly protocols: number;
  readonly publishedProtocols: number;
  readonly qualityTopics: number;
  readonly publishedQualityTopics: number;
  readonly openVerificationIssues: number;
  readonly needsUpdate: number;
}

export async function getDashboardCounts(session: StaffSession): Promise<DashboardCounts> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select
        (select count(*) from sources)::int as sources,
        (select count(*) from sources where is_citable)::int as citable_sources,
        (select count(*) from peptides)::int as peptides,
        (select count(*) from peptides where publication_state = 'published')::int as published_peptides,
        (select count(*) from claims)::int as claims,
        (select count(*) from claims where publication_state = 'published')::int as published_claims,
        (select count(*) from protocols)::int as protocols,
        (select count(*) from protocols where publication_state = 'published')::int as published_protocols,
        (select count(*) from quality_topics)::int as quality_topics,
        (select count(*) from quality_topics where publication_state = 'published')::int as published_quality_topics,
        (select count(*) from verification_issues where status = 'open')::int as open_verification_issues,
        (
          (select count(*) from claims where needs_update)
          + (select count(*) from protocols where needs_update)
          + (select count(*) from peptides where needs_update)
        )::int as needs_update
    `);

    const row = rows<Record<string, number>>(result)[0] ?? {};
    return {
      sources: row.sources ?? 0,
      citableSources: row.citable_sources ?? 0,
      peptides: row.peptides ?? 0,
      publishedPeptides: row.published_peptides ?? 0,
      claims: row.claims ?? 0,
      publishedClaims: row.published_claims ?? 0,
      protocols: row.protocols ?? 0,
      publishedProtocols: row.published_protocols ?? 0,
      qualityTopics: row.quality_topics ?? 0,
      publishedQualityTopics: row.published_quality_topics ?? 0,
      openVerificationIssues: row.open_verification_issues ?? 0,
      needsUpdate: row.needs_update ?? 0,
    };
  });
}

export interface VerificationIssueRow {
  readonly issueKey: string;
  readonly topic: string;
  readonly priority: string;
  readonly status: string;
  readonly whyItMatters: string;
}

export async function listVerificationIssues(
  session: StaffSession,
): Promise<VerificationIssueRow[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select issue_key, topic, priority, status, why_it_matters
      from verification_issues
      where status = 'open'
      order by case priority when 'critical' then 0 when 'high' then 1 else 2 end, issue_key
    `);
    return rows<{
      issue_key: string;
      topic: string;
      priority: string;
      status: string;
      why_it_matters: string;
    }>(result).map((r) => ({
      issueKey: r.issue_key,
      topic: r.topic,
      priority: r.priority,
      status: r.status,
      whyItMatters: r.why_it_matters,
    }));
  });
}

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface SourceRow {
  readonly id: string;
  readonly sourceKey: string;
  readonly title: string;
  readonly sourceTypeKey: string;
  readonly sourceTypeLabel: string;
  readonly qcStatus: string;
  readonly isCitable: boolean;
  readonly year: number | null;
  readonly authors: string[];
  readonly locationCount: number;
}

export async function listSources(session: StaffSession): Promise<SourceRow[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select s.id, s.source_key, s.title, s.source_type_key, st.public_label as source_type_label,
             s.qc_status, s.is_citable, s.year, s.authors,
             (select count(*) from source_locations l where l.source_id = s.id)::int as location_count
      from sources s
      join source_types st on st.key = s.source_type_key
      order by s.source_key
    `);
    return rows<{
      id: string;
      source_key: string;
      title: string;
      source_type_key: string;
      source_type_label: string;
      qc_status: string;
      is_citable: boolean;
      year: number | null;
      authors: string[];
      location_count: number;
    }>(result).map((r) => ({
      id: r.id,
      sourceKey: r.source_key,
      title: r.title,
      sourceTypeKey: r.source_type_key,
      sourceTypeLabel: r.source_type_label,
      qcStatus: r.qc_status,
      isCitable: r.is_citable,
      year: r.year,
      authors: Array.isArray(r.authors) ? r.authors : [],
      locationCount: r.location_count,
    }));
  });
}

export interface SourceDetail extends SourceRow {
  readonly primaryRole: string | null;
  readonly limitationsNotes: string | null;
  readonly authorityNotes: string | null;
  readonly localPrivateFilename: string | null;
  readonly doi: string | null;
  readonly locations: readonly {
    id: string;
    locatorText: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    chapter: string | null;
    section: string | null;
    usageCount: number;
  }[];
}

export async function getSourceDetail(
  session: StaffSession,
  sourceId: string,
): Promise<SourceDetail | null> {
  return asStaff(session, async (tx) => {
    const sourceRows = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select s.id, s.source_key, s.title, s.source_type_key, st.public_label as source_type_label,
               s.qc_status, s.is_citable, s.year, s.authors, s.primary_role,
               s.limitations_notes, s.authority_notes, s.local_private_filename, s.doi,
               (select count(*) from source_locations l where l.source_id = s.id)::int as location_count
        from sources s
        join source_types st on st.key = s.source_type_key
        where s.id = ${sourceId}
      `),
    );
    const source = sourceRows[0];
    if (!source) return null;

    const locations = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select l.id, l.locator_text, l.page_start, l.page_end, l.chapter, l.section,
               (
                 (select count(*) from claim_evidence ce where ce.source_location_id = l.id)
                 + (select count(*) from protocol_sources ps where ps.source_location_id = l.id)
               )::int as usage_count
        from source_locations l
        where l.source_id = ${sourceId}
        order by l.page_start nulls last, l.created_at
      `),
    ).map((l) => ({
      id: String(l.id),
      locatorText: (l.locator_text as string | null) ?? null,
      pageStart: (l.page_start as number | null) ?? null,
      pageEnd: (l.page_end as number | null) ?? null,
      chapter: (l.chapter as string | null) ?? null,
      section: (l.section as string | null) ?? null,
      usageCount: (l.usage_count as number) ?? 0,
    }));

    return {
      id: String(source.id),
      sourceKey: String(source.source_key),
      title: String(source.title),
      sourceTypeKey: String(source.source_type_key),
      sourceTypeLabel: String(source.source_type_label),
      qcStatus: String(source.qc_status),
      isCitable: Boolean(source.is_citable),
      year: (source.year as number | null) ?? null,
      authors: Array.isArray(source.authors) ? (source.authors as string[]) : [],
      locationCount: (source.location_count as number) ?? 0,
      primaryRole: (source.primary_role as string | null) ?? null,
      limitationsNotes: (source.limitations_notes as string | null) ?? null,
      authorityNotes: (source.authority_notes as string | null) ?? null,
      localPrivateFilename: (source.local_private_filename as string | null) ?? null,
      doi: (source.doi as string | null) ?? null,
      locations,
    };
  });
}

// ---------------------------------------------------------------------------
// Compounds
// ---------------------------------------------------------------------------

export interface PeptideRow {
  readonly id: string;
  readonly peptideKey: string;
  readonly canonicalName: string;
  readonly slug: string;
  readonly editorialState: string;
  readonly version: number;
  readonly claimCount: number;
  readonly protocolCount: number;
  readonly aliasCount: number;
  readonly hasSummaries: boolean;
}

export async function listPeptides(session: StaffSession): Promise<PeptideRow[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select p.id, p.peptide_key, p.canonical_name, p.slug, p.editorial_state, p.version,
             (select count(*) from claims c where c.peptide_id = p.id)::int as claim_count,
             (select count(*) from protocols pr where pr.peptide_id = p.id)::int as protocol_count,
             (select count(*) from peptide_aliases a where a.peptide_id = p.id)::int as alias_count,
             (p.simple_summary is not null and p.unknowns_summary is not null) as has_summaries
      from peptides p
      order by p.canonical_name
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      peptideKey: String(r.peptide_key),
      canonicalName: String(r.canonical_name),
      slug: String(r.slug),
      editorialState: String(r.editorial_state),
      version: Number(r.version),
      claimCount: Number(r.claim_count),
      protocolCount: Number(r.protocol_count),
      aliasCount: Number(r.alias_count),
      hasSummaries: Boolean(r.has_summaries),
    }));
  });
}

export interface PeptideDetail {
  readonly id: string;
  readonly peptideKey: string;
  readonly canonicalName: string;
  readonly slug: string;
  readonly editorialState: string;
  readonly version: number;
  readonly shortDescription: string | null;
  readonly simpleSummary: string | null;
  readonly practitionerSummary: string | null;
  readonly unknownsSummary: string | null;
  readonly sequence: string | null;
  readonly molecularDescription: string | null;
  readonly compoundTypeLabel: string | null;
  readonly isPeptide: boolean | null;
  readonly aliases: readonly { id: string; alias: string; aliasType: string; notes: string | null }[];
  readonly claims: readonly {
    id: string;
    claimKey: string;
    claimText: string;
    importance: string;
    editorialState: string;
    evidenceCount: number;
  }[];
  readonly protocols: readonly {
    id: string;
    protocolKey: string;
    objectiveContext: string;
    routeKey: string | null;
    editorialState: string;
    sourceCount: number;
  }[];
}

export async function getPeptideDetail(
  session: StaffSession,
  peptideId: string,
): Promise<PeptideDetail | null> {
  return asStaff(session, async (tx) => {
    const peptideRows = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select p.*, ct.label as compound_type_label, ct.is_peptide
        from peptides p
        left join compound_types ct on ct.key = p.compound_type_key
        where p.id = ${peptideId}
      `),
    );
    const peptide = peptideRows[0];
    if (!peptide) return null;

    const aliases = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select id, alias, alias_type, notes from peptide_aliases
        where peptide_id = ${peptideId} order by alias
      `),
    ).map((a) => ({
      id: String(a.id),
      alias: String(a.alias),
      aliasType: String(a.alias_type),
      notes: (a.notes as string | null) ?? null,
    }));

    const claims = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select c.id, c.claim_key, c.claim_text, c.importance, c.editorial_state,
               (select count(*) from claim_evidence ce where ce.claim_id = c.id)::int as evidence_count
        from claims c where c.peptide_id = ${peptideId}
        order by c.claim_key
      `),
    ).map((c) => ({
      id: String(c.id),
      claimKey: String(c.claim_key),
      claimText: String(c.claim_text),
      importance: String(c.importance),
      editorialState: String(c.editorial_state),
      evidenceCount: Number(c.evidence_count),
    }));

    const protocols = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select pr.id, pr.protocol_key, pr.objective_context, pr.route_key, pr.editorial_state,
               (select count(*) from protocol_sources ps where ps.protocol_id = pr.id)::int as source_count
        from protocols pr where pr.peptide_id = ${peptideId}
        order by pr.protocol_key
      `),
    ).map((p) => ({
      id: String(p.id),
      protocolKey: String(p.protocol_key),
      objectiveContext: String(p.objective_context),
      routeKey: (p.route_key as string | null) ?? null,
      editorialState: String(p.editorial_state),
      sourceCount: Number(p.source_count),
    }));

    return {
      id: String(peptide.id),
      peptideKey: String(peptide.peptide_key),
      canonicalName: String(peptide.canonical_name),
      slug: String(peptide.slug),
      editorialState: String(peptide.editorial_state),
      version: Number(peptide.version),
      shortDescription: (peptide.short_description as string | null) ?? null,
      simpleSummary: (peptide.simple_summary as string | null) ?? null,
      practitionerSummary: (peptide.practitioner_summary as string | null) ?? null,
      unknownsSummary: (peptide.unknowns_summary as string | null) ?? null,
      sequence: (peptide.sequence as string | null) ?? null,
      molecularDescription: (peptide.molecular_description as string | null) ?? null,
      compoundTypeLabel: (peptide.compound_type_label as string | null) ?? null,
      isPeptide: (peptide.is_peptide as boolean | null) ?? null,
      aliases,
      claims,
      protocols,
    };
  });
}

// ---------------------------------------------------------------------------
// Claims
// ---------------------------------------------------------------------------

export interface ClaimDetail {
  readonly id: string;
  readonly claimKey: string;
  readonly claimText: string;
  readonly plainLanguageText: string | null;
  readonly importance: string;
  readonly interpretationNotes: string | null;
  readonly uncertaintyText: string | null;
  readonly isEditorialNonEvidentiary: boolean;
  readonly editorialState: string;
  readonly version: number;
  readonly peptideId: string | null;
  readonly peptideName: string | null;
  readonly evidence: readonly {
    id: string;
    sourceId: string;
    sourceKey: string;
    sourceTitle: string;
    sourceIsCitable: boolean;
    locatorText: string | null;
    evidenceTypeKey: string;
    evidenceTypeLabel: string;
    evidenceClass: string;
    relationship: string;
    populationModel: string | null;
    routeKey: string | null;
    interpretation: string | null;
    primarySourceVerified: boolean;
  }[];
  readonly reviews: readonly {
    id: string;
    reviewType: string;
    outcome: string;
    entityVersion: number;
    reviewerName: string | null;
    comments: string | null;
    reviewedAt: string;
  }[];
}

export async function getClaimDetail(
  session: StaffSession,
  claimId: string,
): Promise<ClaimDetail | null> {
  return asStaff(session, async (tx) => {
    const claimRows = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select c.*, p.canonical_name as peptide_name
        from claims c
        left join peptides p on p.id = c.peptide_id
        where c.id = ${claimId}
      `),
    );
    const claim = claimRows[0];
    if (!claim) return null;

    const evidence = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select ce.id, ce.source_id, s.source_key, s.title as source_title, s.is_citable,
               l.locator_text, ce.evidence_type_key, et.public_label as evidence_type_label,
               et.evidence_class, ce.relationship, ce.population_model, ce.route_key,
               ce.interpretation, ce.primary_source_verified
        from claim_evidence ce
        join sources s on s.id = ce.source_id
        join evidence_types et on et.key = ce.evidence_type_key
        left join source_locations l on l.id = ce.source_location_id
        where ce.claim_id = ${claimId}
        order by ce.created_at
      `),
    ).map((e) => ({
      id: String(e.id),
      sourceId: String(e.source_id),
      sourceKey: String(e.source_key),
      sourceTitle: String(e.source_title),
      sourceIsCitable: Boolean(e.is_citable),
      locatorText: (e.locator_text as string | null) ?? null,
      evidenceTypeKey: String(e.evidence_type_key),
      evidenceTypeLabel: String(e.evidence_type_label),
      evidenceClass: String(e.evidence_class),
      relationship: String(e.relationship),
      populationModel: (e.population_model as string | null) ?? null,
      routeKey: (e.route_key as string | null) ?? null,
      interpretation: (e.interpretation as string | null) ?? null,
      primarySourceVerified: Boolean(e.primary_source_verified),
    }));

    const reviews = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select r.id, r.review_type, r.outcome, r.entity_version, r.comments,
               r.reviewed_at::text as reviewed_at, pr.display_name as reviewer_name
        from reviews r
        left join profiles pr on pr.user_id = r.reviewer_user_id
        where r.entity_type = 'claim' and r.entity_id = ${claimId}
        order by r.reviewed_at desc
      `),
    ).map((r) => ({
      id: String(r.id),
      reviewType: String(r.review_type),
      outcome: String(r.outcome),
      entityVersion: Number(r.entity_version),
      reviewerName: (r.reviewer_name as string | null) ?? null,
      comments: (r.comments as string | null) ?? null,
      reviewedAt: String(r.reviewed_at),
    }));

    return {
      id: String(claim.id),
      claimKey: String(claim.claim_key),
      claimText: String(claim.claim_text),
      plainLanguageText: (claim.plain_language_text as string | null) ?? null,
      importance: String(claim.importance),
      interpretationNotes: (claim.interpretation_notes as string | null) ?? null,
      uncertaintyText: (claim.uncertainty_text as string | null) ?? null,
      isEditorialNonEvidentiary: Boolean(claim.is_editorial_non_evidentiary),
      editorialState: String(claim.editorial_state),
      version: Number(claim.version),
      peptideId: (claim.peptide_id as string | null) ?? null,
      peptideName: (claim.peptide_name as string | null) ?? null,
      evidence,
      reviews,
    };
  });
}

// ---------------------------------------------------------------------------
// Vocabularies, for form controls
// ---------------------------------------------------------------------------

export interface Option {
  readonly value: string;
  readonly label: string;
  readonly group?: string;
}

export async function getFormVocabularies(session: StaffSession): Promise<{
  sourceTypes: Option[];
  evidenceTypes: Option[];
  routes: Option[];
}> {
  return asStaff(session, async (tx) => {
    const sourceTypes = rows<{ key: string; public_label: string }>(
      await tx.execute(
        sql`select key, public_label from source_types where is_active order by sort_order`,
      ),
    ).map((r) => ({ value: r.key, label: r.public_label }));

    const evidenceTypes = rows<{ key: string; public_label: string; evidence_class: string }>(
      await tx.execute(
        sql`select key, public_label, evidence_class from evidence_types where is_active order by sort_order`,
      ),
    ).map((r) => ({
      value: r.key,
      label: r.public_label,
      group: EVIDENCE_CLASS_LABELS[r.evidence_class] ?? r.evidence_class,
    }));

    const routes = rows<{ key: string; name: string }>(
      await tx.execute(sql`select key, name from routes where is_active order by sort_order`),
    ).map((r) => ({ value: r.key, label: r.name }));

    return { sourceTypes, evidenceTypes, routes };
  });
}

const EVIDENCE_CLASS_LABELS: Readonly<Record<string, string>> = {
  human: 'Human evidence',
  preclinical: 'Preclinical evidence',
  reference_opinion: 'Reference and opinion',
};

// ---------------------------------------------------------------------------
// Review queue
// ---------------------------------------------------------------------------

export interface ReviewQueueItem {
  readonly entityType: 'claim' | 'protocol' | 'peptide' | 'quality_topic';
  readonly entityId: string;
  readonly label: string;
  readonly detail: string;
  readonly editorialState: string;
  readonly version: number;
  readonly approvedReviews: readonly string[];
}

/**
 * Records awaiting attention: anything not published, plus anything that has
 * fallen back to `needs_update` because its provenance changed underneath it.
 */
export async function getReviewQueue(session: StaffSession): Promise<ReviewQueueItem[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      with candidates as (
        select 'claim'::text as entity_type, c.id, c.claim_key as label,
               c.claim_text as detail, c.editorial_state, c.needs_update, c.version
        from claims c where c.publication_state <> 'published' or c.needs_update
        union all
        select 'protocol', p.id, p.protocol_key, p.objective_context,
               p.editorial_state, p.needs_update, p.version
        from protocols p where p.publication_state <> 'published' or p.needs_update
        union all
        select 'peptide', pe.id, pe.canonical_name, coalesce(pe.short_description, ''),
               pe.editorial_state, pe.needs_update, pe.version
        from peptides pe where pe.publication_state <> 'published' or pe.needs_update
        union all
        select 'quality_topic', q.id, q.name, coalesce(q.short_description, ''),
               q.editorial_state, q.needs_update, q.version
        from quality_topics q where q.publication_state <> 'published' or q.needs_update
      )
      select c.*, coalesce((
        select array_agg(distinct r.review_type::text)
        from reviews r
        where r.entity_type::text = c.entity_type
          and r.entity_id = c.id
          and r.entity_version = c.version
          and r.outcome = 'approved'
      ), array[]::text[]) as approved_reviews
      from candidates c
      order by
        case when c.needs_update then 0 when c.editorial_state = 'rejected' then 2 else 1 end,
        c.entity_type, c.label
      limit 200
    `);

    return rows<Record<string, unknown>>(result).map((r) => ({
      entityType: r.entity_type as ReviewQueueItem['entityType'],
      entityId: String(r.id),
      label: String(r.label),
      detail: typeof r.detail === 'string' ? r.detail : '',
      editorialState: String(r.editorial_state),
      version: Number(r.version),
      approvedReviews: Array.isArray(r.approved_reviews) ? (r.approved_reviews as string[]) : [],
    }));
  });
}

// ---------------------------------------------------------------------------
// Protocols
// ---------------------------------------------------------------------------

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export interface ProtocolDetail {
  readonly id: string;
  readonly protocolKey: string;
  readonly peptideId: string | null;
  readonly peptideName: string | null;
  readonly combinationName: string | null;
  readonly objectiveContext: string;
  readonly populationModel: string | null;
  readonly routeKey: string | null;
  readonly formulation: string | null;
  readonly regulatoryContext: string | null;
  readonly evidenceTypeKey: string;
  readonly amountReported: string | null;
  readonly amountUnit: string | null;
  readonly frequencyText: string | null;
  readonly timingText: string | null;
  readonly durationText: string | null;
  readonly cycleText: string | null;
  readonly titrationText: string | null;
  readonly monitoringText: string | null;
  readonly contraindicationsText: string | null;
  readonly safetyNotes: string | null;
  readonly adverseEventsText: string | null;
  readonly outcomeContext: string | null;
  readonly patientVisibility: boolean;
  readonly editorialState: string;
  readonly version: number;
  readonly sources: readonly {
    id: string;
    sourceId: string;
    sourceKey: string;
    sourceTitle: string;
    sourceIsCitable: boolean;
    locatorText: string | null;
    sourceRole: string;
  }[];
  /** Other protocols for the same compound. Displayed alongside, never merged. */
  readonly siblings: readonly {
    id: string;
    protocolKey: string;
    objectiveContext: string;
    sourceKeys: string[];
  }[];
}

export async function getProtocolDetail(
  session: StaffSession,
  protocolId: string,
): Promise<ProtocolDetail | null> {
  return asStaff(session, async (tx) => {
    const protocolRows = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select p.*, pe.canonical_name as peptide_name
        from protocols p
        left join peptides pe on pe.id = p.peptide_id
        where p.id = ${protocolId}
      `),
    );
    const protocol = protocolRows[0];
    if (!protocol) return null;

    const sources = rows<Record<string, unknown>>(
      await tx.execute(sql`
        select ps.id, ps.source_id, s.source_key, s.title as source_title, s.is_citable,
               l.locator_text, ps.source_role
        from protocol_sources ps
        join sources s on s.id = ps.source_id
        left join source_locations l on l.id = ps.source_location_id
        where ps.protocol_id = ${protocolId}
        order by ps.created_at
      `),
    ).map((s) => ({
      id: String(s.id),
      sourceId: String(s.source_id),
      sourceKey: String(s.source_key),
      sourceTitle: String(s.source_title),
      sourceIsCitable: Boolean(s.is_citable),
      locatorText: str(s.locator_text),
      sourceRole: String(s.source_role),
    }));

    const peptideId = str(protocol.peptide_id);
    const siblings = peptideId
      ? rows<Record<string, unknown>>(
          await tx.execute(sql`
            select p.id, p.protocol_key, p.objective_context,
                   coalesce((
                     select array_agg(s.source_key order by s.source_key)
                     from protocol_sources ps join sources s on s.id = ps.source_id
                     where ps.protocol_id = p.id
                   ), array[]::text[]) as source_keys
            from protocols p
            where p.peptide_id = ${peptideId} and p.id <> ${protocolId}
            order by p.protocol_key
          `),
        ).map((s) => ({
          id: String(s.id),
          protocolKey: String(s.protocol_key),
          objectiveContext: String(s.objective_context),
          sourceKeys: Array.isArray(s.source_keys) ? (s.source_keys as string[]) : [],
        }))
      : [];

    return {
      id: String(protocol.id),
      protocolKey: String(protocol.protocol_key),
      peptideId,
      peptideName: str(protocol.peptide_name),
      combinationName: str(protocol.combination_name),
      objectiveContext: String(protocol.objective_context),
      populationModel: str(protocol.population_model),
      routeKey: str(protocol.route_key),
      formulation: str(protocol.formulation),
      regulatoryContext: str(protocol.regulatory_context),
      evidenceTypeKey: String(protocol.evidence_type_key),
      amountReported: str(protocol.amount_reported),
      amountUnit: str(protocol.amount_unit),
      frequencyText: str(protocol.frequency_text),
      timingText: str(protocol.timing_text),
      durationText: str(protocol.duration_text),
      cycleText: str(protocol.cycle_text),
      titrationText: str(protocol.titration_text),
      monitoringText: str(protocol.monitoring_text),
      contraindicationsText: str(protocol.contraindications_text),
      safetyNotes: str(protocol.safety_notes),
      adverseEventsText: str(protocol.adverse_events_text),
      outcomeContext: str(protocol.outcome_context),
      patientVisibility: Boolean(protocol.patient_visibility),
      editorialState: String(protocol.editorial_state),
      version: Number(protocol.version),
      sources,
      siblings,
    };
  });
}

// ---------------------------------------------------------------------------
// Quality topics
// ---------------------------------------------------------------------------

export interface QualityTopicRow {
  readonly id: string;
  readonly qualityKey: string;
  readonly name: string;
  readonly slug: string;
  readonly editorialState: string;
  readonly hasBothHalves: boolean;
}

export async function listQualityTopics(session: StaffSession): Promise<QualityTopicRow[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select id, quality_key, name, slug, editorial_state,
             (what_it_proves is not null and what_it_does_not_prove is not null) as has_both_halves
      from quality_topics order by sort_order, name
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      qualityKey: String(r.quality_key),
      name: String(r.name),
      slug: String(r.slug),
      editorialState: String(r.editorial_state),
      hasBothHalves: Boolean(r.has_both_halves),
    }));
  });
}

export interface QualityTopicDetail extends QualityTopicRow {
  readonly shortDescription: string | null;
  readonly simpleSummary: string | null;
  readonly practitionerSummary: string | null;
  readonly whatItProves: string | null;
  readonly whatItDoesNotProve: string | null;
  readonly commonMisinterpretations: string | null;
  readonly version: number;
}

export async function getQualityTopicDetail(
  session: StaffSession,
  topicId: string,
): Promise<QualityTopicDetail | null> {
  return asStaff(session, async (tx) => {
    const topicRows = rows<Record<string, unknown>>(
      await tx.execute(sql`select * from quality_topics where id = ${topicId}`),
    );
    const topic = topicRows[0];
    if (!topic) return null;

    return {
      id: String(topic.id),
      qualityKey: String(topic.quality_key),
      name: String(topic.name),
      slug: String(topic.slug),
      editorialState: String(topic.editorial_state),
      hasBothHalves:
        typeof topic.what_it_proves === 'string' &&
        typeof topic.what_it_does_not_prove === 'string',
      shortDescription: str(topic.short_description),
      simpleSummary: str(topic.simple_summary),
      practitionerSummary: str(topic.practitioner_summary),
      whatItProves: str(topic.what_it_proves),
      whatItDoesNotProve: str(topic.what_it_does_not_prove),
      commonMisinterpretations: str(topic.common_misinterpretations),
      version: Number(topic.version),
    };
  });
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

export interface StaffRow {
  readonly userId: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly role: string;
  readonly isActive: boolean;
  readonly reviewCount: number;
}

export async function listStaff(session: StaffSession): Promise<StaffRow[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(sql`
      select p.user_id, p.display_name, p.email, p.role, p.is_active,
             (select count(*) from reviews r where r.reviewer_user_id = p.user_id)::int as review_count
      from profiles p
      order by p.display_name
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      userId: String(r.user_id),
      displayName: String(r.display_name),
      email: str(r.email),
      role: String(r.role),
      isActive: Boolean(r.is_active),
      reviewCount: Number(r.review_count),
    }));
  });
}

/** Compounds available when creating a protocol. */
export async function listPeptideOptions(session: StaffSession): Promise<Option[]> {
  return asStaff(session, async (tx) => {
    const result = await tx.execute(
      sql`select id, canonical_name from peptides order by canonical_name`,
    );
    return rows<{ id: string; canonical_name: string }>(result).map((r) => ({
      value: r.id,
      label: r.canonical_name,
    }));
  });
}
