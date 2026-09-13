/**
 * Renders PEPTIDE PROTOCOLS & CLINICAL QUICK REFERENCE from the protocol library.
 *
 *   npm run pdf:protocols
 *
 * Reads through the preview path, because no regimen is published. Needs a
 * database; start one with `npm run tides`.
 */
import { mkdirSync, renameSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToFile } from '@react-pdf/renderer';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from '@db/schema';
import { registerFonts } from '@/publishing/theme';
import { ProtocolBook } from '@/publishing/protocol-book';
import { readProtocolLibrary } from '@/server/public/protocol-library';

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
  const library = await readProtocolLibrary(db, 'practitioner', {}, { preview: true });
  const file = 'tides-index-peptide-protocols-quick-reference.pdf';
  const path = `${OUT}${file}`;
  const staged = `${path}.new`;
  await renderToFile(ProtocolBook({ library, generatedAt: new Date().toISOString().slice(0, 10) }), staged);

  let final = path;
  try {
    renameSync(staged, path);
  } catch {
    final = staged;
  }
  console.log(`\n  ${file}  ${(statSync(final).size / 1024).toFixed(0)} KB  (${String(library.totalCount)} regimens)`);
  console.log(`    ${final}\n`);
} catch (error) {
  console.error('Protocol book build failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
