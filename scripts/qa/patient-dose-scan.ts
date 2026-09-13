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
 */
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { readPeptidePagePreview } from '@/server/public/queries';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/**
 * A number followed by a mass, volume or unit-of-activity, optionally per a
 * body-weight, volume or time basis. Deliberately broad: a false positive costs
 * a minute to read, a false negative puts an amount in front of a patient.
 */
const DOSE = /\b\d+(?:[.,]\d+)?\s*(?:[-–]\s*\d+(?:[.,]\d+)?\s*)?(?:mcg|µg|ug|micrograms?|mg|milligrams?|grams?|g|ml|mL|IU|units)\b(?:\s*(?:\/|per)\s*(?:kg|kilogram|ml|mL|day|dose|vial))?/g;

/** Strings that match the pattern and are not doses. Keep this list short and specific. */
const ALLOWED = [
  // Molecular weights.
  /\b\d+(?:\.\d+)?\s*(?:g\/mol|grams? per mole|kDa)\b/i,
  // A biomarker concentration measured in a study is a result, not an amount
  // anybody is given: "IGF-1 rose by 181 micrograms per litre".
  /\b\d+(?:\.\d+)?\s*(?:micrograms?|mcg|µg|ug|mg|ng|pg)\s*(?:per|\/)\s*(?:litre|liter|L|dL)\b/i,
];

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema, casing: 'snake_case' });

let hits = 0;

function walk(value: unknown, path: string, slug: string): void {
  if (typeof value === 'string') {
    for (const match of value.matchAll(DOSE)) {
      const around = value.slice(Math.max(0, match.index - 40), match.index + match[0].length + 30);
      if (ALLOWED.some((a) => a.test(around))) continue;
      hits += 1;
      console.log(`  ${slug}${path}\n      …${around.replaceAll('\n', ' ')}…`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, `${path}[${String(index)}]`, slug));
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) walk(item, `${path}.${key}`, slug);
  }
}

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
    const before = hits;
    walk(page, '', slug);
    console.log(`  ${slug.padEnd(20)} ${hits === before ? 'clean' : `${String(hits - before)} hit(s)`}`);
  }

  console.log(hits === 0 ? '\nNo dose-shaped strings in any patient payload.\n' : `\n${String(hits)} hit(s).\n`);
  process.exitCode = hits === 0 ? 0 : 1;
} finally {
  await client.end();
}
