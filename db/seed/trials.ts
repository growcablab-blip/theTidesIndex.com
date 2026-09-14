import { sql } from 'drizzle-orm';
import type { SeedDb } from './index';
import { seedData, type SourceArtifactSeed, type TrialPacket } from './seed-data';

/**
 * Held artifacts and registered trials (migration 0026).
 *
 * Artifacts load straight after the source registry: they describe copies of
 * registered sources, and a copy of an unregistered source is refused.
 *
 * Trials load after the compound packets, because a comparison between a
 * journal table and a registry outcome measure points at two exact locations
 * that those packets create. A comparison citing a location nobody recorded is
 * refused rather than stored with a dangling reference.
 */

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function sourceIdOf(db: SeedDb, sourceKey: string, context: string): Promise<string> {
  const rows = rowsOf<{ id: string }>(
    await db.execute(sql`select id from sources where source_key = ${sourceKey}`),
  );
  const id = rows[0]?.id;
  if (id === undefined) throw new Error(`${context}: source ${sourceKey} is not registered.`);
  return id;
}

export async function loadSourceArtifacts(
  db: SeedDb,
  artifacts: readonly SourceArtifactSeed[] = seedData.sourceArtifacts,
): Promise<number> {
  for (const a of artifacts) {
    const sourceId = await sourceIdOf(db, a.sourceKey, a.artifactKey);
    await db.execute(sql`
      insert into source_artifacts (
        artifact_key, source_id, artifact_kind, disposition, verification,
        filename, sha256, bytes, page_count, language, acquired_from, acquired_at,
        duplicate_of_artifact_key, distribution_provenance, notes, public_note
      ) values (
        ${a.artifactKey}, ${sourceId}, ${a.artifactKind}::artifact_kind,
        ${a.disposition}::artifact_disposition, ${a.verification}::artifact_verification,
        ${a.filename}, ${a.sha256}, ${a.bytes}, ${a.pageCount}, ${a.language},
        ${a.acquiredFrom}, ${a.acquiredAt}, ${a.duplicateOfArtifactKey},
        ${a.distributionProvenance}, ${a.notes}, ${a.publicNote}
      )
      on conflict (artifact_key) do update set
        source_id = excluded.source_id,
        artifact_kind = excluded.artifact_kind,
        disposition = excluded.disposition,
        verification = excluded.verification,
        filename = excluded.filename,
        sha256 = excluded.sha256,
        bytes = excluded.bytes,
        page_count = excluded.page_count,
        language = excluded.language,
        acquired_from = excluded.acquired_from,
        acquired_at = excluded.acquired_at,
        duplicate_of_artifact_key = excluded.duplicate_of_artifact_key,
        distribution_provenance = excluded.distribution_provenance,
        notes = excluded.notes,
        public_note = excluded.public_note
    `);
  }
  return artifacts.length;
}

export interface TrialLoadResult {
  packetKey: string;
  trials: number;
  documents: number;
  comparisons: number;
}

export async function loadTrialPackets(
  db: SeedDb,
  packets: readonly TrialPacket[] = seedData.trialPackets,
): Promise<TrialLoadResult[]> {
  const results: TrialLoadResult[] = [];
  for (const packet of packets) results.push(await loadTrialPacket(db, packet));
  return results;
}

async function loadTrialPacket(db: SeedDb, packet: TrialPacket): Promise<TrialLoadResult> {
  const peptide = rowsOf<{ id: string }>(
    await db.execute(sql`select id from peptides where peptide_key = ${packet.peptideKey}`),
  )[0];
  if (peptide === undefined) {
    throw new Error(`${packet.packetKey}: no compound '${packet.packetKey}' in the register.`);
  }

  let documents = 0;
  let comparisons = 0;

  for (const [order, t] of packet.trials.entries()) {
    const trial = rowsOf<{ id: string }>(
      await db.execute(sql`
        insert into clinical_trials (
          trial_key, peptide_id, registry_name, registry_id, sponsor_protocol_id, acronym,
          official_title, phase, design, population, comparator, enrolment_text, countries,
          site_count, duration_text, primary_outcome, secondary_outcomes, analysis_populations,
          statistical_plan, oversight, dose_arms_text, sponsor, registry_status, start_date,
          primary_completion_date, completion_date, results_posted_date, registry_last_update,
          registry_checked_at, notes, sort_order
        ) values (
          ${t.trialKey}, ${peptide.id}, ${t.registryName}, ${t.registryId}, ${t.sponsorProtocolId},
          ${t.acronym}, ${t.officialTitle}, ${t.phase}, ${t.design}, ${t.population},
          ${t.comparator}, ${t.enrolmentText}, ${t.countries}, ${t.siteCount}, ${t.durationText},
          ${t.primaryOutcome}, ${t.secondaryOutcomes}, ${t.analysisPopulations},
          ${t.statisticalPlan}, ${t.oversight}, ${t.doseArmsText}, ${t.sponsor},
          ${t.registryStatus}, ${t.startDate}, ${t.primaryCompletionDate}, ${t.completionDate},
          ${t.resultsPostedDate}, ${t.registryLastUpdate}, ${t.registryCheckedAt}, ${t.notes},
          ${order}
        )
        on conflict (trial_key) do update set
          peptide_id = excluded.peptide_id,
          registry_name = excluded.registry_name,
          registry_id = excluded.registry_id,
          sponsor_protocol_id = excluded.sponsor_protocol_id,
          acronym = excluded.acronym,
          official_title = excluded.official_title,
          phase = excluded.phase,
          design = excluded.design,
          population = excluded.population,
          comparator = excluded.comparator,
          enrolment_text = excluded.enrolment_text,
          countries = excluded.countries,
          site_count = excluded.site_count,
          duration_text = excluded.duration_text,
          primary_outcome = excluded.primary_outcome,
          secondary_outcomes = excluded.secondary_outcomes,
          analysis_populations = excluded.analysis_populations,
          statistical_plan = excluded.statistical_plan,
          oversight = excluded.oversight,
          dose_arms_text = excluded.dose_arms_text,
          sponsor = excluded.sponsor,
          registry_status = excluded.registry_status,
          start_date = excluded.start_date,
          primary_completion_date = excluded.primary_completion_date,
          completion_date = excluded.completion_date,
          results_posted_date = excluded.results_posted_date,
          registry_last_update = excluded.registry_last_update,
          registry_checked_at = excluded.registry_checked_at,
          notes = excluded.notes,
          sort_order = excluded.sort_order
        returning id
      `),
    )[0];
    if (trial === undefined) throw new Error(`${t.trialKey}: insert returned no row.`);

    // Documents are replaced wholesale: a link removed from the packet must not
    // survive in the database as a relationship nobody asserts any more.
    await db.execute(sql`delete from trial_documents where trial_id = ${trial.id}`);
    for (const [docOrder, d] of t.documents.entries()) {
      const sourceId = await sourceIdOf(db, d.sourceKey, t.trialKey);
      await db.execute(sql`
        insert into trial_documents (
          trial_id, source_id, role, link_basis, depth, version_label, document_date,
          answers, notes, sort_order
        ) values (
          ${trial.id}, ${sourceId}, ${d.role}::trial_document_role,
          ${d.linkBasis}::trial_link_basis, ${d.depth}::trial_document_depth,
          ${d.versionLabel}, ${d.documentDate}, ${d.answers}, ${d.notes}, ${docOrder}
        )
      `);
      documents += 1;
    }

    await db.execute(sql`delete from trial_source_comparisons where trial_id = ${trial.id}`);
    for (const [cmpOrder, c] of t.comparisons.entries()) {
      const locations = rowsOf<{ location_key: string; id: string }>(
        await db.execute(sql`
          select location_key, id from source_locations
           where location_key in (${c.locationAKey}, ${c.locationBKey})
        `),
      );
      const a = locations.find((l) => l.location_key === c.locationAKey)?.id;
      const b = locations.find((l) => l.location_key === c.locationBKey)?.id;
      if (a === undefined || b === undefined) {
        throw new Error(
          `${c.comparisonKey}: cites a location that no packet recorded ` +
            `(${a === undefined ? c.locationAKey : c.locationBKey}).`,
        );
      }
      await db.execute(sql`
        insert into trial_source_comparisons (
          comparison_key, trial_id, topic, location_a_id, a_reports, location_b_id, b_reports,
          state, known_explanation, why_it_matters, dose_specific, sort_order
        ) values (
          ${c.comparisonKey}, ${trial.id}, ${c.topic}, ${a}, ${c.aReports}, ${b}, ${c.bReports},
          ${c.state}::trial_comparison_state, ${c.knownExplanation}, ${c.whyItMatters},
          ${c.doseSpecific}, ${cmpOrder}
        )
      `);
      comparisons += 1;
    }
  }

  return { packetKey: packet.packetKey, trials: packet.trials.length, documents, comparisons };
}
