/**
 * Renders THE PEPTIDE REFERENCE GUIDE — every compound monograph, bound.
 *
 *   npm run pdf:guide
 *
 * The reference sheets print one record each, for a clinic wall or a folder.
 * This is the other artefact: the whole register in one volume, with a cover,
 * contents, dividers and a monograph template that does not change between
 * compounds, so a reader learns the shape once and then reads twelve records
 * the same way.
 *
 * Generated from the database through the preview path, because nothing is
 * published. Every monograph therefore carries its record's version and review
 * state, and the cover says the volume is unreviewed. Needs a database; start
 * one with `npm run tides`.
 */
import { mkdirSync, renameSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { registerFonts } from '@/publishing/theme';
import { ReferenceGuide } from '@/publishing/books/reference-guide';
import { readPeptidePagePreview, type PeptidePage } from '@/server/public/queries';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('\n  DATABASE_URL is not set. Start the local database with `npm run tides`.\n');
  process.exit(1);
}

registerFonts();
const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// One connection: PGlite serves one at a time and this is a batch job.
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
    // Practitioner depth. The patient-facing volume is Understanding Peptides,
    // which carries no regimens at all; a reference guide with the regimens
    // removed would be neither one thing nor the other.
    const peptide = await readPeptidePagePreview(db, slug, 'practitioner');
    if (peptide === null) {
      console.error(`  No record for '${slug}'.`);
      process.exitCode = 1;
      continue;
    }
    peptides.push(peptide);
  }

  if (peptides.length === 0) {
    console.log('\n  No compound has a record to bind.\n');
  } else {
    const file = 'tides-index-peptide-reference-guide.pdf';
    const path = `${OUT}${file}`;
    const staged = `${path}.new`;
    await renderToFile(
      ReferenceGuide({ peptides, generatedAt: new Date().toISOString().slice(0, 10) }),
      staged,
    );

    let final = path;
    try {
      renameSync(staged, path);
    } catch {
      // A viewer holding the previous build open. Keep the work either way.
      final = staged;
    }

    const bytes = statSync(final).size;
    console.log(
      `\n  ${file}  ${(bytes / 1024).toFixed(0)} KB  (${String(peptides.length)} monographs)`,
    );
    console.log(`    ${final}\n`);
  }
} catch (error) {
  console.error('Reference guide build failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
