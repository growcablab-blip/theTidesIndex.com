import { sql } from 'drizzle-orm';
import type { SeedDb } from './index';
import { seedData, type SynthesisSeed } from './seed-data';

/**
 * Tides syntheses: conclusions drawn from several sourced claims, each naming
 * the claims it rests on.
 *
 * Refuses a synthesis whose subject or any supporting claim is absent, and one
 * resting on a claim that carries contradicting evidence — a synthesis may not
 * override evidence pointing the other way. The no-numerals and two-claim rules
 * are held by the seed schema and again by the database. Nothing here
 * publishes.
 */

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

async function subjectColumn(
  db: SeedDb,
  synthesis: SynthesisSeed,
): Promise<{ peptide: string | null; quality: string | null; learning: string | null }> {
  const { kind, key } = synthesis.subject;
  const lookup =
    kind === 'learning'
      ? sql`select id from learning_topics where topic_key = ${key}`
      : kind === 'quality'
        ? sql`select id from quality_topics where slug = ${key}`
        : sql`select id from peptides where slug = ${key}`;
  const row = rowsOf<{ id: string }>(await db.execute(lookup))[0];
  if (row === undefined) {
    throw new Error(`${synthesis.synthesisKey}: subject ${kind} '${key}' does not exist.`);
  }
  return {
    peptide: kind === 'peptide' ? row.id : null,
    quality: kind === 'quality' ? row.id : null,
    learning: kind === 'learning' ? row.id : null,
  };
}

export async function loadSyntheses(
  db: SeedDb,
  syntheses: readonly SynthesisSeed[] = seedData.syntheses,
): Promise<number> {
  for (const [index, s] of syntheses.entries()) {
    const subject = await subjectColumn(db, s);

    const claimIds: string[] = [];
    for (const claimKey of s.claimKeys) {
      const claim = rowsOf<{ id: string; contradicted: boolean }>(
        await db.execute(sql`
          select c.id,
                 exists (
                   select 1 from claim_evidence ce
                    where ce.claim_id = c.id and ce.relationship = 'contradicts'
                 ) as contradicted
            from claims c
           where c.claim_key = ${claimKey}
        `),
      )[0];
      if (claim === undefined) {
        throw new Error(`${s.synthesisKey}: rests on ${claimKey}, which does not exist.`);
      }
      if (claim.contradicted) {
        throw new Error(
          `${s.synthesisKey}: rests on ${claimKey}, which carries contradicting evidence. A synthesis may not override it.`,
        );
      }
      claimIds.push(claim.id);
    }

    const row = rowsOf<{ id: string }>(
      await db.execute(sql`
        insert into editorial_syntheses (
          synthesis_key, peptide_id, quality_topic_id, learning_topic_id,
          statement, plain_language_text, reasoning, does_not_conclude, sort_order
        ) values (
          ${s.synthesisKey}, ${subject.peptide}, ${subject.quality}, ${subject.learning},
          ${s.statement}, ${s.plainLanguageText}, ${s.reasoning}, ${s.doesNotConclude},
          ${(index + 1) * 10}
        )
        on conflict (synthesis_key) do update set
          peptide_id = excluded.peptide_id,
          quality_topic_id = excluded.quality_topic_id,
          learning_topic_id = excluded.learning_topic_id,
          statement = excluded.statement,
          plain_language_text = excluded.plain_language_text,
          reasoning = excluded.reasoning,
          does_not_conclude = excluded.does_not_conclude,
          sort_order = excluded.sort_order
        returning id
      `),
    )[0];
    if (row === undefined) throw new Error(`${s.synthesisKey}: insert returned no row.`);

    await db.execute(sql`delete from editorial_synthesis_claims where synthesis_id = ${row.id}`);
    for (const [i, claimId] of claimIds.entries()) {
      await db.execute(sql`
        insert into editorial_synthesis_claims (synthesis_id, claim_id, sort_order)
        values (${row.id}, ${claimId}, ${(i + 1) * 10})
      `);
    }
  }
  return syntheses.length;
}
