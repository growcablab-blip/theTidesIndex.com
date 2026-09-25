/**
 * Publishes the current library through the real publish gates.
 *
 *   npm run db:publish-library
 *
 * Since migration 0029 a record becomes public on provenance and completeness
 * rather than on a human approval, so the existing library is publishable as it
 * stands. This script is how that is done once, in bulk, without anybody
 * reaching for an UPDATE statement.
 *
 * It is deliberately not a way around the gates. Each row is published with an
 * ordinary write, which means every trigger runs: provenance is checked, the
 * required fields are checked, a rejected record is refused, `published_at` is
 * set, `last_reviewed_at` is left alone, and the search index is rebuilt from
 * the reindex triggers. A row the gate refuses is reported with the reason it
 * gave and left unpublished — the refusals are the useful output.
 *
 * Editorial syntheses are excluded on purpose. A Tides synthesis is this index's
 * own conclusion rather than a sourced fact, and the owner decision of 21
 * September — that compound-specific and interpretive syntheses need a human
 * scientific review before publication — was not superseded on 24 September.
 * Publishing those is a separate decision, and it is the owner's.
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/**
 * Supporting records first, then the statements, then the pages that frame
 * them. Nothing here depends on the order — every gate is evaluated per row —
 * but publishing the parts before the whole means that if the run stops
 * half-way, what is public is a page with its evidence rather than a page
 * without it.
 */
const TABLES = [
  'compound_identity_claims',
  'replication_assessments',
  'peptide_routes',
  'regulatory_statuses',
  'disagreements',
  'compound_products',
  'pk_observations',
  'literature_screens',
  'claims',
  'protocols',
  'peptides',
  'quality_topics',
  'learning_topics',
] as const;

/** The column that names a row in a refusal message, where there is one. */
const LABELS: Readonly<Record<string, string>> = {
  claims: 'claim_key',
  protocols: 'protocol_key',
  peptides: 'peptide_key',
  quality_topics: 'quality_key',
  learning_topics: 'topic_key',
};

/**
 * The gate's own sentence, dug out of the driver's wrapper.
 *
 * Drizzle reports `Failed query: …` and puts the Postgres message on the cause,
 * which is where the gate's explanation actually lives. Printing the wrapper
 * instead would turn a precise refusal — "both what_it_proves and
 * what_it_does_not_prove are required" — into no information at all, and the
 * refusals are the useful half of this script's output.
 */
function gateReason(error: unknown): string {
  const seen = new Set<unknown>();
  let current: unknown = error;
  let best = 'refused by the gate; no message given';

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    const line = current.message.split('\n')[0]?.trim() ?? '';
    if (line !== '' && !line.startsWith('Failed query')) best = line;
    current = (current as { cause?: unknown }).cause;
  }
  return best;
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const rows = async <T>(query: ReturnType<typeof sql>): Promise<T[]> => {
    const result = await db.execute(query);
    return (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as T[];
  };

  console.log('\n  PUBLISHING THE LIBRARY\n');
  console.log('  TABLE                      PUBLISHED  REFUSED');
  console.log('  ---------------------------------------------');

  const refusals: { table: string; label: string; reason: string }[] = [];
  let publishedTotal = 0;

  for (const table of TABLES) {
    const labelColumn = LABELS[table] ?? 'id';
    const pending = await rows<{ id: string; label: string }>(sql`
      select id, ${sql.identifier(labelColumn)}::text as label
        from ${sql.identifier(table)}
       where publication_state = 'unpublished'
       order by ${sql.identifier(labelColumn)}
    `);

    let published = 0;
    let refused = 0;

    for (const row of pending) {
      try {
        await db.execute(sql`
          update ${sql.identifier(table)}
             set publication_state = 'published'
           where id = ${row.id}
        `);

        // The gate can refuse by coercion rather than by raising — a rejected
        // record is turned to 'withdrawn' instead of erroring — so the state is
        // read back rather than assumed from the absence of an exception.
        const [after] = await rows<{ publication_state: string }>(sql`
          select publication_state from ${sql.identifier(table)} where id = ${row.id}
        `);
        if (after?.publication_state === 'published') {
          published += 1;
        } else {
          refused += 1;
          refusals.push({
            table,
            label: row.label,
            reason: `refused: left ${after?.publication_state ?? 'unknown'}`,
          });
        }
      } catch (error) {
        refused += 1;
        refusals.push({ table, label: row.label, reason: gateReason(error) });
      }
    }

    publishedTotal += published;
    console.log(
      `  ${table.padEnd(26)} ${String(published).padStart(9)}  ${String(refused).padStart(7)}`,
    );
  }

  // The reindex triggers already fired on each write. This is belt and braces
  // for rows whose searchable text depends on children published afterwards.
  await db.execute(sql`select tides_rebuild_search_index()`);

  console.log(`\n  ${publishedTotal} record(s) published.`);

  if (refusals.length > 0) {
    console.log(`\n  ${refusals.length} refused by the gates:\n`);
    for (const refusal of refusals.slice(0, 40)) {
      console.log(`    ${refusal.table} · ${refusal.label}`);
      console.log(`      ${refusal.reason}`);
    }
    if (refusals.length > 40) console.log(`    … and ${refusals.length - 40} more.`);
  }

  const [index] = await rows<{ n: number }>(sql`select count(*)::int n from search_documents`);
  console.log(`\n  Search index: ${index?.n ?? 0} document(s).\n`);
} finally {
  await client.end({ timeout: 5 });
}
