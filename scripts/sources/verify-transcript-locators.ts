/**
 * Checks every transcript locator against the transcript it names.
 *
 *   npm run evidence:transcript-locators
 *
 * `evidence:locators` resolves a printed page to a page of a held PDF. A
 * transcript has no pages, and the three held here have no timestamps either,
 * so a locator is a speaker turn plus a phrase from it. That is checkable — more
 * checkable than a timestamp, because a reader can search for the phrase on the
 * publisher's page — but only if something actually checks it.
 *
 * Per locator, this confirms:
 *
 *   - the source is one of the held transcripts and its snapshot exists;
 *   - the locator names a turn, and the transcript has that many turns;
 *   - the anchor phrase appears in that turn, and not only somewhere in the file;
 *   - the phrase is distinctive enough to find, rather than matching many turns.
 *
 * A phrase that appears in the right turn and nowhere else RESOLVES. One in the
 * right turn and elsewhere too is AMBIGUOUS: a reader searching for it would
 * land in the wrong place first. One that is not in the named turn FAILS.
 *
 * Reads the snapshots under data/private/source-snapshots/tremblay, which git
 * ignores, and prints no transcript text beyond the anchor phrase itself.
 */
import { existsSync, readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { fileURLToPath } from 'node:url';
import * as schema from '@db/schema';

const url = process.env.DATABASE_URL;
if (url === undefined || url === '') {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

/** Speaker labels as the three publishers write them. */
const SPEAKER = /^(Jean(-Fran[cç]ois)?( Tremblay)?|Ari( Whitten)?|Ben|Host)\s*:\s*(.*)$/;

function turnsOf(sourceKey: string): string[] | null {
  const path = fileURLToPath(
    new URL(`../../data/private/source-snapshots/tremblay/${sourceKey}.txt`, import.meta.url),
  );
  if (!existsSync(path)) return null;

  const turns: string[] = [];
  let current: string | null = null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = SPEAKER.exec(line);
    if (match) {
      if (current !== null) turns.push(current);
      current = match[6] ?? '';
    } else if (current !== null) {
      current += ` ${line}`;
    }
  }
  if (current !== null) turns.push(current);
  return turns;
}

/**
 * Compare on letters and digits only.
 *
 * The transcripts use curly apostrophes and non-breaking spaces, and an anchor
 * typed with a straight quote would fail against text that is word for word
 * identical. Punctuation is not what makes a phrase findable.
 */
function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const client = postgres(url, { max: 1, prepare: false });

try {
  const db = drizzle(client, { schema, casing: 'snake_case' });
  const result = await db.execute(sql`
    select l.locator_text, l.section, s.source_key,
           (select count(*)::int from claim_evidence ce where ce.source_location_id = l.id) as cited_by,
           (select count(*)::int from protocol_sources ps where ps.source_location_id = l.id) as protocols
      from source_locations l
      join sources s on s.id = l.source_id
     where s.source_key in ('SRC-204', 'SRC-206', 'SRC-216')
     order by s.source_key, l.locator_text
  `);
  const rows = (Array.isArray(result) ? result : (result as { rows: unknown[] }).rows) as {
    locator_text: string | null;
    section: string | null;
    source_key: string;
    cited_by: number;
    protocols: number;
  }[];

  const cache = new Map<string, string[] | null>();
  let resolved = 0;
  let failed = 0;
  let ambiguous = 0;
  const notes: string[] = [];

  for (const row of rows) {
    const label = `${row.source_key} ${row.locator_text ?? '(no locator)'}`;
    if (!cache.has(row.source_key)) cache.set(row.source_key, turnsOf(row.source_key));
    const turns = cache.get(row.source_key) ?? null;

    if (turns === null) {
      failed += 1;
      notes.push(`FAIL  ${label} — no held snapshot for ${row.source_key}`);
      continue;
    }
    const turnNumber = /turn (\d+)/.exec(row.locator_text ?? '')?.[1];
    if (turnNumber === undefined) {
      failed += 1;
      notes.push(`FAIL  ${label} — the locator names no turn`);
      continue;
    }
    const index = Number(turnNumber);
    if (index < 1 || index > turns.length) {
      failed += 1;
      notes.push(
        `FAIL  ${label} — turn ${turnNumber} is outside a transcript of ${String(turns.length)} turns`,
      );
      continue;
    }
    const anchor = row.section;
    if (anchor === null || anchor.trim() === '') {
      failed += 1;
      notes.push(`FAIL  ${label} — no anchor phrase recorded`);
      continue;
    }

    const needle = normalise(anchor);
    if (needle.length < 12) {
      ambiguous += 1;
      notes.push(`CHECK ${label} — the anchor "${anchor}" is too short to find reliably`);
      continue;
    }

    const inNamedTurn = normalise(turns[index - 1]!).includes(needle);
    const elsewhere = turns.filter((t, i) => i !== index - 1 && normalise(t).includes(needle)).length;

    if (!inNamedTurn) {
      const found = turns.findIndex((t) => normalise(t).includes(needle));
      failed += 1;
      notes.push(
        `FAIL  ${label} — the anchor is not in turn ${turnNumber}` +
          (found >= 0 ? `; it is in turn ${String(found + 1)}` : '; it is nowhere in the transcript'),
      );
      continue;
    }
    if (elsewhere > 0) {
      ambiguous += 1;
      notes.push(
        `CHECK ${label} — the anchor is in turn ${turnNumber} and in ${String(elsewhere)} other turn(s)`,
      );
      continue;
    }
    resolved += 1;
  }

  console.log('\nTranscript locator verification\n');
  for (const note of notes) console.log(`  ${note}`);
  if (notes.length > 0) console.log('');
  console.log(`  Tremblay locations  ${String(rows.length)}`);
  console.log(`  resolved            ${String(resolved)}`);
  console.log(`  ambiguous           ${String(ambiguous)}`);
  console.log(`  failed              ${String(failed)}`);
  console.log('');
  console.log('A resolved locator means the phrase is in the turn the locator names and');
  console.log('nowhere else in that transcript. It does not mean the reading is right.');

  if (failed > 0 || ambiguous > 0) process.exitCode = 1;
} catch (error) {
  console.error('Transcript locator verification failed:', error);
  process.exitCode = 1;
} finally {
  await client.end();
}
