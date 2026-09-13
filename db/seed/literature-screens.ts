import { sql } from 'drizzle-orm';
import { eq } from 'drizzle-orm';
import * as schema from '@db/schema';
import { seedData } from './seed-data';
import type { SeedDb } from './index';

/**
 * Loads a literature screen and its ledger.
 *
 * The screen exists to make one sentence checkable. The BPC-157 record could
 * previously say "no human study is recorded in the sources held here", which
 * was true and nearly useless — it described this library rather than the
 * literature. It could not say anything stronger without a search somebody
 * could repeat.
 *
 * Now it can, and the answer turned out to be the opposite of what the register
 * implied: the screen found three primary human studies. Two records that a
 * careless screen would have counted — a paper whose MeSH headings include
 * "Humans" but whose BPC-157 arm was in rats, and a review asserting that
 * clinical trials happened — are in the ledger with the reason they were not
 * counted, which is the part that makes the total defensible.
 *
 * The ledger replaces itself on every load. It is derived from a query and a
 * script, so a partial upsert would leave a stale classification behind a
 * corrected one.
 */

export interface ScreenLoadResult {
  readonly screenKey: string;
  readonly records: number;
  readonly humanPrimary: number;
}

/** `db.execute` returns an array or a `{ rows }` envelope depending on driver. */
function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

export async function loadLiteratureScreens(db: SeedDb): Promise<ScreenLoadResult[]> {
  const results: ScreenLoadResult[] = [];

  for (const screen of seedData.literatureScreens) {
    const peptide = await db
      .select({ id: schema.peptides.id })
      .from(schema.peptides)
      .where(eq(schema.peptides.peptideKey, screen.peptideKey));
    const peptideId = peptide[0]?.id;
    if (peptideId === undefined) {
      throw new Error(
        `literature screen ${screen.screenKey} names compound ${screen.peptideKey}, which does not exist.`,
      );
    }

    const inserted = await db
      .execute(
        sql`
        insert into literature_screens (
          screen_key, peptide_id, database_name, query_text, search_date,
          result_count, deduplication_notes, inclusion_criteria,
          human_primary_criteria, screened_count, stratum
        ) values (
          ${screen.screenKey}, ${peptideId}, ${screen.database}, ${screen.query},
          ${screen.searchDate}::date, ${screen.resultCount}, ${screen.deduplication},
          ${screen.inclusionCriteria}, ${screen.humanPrimaryCriteria},
          ${screen.screenedCount ?? screen.records.length}, ${screen.stratum}
        )
        on conflict (screen_key) do update set
          database_name = excluded.database_name,
          query_text = excluded.query_text,
          search_date = excluded.search_date,
          result_count = excluded.result_count,
          deduplication_notes = excluded.deduplication_notes,
          inclusion_criteria = excluded.inclusion_criteria,
          human_primary_criteria = excluded.human_primary_criteria,
          screened_count = excluded.screened_count,
          stratum = excluded.stratum
        returning id
      `,
      )
      .then(rowsOf<{ id: string }>);
    const screenId = inserted[0]!.id;

    await db.execute(sql`delete from literature_screen_records where screen_id = ${screenId}`);
    for (const record of screen.records) {
      await db.execute(sql`
        insert into literature_screen_records (
          screen_id, external_id, external_id_type, title, publication_year,
          journal, publication_types, study_type, evidence_class, included,
          primary_or_secondary, peptide_identity_certainty, full_text_status,
          classified_by, reason, country, language, research_group
        ) values (
          ${screenId}, ${record.pmid}, 'pmid', ${record.title},
          ${record.year === '' ? null : Number(record.year)}, ${record.journal},
          ${record.publicationTypes.join('; ')},
          ${record.studyType}::screen_study_type, ${record.evidenceClass},
          ${record.included}, ${record.primaryOrSecondary},
          ${record.peptideIdentityCertainty}, ${record.fullTextStatus},
          ${record.classifiedBy}, ${record.reason}, ${record.country},
          ${record.language}, ${record.researchGroup}
        )
      `);
    }

    results.push({
      screenKey: screen.screenKey,
      records: screen.records.length,
      // Studies in people, not records with a human matrix. See the same
      // distinction, and the reason for it, in readPeptidePage.
      humanPrimary: screen.records.filter(
        (r) =>
          r.included &&
          r.primaryOrSecondary === 'primary' &&
          ['human_interventional', 'human_observational', 'case_report'].includes(r.studyType),
      ).length,
    });
  }

  return results;
}
