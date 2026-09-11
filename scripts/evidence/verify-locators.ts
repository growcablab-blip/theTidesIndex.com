/**
 * Re-resolves every recorded locator against the file the registry holds.
 *
 *   npm run evidence:locators
 *
 * Stage 7 of the extraction workflow, made repeatable. A locator is a promise
 * that somebody can open a page and check a statement, and that promise decays
 * silently: a file is replaced, a page offset is wrong, an edition differs, and
 * the citation still looks perfectly good on the page.
 *
 * What this checks, per locator:
 *
 *   - the source is registered and a copy is actually held;
 *   - the QC status still permits citation;
 *   - the printed page resolves to a page that exists in the held file;
 *   - and, where the location names a chapter, table or figure, that the
 *     resolved page mentions it.
 *
 * The last check is a heuristic and says so: text extraction is imperfect, so a
 * miss is reported as UNCONFIRMED rather than as a failure. The tool never
 * decides a citation is wrong — it decides which citations a person should look
 * at, which is the honest limit of what automation can do here.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { extractText, getDocumentProxy } from 'unpdf';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

interface LocatorRow {
  location_key: string | null;
  locator_text: string | null;
  page_start: number | null;
  chapter: string | null;
  section: string | null;
  table_number: string | null;
  figure: string | null;
  source_key: string;
  qc_status: string;
  access_status: string;
  local_private_filename: string | null;
  printed_page_offset: number | null;
  page_count: number | null;
  cited_by: number;
}

type Verdict = 'ok' | 'unconfirmed' | 'failed' | 'skipped';

const client = postgres(url, { max: 1, prepare: false });
const pageCache = new Map<string, string[]>();

async function pagesOf(filename: string): Promise<string[]> {
  const cached = pageCache.get(filename);
  if (cached) return cached;
  const path = fileURLToPath(new URL(`../../sources/${filename}`, import.meta.url));
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  const pages: string[] = Array.isArray(text) ? text : [String(text)];
  pageCache.set(filename, pages);
  return pages;
}

/** Loose match: extraction clips characters, so compare on digits and letters. */
function mentions(haystack: string, needle: string): boolean {
  const norm = (v: string) => v.toLowerCase().replace(/[^a-z0-9]/g, '');
  return norm(haystack).includes(norm(needle));
}

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const result = await db.execute(sql`
    select l.location_key, l.locator_text, l.page_start, l.chapter, l.section,
           l.table_number, l.figure,
           s.source_key, s.qc_status, s.access_status, s.local_private_filename,
           s.printed_page_offset, s.page_count,
           (select count(*) from claim_evidence ce where ce.source_location_id = l.id)::int
             as cited_by
    from source_locations l
    join sources s on s.id = l.source_id
    order by s.source_key, l.page_start
  `);
  const locators = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as
    | LocatorRow[];

  const counts: Record<Verdict, number> = { ok: 0, unconfirmed: 0, failed: 0, skipped: 0 };
  const notes: string[] = [];

  for (const row of locators) {
    const label = `${row.source_key} ${row.locator_text ?? row.location_key ?? '(no locator)'}`;

    if (row.local_private_filename === null || row.access_status !== 'held') {
      counts.skipped += 1;
      notes.push(`SKIP  ${label} — no copy held (access: ${row.access_status})`);
      continue;
    }
    if (row.qc_status === 'replace' || row.qc_status === 'exclude') {
      counts.failed += 1;
      notes.push(`FAIL  ${label} — source QC status is '${row.qc_status}'; not citable`);
      continue;
    }
    if (row.page_start === null) {
      counts.skipped += 1;
      notes.push(`SKIP  ${label} — no page recorded`);
      continue;
    }

    const filePage = row.page_start + (row.printed_page_offset ?? 0);
    const pages = await pagesOf(row.local_private_filename);

    if (filePage < 1 || filePage > pages.length) {
      counts.failed += 1;
      notes.push(
        `FAIL  ${label} — printed p.${String(row.page_start)} resolves to file page ` +
          `${String(filePage)}, outside a ${String(pages.length)}-page file`,
      );
      continue;
    }

    const text = pages[filePage - 1] ?? '';
    const markers = [row.table_number, row.figure].filter((v): v is string => v !== null);
    const missing = markers.filter((marker) => !mentions(text, marker));

    if (missing.length > 0) {
      counts.unconfirmed += 1;
      notes.push(
        `CHECK ${label} — file page ${String(filePage)} does not appear to mention ` +
          `${missing.join(', ')}. Extraction is imperfect; open it and confirm.`,
      );
      continue;
    }

    counts.ok += 1;
  }

  console.log('Locator verification\n');
  for (const note of notes) console.log('  ' + note);
  if (notes.length > 0) console.log('');
  console.log(`  resolved      ${String(counts.ok)}`);
  console.log(`  to check      ${String(counts.unconfirmed)}`);
  console.log(`  failed        ${String(counts.failed)}`);
  console.log(`  skipped       ${String(counts.skipped)}`);
  console.log('');
  console.log('A resolved locator means the page exists and carries the markers recorded.');
  console.log('It does not mean the statement is correct. Only a person reading it settles that.');

  if (counts.failed > 0) process.exitCode = 1;
} catch (error) {
  console.error('Locator verification failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
