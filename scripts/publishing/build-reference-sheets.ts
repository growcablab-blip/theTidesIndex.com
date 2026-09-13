/**
 * Renders a practitioner reference sheet for each compound record.
 *
 *   npm run sheets                  every compound with a record
 *   npm run sheets -- tesamorelin   one
 *
 * Unlike the two books, these are generated from the database rather than
 * written: the sheet is a view of a record, and a hand-written one would be a
 * second place the content lives and a second place it can go stale.
 *
 * It reads through the *preview* path, because neither compound is published
 * and neither should be — a sheet is how a reviewer reads a record at the
 * density a clinic would. That means the output is a working artefact, and it
 * says so on the page: every sheet prints the record's version, the date it was
 * generated, and whether the record has been reviewed by a person.
 *
 * Needs a database. Start one with `npm run tides` in another terminal, or set
 * DATABASE_URL.
 */
import { mkdirSync, renameSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import * as schema from '@db/schema';
import { registerFonts } from '@/publishing/theme';
import { ReferenceSheet } from '@/publishing/reference-sheet';
import { readPeptidePagePreview } from '@/server/public/queries';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error(
    '\n  DATABASE_URL is not set.\n' +
      '  Start the local database with `npm run tides`, or export a connection string.\n',
  );
  process.exit(1);
}

registerFonts();

const OUT = fileURLToPath(new URL('../../build/publications/', import.meta.url));
mkdirSync(OUT, { recursive: true });

// One connection. PGlite serves one at a time, and this is a batch job.
const client = postgres(url, { max: 1, prepare: false });
const db = drizzle(client, { schema, casing: 'snake_case' });

const requested = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));

try {
  const slugs =
    requested.length > 0
      ? requested
      : (
          (await db.execute(sql`
            select p.slug
              from peptides p
             where not p.is_demonstration
               and exists (select 1 from claims c where c.peptide_id = p.id)
             order by p.slug
          `)) as unknown as readonly { slug: string }[]
        ).map((row) => row.slug);

  if (slugs.length === 0) {
    console.log('\n  No compound has a record to print.\n');
  }

  const generatedAt = new Date().toISOString().slice(0, 10);
  console.log('');

  for (const slug of slugs) {
    // Practitioner depth: a reference sheet withheld from the person it is for
    // would be a strange object. Patient-facing print belongs on the page.
    const peptide = await readPeptidePagePreview(db, slug, 'practitioner');
    if (peptide === null) {
      console.error(`  No record for '${slug}'.`);
      process.exitCode = 1;
      continue;
    }

    const file = `tides-index-reference-${slug}.pdf`;
    const path = `${OUT}${file}`;
    const staged = `${path}.new`;
    await renderToFile(ReferenceSheet({ peptide, generatedAt }), staged);

    let final = path;
    try {
      renameSync(staged, path);
    } catch {
      // A viewer holding the previous build open. Keep the work either way.
      final = staged;
    }

    const bytes = statSync(final).size;
    console.log(`  ${peptide.canonicalName.padEnd(16)} ${file}  ${(bytes / 1024).toFixed(0)} KB`);
    if (final !== path) {
      console.log(`    (${file} is open in another program; close it and re-run to replace it)`);
    }
  }
  console.log(`\n  ${OUT}\n`);
} catch (error) {
  console.error('Reference sheet build failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
