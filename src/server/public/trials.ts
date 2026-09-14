import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import type { ReadingMode } from '@/domain/presentation/reading-mode';
import { rows, str } from './shapes';

/**
 * The registered trials behind a compound record (migration 0026).
 *
 * A trial is counted once however many documents describe it. Each document —
 * article, registry record, posted results, protocol, statistical plan,
 * substudy — is listed with the question it answers and how much of it this
 * index actually holds, so "full text not held" is visible where it matters.
 *
 * Simple mode is enforced here, not in a component: the randomised dose arms
 * are never selected, and comparisons that carry arm amounts are never
 * returned. A patient payload does not contain dosing merely because nothing
 * renders it.
 */

export interface TrialDocument {
  readonly sourceKey: string;
  readonly sourceTitle: string;
  readonly role: string;
  readonly linkBasis: string;
  readonly depth: string;
  readonly versionLabel: string | null;
  readonly documentDate: string | null;
  readonly answers: string | null;
  readonly notes: string | null;
}

export interface TrialComparison {
  readonly comparisonKey: string;
  readonly topic: string;
  readonly aReports: string;
  readonly aSourceKey: string;
  readonly aLocator: string | null;
  readonly bReports: string;
  readonly bSourceKey: string;
  readonly bLocator: string | null;
  readonly state: string;
  readonly knownExplanation: string;
  readonly whyItMatters: string | null;
}

export interface ClinicalTrialRecord {
  readonly trialKey: string;
  readonly registryName: string;
  readonly registryId: string;
  readonly sponsorProtocolId: string | null;
  readonly acronym: string | null;
  readonly officialTitle: string;
  readonly phase: string;
  readonly design: string;
  readonly population: string;
  readonly comparator: string | null;
  readonly enrolmentText: string | null;
  readonly countries: string | null;
  readonly siteCount: number | null;
  readonly durationText: string | null;
  readonly primaryOutcome: string | null;
  readonly analysisPopulations: string | null;
  readonly statisticalPlan: string | null;
  readonly oversight: string | null;
  /** Null in simple mode, always: withheld by the query. */
  readonly doseArmsText: string | null;
  readonly sponsor: string;
  readonly registryStatus: string;
  readonly startDate: string | null;
  readonly completionDate: string | null;
  readonly resultsPostedDate: string | null;
  readonly registryCheckedAt: string;
  readonly notes: string | null;
  readonly documents: readonly TrialDocument[];
  readonly comparisons: readonly TrialComparison[];
}

const RELATIONS = {
  public_v_peptides: 'peptides',
  public_v_clinical_trials: 'clinical_trials',
  public_v_trial_documents: 'trial_documents',
  public_v_trial_source_comparisons: 'trial_source_comparisons',
  public_v_sources: 'sources',
  public_v_source_locations: 'source_locations',
} as const;

export async function readPeptideTrials(
  tx: Database,
  slug: string,
  mode: ReadingMode,
  options: { preview?: boolean } = {},
): Promise<ClinicalTrialRecord[]> {
  const preview = options.preview === true;
  const rel = (name: keyof typeof RELATIONS) => sql.raw(preview ? RELATIONS[name] : name);
  const simple = mode === 'simple';
  const notFixture = preview ? sql`and not p.is_demonstration` : sql``;

  const trialRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select t.id, t.trial_key, t.registry_name, t.registry_id, t.sponsor_protocol_id,
             t.acronym, t.official_title, t.phase, t.design, t.population, t.comparator,
             t.enrolment_text, t.countries, t.site_count, t.duration_text, t.primary_outcome,
             t.analysis_populations, t.statistical_plan, t.oversight,
             ${simple ? sql`null::text` : sql`t.dose_arms_text`} as dose_arms_text,
             t.sponsor, t.registry_status, t.start_date::text as start_date,
             t.completion_date::text as completion_date,
             t.results_posted_date::text as results_posted_date,
             t.registry_checked_at::text as registry_checked_at, t.notes
        from ${rel('public_v_clinical_trials')} t
        join ${rel('public_v_peptides')} p on p.id = t.peptide_id
       where p.slug = ${slug} ${notFixture}
       order by t.sort_order
    `),
  );
  if (trialRows.length === 0) return [];

  const ids = trialRows.map((t) => String(t.id));
  const idList = sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `);

  const documentRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select d.trial_id, s.source_key, s.title as source_title, d.role::text as role,
             d.link_basis::text as link_basis, d.depth::text as depth, d.version_label,
             d.document_date::text as document_date, d.answers, d.notes
        from ${rel('public_v_trial_documents')} d
        join ${rel('public_v_sources')} s on s.id = d.source_id
       where d.trial_id in (${idList})
       order by d.sort_order
    `),
  );

  const comparisonRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select c.trial_id, c.comparison_key, c.topic, c.a_reports, c.b_reports,
             c.state::text as state, c.known_explanation, c.why_it_matters,
             sa.source_key as a_source_key, la.locator_text as a_locator,
             sb.source_key as b_source_key, lb.locator_text as b_locator
        from ${rel('public_v_trial_source_comparisons')} c
        join ${rel('public_v_source_locations')} la on la.id = c.location_a_id
        join ${rel('public_v_sources')} sa on sa.id = la.source_id
        join ${rel('public_v_source_locations')} lb on lb.id = c.location_b_id
        join ${rel('public_v_sources')} sb on sb.id = lb.source_id
       where c.trial_id in (${idList})
         ${simple ? sql`and not c.dose_specific` : sql``}
       order by c.sort_order
    `),
  );

  return trialRows.map((t) => {
    const id = String(t.id);
    return {
      trialKey: String(t.trial_key),
      registryName: String(t.registry_name),
      registryId: String(t.registry_id),
      sponsorProtocolId: str(t.sponsor_protocol_id),
      acronym: str(t.acronym),
      officialTitle: String(t.official_title),
      phase: String(t.phase),
      design: String(t.design),
      population: String(t.population),
      comparator: str(t.comparator),
      enrolmentText: str(t.enrolment_text),
      countries: str(t.countries),
      siteCount: t.site_count === null || t.site_count === undefined ? null : Number(t.site_count),
      durationText: str(t.duration_text),
      primaryOutcome: str(t.primary_outcome),
      analysisPopulations: str(t.analysis_populations),
      statisticalPlan: str(t.statistical_plan),
      oversight: str(t.oversight),
      doseArmsText: simple ? null : str(t.dose_arms_text),
      sponsor: String(t.sponsor),
      registryStatus: String(t.registry_status),
      startDate: str(t.start_date),
      completionDate: str(t.completion_date),
      resultsPostedDate: str(t.results_posted_date),
      registryCheckedAt: String(t.registry_checked_at),
      notes: str(t.notes),
      documents: documentRows
        .filter((d) => String(d.trial_id) === id)
        .map((d) => ({
          sourceKey: String(d.source_key),
          sourceTitle: String(d.source_title),
          role: String(d.role),
          linkBasis: String(d.link_basis),
          depth: String(d.depth),
          versionLabel: str(d.version_label),
          documentDate: str(d.document_date),
          answers: str(d.answers),
          notes: str(d.notes),
        })),
      comparisons: comparisonRows
        .filter((c) => String(c.trial_id) === id)
        .map((c) => ({
          comparisonKey: String(c.comparison_key),
          topic: String(c.topic),
          aReports: String(c.a_reports),
          aSourceKey: String(c.a_source_key),
          aLocator: str(c.a_locator),
          bReports: String(c.b_reports),
          bSourceKey: String(c.b_source_key),
          bLocator: str(c.b_locator),
          state: String(c.state),
          knownExplanation: String(c.known_explanation),
          whyItMatters: str(c.why_it_matters),
        })),
    };
  });
}

/** What kind of copy of a source is held, and how far it was verified. No filenames, no hashes. */
export interface PublicSourceArtifact {
  readonly artifactKey: string;
  readonly artifactKind: string;
  readonly disposition: string;
  readonly verification: string;
  readonly language: string | null;
  readonly pageCount: number | null;
  readonly publicNote: string | null;
}

export async function readSourceArtifacts(
  tx: Database,
  sourceKey: string,
): Promise<PublicSourceArtifact[]> {
  const result = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select a.artifact_key, a.artifact_kind::text as artifact_kind,
             a.disposition::text as disposition, a.verification::text as verification,
             a.language, a.page_count, a.public_note
        from public_v_source_artifacts a
        join public_v_sources s on s.id = a.source_id
       where s.source_key = ${sourceKey}
       order by case a.disposition when 'working_copy' then 0 when 'retained_reference' then 1
                                   when 'rejected' then 2 else 3 end, a.artifact_key
    `),
  );
  return result.map((r) => ({
    artifactKey: String(r.artifact_key),
    artifactKind: String(r.artifact_kind),
    disposition: String(r.disposition),
    verification: String(r.verification),
    language: str(r.language),
    pageCount: r.page_count === null || r.page_count === undefined ? null : Number(r.page_count),
    publicNote: str(r.public_note),
  }));
}
