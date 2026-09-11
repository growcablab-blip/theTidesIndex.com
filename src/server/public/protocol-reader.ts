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
export async function readProtocols(
  tx: Database,
  peptideId: string,
  mode: ReadingMode,
): Promise<SimpleProtocol[] | PractitionerProtocol[]> {
  const sourceRows = rows<CitationRow & { protocol_id: string; source_role: string }>(
    await tx.execute(sql`
      select ps.protocol_id, ps.source_role, ${CITATION_SELECT}
      from public_v_protocol_sources ps
      join public_v_sources s on s.id = ps.source_id
      join public_v_source_types st on st.key = s.source_type_key
      left join public_v_source_locations l on l.id = ps.source_location_id
      join public_v_protocol_practitioner p on p.id = ps.protocol_id
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
    const result = await tx.execute(sql`
      select p.id, p.protocol_key, p.objective_context, p.population_model,
             r.name as route_name, p.regulatory_context,
             et.public_label as evidence_type_label,
             p.has_monitoring_guidance, p.has_safety_guidance
      from public_v_protocol_simple p
      left join public_v_routes r on r.key = p.route_key
      join public_v_evidence_types et on et.key = p.evidence_type_key
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
      hasMonitoringGuidance: Boolean(p.has_monitoring_guidance),
      hasSafetyGuidance: Boolean(p.has_safety_guidance),
      sources: sourcesByProtocol.get(String(p.id)) ?? [],
    }));
  }

  const result = await tx.execute(sql`
    select p.*, r.name as route_name, et.public_label as evidence_type_label
    from public_v_protocol_practitioner p
    left join public_v_routes r on r.key = p.route_key
    join public_v_evidence_types et on et.key = p.evidence_type_key
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
    hasMonitoringGuidance: p.monitoring_text !== null,
    hasSafetyGuidance: p.contraindications_text !== null || p.safety_notes !== null,
    formulation: str(p.formulation),
    amountReported: str(p.amount_reported),
    amountUnit: str(p.amount_unit),
    frequencyText: str(p.frequency_text),
    timingText: str(p.timing_text),
    durationText: str(p.duration_text),
    cycleText: str(p.cycle_text),
    titrationText: str(p.titration_text),
    monitoringText: str(p.monitoring_text),
    contraindicationsText: str(p.contraindications_text),
    safetyNotes: str(p.safety_notes),
    adverseEventsText: str(p.adverse_events_text),
    outcomeContext: str(p.outcome_context),
    sources: sourcesByProtocol.get(String(p.id)) ?? [],
  }));
}
