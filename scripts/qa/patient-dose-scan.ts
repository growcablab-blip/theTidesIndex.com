/**
 * Scans every compound's patient-mode payload for anything shaped like a dose.
 *
 *   DATABASE_URL=… npx tsx --tsconfig tsconfig.scripts.json scripts/qa/patient-dose-scan.ts
 *
 * The patient boundary has failed eight times across three sprints, and every
 * failure was in a field nobody thought of as dosing: a claim's uncertainty
 * note, a product name, a screening ledger's reason, an identity's usage
 * context. The integration tests check a list of known amounts; this checks
 * the *shape* of an amount, in every string of every payload, so the next leak
 * is found by pattern rather than by someone remembering to add it to a list.
 *
 * Exits non-zero on any hit. Run after every compound is loaded.
 *
 * The rule itself lives in `src/domain/presentation/dose-text.ts`, shared with
 * `tests/integration/every-compound-renders.test.ts`, so the standing QA check
 * and the test suite cannot drift apart on what counts as a dose.
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { readPeptidePagePreview } from '@/server/public/queries';
import { readStackPage, STACK_DEFINITIONS } from '@/server/public/stacks';
import { findDoses } from '@/domain/presentation/dose-text';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema, casing: 'snake_case' });

let hits = 0;

try {
  const slugs = (
    (await db.execute(sql`
      select slug from peptides p
       where not is_demonstration
         and exists (select 1 from claims c where c.peptide_id = p.id)
       order by slug
    `)) as unknown as readonly { slug: string }[]
  ).map((r) => r.slug);

  console.log(`\nScanning patient payloads for ${String(slugs.length)} compounds\n`);
  for (const slug of slugs) {
    const page = await readPeptidePagePreview(db, slug, 'simple');
    const found = findDoses(page);
    hits += found.length;
    for (const hit of found) console.log(`  ${slug}${hit.path}
      …${hit.context}…`);
    console.log(`  ${slug.padEnd(20)} ${found.length === 0 ? 'clean' : `${String(found.length)} hit(s)`}`);
  }

  // Combination pages are a second patient surface, reading the same records
  // through a different query. A boundary that holds on the compound page can
  // still fail here, so it is scanned rather than assumed.
  console.log(
    `
Scanning patient payloads for ${String(STACK_DEFINITIONS.length)} combination page(s)
`,
  );
  for (const definition of STACK_DEFINITIONS) {
    const stack = await readStackPage(db, definition.slug, 'simple');
    const found = stack === null ? [] : findDoses(stack);
    hits += found.length;
    for (const hit of found) {
      console.log(`  ${definition.slug}${hit.path}
      …${hit.context}…`);
    }
    const state = stack === null ? 'not published' : found.length === 0 ? 'clean' : `${String(found.length)} hit(s)`;
    console.log(`  ${definition.slug.padEnd(20)} ${state}`);
  }

  console.log(hits === 0 ? '\nNo dose-shaped strings in any patient payload.\n' : `\n${String(hits)} hit(s).\n`);
  process.exitCode = hits === 0 ? 0 : 1;
} finally {
  await client.end();
}
