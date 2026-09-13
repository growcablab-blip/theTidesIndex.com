/**
 * Renders PEPTIDE SCIENCE & APPLICATIONS.
 *
 *   npm run pdf:science
 *
 * The clinician-facing volume: the general science behind the compound
 * records, written so that each idea lands against the records that display
 * it. It is generated with the register in hand rather than written blind —
 * the chapters name real records, real disagreements and real absences, so a
 * reader can turn from a principle to the page where it bit.
 *
 * Reads through the preview path, because nothing is published. Needs a
 * database; start one with `npm run tides`.
 */
import { mkdirSync, renameSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { registerFonts } from '@/publishing/theme';
import { ScienceAndApplications } from '@/publishing/books/science-applications';
import { readPeptidePagePreview, type PeptidePage } from '@/server/public/queries';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('\n  DATABASE_URL is not set. Start the local database with `npm run tides`.\n');
  process.exit(1);
}

registerFonts();
const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema, casing: 'snake_case' });

try {
  const slugs = (
    (await db.execute(sql`
      select p.slug
        from peptides p
       where not p.is_demonstration
         and exists (select 1 from claims c where c.peptide_id = p.id)
       order by p.canonical_name
    `)) as unknown as readonly { slug: string }[]
  ).map((row) => row.slug);

  const peptides: PeptidePage[] = [];
  for (const slug of slugs) {
    const peptide = await readPeptidePagePreview(db, slug, 'practitioner');
    if (peptide !== null) peptides.push(peptide);
  }

  const file = 'tides-index-peptide-science-and-applications.pdf';
  const path = `${OUT}${file}`;
  const staged = `${path}.new`;
  await renderToFile(
    ScienceAndApplications({ peptides, generatedAt: new Date().toISOString().slice(0, 10) }),
    staged,
  );

  let final = path;
  try {
    renameSync(staged, path);
  } catch {
    final = staged;
  }

  console.log(
    `\n  ${file}  ${(statSync(final).size / 1024).toFixed(0)} KB  (drawn from ${String(peptides.length)} records)`,
  );
  console.log(`    ${final}\n`);
} catch (error) {
  console.error('Science & Applications build failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
