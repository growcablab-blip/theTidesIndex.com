import { sql, type SQL } from 'drizzle-orm';
import type { Database } from '../db/types';
import { rows, str } from './shapes';

/**
 * Two cross-register views that answer questions no single page can.
 *
 *   - **Discovery.** Which compounds have human evidence at all, by which routes,
 *     with regimens from which kind of source, replicated how far. A reader
 *     browsing by research area should see the shape of the evidence before
 *     opening a record, the same way the compound page's "at a glance" shows it
 *     after.
 *   - **Research questions.** Every question this index has derived from a
 *     recorded absence, across compounds and quality topics. A question exists
 *     here only because a gap does: the reader cannot add one and neither can a
 *     page.
 *
 * Neither ranks compounds. Counts describe what the literature screens and
 * records contain; they are not scores, and the pages that render them sort
 * alphabetically. Neither selects a dosing column, so both are safe in simple
 * mode without a separate query.
 */

const RELATIONS = {
  public_v_peptides: 'peptides',
  public_v_compound_categories: 'compound_categories',
  public_v_compound_types: 'compound_types',
  public_v_evidence_gaps: 'evidence_gaps',
  public_v_quality_topics: 'quality_topics',
  public_v_literature_screens: 'literature_screens',
  public_v_literature_screen_records: 'literature_screen_records',
  public_v_peptide_routes: 'peptide_routes',
  public_v_routes: 'routes',
  public_v_protocol_practitioner: 'protocols',
  public_v_disagreements: 'disagreements',
  public_v_replication_assessments: 'replication_assessments',
  public_v_claims: 'claims',
  public_v_claim_evidence: 'claim_evidence',
  public_v_study_funding: 'study_funding',
} as const;

type Rel = (name: keyof typeof RELATIONS) => SQL;

function relations(preview: boolean): Rel {
  return (name) => sql.raw(preview ? RELATIONS[name] : name);
}

const HUMAN_TYPES = ['human_interventional', 'human_observational', 'case_report', 'human_pk_safety'];
const PRECLINICAL_TYPES = ['animal_in_vivo', 'ex_vivo', 'in_vitro'];

/**
 * The replication ladder, strongest state first. Used only to report the
 * furthest a compound's findings have been repeated — the same phrase the
 * compound page uses — never to order compounds.
 */
export const REPLICATION_ORDER = [
  'confirmed_in_humans',
  'independent_multiple_countries',
  'independent_group',
  'repeated_same_group',
  'single_study',
  'conflicting_replication',
  'failed_replication',
  'not_assessed',
] as const;

export interface DiscoveryRow {
  readonly slug: string;
  readonly name: string;
  readonly categoryKey: string | null;
  readonly categoryLabel: string | null;
  readonly compoundTypeLabel: string | null;
  /** Records in the literature screen in which the compound was given to people. */
  readonly humanRecords: number;
  readonly preclinicalRecords: number;
  readonly screenedRecords: number;
  /** Human records published in a language other than English. */
  readonly nonEnglishHumanRecords: number;
  readonly hasScreen: boolean;
  readonly routes: readonly { key: string; name: string }[];
  readonly protocolCount: number;
  readonly protocolEvidenceKeys: readonly string[];
  readonly bestReplication: string | null;
  readonly unresolvedDisagreements: number;
  readonly researchQuestions: number;
  /**
   * How far this record's citations have been traced back to research.
   *
   * Counted here, never shown as a count: the directory renders a phrase, and
   * a reader comparing two compounds should be comparing what kind of source
   * each rests on, not how many rows one has.
   */
  readonly evidenceRows: number;
  readonly citesPrimaryResearch: number;
  readonly abstractOnly: number;
  readonly restsOnSecondary: number;
  readonly fullTextRead: number;
  /** Sources behind this record that carry a funding disclosure either way. */
  readonly fundingChecked: number;
  readonly fundingSources: number;
}

export interface ResearchQuestionEntry {
  readonly gapKey: string;
  readonly question: string;
  readonly opportunityType: string;
  readonly gapType: string;
  readonly statement: string;
  readonly why: string;
  readonly whatWouldResolveIt: string | null;
  /** Open, partially resolved, resolved or superseded — never silently dropped. */
  readonly resolutionState: string;
  readonly resolutionNote: string | null;
  readonly subjectKind: 'compound' | 'quality';
  readonly subjectSlug: string;
  readonly subjectName: string;
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string');
  if (typeof value === 'string' && value.startsWith('{')) {
    return value
      .replace(/^\{|\}$/g, '')
      .split(',')
      .map((v) => v.replace(/^"|"$/g, ''))
      .filter((v) => v !== '' && v !== 'NULL');
  }
  return [];
}

export async function readDiscovery(tx: Database, options: { preview?: boolean } = {}): Promise<DiscoveryRow[]> {
  const preview = options.preview === true;
  const rel = relations(preview);
  const notFixture = preview ? sql`and not pe.is_demonstration` : sql``;
  const human = sql.join(HUMAN_TYPES.map((t) => sql`${t}`), sql`, `);
  const preclinical = sql.join(PRECLINICAL_TYPES.map((t) => sql`${t}`), sql`, `);

  const result = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select pe.slug, pe.canonical_name, pe.primary_category_key,
             cc.label as category_label, ct.label as compound_type_label,
             (select count(*) from ${rel('public_v_literature_screen_records')} r
                join ${rel('public_v_literature_screens')} s on s.id = r.screen_id
               where s.peptide_id = pe.id and r.study_type in (${human}))::int as human_records,
             (select count(*) from ${rel('public_v_literature_screen_records')} r
                join ${rel('public_v_literature_screens')} s on s.id = r.screen_id
               where s.peptide_id = pe.id and r.study_type in (${preclinical}))::int as preclinical_records,
             (select count(*) from ${rel('public_v_literature_screen_records')} r
                join ${rel('public_v_literature_screens')} s on s.id = r.screen_id
               where s.peptide_id = pe.id)::int as screened_records,
             (select count(*) from ${rel('public_v_literature_screen_records')} r
                join ${rel('public_v_literature_screens')} s on s.id = r.screen_id
               where s.peptide_id = pe.id and r.study_type in (${human})
                 and r.language is not null and r.language <> 'eng')::int as non_english_human,
             (select count(*) from ${rel('public_v_literature_screens')} s where s.peptide_id = pe.id)::int as screen_count,
             (select array_agg(distinct pr.route_key) from ${rel('public_v_peptide_routes')} pr
               where pr.peptide_id = pe.id) as route_keys,
             (select count(*) from ${rel('public_v_protocol_practitioner')} p where p.peptide_id = pe.id)::int as protocol_count,
             (select array_agg(distinct p.evidence_type_key) from ${rel('public_v_protocol_practitioner')} p
               where p.peptide_id = pe.id) as protocol_evidence_keys,
             (select array_agg(distinct ra.state::text) from ${rel('public_v_replication_assessments')} ra
               where ra.peptide_id = pe.id) as replication_states,
             (select count(*) from ${rel('public_v_disagreements')} d
               where d.peptide_id = pe.id and d.resolution = 'unresolved')::int as unresolved_disagreements,
             (select count(*) from ${rel('public_v_evidence_gaps')} g
               where g.peptide_id = pe.id and g.research_question is not null)::int as research_questions,
             (select count(*) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id)::int as evidence_rows,
             (select count(*) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id
                 and ce.primary_trace = 'primary_source_is_cited')::int as cites_primary,
             (select count(*) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id and ce.primary_trace = 'abstract_only')::int as abstract_only,
             (select count(*) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id
                 and ce.primary_trace in ('cited_not_obtained', 'not_attempted'))::int as rests_on_secondary,
             (select count(*) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id and ce.primary_source_verified)::int as full_text_read,
             (select count(distinct f.source_id) from ${rel('public_v_study_funding')} f
               where f.source_id in (
                 select ce.source_id from ${rel('public_v_claim_evidence')} ce
                   join ${rel('public_v_claims')} c on c.id = ce.claim_id
                  where c.peptide_id = pe.id))::int as funding_checked,
             (select count(distinct ce.source_id) from ${rel('public_v_claim_evidence')} ce
                join ${rel('public_v_claims')} c on c.id = ce.claim_id
               where c.peptide_id = pe.id)::int as funding_sources
        from ${rel('public_v_peptides')} pe
        left join ${rel('public_v_compound_categories')} cc on cc.key = pe.primary_category_key
        left join ${rel('public_v_compound_types')} ct on ct.key = pe.compound_type_key
       where true ${notFixture}
    `),
  );

  const routeRows = rows<{ key: string; name: string }>(
    await tx.execute(sql`select key, name from ${rel('public_v_routes')}`),
  );
  const routeName = new Map(routeRows.map((r) => [r.key, r.name]));

  return result
    .map((r) => {
      const states = list(r.replication_states);
      const best = REPLICATION_ORDER.find((s) => states.includes(s)) ?? null;
      return {
        slug: String(r.slug),
        name: String(r.canonical_name),
        categoryKey: str(r.primary_category_key),
        categoryLabel: str(r.category_label),
        compoundTypeLabel: str(r.compound_type_label),
        humanRecords: Number(r.human_records),
        preclinicalRecords: Number(r.preclinical_records),
        screenedRecords: Number(r.screened_records),
        nonEnglishHumanRecords: Number(r.non_english_human),
        hasScreen: Number(r.screen_count) > 0,
        routes: list(r.route_keys)
          .map((key) => ({ key, name: routeName.get(key) ?? key }))
          .sort((a, b) => a.name.localeCompare(b.name)),
        protocolCount: Number(r.protocol_count),
        protocolEvidenceKeys: list(r.protocol_evidence_keys).sort(),
        bestReplication: best,
        unresolvedDisagreements: Number(r.unresolved_disagreements),
        researchQuestions: Number(r.research_questions),
        evidenceRows: Number(r.evidence_rows),
        citesPrimaryResearch: Number(r.cites_primary),
        abstractOnly: Number(r.abstract_only),
        restsOnSecondary: Number(r.rests_on_secondary),
        fullTextRead: Number(r.full_text_read),
        fundingChecked: Number(r.funding_checked),
        fundingSources: Number(r.funding_sources),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function readResearchQuestions(
  tx: Database,
  options: { preview?: boolean } = {},
): Promise<ResearchQuestionEntry[]> {
  const preview = options.preview === true;
  const rel = relations(preview);
  const notFixture = preview ? sql`and (pe.id is null or not pe.is_demonstration)` : sql``;

  const result = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select g.gap_key, g.research_question, g.opportunity_type, g.gap_type::text as gap_type,
             g.statement, g.why_not_supported, g.what_would_resolve_it,
             g.resolution_state::text as resolution_state, g.resolution_note,
             pe.slug as peptide_slug, pe.canonical_name as peptide_name,
             q.slug as topic_slug, q.name as topic_name
        from ${rel('public_v_evidence_gaps')} g
        left join ${rel('public_v_peptides')} pe on pe.id = g.peptide_id
        left join ${rel('public_v_quality_topics')} q on q.id = g.quality_topic_id
       where g.research_question is not null
         and (pe.id is not null or q.id is not null)
         ${notFixture}
    `),
  );

  return result
    .map((r) => {
      const compound = r.peptide_slug !== null && r.peptide_slug !== undefined;
      return {
        gapKey: String(r.gap_key),
        question: String(r.research_question),
        opportunityType: String(r.opportunity_type),
        gapType: String(r.gap_type),
        statement: String(r.statement),
        why: String(r.why_not_supported),
        whatWouldResolveIt: str(r.what_would_resolve_it),
        resolutionState: str(r.resolution_state) ?? 'open',
        resolutionNote: str(r.resolution_note),
        subjectKind: compound ? ('compound' as const) : ('quality' as const),
        subjectSlug: String(compound ? r.peptide_slug : r.topic_slug),
        subjectName: String(compound ? r.peptide_name : r.topic_name),
      };
    })
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || a.gapKey.localeCompare(b.gapKey));
}
