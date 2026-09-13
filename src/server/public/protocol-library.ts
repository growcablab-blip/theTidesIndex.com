import { sql, type SQL } from 'drizzle-orm';
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
} from './shapes';
import type { EvidenceClass } from '@/domain/evidence/evidence-types';

/**
 * Every source-reported regimen in the index, across compounds.
 *
 * The compound page answers "what has been reported for this compound". This
 * answers the questions a clinic asks across the register: what does one named
 * source report, what has been reported by one route, what regimens rest on a
 * human trial rather than a handbook.
 *
 * Three rules carry over from the compound page and are enforced here, in the
 * reader, rather than in the page:
 *
 *   - **Patient mode selects no dosing column.** Not "selects it and does not
 *     render it": the facet query below names its columns, and in simple mode it
 *     is the only query that runs. A patient learns which compounds have
 *     regimens recorded, from which sources, by which routes and on what kind of
 *     evidence, and never an amount.
 *   - **Nothing is ranked.** Protocols come back ordered by compound and source
 *     key, which carries no judgement.
 *   - **Nothing is merged.** One row per protocol record, each with the single
 *     source that reported it.
 */

export interface LibraryProtocol extends PractitionerProtocol {
  readonly peptideSlug: string;
  readonly peptideName: string;
  readonly routeKey: string | null;
  readonly evidenceTypeKey: string;
  readonly evidenceClass: EvidenceClass;
}

export interface FacetOption {
  readonly value: string;
  readonly label: string;
  readonly count: number;
}

export interface ProtocolLibraryFilters {
  readonly peptide?: string | undefined;
  readonly source?: string | undefined;
  readonly route?: string | undefined;
  readonly evidence?: string | undefined;
}

export interface CompoundProtocolSummary {
  readonly slug: string;
  readonly name: string;
  readonly protocolCount: number;
  readonly sourceCount: number;
  readonly routes: readonly string[];
  readonly evidenceLabels: readonly string[];
}

export interface ProtocolLibrary {
  /** Empty in simple mode. Always. */
  readonly protocols: readonly LibraryProtocol[];
  /** Every protocol in the register, not only the filtered ones. */
  readonly totalCount: number;
  readonly filteredCount: number;
  readonly facets: {
    readonly peptides: readonly FacetOption[];
    readonly sources: readonly FacetOption[];
    readonly routes: readonly FacetOption[];
    readonly evidence: readonly FacetOption[];
  };
  /** Per-compound counts. The whole of what simple mode receives about regimens. */
  readonly compounds: readonly CompoundProtocolSummary[];
}

const RELATIONS = {
  public_v_protocol_practitioner: 'protocols',
  public_v_protocol_sources: 'protocol_sources',
  public_v_peptides: 'peptides',
  public_v_sources: 'sources',
  public_v_source_types: 'source_types',
  public_v_source_locations: 'source_locations',
  public_v_routes: 'routes',
  public_v_evidence_types: 'evidence_types',
} as const;

interface FacetRow {
  protocol_id: string;
  peptide_slug: string;
  peptide_name: string;
  route_key: string | null;
  route_name: string | null;
  evidence_type_key: string;
  evidence_type_label: string;
  source_key: string;
  source_title: string;
  source_authors: string[] | string | null;
}

function firstAuthor(value: FacetRow['source_authors']): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  if (typeof value === 'string' && value !== '') {
    // Postgres text[] arrives as '{"A","B"}' through some drivers.
    const trimmed = value.replace(/^\{|\}$/g, '').split(',')[0]?.replace(/^"|"$/g, '');
    return trimmed === undefined || trimmed === '' ? null : trimmed;
  }
  return null;
}

function facet(values: readonly { value: string; label: string; id: string }[]): FacetOption[] {
  const byValue = new Map<string, { label: string; ids: Set<string> }>();
  for (const { value, label, id } of values) {
    const entry = byValue.get(value) ?? { label, ids: new Set<string>() };
    entry.ids.add(id);
    byValue.set(value, entry);
  }
  return [...byValue.entries()]
    .map(([value, { label, ids }]) => ({ value, label, count: ids.size }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function readProtocolLibrary(
  tx: Database,
  mode: ReadingMode,
  filters: ProtocolLibraryFilters = {},
  options: { preview?: boolean } = {},
): Promise<ProtocolLibrary> {
  const preview = options.preview === true;
  const rel = (name: keyof typeof RELATIONS): SQL =>
    sql.raw(preview ? RELATIONS[name] : name);

  // A development fixture is not in scope on any public surface, and the
  // preview reads the base table, so it restates the exclusion the view makes.
  const notFixture = preview ? sql`and not pe.is_demonstration` : sql``;

  /*
   * The facet query. No dosing column appears in it, in either mode, and in
   * simple mode it is the only query that runs.
   */
  const facetRows = rows<FacetRow>(
    await tx.execute(sql`
      select p.id as protocol_id, pe.slug as peptide_slug,
             pe.canonical_name as peptide_name,
             p.route_key, r.name as route_name,
             p.evidence_type_key, et.public_label as evidence_type_label,
             s.source_key, s.title as source_title, s.authors as source_authors
        from ${rel('public_v_protocol_practitioner')} p
        join ${rel('public_v_peptides')} pe on pe.id = p.peptide_id
        join ${rel('public_v_evidence_types')} et on et.key = p.evidence_type_key
        left join ${rel('public_v_routes')} r on r.key = p.route_key
        join ${rel('public_v_protocol_sources')} ps on ps.protocol_id = p.id
        join ${rel('public_v_sources')} s on s.id = ps.source_id
       where true ${notFixture}
       order by pe.canonical_name, s.source_key
    `),
  );

  const totalIds = new Set(facetRows.map((r) => r.protocol_id));

  const matches = (row: FacetRow): boolean =>
    (filters.peptide === undefined || row.peptide_slug === filters.peptide) &&
    (filters.source === undefined || row.source_key === filters.source) &&
    (filters.route === undefined || row.route_key === filters.route) &&
    (filters.evidence === undefined || row.evidence_type_key === filters.evidence);

  const filtered = facetRows.filter(matches);
  const filteredIds = new Set(filtered.map((r) => r.protocol_id));

  const byCompound = new Map<
    string,
    { name: string; ids: Set<string>; sources: Set<string>; routes: Set<string>; evidence: Set<string> }
  >();
  for (const row of facetRows) {
    const entry = byCompound.get(row.peptide_slug) ?? {
      name: row.peptide_name,
      ids: new Set<string>(),
      sources: new Set<string>(),
      routes: new Set<string>(),
      evidence: new Set<string>(),
    };
    entry.ids.add(row.protocol_id);
    entry.sources.add(row.source_key);
    if (row.route_name !== null) entry.routes.add(row.route_name);
    entry.evidence.add(row.evidence_type_label);
    byCompound.set(row.peptide_slug, entry);
  }

  const library: Omit<ProtocolLibrary, 'protocols'> = {
    totalCount: totalIds.size,
    filteredCount: filteredIds.size,
    facets: {
      peptides: facet(facetRows.map((r) => ({ value: r.peptide_slug, label: r.peptide_name, id: r.protocol_id }))),
      sources: facet(
        facetRows.map((r) => ({
          value: r.source_key,
          label: `${firstAuthor(r.source_authors) ?? r.source_key} — ${r.source_title}`,
          id: r.protocol_id,
        })),
      ),
      routes: facet(
        facetRows
          .filter((r) => r.route_key !== null)
          .map((r) => ({ value: r.route_key!, label: r.route_name ?? r.route_key!, id: r.protocol_id })),
      ),
      evidence: facet(
        facetRows.map((r) => ({ value: r.evidence_type_key, label: r.evidence_type_label, id: r.protocol_id })),
      ),
    },
    compounds: [...byCompound.entries()]
      .map(([slug, e]) => ({
        slug,
        name: e.name,
        protocolCount: e.ids.size,
        sourceCount: e.sources.size,
        routes: [...e.routes].sort(),
        evidenceLabels: [...e.evidence].sort(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };

  if (mode === 'simple' || filteredIds.size === 0) {
    return { ...library, protocols: [] };
  }

  /*
   * Practitioner mode: the full records for the filtered set. Filters are
   * re-applied in SQL rather than by id list, which keeps every value a bound
   * parameter and avoids depending on a driver's array encoding.
   */
  const conditions: SQL[] = [sql`true`];
  if (filters.peptide !== undefined) conditions.push(sql`pe.slug = ${filters.peptide}`);
  if (filters.route !== undefined) conditions.push(sql`p.route_key = ${filters.route}`);
  if (filters.evidence !== undefined) conditions.push(sql`p.evidence_type_key = ${filters.evidence}`);
  if (filters.source !== undefined) {
    conditions.push(sql`exists (
      select 1 from ${rel('public_v_protocol_sources')} fps
        join ${rel('public_v_sources')} fs on fs.id = fps.source_id
       where fps.protocol_id = p.id and fs.source_key = ${filters.source}
    )`);
  }
  const where = sql.join(conditions, sql` and `);

  const sourceRows = rows<CitationRow & { protocol_id: string }>(
    await tx.execute(sql`
      select ps.protocol_id, ${CITATION_SELECT}
        from ${rel('public_v_protocol_sources')} ps
        join ${rel('public_v_sources')} s on s.id = ps.source_id
        join ${rel('public_v_source_types')} st on st.key = s.source_type_key
        left join ${rel('public_v_source_locations')} l on l.id = ps.source_location_id
        join ${rel('public_v_protocol_practitioner')} p on p.id = ps.protocol_id
        join ${rel('public_v_peptides')} pe on pe.id = p.peptide_id
       where ${where} ${notFixture}
       order by s.source_key
    `),
  );
  const sourcesByProtocol = new Map<string, Citation[]>();
  for (const row of sourceRows) {
    const list = sourcesByProtocol.get(row.protocol_id) ?? [];
    list.push(toCitation(row));
    sourcesByProtocol.set(row.protocol_id, list);
  }

  const protocolRows = rows<Record<string, unknown>>(
    await tx.execute(sql`
      select p.*, pe.slug as peptide_slug, pe.canonical_name as peptide_name,
             r.name as route_name, et.public_label as evidence_type_label,
             et.evidence_class
        from ${rel('public_v_protocol_practitioner')} p
        join ${rel('public_v_peptides')} pe on pe.id = p.peptide_id
        join ${rel('public_v_evidence_types')} et on et.key = p.evidence_type_key
        left join ${rel('public_v_routes')} r on r.key = p.route_key
       where ${where} ${notFixture}
       order by pe.canonical_name, p.protocol_key
    `),
  );

  const protocols: LibraryProtocol[] = protocolRows.map((p) => ({
    id: String(p.id),
    protocolKey: String(p.protocol_key),
    peptideSlug: String(p.peptide_slug),
    peptideName: String(p.peptide_name),
    objectiveContext: String(p.objective_context),
    populationModel: str(p.population_model),
    routeKey: str(p.route_key),
    routeName: str(p.route_name),
    regulatoryContext: str(p.regulatory_context),
    evidenceTypeKey: String(p.evidence_type_key),
    evidenceTypeLabel: String(p.evidence_type_label),
    evidenceClass: p.evidence_class as EvidenceClass,
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

  return { ...library, protocols };
}
