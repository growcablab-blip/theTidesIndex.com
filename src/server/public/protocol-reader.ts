import { sql } from 'drizzle-orm';
import type { Database } from '../db/types';
import type { ReadingMode } from '@/domain/presentation/reading-mode';
import {
  CITATION_SELECT,
  rows,
  str,
  toCitation,
  type Citation,
  type CitationRow,
  type PractitionerProtocol,
  type SimpleProtocol,
} from './shapes';

/**
 * Reads protocol records for the given depth.
 *
 * The two branches select from different relations. That is the whole point:
 * patient mode reads a view that has no dose in it.
 */
/**
 * Relation names for the two surfaces.
 *
 * `public_v_protocol_simple` has no dosing columns at all, which is what makes
 * patient mode safe by construction rather than by filtering. The preview reads
 * the base table for both, so the *column selection* below is what keeps the
 * simple payload clean there — which is why the simple branch names its columns
 * and never selects `*`.
 */
const PROTOCOL_RELATIONS = {
  'public_v_protocol_sources': 'protocol_sources',
  'public_v_protocol_practitioner': 'protocols',
  'public_v_protocol_simple': 'protocols',
  'public_v_sources': 'sources',
  'public_v_source_types': 'source_types',
  'public_v_source_locations': 'source_locations',
  'public_v_routes': 'routes',
  'public_v_evidence_types': 'evidence_types',
} as const;

export async function readProtocols(
  tx: Database,
  peptideId: string,
  mode: ReadingMode,
  options: { preview?: boolean } = {},
): Promise<SimpleProtocol[] | PractitionerProtocol[]> {
  const preview = options.preview === true;
  const rel = (name: keyof typeof PROTOCOL_RELATIONS): string =>
    preview ? PROTOCOL_RELATIONS[name] : name;
  const sourceRows = rows<CitationRow & { protocol_id: string; source_role: string }>(
    await tx.execute(sql`
      select ps.protocol_id, ps.source_role, ${CITATION_SELECT}
      from ${sql.raw(rel('public_v_protocol_sources'))} ps
      join ${sql.raw(rel('public_v_sources'))} s on s.id = ps.source_id
      join ${sql.raw(rel('public_v_source_types'))} st on st.key = s.source_type_key
      left join ${sql.raw(rel('public_v_source_locations'))} l on l.id = ps.source_location_id
      join ${sql.raw(rel('public_v_protocol_practitioner'))} p on p.id = ps.protocol_id
      where p.peptide_id = ${peptideId}
      order by ps.source_role, s.source_key
    `),
  );

  const sourcesByProtocol = new Map<string, Citation[]>();
  for (const row of sourceRows) {
    const list = sourcesByProtocol.get(row.protocol_id) ?? [];
    list.push(toCitation(row));
    sourcesByProtocol.set(row.protocol_id, list);
  }

  if (mode === 'simple') {
    /*
     * The preview reads `protocols`, which is not the same relation as
     * `public_v_protocol_simple` in two ways that matter here.
     *
     * It has no `has_monitoring_guidance` / `has_safety_guidance` — the view
     * computes those as the *presence* of text, precisely so the text itself
     * never reaches a patient payload — and it has no `patient_visibility`
     * filter, because the view is the filter.
     *
     * Both are restated explicitly for the preview. Leaving the second one out
     * would have made the development preview the one surface where patient
     * mode showed a protocol that patient mode is not allowed to show, which is
     * the worst possible place for that bug to live: visible only to the people
     * who already know what it should say.
     */
    const result = await tx.execute(sql`
      select p.id, p.protocol_key, p.objective_context, p.population_model,
             r.name as route_name, p.regulatory_context,
             et.public_label as evidence_type_label, et.is_human_evidence,
             ${
               preview
                 ? sql`(p.monitoring_text is not null) as has_monitoring_guidance,
                       (p.contraindications_text is not null or p.safety_notes is not null)
                         as has_safety_guidance`
                 : sql`p.has_monitoring_guidance, p.has_safety_guidance`
             }
      from ${sql.raw(rel('public_v_protocol_simple'))} p
      left join ${sql.raw(rel('public_v_routes'))} r on r.key = p.route_key
      join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = p.evidence_type_key
      where p.peptide_id = ${peptideId}
        ${preview ? sql`and p.patient_visibility` : sql``}
      order by p.protocol_key
    `);

    return rows<Record<string, unknown>>(result).map((p) => ({
      id: String(p.id),
      protocolKey: String(p.protocol_key),
      objectiveContext: String(p.objective_context),
      populationModel: str(p.population_model),
      routeName: str(p.route_name),
      regulatoryContext: str(p.regulatory_context),
      evidenceTypeLabel: String(p.evidence_type_label),
      isHumanEvidence: Boolean(p.is_human_evidence),
      hasMonitoringGuidance: Boolean(p.has_monitoring_guidance),
      hasSafetyGuidance: Boolean(p.has_safety_guidance),
      sources: sourcesByProtocol.get(String(p.id)) ?? [],
    }));
  }

  const result = await tx.execute(sql`
    select p.*, r.name as route_name, et.public_label as evidence_type_label,
           et.is_human_evidence
    from ${sql.raw(rel('public_v_protocol_practitioner'))} p
    left join ${sql.raw(rel('public_v_routes'))} r on r.key = p.route_key
    join ${sql.raw(rel('public_v_evidence_types'))} et on et.key = p.evidence_type_key
    where p.peptide_id = ${peptideId}
    order by p.protocol_key
  `);

  return rows<Record<string, unknown>>(result).map((p) => ({
    id: String(p.id),
    protocolKey: String(p.protocol_key),
    objectiveContext: String(p.objective_context),
    populationModel: str(p.population_model),
    routeName: str(p.route_name),
    regulatoryContext: str(p.regulatory_context),
    evidenceTypeLabel: String(p.evidence_type_label),
    isHumanEvidence: Boolean(p.is_human_evidence),
    hasMonitoringGuidance: p.monitoring_text !== null,
    hasSafetyGuidance: p.contraindications_text !== null || p.safety_notes !== null,
    formulation: str(p.formulation),
    amountReported: str(p.amount_reported),
    amountUnit: str(p.amount_unit),
    frequencyText: str(p.frequency_text),
    timingText: str(p.timing_text),
    durationText: str(p.duration_text),
    cycleText: str(p.cycle_text),
    combinationsText: str(p.combinations_text),
    titrationText: str(p.titration_text),
    monitoringText: str(p.monitoring_text),
    contraindicationsText: str(p.contraindications_text),
    safetyNotes: str(p.safety_notes),
    adverseEventsText: str(p.adverse_events_text),
    outcomeContext: str(p.outcome_context),
    sources: sourcesByProtocol.get(String(p.id)) ?? [],
  }));
}
