import 'server-only';
import {
  readProtocolLibrary,
  type ProtocolLibrary,
  type ProtocolLibraryFilters,
} from './protocol-library';
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
import {
  readPeptideTrials,
  readSourceArtifacts,
  type ClinicalTrialRecord,
  type PublicSourceArtifact,
} from './trials';
import { readQualityTopic, type QualityTopicReading } from './quality-topic';
import {
  readLearningTopic,
  readLearningTopics,
  type LearningTopicReading,
  type LearningTopicSummary,
} from './learning';
import { readSpecimenCertificate, type CertificateReading } from './certificate';
import {
  readDiscovery,
  readResearchQuestions,
  type DiscoveryRow,
  type ResearchQuestionEntry,
} from './research-index';

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
import type { EvidenceGap } from './shapes';
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
  /**
   * Null in patient mode.
   *
   * A disagreement about a dose states the doses in its positions, so the text
   * is suppressed in the query the way protocol dosing is. The reader still
   * learns that the sources differ, how many differ, and what kind of source
   * each is.
   */
  readonly positionText: string | null;
  readonly evidenceTypeLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly citation: Citation;
}

export interface Disagreement {
  readonly id: string;
  readonly topic: string;
  readonly plainLanguageText: string | null;
  /** The axis the sources differ on: formulation, chemical form, dose… */
  readonly candidateExplanation: string;
  readonly explanationNotes: string | null;
  /**
   * Whether the difference has been settled, and how.
   *
   * The field that lets a page say "these values differ because they were
   * measured under different conditions" instead of printing two numbers and
   * leaving a reader to assume one of them is wrong.
   */
  readonly resolution: string;
  readonly resolutionBasis: string | null;
  readonly resolvedAt: string | null;
  readonly resolutionRequirement: string | null;
  readonly positions: readonly DisagreementPosition[];
}

/**
 * A marketed product of the compound.
 *
 * Dose-bearing fields are null in patient mode. A vial strength plus a
 * reconstitution volume is a dose written in two parts, and a patient page that
 * carried both would be a dosing page whatever else it said.
 */
export interface CompoundProduct {
  readonly id: string;
  readonly productKey: string;
  readonly productName: string;
  readonly proprietaryName: string | null;
  readonly manufacturer: string | null;
  readonly authority: string | null;
  readonly jurisdiction: string | null;
  readonly applicationNumber: string | null;
  readonly marketingStatus: string | null;
  readonly presentation: string | null;
  readonly strengthText: string | null;
  readonly reconstitutionText: string | null;
  readonly labelledDoseText: string | null;
  readonly storageText: string | null;
  readonly excipientsText: string | null;
  readonly substitutabilityNote: string | null;
  readonly notes: string | null;
  readonly citation: Citation | null;
}

/** A chemical form, with the basis its molecular weight is expressed on. */
export interface CompoundForm {
  readonly id: string;
  readonly formKey: string;
  readonly chemicalForm: string;
  readonly molecularFormula: string | null;
  readonly molecularWeight: string | null;
  readonly weightBasis: string | null;
  readonly formStatedBySource: boolean;
  readonly notes: string | null;
  readonly citation: Citation | null;
}

/**
 * One pharmacokinetic result and the conditions that produced it.
 *
 * `doseContext` is null in patient mode; everything else is not, because the
 * conditions are the point. A patient reading that one figure came from a
 * single injection and another from fourteen days of them has learned the thing
 * that matters, without learning a dose.
 */
export interface PkObservation {
  readonly id: string;
  readonly observationKey: string;
  readonly parameter: string;
  readonly valueText: string;
  readonly doseContext: string | null;
  readonly administration: string;
  readonly population: string;
  readonly routeName: string | null;
  readonly studyCondition: string | null;
  readonly productName: string | null;
  readonly evidenceTypeLabel: string;
  readonly evidenceClass: EvidenceClass;
  readonly notes: string | null;
  readonly citation: Citation | null;
}

/** How many records of each study type a screen classified. */
export interface ScreenTypeCount {
  readonly studyType: string;
  readonly count: number;
}

/**
 * A literature screen: the search, its criteria, and what it found.
 *
 * `resultCount` is the number of records the query returned and nothing else.
 * `humanPrimaryCount` is what the screen actually established, and the two are
 * kept apart deliberately — the first is 230 and the second is 3.
 */
export interface LiteratureScreen {
  readonly id: string;
  readonly screenKey: string;
  readonly databaseName: string;
  readonly queryText: string;
  readonly searchDate: string;
  readonly resultCount: number;
  /** How many of those the ledger classifies. Equal to resultCount for a census. */
  readonly screenedCount: number;
  /** Which part of the result set was taken, when it was not all of it. */
  readonly stratum: string | null;
  readonly deduplicationNotes: string;
  readonly inclusionCriteria: string;
  readonly humanPrimaryCriteria: string;
  readonly includedCount: number;
  readonly humanPrimaryCount: number;
  readonly typeCounts: readonly ScreenTypeCount[];
  readonly humanRecords: readonly ScreenRecord[];
}

/**
 * One source's statement about what a name refers to.
 *
 * `nameUsed` is the name exactly as the source writes it, because the point of
 * the record is that one name is used by different sources for different
 * molecules.
 */
export interface CompoundIdentityClaim {
  readonly id: string;
  readonly identityKey: string;
  readonly nameUsed: string;
  readonly chemicalForm: string | null;
  readonly sequence: string | null;
  readonly residueCount: number | null;
  readonly molecularWeight: string | null;
  readonly weightBasis: string | null;
  readonly form: string;
  readonly verification: string;
  readonly usageContext: string;
  readonly notes: string | null;
  readonly evidenceTypeLabel: string;
  readonly citation: Citation | null;
}

/**
 * How far a finding has been repeated, and by whom.
 *
 * Deliberately a state rather than a count: forty papers from one laboratory is
 * a weaker position than two from two.
 */
export interface ReplicationAssessment {
  readonly id: string;
  readonly assessmentKey: string;
  readonly finding: string;
  readonly state: string;
  readonly studyCount: number | null;
  readonly groupCount: number | null;
  readonly countryCount: number | null;
  readonly models: string | null;
  readonly humanConfirmed: boolean;
  readonly basis: string;
  readonly limitations: string | null;
  readonly supportingRecords: string | null;
}

export interface ScreenRecord {
  readonly externalId: string;
  readonly externalIdType: string;
  readonly title: string;
  readonly publicationYear: number | null;
  readonly journal: string | null;
  readonly studyType: string;
  readonly evidenceClass: string;
  readonly included: boolean;
  readonly primaryOrSecondary: string;
  readonly classifiedBy: string;
  /** Null in patient mode: a screener's note on a trial names what it gave. */
  readonly reason: string | null;
  /**
   * Where the work was done and by whom. Recorded so that replication can be
   * assessed — and so that the register can show it is not privileging a
   * country, which it cannot do without knowing the country.
   */
  readonly country: string | null;
  readonly language: string | null;
  readonly researchGroup: string | null;
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
  readonly products: readonly CompoundProduct[];
  readonly forms: readonly CompoundForm[];
  readonly pharmacokinetics: readonly PkObservation[];
  readonly literatureScreens: readonly LiteratureScreen[];
  readonly identities: readonly CompoundIdentityClaim[];
  readonly replication: readonly ReplicationAssessment[];
  /**
   * What the sources held here do not settle about this compound.
   *
   * Loaded by the compound packets and not read by this assembly until the
   * first real records existed, so both carried their recorded absences in the
   * database and showed none of them. On a record whose most important content
   * is what is *not* established — BPC-157 has no human evidence at all — that
   * omission inverted the point of the page.
   */
  readonly gaps: readonly EvidenceGap[];
  readonly protocols: readonly SimpleProtocol[] | readonly PractitionerProtocol[];
  readonly protocolCountAll: number;
  /**
   * The registered trials behind the record, read in the same session as the
   * rest of it. Reading them through a separate loader opened two more
   * database sessions per render, which on the single-process development
   * database was enough to make record pages fail intermittently.
   */
  readonly trials: readonly ClinicalTrialRecord[];
}

/**
 * Assembles a compound page.
 *
 * `mode` decides which protocol relation is read. In simple mode the query
 * touches `public_v_protocol_simple`, which has no dosing columns, so the
 * values never enter the process — there is nothing for a rendering mistake to
 * leak.
 */
const PEPTIDE_RELATIONS = {
  'public_v_peptides': 'peptides',
  'public_v_peptide_aliases': 'peptide_aliases',
  'public_v_compound_categories': 'compound_categories',
  'public_v_compound_types': 'compound_types',
  'public_v_claims': 'claims',
  'public_v_claim_evidence': 'claim_evidence',
  'public_v_evidence_types': 'evidence_types',
  'public_v_sources': 'sources',
  'public_v_source_types': 'source_types',
  'public_v_source_locations': 'source_locations',
  'public_v_routes': 'routes',
  'public_v_peptide_routes': 'peptide_routes',
  'public_v_regulatory_statuses': 'regulatory_statuses',
  'public_v_disagreements': 'disagreements',
  'public_v_disagreement_positions': 'disagreement_positions',
  'public_v_protocol_practitioner': 'protocols',
  'public_v_protocol_simple': 'protocols',
  'public_v_protocol_sources': 'protocol_sources',
  'public_v_evidence_gaps': 'evidence_gaps',
  'public_v_compound_products': 'compound_products',
  'public_v_compound_forms': 'compound_forms',
  'public_v_pk_observations': 'pk_observations',
  'public_v_literature_screens': 'literature_screens',
  'public_v_literature_screen_records': 'literature_screen_records',
  'public_v_compound_identity_claims': 'compound_identity_claims',
  'public_v_replication_assessments': 'replication_assessments',
} as const;

/**
 * The compound assembly, once, for both surfaces.
 *
 * The public site reads the `public_v_*` views as `anon`; the development
 * preview reads the base tables so an extracted record can be looked at before
 * anyone is asked to approve it. Same query text, different relation names —
 * the pattern `readQualityTopic` established, for the same reason: two
 * separately maintained copies of this would drift, and the one that drifts is
 * always the one nobody is reading.
 */
async function readPeptidePage(
  tx: Database,
  slug: string,
  mode: ReadingMode,
  options: { preview?: boolean } = {},
): Promise<PeptidePage | null> {
  const preview = options.preview === true;
  const simple = mode === 'simple';
  const rel = (name: keyof typeof PEPTIDE_RELATIONS): string =>
    preview ? PEPTIDE_RELATIONS[name] : name;
  {
    {
      const peptideRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select p.*, cc.label as category_label, ct.label as compound_type_label,
                 coalesce(ct.is_peptide, true) as is_peptide
          from ${sql.raw(rel('public_v_peptides'))} p
          left join ${sql.raw(rel('public_v_compound_categories'))} cc on cc.key = p.primary_category_key
          left join ${sql.raw(rel('public_v_compound_types'))} ct on ct.key = p.compound_type_key
          where p.slug = ${slug}
        `),
      );
      const peptide = peptideRows[0];
      if (!peptide) return null;

      const peptideId = String(peptide.id);

      const aliases = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select alias, alias_type, notes from ${sql.raw(rel('public_v_peptide_aliases'))}
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
          from ${sql.raw(rel('public_v_claims'))}
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
                 /*
                  * The editor's note on what a source actually said, and the
                  * formulation it said it about. Both routinely carry a dose:
                  * the tesamorelin label's own pharmacology section cannot be
                  * summarised without naming "1.4 mg of EGRIFTA SV", and that
                  * sentence reached patient mode the moment the label was
                  * cited. Withheld in simple mode for the same reason the
                  * practitioner summary is, and by the same means — the query,
                  * not a conditional in a component.
                  *
                  * What a patient still receives: the claim, its plain-language
                  * form, every piece of evidence with its type, its class, its
                  * population, its route and its full citation. The evidence is
                  * not hidden. The annotation on it is.
                  */
                 ${simple ? sql`null::text as formulation, null::text as interpretation` : sql`ce.formulation, ce.interpretation`},
                 ce.primary_source_verified,
                 -- How far this citation has been traced back to the research.
                 -- Not a dose and not a score, so it is selected in both modes;
                 -- what differs is whether the page renders it, because a
                 -- patient reading "abstract reviewed" learns less than a
                 -- clinician does and has more to be confused by.
                 ce.primary_trace,
                 et.public_label as evidence_type_label, et.evidence_class,
                 et.is_human_evidence, et.is_interpretive,
                 ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_claim_evidence'))} ce
          join ${sql.raw(rel('public_v_claims'))} c on c.id = ce.claim_id
          join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = ce.evidence_type_key
          join ${sql.raw(rel('public_v_sources'))} s on s.id = ce.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = ce.source_location_id
          left join ${sql.raw(rel('public_v_routes'))} r on r.key = ce.route_key
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
          primaryTrace: String(row.primary_trace),
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
                 pr.population_model,
                 ${
                   simple
                     ? sql`null::text as formulation, null::text as pk_notes,
                           null::text as bioavailability_notes`
                     : sql`pr.formulation, pr.pk_notes, pr.bioavailability_notes`
                 },
                 pr.limitations_notes,
                 ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_peptide_routes'))} pr
          join ${sql.raw(rel('public_v_routes'))} r on r.key = pr.route_key
          join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = pr.evidence_type_key
          join ${sql.raw(rel('public_v_sources'))} s on s.id = pr.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = pr.source_location_id
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
          from ${sql.raw(rel('public_v_regulatory_statuses'))} rs
          left join ${sql.raw(rel('public_v_sources'))} s on s.id = rs.source_id
          left join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = rs.source_location_id
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
                 explanation_notes, resolution_requirement, resolution,
                 resolution_basis, resolved_at::text as resolved_at
          from ${sql.raw(rel('public_v_disagreements'))}
          where peptide_id = ${peptideId}
          order by topic
        `),
      );

      /*
       * Position text is suppressed in patient mode, and suppressed here
       * rather than in the component.
       *
       * A disagreement between sources about a *dose* is stated in the
       * positions — "gives 250 mcg twice a day", "gives 300-600 mcg daily" —
       * which is exactly the content the simple protocol relation exists to
       * keep out of a patient payload. The protocol path was suppressed from
       * the beginning; this path was not, because until a compound with
       * dose-level disagreements existed there was nothing to leak.
       *
       * A patient still learns that the sources disagree, how many disagree,
       * and what kind of source each is. What they do not get is the number.
       */
      const positionRows = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select dp.id, dp.disagreement_id,
                 ${simple ? sql`null::text` : sql`dp.position_text`} as position_text,
                 et.public_label as evidence_type_label, et.evidence_class,
                 ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_disagreement_positions'))} dp
          join ${sql.raw(rel('public_v_disagreements'))} d on d.id = dp.disagreement_id
          join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = dp.evidence_type_key
          join ${sql.raw(rel('public_v_sources'))} s on s.id = dp.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = dp.source_location_id
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
          positionText: str(row.position_text),
          evidenceTypeLabel: String(row.evidence_type_label),
          evidenceClass: row.evidence_class as EvidenceClass,
          citation: toCitation(row),
        });
        positionsByDisagreement.set(key, list);
      }

      const gapRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select id, gap_type, statement, why_not_supported, what_would_resolve_it,
                 verification_issue_key, sort_order, research_question,
                 opportunity_type, resolution_state::text as resolution_state,
                 resolution_note, resolution_checked_at::text as resolution_checked_at
          from ${sql.raw(rel('public_v_evidence_gaps'))}
          where peptide_id = ${peptideId}
          order by sort_order
        `),
      );

      const gaps: EvidenceGap[] = gapRows.map((row) => ({
        id: String(row.id),
        gapType: String(row.gap_type),
        statement: String(row.statement),
        whyNotSupported: String(row.why_not_supported),
        whatWouldResolveIt: str(row.what_would_resolve_it),
        verificationIssueKey: str(row.verification_issue_key),
        researchQuestion: str(row.research_question),
        opportunityType: str(row.opportunity_type),
        resolutionState: str(row.resolution_state) ?? 'open',
        resolutionNote: str(row.resolution_note),
        resolutionCheckedAt: str(row.resolution_checked_at),
      }));

      const disagreements: Disagreement[] = disagreementRows.map((d) => ({
        id: String(d.id),
        topic: String(d.topic),
        plainLanguageText: str(d.plain_language_text),
        candidateExplanation: String(d.candidate_explanation),
        explanationNotes: str(d.explanation_notes),
        resolution: String(d.resolution),
        resolutionBasis: str(d.resolution_basis),
        resolvedAt: str(d.resolved_at),
        resolutionRequirement: str(d.resolution_requirement),
        positions: positionsByDisagreement.get(String(d.id)) ?? [],
      }));

      /*
       * Products, forms and pharmacokinetics.
       *
       * Read here rather than folded into the compound row because each is a
       * set: one molecule, three products; one molecule, two chemical forms
       * with two different molecular weights; one molecule, seven
       * pharmacokinetic results under seven different sets of conditions. A
       * column on `peptides` could hold exactly one of each, which is how the
       * record came to state a half-life that belonged to a product it did not
       * name.
       */
      const products: CompoundProduct[] = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select cp.id, cp.product_key, cp.product_name, cp.proprietary_name,
                 cp.manufacturer, cp.authority, cp.jurisdiction,
                 cp.application_number, cp.marketing_status,
                 -- Presentation is free text off a label, and a label describes
                 -- how a product is given: the tesamorelin presentation names
                 -- the diluent and the injection site. No amount, but it is
                 -- administration detail, and patient mode is not an
                 -- administration guide. Found by the patient presentation
                 -- audit rather than by the dose scan, which looks for numbers.
                 ${simple ? sql`null::text` : sql`cp.presentation`} as presentation,
                 -- Strength, reconstitution and labelled dose reconstruct a dose
                 -- between them, so they go the way protocol dosing goes.
                 ${simple
                   ? sql`null::text as strength_text, null::text as reconstitution_text, null::text as labelled_dose_text`
                   : sql`cp.strength_text, cp.reconstitution_text, cp.labelled_dose_text`},
                 cp.storage_text,
                 -- Excipient quantities are per vial, and "50 mg mannitol" beside
                 -- a vial strength is composition a patient can turn into a dose.
                 -- Found by the dose scan rather than by a test anyone wrote.
                 ${simple ? sql`null::text` : sql`cp.excipients_text`} as excipients_text,
                 cp.substitutability_note,
                 -- The editorial note on a product is the place a strength ends
                 -- up when nobody is watching: "the label states the safety of
                 -- this product was established on trials with the 2 mg dose of
                 -- the other one" is a natural sentence to write and a dose. It
                 -- goes where the evidence annotation goes.
                 ${simple ? sql`null::text` : sql`cp.notes`} as notes,
                 ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_compound_products'))} cp
          join ${sql.raw(rel('public_v_sources'))} s on s.id = cp.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = cp.source_location_id
          where cp.peptide_id = ${peptideId}
          order by cp.product_key
        `),
      ).map((row) => ({
        id: String(row.id),
        productKey: String(row.product_key),
        productName: String(row.product_name),
        proprietaryName: str(row.proprietary_name),
        manufacturer: str(row.manufacturer),
        authority: str(row.authority),
        jurisdiction: str(row.jurisdiction),
        applicationNumber: str(row.application_number),
        marketingStatus: str(row.marketing_status),
        presentation: str(row.presentation),
        strengthText: str(row.strength_text),
        reconstitutionText: str(row.reconstitution_text),
        labelledDoseText: str(row.labelled_dose_text),
        storageText: str(row.storage_text),
        excipientsText: str(row.excipients_text),
        substitutabilityNote: str(row.substitutability_note),
        notes: str(row.notes),
        citation: row.source_id ? toCitation(row) : null,
      }));

      const forms: CompoundForm[] = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select cf.id, cf.form_key, cf.chemical_form, cf.molecular_formula,
                 cf.molecular_weight::text as molecular_weight, cf.weight_basis,
                 cf.form_stated_by_source, cf.notes, ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_compound_forms'))} cf
          join ${sql.raw(rel('public_v_sources'))} s on s.id = cf.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = cf.source_location_id
          where cf.peptide_id = ${peptideId}
          order by cf.form_key
        `),
      ).map((row) => ({
        id: String(row.id),
        formKey: String(row.form_key),
        chemicalForm: String(row.chemical_form),
        molecularFormula: str(row.molecular_formula),
        molecularWeight: str(row.molecular_weight),
        weightBasis: str(row.weight_basis),
        formStatedBySource: Boolean(row.form_stated_by_source),
        notes: str(row.notes),
        citation: row.source_id ? toCitation(row) : null,
      }));

      const pharmacokinetics: PkObservation[] = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select o.id, o.observation_key, o.parameter, o.value_text,
                 ${simple ? sql`null::text` : sql`o.dose_context`} as dose_context,
                 o.administration, o.population, o.study_condition,
                 -- Same rule as the product note and the evidence annotation.
                 -- An explanatory note about a measurement almost always names
                 -- the dose it was measured at, because that is what makes it
                 -- explanatory. Patient mode gets the structure instead: the
                 -- parameter, the value, the product, the population, whether it
                 -- was one administration or a course, and the condition — which
                 -- is the whole of the point without any of the amounts.
                 ${simple ? sql`null::text` : sql`o.notes`} as notes,
                 r.name as route_name, cp.product_name,
                 et.public_label as evidence_type_label, et.evidence_class,
                 ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_pk_observations'))} o
          join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = o.evidence_type_key
          join ${sql.raw(rel('public_v_sources'))} s on s.id = o.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = o.source_location_id
          left join ${sql.raw(rel('public_v_routes'))} r on r.key = o.route_key
          left join ${sql.raw(rel('public_v_compound_products'))} cp on cp.id = o.product_id
          where o.peptide_id = ${peptideId}
          order by o.parameter, o.observation_key
        `),
      ).map((row) => ({
        id: String(row.id),
        observationKey: String(row.observation_key),
        parameter: String(row.parameter),
        valueText: String(row.value_text),
        doseContext: str(row.dose_context),
        administration: String(row.administration),
        population: String(row.population),
        routeName: str(row.route_name),
        studyCondition: str(row.study_condition),
        productName: str(row.product_name),
        evidenceTypeLabel: String(row.evidence_type_label),
        evidenceClass: row.evidence_class as EvidenceClass,
        notes: str(row.notes),
        citation: row.source_id ? toCitation(row) : null,
      }));

      /*
       * Literature screens.
       *
       * The counts are computed here rather than stored, so that a screen's
       * ledger and the numbers shown beside it cannot disagree. `resultCount`
       * comes from the search; everything else is counted from the rows.
       *
       * Only the human records are carried in full. The rest of the ledger is
       * 225 rows and belongs on a page of its own, not in every compound
       * payload — but the human ones are the answer to the question the screen
       * was run to settle.
       */
      const screenRows = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select id, screen_key, database_name, query_text,
                 search_date::text as search_date, result_count, screened_count,
                 stratum, deduplication_notes, inclusion_criteria,
                 human_primary_criteria
          from ${sql.raw(rel('public_v_literature_screens'))}
          where peptide_id = ${peptideId}
          order by search_date desc
        `),
      );

      const literatureScreens: LiteratureScreen[] = [];
      for (const screen of screenRows) {
        const ledger = rows<Record<string, unknown>>(
          await tx.execute(sql`
            select external_id, external_id_type, title, publication_year,
                   journal, study_type, evidence_class, included,
                   primary_or_secondary, classified_by, country, language,
                   research_group,
                   /*
                    * The adjudication reason, withheld from patient mode.
                    *
                    * It is the note a screener writes about why a study was
                    * counted, and the natural way to describe a trial is by
                    * what it gave: "10 mg, then 20 mg", "42–1260 mg". That
                    * reached patient payloads through the human-records list
                    * for two sprints before a dose scan found it. The patient
                    * keeps the study type, the title, the journal, the year
                    * and the country — enough to know what kind of work it
                    * was, without the amounts.
                    */
                   ${simple ? sql`null::text` : sql`reason`} as reason
            from ${sql.raw(rel('public_v_literature_screen_records'))}
            where screen_id = ${String(screen.id)}
            order by publication_year desc nulls last, external_id
          `),
        ).map((r) => ({
          externalId: String(r.external_id),
          externalIdType: String(r.external_id_type),
          title: String(r.title),
          publicationYear: r.publication_year === null ? null : Number(r.publication_year),
          journal: str(r.journal),
          studyType: String(r.study_type),
          evidenceClass: String(r.evidence_class),
          included: Boolean(r.included),
          primaryOrSecondary: String(r.primary_or_secondary),
          classifiedBy: String(r.classified_by),
          reason: str(r.reason),
          country: str(r.country),
          language: str(r.language),
          researchGroup: str(r.research_group),
        }));

        const byType = new Map<string, number>();
        for (const record of ledger) {
          byType.set(record.studyType, (byType.get(record.studyType) ?? 0) + 1);
        }

        literatureScreens.push({
          id: String(screen.id),
          screenKey: String(screen.screen_key),
          databaseName: String(screen.database_name),
          queryText: String(screen.query_text),
          searchDate: String(screen.search_date),
          resultCount: Number(screen.result_count),
          screenedCount: Number(screen.screened_count ?? screen.result_count),
          stratum: str(screen.stratum),
          deduplicationNotes: String(screen.deduplication_notes),
          inclusionCriteria: String(screen.inclusion_criteria),
          humanPrimaryCriteria: String(screen.human_primary_criteria),
          includedCount: ledger.filter((r) => r.included).length,
          /*
           * Studies in which the compound was given to people.
           *
           * Counted by study type rather than by evidence class, and the
           * difference is not pedantry: two of the five human-class records in
           * the BPC-157 ledger are doping-control methods validated in human
           * urine. Those carry the `human` class correctly — the matrix is
           * human — and nobody in them was given anything. Counting them here
           * put "5 primary human studies" on a page whose every sentence said
           * three, and the sentences were right.
           */
          humanPrimaryCount: ledger.filter(
            (r) =>
              r.included &&
              r.primaryOrSecondary === 'primary' &&
              ['human_interventional', 'human_observational', 'case_report'].includes(r.studyType),
          ).length,
          typeCounts: [...byType.entries()]
            .map(([studyType, count]) => ({ studyType, count }))
            .sort((a, b) => b.count - a.count),
          humanRecords: ledger.filter((r) => r.evidenceClass === 'human'),
        });
      }

      /*
       * Identity and replication.
       *
       * Both patient-facing in full. Neither carries a dose, and both answer
       * questions a patient has as directly as a clinician does: is the thing I
       * was sold the thing this page is about, and has anybody else found the
       * same result.
       */
      const identities: CompoundIdentityClaim[] = rows<CitationRow & Record<string, unknown>>(
        await tx.execute(sql`
          select ci.id, ci.identity_key, ci.name_used, ci.chemical_form, ci.sequence,
                 ci.residue_count, ci.molecular_weight::text as molecular_weight,
                 ci.weight_basis, ci.form, ci.verification, ci.usage_context,
                 ci.notes, et.public_label as evidence_type_label, ${CITATION_SELECT}
          from ${sql.raw(rel('public_v_compound_identity_claims'))} ci
          join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = ci.evidence_type_key
          join ${sql.raw(rel('public_v_sources'))} s on s.id = ci.source_id
          join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
          left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = ci.source_location_id
          where ci.peptide_id = ${peptideId}
          order by ci.name_used, ci.identity_key
        `),
      ).map((row) => ({
        id: String(row.id),
        identityKey: String(row.identity_key),
        nameUsed: String(row.name_used),
        chemicalForm: str(row.chemical_form),
        sequence: str(row.sequence),
        residueCount: row.residue_count === null ? null : Number(row.residue_count),
        molecularWeight: str(row.molecular_weight),
        weightBasis: str(row.weight_basis),
        form: String(row.form),
        verification: String(row.verification),
        usageContext: String(row.usage_context),
        notes: str(row.notes),
        evidenceTypeLabel: String(row.evidence_type_label),
        citation: row.source_id ? toCitation(row) : null,
      }));

      const replication: ReplicationAssessment[] = rows<Record<string, unknown>>(
        await tx.execute(sql`
          select id, assessment_key, finding, state, study_count, group_count,
                 country_count, models, human_confirmed, basis, limitations,
                 supporting_records
          from ${sql.raw(rel('public_v_replication_assessments'))}
          where peptide_id = ${peptideId}
          order by
            case state
              when 'confirmed_in_humans' then 0
              when 'independent_multiple_countries' then 1
              when 'independent_group' then 2
              when 'repeated_same_group' then 3
              when 'single_study' then 4
              when 'conflicting_replication' then 5
              when 'failed_replication' then 6
              else 7
            end,
            assessment_key
        `),
      ).map((row) => ({
        id: String(row.id),
        assessmentKey: String(row.assessment_key),
        finding: String(row.finding),
        state: String(row.state),
        studyCount: row.study_count === null ? null : Number(row.study_count),
        groupCount: row.group_count === null ? null : Number(row.group_count),
        countryCount: row.country_count === null ? null : Number(row.country_count),
        models: str(row.models),
        humanConfirmed: Boolean(row.human_confirmed),
        basis: String(row.basis),
        limitations: str(row.limitations),
        supportingRecords: str(row.supporting_records),
      }));

      const protocols = await readProtocols(tx, peptideId, mode, { preview });

      const [countRow] = rows<{ n: number }>(
        await tx.execute(sql`
          select count(*)::int as n from ${sql.raw(rel('public_v_protocol_practitioner'))}
          where peptide_id = ${peptideId}
        `),
      );

      // Same transaction, same relation switch, same mode rule: dose arms and
      // dose-specific comparisons are withheld in simple mode by the query.
      const trials = await readPeptideTrials(tx, slug, mode, { preview });

      return {
        id: peptideId,
        slug: String(peptide.slug),
        peptideKey: String(peptide.peptide_key),
        canonicalName: String(peptide.canonical_name),
        shortDescription: str(peptide.short_description),
        simpleSummary: str(peptide.simple_summary),
        /*
         * Null in patient mode, and dropped here rather than in the component.
         *
         * The practitioner summary is the densest prose on the record and it
         * carries doses, concentrations and reconstitution detail — on
         * tesamorelin it names the labelled dose. It was being loaded in both
         * modes and simply not rendered in simple mode, which means every
         * patient payload has been carrying it: one changed component, one
         * debug view, one print stylesheet away from being read.
         *
         * The project's rule is that a patient payload should not contain what
         * a patient must not see, rather than contain it and decline to draw
         * it. This is that rule applied to the field that most needed it.
         */
        practitionerSummary: simple ? null : str(peptide.practitioner_summary),
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
        products,
        forms,
        pharmacokinetics,
        literatureScreens,
        identities,
        replication,
        gaps,
        protocols,
        protocolCountAll: countRow?.n ?? 0,
        trials,
      };
    }
  }
}

export const getPeptidePage = cache(
  async (slug: string, mode: ReadingMode): Promise<PeptidePage | null> =>
    asPublic((tx) => readPeptidePage(tx, slug, mode)),
);

/**
 * The protocol library across every published compound.
 *
 * Not wrapped in `cache`: the filters are part of the key and a page renders it
 * once per request anyway.
 */
export function getProtocolLibrary(
  mode: ReadingMode,
  filters: ProtocolLibraryFilters,
): Promise<ProtocolLibrary> {
  return asPublic((tx) => readProtocolLibrary(tx, mode, filters));
}

/** The same record read without the publication filter, for local review only. */
export async function readPeptidePagePreview(
  tx: Database,
  slug: string,
  mode: ReadingMode,
): Promise<PeptidePage | null> {
  return readPeptidePage(tx, slug, mode, { preview: true });
}

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

/**
 * Who paid for the study behind a source, as the source discloses it.
 *
 * Context, never a verdict. A reader weighing a result is entitled to know
 * that the manufacturer ran the trial, and equally entitled to know that
 * nobody reported the funding at all — and those are different answers, which
 * is why "not checked" is stored and rendered rather than being left blank.
 * Nothing here scores a study by its sponsor.
 */
export interface SourceFunding {
  readonly fundingKey: string;
  readonly funderKind: string;
  readonly sponsorName: string | null;
  readonly manufacturerInvolved: boolean | null;
  readonly institution: string | null;
  readonly grantReference: string | null;
  readonly disclosureText: string | null;
  readonly notes: string | null;
}

export const getSourceFunding = cache(async (sourceKey: string): Promise<SourceFunding[]> =>
  asPublic(async (tx) => {
    const result = await tx.execute(sql`
      select f.funding_key, f.funder_kind::text as funder_kind, f.sponsor_name,
             f.manufacturer_involved, f.institution, f.grant_reference,
             f.disclosure_text, f.notes
        from public_v_study_funding f
        join public_v_sources s on s.id = f.source_id
       where s.source_key = ${sourceKey}
       order by f.funding_key
    `);
    return rows<Record<string, unknown>>(result).map((row) => ({
      fundingKey: String(row.funding_key),
      funderKind: String(row.funder_kind),
      sponsorName: str(row.sponsor_name),
      manufacturerInvolved:
        row.manufacturer_involved === null || row.manufacturer_involved === undefined
          ? null
          : Boolean(row.manufacturer_involved),
      institution: str(row.institution),
      grantReference: str(row.grant_reference),
      disclosureText: str(row.disclosure_text),
      notes: str(row.notes),
    }));
  }),
);

/** What kind of copy of a source is held, and how far it was verified. */
export const getSourceArtifacts = cache(
  async (sourceKey: string): Promise<PublicSourceArtifact[]> =>
    asPublic((tx) => readSourceArtifacts(tx, sourceKey)),
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
  /**
   * Compounds the index recognises and is working on, published or not.
   *
   * The front page used to report published counts only. With the
   * demonstration fixture correctly excluded those are all zero, and a reader
   * would be told the index is empty — which is as misleading as the old
   * "1 compound published" was, in the other direction.
   *
   * "In development" is the true statement, and it is also the more useful one:
   * it tells a reader what is in scope, which is what they came to find out.
   */
  readonly compoundsInDevelopment: number;
  /** Quality topics with extracted evidence attached, reviewed or not. */
  readonly qualityReferencesWritten: number;
  /** Quality topics the index recognises, written or not. */
  readonly qualityTopicsRegistered: number;
  /** Statements extracted and located, awaiting a human scientific review. */
  readonly statementsAwaitingReview: number;
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
         where et.is_human_evidence)::int as claims_with_human_evidence,
        (select count(*) from public_v_peptide_register)::int
          as compounds_in_development,
        (select count(*) from public_v_quality_register where claim_count > 0)::int
          as quality_references_written,
        (select count(*) from public_v_quality_register)::int
          as quality_topics_registered,
        (select coalesce(sum(claim_count), 0) from public_v_quality_register)::int
          as statements_awaiting_review
    `);
    const row = rows<Record<string, number>>(result)[0] ?? {};
    return {
      publishedPeptides: row.published_peptides ?? 0,
      publishedQualityTopics: row.published_quality_topics ?? 0,
      registeredSources: row.registered_sources ?? 0,
      citableSources: row.citable_sources ?? 0,
      publishedClaims: row.published_claims ?? 0,
      claimsWithHumanEvidence: row.claims_with_human_evidence ?? 0,
      compoundsInDevelopment: row.compounds_in_development ?? 0,
      qualityReferencesWritten: row.quality_references_written ?? 0,
      qualityTopicsRegistered: row.quality_topics_registered ?? 0,
      statementsAwaitingReview: row.statements_awaiting_review ?? 0,
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

export const getDiscovery = cache(async (): Promise<DiscoveryRow[]> =>
  asPublic((tx) => readDiscovery(tx)),
);

export const getResearchQuestions = cache(async (): Promise<ResearchQuestionEntry[]> =>
  asPublic((tx) => readResearchQuestions(tx)),
);

/**
 * Foundational learning topics, as the public may read them: only topics whose
 * publication state is published, through the `public_v_*` views (0027).
 */
export const listLearningTopics = cache(
  async (): Promise<readonly LearningTopicSummary[]> => asPublic((tx) => readLearningTopics(tx)),
);

export const getLearningTopic = cache(
  async (slug: string): Promise<LearningTopicReading | null> =>
    asPublic((tx) => readLearningTopic(tx, slug)),
);

export type { LearningTopicReading, LearningTopicSummary };

