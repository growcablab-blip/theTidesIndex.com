import 'server-only';
import { sql } from 'drizzle-orm';
import { cache } from 'react';
import { getPublicDb } from '../db/client';
import { withPublicSession } from '../db/session';
import type { Database } from '../db/types';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';
import {
  CITATION_SELECT,
  rows,
  str,
  toCitation,
  type Citation,
  type CitationRow,
  type EvidenceRecord,
  type PractitionerProtocol,
  type PublicClaim,
  type SimpleProtocol,
} from './shapes';
import { readProtocols } from './protocol-reader';
import { readQualityTopic, type QualityTopicReading } from './quality-topic';
import { readSpecimenCertificate, type CertificateReading } from './certificate';

export type { QualityTopicReading } from './quality-topic';
export type {
  CertificateReading,
  CertificateTestReading,
  DimensionState,
  TransparencyDimension,
} from './certificate';
export type {
  Citation,
  EvidenceGap,
  EvidenceRecord,
  RelationshipEvidenceStatus,
  TopicRelationship,
  PractitionerProtocol,
  PublicClaim,
  SimpleProtocol,
} from './shapes';
import type { ReadingMode } from '@/domain/presentation/reading-mode';

/**
 * The public read surface.
 *
 * Every query here runs inside `withPublicSession`, which drops the connection
 * to the `anon` role. That role holds privileges on the `public_v_*` views and
 * on nothing else, so a mistake in a query below cannot reach a draft record, a
 * private column, or — in patient mode — a dose. The boundary is the database's,
 * not this file's.
 */

function asPublic<T>(work: (tx: Database) => Promise<T>): Promise<T> {
  return withPublicSession(getPublicDb(), work);
}

// ---------------------------------------------------------------------------
// Compounds
// ---------------------------------------------------------------------------

export interface PeptideSummaryRow {
  readonly id: string;
  readonly slug: string;
  readonly canonicalName: string;
  readonly shortDescription: string | null;
  readonly categoryLabel: string | null;
  readonly compoundTypeLabel: string | null;
  readonly isPeptide: boolean;
  readonly aliases: readonly string[];
  readonly humanEvidenceCount: number;
  readonly preclinicalEvidenceCount: number;
  readonly referenceEvidenceCount: number;
  readonly needsUpdate: boolean;
}

/** Every published compound, for the index. */
export const listPeptides = cache(async (): Promise<PeptideSummaryRow[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select p.id, p.slug, p.canonical_name, p.short_description, p.needs_update,
             cc.label as category_label, ct.label as compound_type_label,
             coalesce(ct.is_peptide, true) as is_peptide,
             coalesce((
               select array_agg(a.alias order by a.alias)
               from public_v_peptide_aliases a
               where a.peptide_id = p.id and a.alias_type <> 'related_but_distinct'
             ), array[]::text[]) as aliases,
             coalesce((
               select count(*) from public_v_claims c
               join public_v_claim_evidence ce on ce.claim_id = c.id
               join public_v_evidence_types et on et.key = ce.evidence_type_key
               where c.peptide_id = p.id and et.evidence_class = 'human'
             ), 0)::int as human_count,
             coalesce((
               select count(*) from public_v_claims c
               join public_v_claim_evidence ce on ce.claim_id = c.id
               join public_v_evidence_types et on et.key = ce.evidence_type_key
               where c.peptide_id = p.id and et.evidence_class = 'preclinical'
             ), 0)::int as preclinical_count,
             coalesce((
               select count(*) from public_v_claims c
               join public_v_claim_evidence ce on ce.claim_id = c.id
               join public_v_evidence_types et on et.key = ce.evidence_type_key
               where c.peptide_id = p.id and et.evidence_class = 'reference_opinion'
             ), 0)::int as reference_count
      from public_v_peptides p
      left join public_v_compound_categories cc on cc.key = p.primary_category_key
      left join public_v_compound_types ct on ct.key = p.compound_type_key
      order by p.canonical_name
    `);

    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      canonicalName: String(r.canonical_name),
      shortDescription: str(r.short_description),
      categoryLabel: str(r.category_label),
      compoundTypeLabel: str(r.compound_type_label),
      isPeptide: Boolean(r.is_peptide),
      aliases: Array.isArray(r.aliases) ? (r.aliases as string[]) : [],
      humanEvidenceCount: Number(r.human_count),
      preclinicalEvidenceCount: Number(r.preclinical_count),
      referenceEvidenceCount: Number(r.reference_count),
      needsUpdate: Boolean(r.needs_update),
    }));
  }),
);

export interface PeptideAlias {
  readonly alias: string;
  readonly aliasType: string;
  readonly notes: string | null;
}

export interface RouteEvidence {
  readonly id: string;
  readonly routeKey: string;
  readonly routeName: string;
  readonly routeLimitations: string | null;
  readonly evidenceTypeLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly populationModel: string | null;
  readonly formulation: string | null;
  readonly pkNotes: string | null;
  readonly bioavailabilityNotes: string | null;
  readonly limitationsNotes: string | null;
  readonly citation: Citation;
}

export interface RegulatoryStatus {
  readonly id: string;
  readonly jurisdiction: string;
  readonly indicationContext: string | null;
  readonly status: string;
  readonly authority: string | null;
  readonly checkedAt: string;
  readonly notes: string | null;
  readonly citation: Citation | null;
}

export interface DisagreementPosition {
  readonly id: string;
  readonly positionText: string;
  readonly evidenceTypeLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly citation: Citation;
}

export interface Disagreement {
  readonly id: string;
  readonly topic: string;
  readonly plainLanguageText: string | null;
  readonly candidateExplanation: string;
  readonly explanationNotes: string | null;
  readonly resolutionRequirement: string | null;
  readonly positions: readonly DisagreementPosition[];
}

export interface PeptidePage {
  readonly id: string;
  readonly slug: string;
  readonly peptideKey: string;
  readonly canonicalName: string;
  readonly shortDescription: string | null;
  readonly simpleSummary: string | null;
  readonly practitionerSummary: string | null;
  readonly unknownsSummary: string | null;
  readonly sequence: string | null;
  readonly molecularDescription: string | null;
  readonly naturalOrSynthetic: string | null;
  readonly compoundTypeLabel: string | null;
  readonly isPeptide: boolean;
  readonly categoryLabel: string | null;
  readonly version: number;
  readonly publishedAt: string | null;
  readonly lastReviewedAt: string | null;
  readonly evidenceCutoffAt: string | null;
  readonly needsUpdate: boolean;
  readonly aliases: readonly PeptideAlias[];
  readonly claims: readonly PublicClaim[];
  readonly routes: readonly RouteEvidence[];
  readonly regulatoryStatuses: readonly RegulatoryStatus[];
  readonly disagreements: readonly Disagreement[];
  readonly protocols: readonly SimpleProtocol[] | readonly PractitionerProtocol[];
  readonly protocolCountAll: number;
}

/**
 * Assembles a compound page.
 *
 * `mode` decides which protocol relation is read. In simple mode the query
 * touches `public_v_protocol_simple`, which has no dosing columns, so the
 * values never enter the process — there is nothing for a rendering mistake to
 * leak.
 */
export const getPeptidePage = cache(
  async (slug: string, mode: ReadingMode): Promise<PeptidePage | null> =>
    asPublic(async (tx) => {
      const peptideRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select p.*, cc.label as category_label, ct.label as compound_type_label,
                 coalesce(ct.is_peptide, true) as is_peptide
          from public_v_peptides p
          left join public_v_compound_categories cc on cc.key = p.primary_category_key
          left join public_v_compound_types ct on ct.key = p.compound_type_key
          where p.slug = ${slug}
        `),
      );
      const peptide = peptideRows[0];
      if (!peptide) return null;

      const peptideId = String(peptide.id);

      const aliases = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select alias, alias_type, notes from public_v_peptide_aliases
          where peptide_id = ${peptideId}
          order by case alias_type when 'related_but_distinct' then 1 else 0 end, alias
        `),
      ).map((a) => ({
        alias: String(a.alias),
        aliasType: String(a.alias_type),
        notes: str(a.notes),
      }));

      const claimRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select id, claim_key, claim_text, plain_language_text, claim_category,
                 importance, certificate_type_scope, interpretation_notes, uncertainty_text,
                 is_editorial_non_evidentiary, needs_update,
                 last_reviewed_at::text as last_reviewed_at
          from public_v_claims
          where peptide_id = ${peptideId}
          order by case importance
                     when 'critical' then 0 when 'high' then 1
                     when 'medium' then 2 else 3 end,
                   claim_key
        `),
      );

      const evidenceRows = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select ce.id, ce.claim_id, ce.evidence_type_key, ce.relationship,
                 ce.population_model, ce.route_key, r.name as route_name,
                 ce.formulation, ce.interpretation, ce.primary_source_verified,
                 et.public_label as evidence_type_label, et.evidence_class,
                 et.is_human_evidence, et.is_interpretive,
                 ${CITATION_SELECT}
          from public_v_claim_evidence ce
          join public_v_claims c on c.id = ce.claim_id
          join public_v_evidence_types et on et.key = ce.evidence_type_key
          join public_v_sources s on s.id = ce.source_id
          join public_v_source_types st on st.key = s.source_type_key
          left join public_v_source_locations l on l.id = ce.source_location_id
          left join public_v_routes r on r.key = ce.route_key
          where c.peptide_id = ${peptideId}
          order by et.sort_order, s.source_key
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
          routeName: str(row.route_name),
          formulation: str(row.formulation),
          interpretation: str(row.interpretation),
          primarySourceVerified: Boolean(row.primary_source_verified),
          citation: toCitation(row),
        });
        evidenceByClaim.set(claimId, list);
      }

      const claims: PublicClaim[] = claimRows.map((c) => ({
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
      }));

      const routeEvidence = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select pr.id, pr.route_key, r.name as route_name,
                 r.general_limitations as route_limitations,
                 et.public_label as evidence_type_label, et.evidence_class,
                 pr.population_model, pr.formulation, pr.pk_notes,
                 pr.bioavailability_notes, pr.limitations_notes,
                 ${CITATION_SELECT}
          from public_v_peptide_routes pr
          join public_v_routes r on r.key = pr.route_key
          join public_v_evidence_types et on et.key = pr.evidence_type_key
          join public_v_sources s on s.id = pr.source_id
          join public_v_source_types st on st.key = s.source_type_key
          left join public_v_source_locations l on l.id = pr.source_location_id
          where pr.peptide_id = ${peptideId}
          order by r.sort_order, et.sort_order
        `),
      ).map((r) => ({
        id: String(r.id),
        routeKey: String(r.route_key),
        routeName: String(r.route_name),
        routeLimitations: str(r.route_limitations),
        evidenceTypeLabel: String(r.evidence_type_label),
        evidenceClass: r.evidence_class as EvidenceClass,
        populationModel: str(r.population_model),
        formulation: str(r.formulation),
        pkNotes: str(r.pk_notes),
        bioavailabilityNotes: str(r.bioavailability_notes),
        limitationsNotes: str(r.limitations_notes),
        citation: toCitation(r),
      }));

      const regulatoryStatuses = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select rs.id, rs.jurisdiction, rs.indication_context, rs.status,
                 rs.authority, rs.checked_at::text as checked_at, rs.notes,
                 ${CITATION_SELECT}
          from public_v_regulatory_statuses rs
          left join public_v_sources s on s.id = rs.source_id
          left join public_v_source_types st on st.key = s.source_type_key
          left join public_v_source_locations l on l.id = rs.source_location_id
          where rs.peptide_id = ${peptideId}
          order by rs.jurisdiction, rs.checked_at desc
        `),
      ).map((r) => ({
        id: String(r.id),
        jurisdiction: String(r.jurisdiction),
        indicationContext: str(r.indication_context),
        status: String(r.status),
        authority: str(r.authority),
        checkedAt: String(r.checked_at),
        notes: str(r.notes),
        citation: r.source_id ? toCitation(r) : null,
      }));

      const disagreementRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select id, topic, plain_language_text, candidate_explanation,
                 explanation_notes, resolution_requirement
          from public_v_disagreements
          where peptide_id = ${peptideId}
          order by topic
        `),
      );

      const positionRows = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select dp.id, dp.disagreement_id, dp.position_text,
                 et.public_label as evidence_type_label, et.evidence_class,
                 ${CITATION_SELECT}
          from public_v_disagreement_positions dp
          join public_v_disagreements d on d.id = dp.disagreement_id
          join public_v_evidence_types et on et.key = dp.evidence_type_key
          join public_v_sources s on s.id = dp.source_id
          join public_v_source_types st on st.key = s.source_type_key
          left join public_v_source_locations l on l.id = dp.source_location_id
          where d.peptide_id = ${peptideId}
          order by dp.sort_order
        `),
      );

      const positionsByDisagreement = new Map<string, DisagreementPosition[]>();
      for (const row of positionRows) {
        const key = String(row.disagreement_id);
        const list = positionsByDisagreement.get(key) ?? [];
        list.push({
          id: String(row.id),
          positionText: String(row.position_text),
          evidenceTypeLabel: String(row.evidence_type_label),
          evidenceClass: row.evidence_class as EvidenceClass,
          citation: toCitation(row),
        });
        positionsByDisagreement.set(key, list);
      }

      const disagreements: Disagreement[] = disagreementRows.map((d) => ({
        id: String(d.id),
        topic: String(d.topic),
        plainLanguageText: str(d.plain_language_text),
        candidateExplanation: String(d.candidate_explanation),
        explanationNotes: str(d.explanation_notes),
        resolutionRequirement: str(d.resolution_requirement),
        positions: positionsByDisagreement.get(String(d.id)) ?? [],
      }));

      const protocols = await readProtocols(tx, peptideId, mode);

      const [countRow] = rows<{ n: number }>(
        await tx.execute(sql`
          select count(*)::int as n from public_v_protocol_practitioner
          where peptide_id = ${peptideId}
        `),
      );

      return {
        id: peptideId,
        slug: String(peptide.slug),
        peptideKey: String(peptide.peptide_key),
        canonicalName: String(peptide.canonical_name),
        shortDescription: str(peptide.short_description),
        simpleSummary: str(peptide.simple_summary),
        practitionerSummary: str(peptide.practitioner_summary),
        unknownsSummary: str(peptide.unknowns_summary),
        sequence: str(peptide.sequence),
        molecularDescription: str(peptide.molecular_description),
        naturalOrSynthetic: str(peptide.natural_or_synthetic),
        compoundTypeLabel: str(peptide.compound_type_label),
        isPeptide: Boolean(peptide.is_peptide),
        categoryLabel: str(peptide.category_label),
        version: Number(peptide.version),
        publishedAt: str(peptide.published_at),
        lastReviewedAt: str(peptide.last_reviewed_at),
        evidenceCutoffAt: str(peptide.evidence_cutoff_at),
        needsUpdate: Boolean(peptide.needs_update),
        aliases,
        claims,
        routes: routeEvidence,
        regulatoryStatuses,
        disagreements,
        protocols,
        protocolCountAll: countRow?.n ?? 0,
      };
    }),
);

// ---------------------------------------------------------------------------
// Quality topics
// ---------------------------------------------------------------------------

export interface QualityTopicSummary {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly shortDescription: string | null;
  readonly needsUpdate: boolean;
}

export const listQualityTopics = cache(async (): Promise<QualityTopicSummary[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select id, slug, name, short_description, needs_update
      from public_v_quality_topics order by sort_order, name
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      slug: String(r.slug),
      name: String(r.name),
      shortDescription: str(r.short_description),
      needsUpdate: Boolean(r.needs_update),
    }));
  }),
);

/**
 * A quality topic as a reader sees it.
 *
 * `relatedTopics` was a list of every other published topic — useful navigation,
 * and silent about why any two related. It is replaced by the quality map, whose
 * edges say what kind of relationship each one is and what it rests on.
 */
export type QualityTopicPage = QualityTopicReading;

export const getSpecimenCertificate = cache(
  async (certificateKey: string): Promise<CertificateReading | null> =>
    asPublic((tx) => readSpecimenCertificate(tx, certificateKey)),
);

/**
 * Every quality topic, published or not, with how far each has got.
 *
 * The section index needs this because listing only published topics rendered an
 * empty page: four topics are written and none is published. "Nothing is
 * published here yet" and "this subject is not in the index" are different
 * statements and a reader deserves to tell them apart — the same reasoning as
 * the compound register.
 *
 * Carries no prose. A short description is unreviewed content until the topic
 * publishes, and published topics have their own view.
 */
export interface QualityRegisterEntry {
  readonly id: string;
  readonly qualityKey: string;
  readonly name: string;
  readonly slug: string;
  readonly family: string | null;
  readonly reviewState: string;
  readonly isPublished: boolean;
  readonly needsUpdate: boolean;
  readonly claimCount: number;
  readonly gapCount: number;
  readonly relationshipCount: number;
  /**
   * The open verification issue blocking this topic, where one exists.
   *
   * "Nobody has written this yet" and "the source this needs cannot currently be
   * obtained" are different states. The second is the more useful thing to tell
   * a reader, and the verification queue already records it.
   */
  readonly openIssueKey: string | null;
}

export const listQualityRegister = cache(async (): Promise<QualityRegisterEntry[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select id, quality_key, name, slug, family, review_state, is_published,
             needs_update, claim_count, gap_count, relationship_count,
             open_issue_key
      from public_v_quality_register
      order by sort_order, name
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      qualityKey: String(r.quality_key),
      name: String(r.name),
      slug: String(r.slug),
      family: str(r.family),
      reviewState: String(r.review_state),
      isPublished: Boolean(r.is_published),
      needsUpdate: Boolean(r.needs_update),
      claimCount: Number(r.claim_count),
      gapCount: Number(r.gap_count),
      relationshipCount: Number(r.relationship_count),
      openIssueKey: str(r.open_issue_key),
    }));
  }),
);

export const getQualityTopicPage = cache(
  async (slug: string): Promise<QualityTopicPage | null> =>
    asPublic((tx) => readQualityTopic(tx, slug)),
);

export interface PublicSource {
  readonly id: string;
  readonly sourceKey: string;
  readonly title: string;
  readonly sourceTypeKey: string;
  readonly sourceTypeLabel: string;
  readonly authors: readonly string[];
  readonly year: number | null;
  readonly publisher: string | null;
  readonly publicationName: string | null;
  readonly doi: string | null;
  readonly canonicalUrl: string | null;
  readonly qcStatus: string;
  readonly isCitable: boolean;
  readonly primaryRole: string | null;
  readonly limitationsNotes: string | null;
  readonly authorityNotes: string | null;
  readonly citedByCount: number;
}

export const listSources = cache(async (): Promise<PublicSource[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select s.*, st.public_label as source_type_label,
             coalesce((
               select count(*) from public_v_claim_evidence ce where ce.source_id = s.id
             ), 0)::int as cited_by_count
      from public_v_sources s
      join public_v_source_types st on st.key = s.source_type_key
      order by st.sort_order, s.source_key
    `);
    return rows<Record<string, unknown>>(result).map(toPublicSource);
  }),
);

export const getSource = cache(async (sourceKey: string): Promise<PublicSource | null> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select s.*, st.public_label as source_type_label,
             coalesce((
               select count(*) from public_v_claim_evidence ce where ce.source_id = s.id
             ), 0)::int as cited_by_count
      from public_v_sources s
      join public_v_source_types st on st.key = s.source_type_key
      where s.source_key = ${sourceKey}
    `);
    const row = rows<Record<string, unknown>>(result)[0];
    return row ? toPublicSource(row) : null;
  }),
);

function toPublicSource(r: Record<string, unknown>): PublicSource {
  return {
    id: String(r.id),
    sourceKey: String(r.source_key),
    title: String(r.title),
    sourceTypeKey: String(r.source_type_key),
    sourceTypeLabel: String(r.source_type_label),
    authors: Array.isArray(r.authors) ? (r.authors as string[]) : [],
    year: typeof r.year === 'number' ? r.year : null,
    publisher: str(r.publisher),
    publicationName: str(r.publication_name),
    doi: str(r.doi),
    canonicalUrl: str(r.canonical_url),
    qcStatus: String(r.qc_status),
    isCitable: Boolean(r.is_citable),
    primaryRole: str(r.primary_role),
    limitationsNotes: str(r.limitations_notes),
    authorityNotes: str(r.authority_notes),
    citedByCount: Number(r.cited_by_count ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Routes, taxonomy and corrections
// ---------------------------------------------------------------------------

export interface PublicRoute {
  readonly key: string;
  readonly name: string;
  readonly slug: string;
  readonly descriptionSimple: string | null;
  readonly descriptionPractitioner: string | null;
  readonly generalLimitations: string | null;
}

export const listRoutes = cache(async (): Promise<PublicRoute[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select key, name, slug, description_simple, description_practitioner, general_limitations
      from public_v_routes order by sort_order
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      key: String(r.key),
      name: String(r.name),
      slug: String(r.slug),
      descriptionSimple: str(r.description_simple),
      descriptionPractitioner: str(r.description_practitioner),
      generalLimitations: str(r.general_limitations),
    }));
  }),
);

export interface PublicEvidenceType {
  readonly key: string;
  readonly publicLabel: string;
  readonly description: string | null;
  readonly evidenceClass: EvidenceClass;
  readonly isHumanEvidence: boolean;
  readonly isInterpretive: boolean;
}

export const listEvidenceTypes = cache(async (): Promise<PublicEvidenceType[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select key, public_label, description, evidence_class, is_human_evidence, is_interpretive
      from public_v_evidence_types order by sort_order
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      key: String(r.key),
      publicLabel: String(r.public_label),
      description: str(r.description),
      evidenceClass: r.evidence_class as EvidenceClass,
      isHumanEvidence: Boolean(r.is_human_evidence),
      isInterpretive: Boolean(r.is_interpretive),
    }));
  }),
);

export interface PublicSourceType {
  readonly key: string;
  readonly publicLabel: string;
  readonly description: string | null;
}

export const listSourceTypes = cache(async (): Promise<PublicSourceType[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select key, public_label, description from public_v_source_types order by sort_order
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      key: String(r.key),
      publicLabel: String(r.public_label),
      description: str(r.description),
    }));
  }),
);

export interface PublicCorrection {
  readonly id: string;
  readonly correctionKey: string;
  readonly entityType: string;
  readonly severity: string;
  readonly whatChanged: string;
  readonly reason: string;
  readonly correctedAt: string | null;
}

export const listCorrections = cache(async (): Promise<PublicCorrection[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select id, correction_key, entity_type, severity, what_changed, reason,
             corrected_at::text as corrected_at
      from public_v_corrections order by corrected_at desc
    `);
    return rows<Record<string, unknown>>(result).map((r) => ({
      id: String(r.id),
      correctionKey: String(r.correction_key),
      entityType: String(r.entity_type),
      severity: String(r.severity),
      whatChanged: String(r.what_changed),
      reason: String(r.reason),
      correctedAt: str(r.corrected_at),
    }));
  }),
);

/** Headline counts for the home page. Coverage is stated, not implied. */
export interface CoverageSnapshot {
  readonly publishedPeptides: number;
  readonly publishedQualityTopics: number;
  readonly registeredSources: number;
  readonly citableSources: number;
  readonly publishedClaims: number;
  readonly claimsWithHumanEvidence: number;
}

export const getCoverageSnapshot = cache(async (): Promise<CoverageSnapshot> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select
        (select count(*) from public_v_peptides)::int as published_peptides,
        (select count(*) from public_v_quality_topics)::int as published_quality_topics,
        (select count(*) from public_v_sources)::int as registered_sources,
        (select count(*) from public_v_sources where is_citable)::int as citable_sources,
        (select count(*) from public_v_claims)::int as published_claims,
        (select count(distinct c.id)
         from public_v_claims c
         join public_v_claim_evidence ce on ce.claim_id = c.id
         join public_v_evidence_types et on et.key = ce.evidence_type_key
         where et.is_human_evidence)::int as claims_with_human_evidence
    `);
    const row = rows<Record<string, number>>(result)[0] ?? {};
    return {
      publishedPeptides: row.published_peptides ?? 0,
      publishedQualityTopics: row.published_quality_topics ?? 0,
      registeredSources: row.registered_sources ?? 0,
      citableSources: row.citable_sources ?? 0,
      publishedClaims: row.published_claims ?? 0,
      claimsWithHumanEvidence: row.claims_with_human_evidence ?? 0,
    };
  }),
);

// ---------------------------------------------------------------------------
// The register
// ---------------------------------------------------------------------------

/**
 * A compound that is in scope for this index, whether or not it has a published
 * record yet.
 *
 * Carries no medical content — name, alternative names, and how far the record
 * has got. That is enough to answer "is this compound in scope?" without
 * publishing anything unreviewed.
 */
export interface RegisteredPeptide {
  readonly id: string;
  readonly peptideKey: string;
  readonly canonicalName: string;
  readonly slug: string;
  readonly hasPublishedRecord: boolean;
  readonly hasDraftSummary: boolean;
  readonly draftClaimCount: number;
  readonly draftProtocolCount: number;
  readonly aliases: readonly PeptideAlias[];
}

export const listRegisteredPeptides = cache(async (): Promise<RegisteredPeptide[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select r.*,
             coalesce((
               select json_agg(json_build_object(
                 'alias', a.alias, 'aliasType', a.alias_type, 'notes', a.notes
               ) order by a.alias)
               from public_v_peptide_register_aliases a
               where a.peptide_id = r.id
             ), '[]'::json) as aliases
      from public_v_peptide_register r
      order by r.canonical_name
    `);
    return rows<Record<string, unknown>>(result).map(toRegisteredPeptide);
  }),
);

export const getRegisteredPeptide = cache(
  async (slug: string): Promise<RegisteredPeptide | null> =>
    asPublic(async (tx) => {
      const result = await tx.execute(sql`
        select r.*,
               coalesce((
                 select json_agg(json_build_object(
                   'alias', a.alias, 'aliasType', a.alias_type, 'notes', a.notes
                 ) order by a.alias)
                 from public_v_peptide_register_aliases a
                 where a.peptide_id = r.id
               ), '[]'::json) as aliases
        from public_v_peptide_register r
        where r.slug = ${slug}
      `);
      const row = rows<Record<string, unknown>>(result)[0];
      return row ? toRegisteredPeptide(row) : null;
    }),
);

function toRegisteredPeptide(r: Record<string, unknown>): RegisteredPeptide {
  const rawAliases: unknown = typeof r.aliases === 'string' ? JSON.parse(r.aliases) : r.aliases;
  return {
    id: String(r.id),
    peptideKey: String(r.peptide_key),
    canonicalName: String(r.canonical_name),
    slug: String(r.slug),
    hasPublishedRecord: Boolean(r.has_published_record),
    hasDraftSummary: Boolean(r.has_draft_summary),
    draftClaimCount: Number(r.draft_claim_count ?? 0),
    draftProtocolCount: Number(r.draft_protocol_count ?? 0),
    aliases: Array.isArray(rawAliases)
      ? (rawAliases as { alias: string; aliasType: string; notes: string | null }[]).map((a) => ({
          alias: a.alias,
          aliasType: a.aliasType,
          notes: a.notes,
        }))
      : [],
  };
}
