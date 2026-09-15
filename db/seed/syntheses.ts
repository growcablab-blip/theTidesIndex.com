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
 * are held by the seed schema and again by the database.
 *
 * A synthesis about a compound, or one interpreting mechanism, efficacy, safety,
 * clinical meaning or a protocol, may be seeded as a draft but never as
 * published: a seed file cannot record a human scientific review (migration
 * 0028). Every such request is refused before anything is written. A general
 * synthesis marked `published` is offered to the database's mechanical gate.
 *
 * Links are reconciled rather than rewritten, so a re-seed that changes nothing
 * does not bump a synthesis version and strand a review.
 */

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: T[] }).rows;
  }
  return [];
}

/** The rule of `tides_synthesis_requires_review`, for refusing before writing. */
export function synthesisRequiresReview(
  synthesis: Pick<SynthesisSeed, 'subject' | 'interpretationKind'>,
): boolean {
  return synthesis.subject.kind === 'peptide' || synthesis.interpretationKind !== 'general';
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
  for (const s of syntheses) {
    if (s.publicationState === 'published' && synthesisRequiresReview(s)) {
      throw new Error(
        `${s.synthesisKey}: a ${s.subject.kind === 'peptide' ? 'compound-specific' : s.interpretationKind} synthesis cannot be seeded as published. It requires an approved human scientific review, which a seed file cannot record; seed it as a draft.`,
      );
    }
  }

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
          statement, plain_language_text, reasoning, does_not_conclude,
          interpretation_kind, sort_order
        ) values (
          ${s.synthesisKey}, ${subject.peptide}, ${subject.quality}, ${subject.learning},
          ${s.statement}, ${s.plainLanguageText}, ${s.reasoning}, ${s.doesNotConclude},
          ${s.interpretationKind}::synthesis_interpretation_kind, ${(index + 1) * 10}
        )
        on conflict (synthesis_key) do update set
          peptide_id = excluded.peptide_id,
          quality_topic_id = excluded.quality_topic_id,
          learning_topic_id = excluded.learning_topic_id,
          statement = excluded.statement,
          plain_language_text = excluded.plain_language_text,
          reasoning = excluded.reasoning,
          does_not_conclude = excluded.does_not_conclude,
          interpretation_kind = excluded.interpretation_kind,
          sort_order = excluded.sort_order
        returning id
      `),
    )[0];
    if (row === undefined) throw new Error(`${s.synthesisKey}: insert returned no row.`);

    // Adding or removing a supporting claim is an edit (it bumps the version);
    // reordering is not.
    const keep = sql.join(
      claimIds.map((id) => sql`${id}::uuid`),
      sql`, `,
    );
    await db.execute(sql`
      delete from editorial_synthesis_claims
       where synthesis_id = ${row.id} and claim_id not in (${keep})
    `);
    for (const [i, claimId] of claimIds.entries()) {
      await db.execute(sql`
        insert into editorial_synthesis_claims (synthesis_id, claim_id, sort_order)
        values (${row.id}, ${claimId}, ${(i + 1) * 10})
        on conflict (synthesis_id, claim_id) do update set sort_order = excluded.sort_order
          where editorial_synthesis_claims.sort_order is distinct from excluded.sort_order
      `);
    }

    if (s.publicationState === 'published') {
      await db.execute(sql`
        update editorial_syntheses set publication_state = 'published'
         where id = ${row.id} and publication_state <> 'published'
      `);
    }
  }
  return syntheses.length;
}
