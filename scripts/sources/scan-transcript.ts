/**
 * Finds where a held transcript talks about a compound, and prints the turn.
 *
 *   npx tsx --tsconfig tsconfig.scripts.json scripts/sources/scan-transcript.ts SRC-206 "BPC"
 *
 * The transcripts are speaker-labelled and carry no timestamps, so a locator
 * has to be a turn and a phrase rather than a time. This prints the turn index
 * and the speaker alongside the text, which is what a locator records.
 *
 * Reads only from data/private/source-snapshots/tremblay, which is ignored by
 * git: the transcripts are copyrighted and stay local.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const key = process.argv[2];
const needle = process.argv[3];
if (key === undefined || needle === undefined) {
  console.error('Usage: scan-transcript.ts <SRC-KEY> <search term> [--turns]');
  process.exit(1);
}

const path = fileURLToPath(
  new URL(`../../data/private/source-snapshots/tremblay/${key}.txt`, import.meta.url),
);
const lines = readFileSync(path, 'utf8').split('\n');

/** A turn is a speaker label followed by everything up to the next label. */
const SPEAKER = /^(Jean(-Fran[cç]ois)?( Tremblay)?|Ari( Whitten)?|Ben|Host)\s*:\s*(.*)$/;

interface Turn {
  index: number;
  speaker: string;
  text: string;
}

const turns: Turn[] = [];
let current: Turn | null = null;
for (const line of lines) {
  const match = SPEAKER.exec(line);
  if (match) {
    if (current !== null) turns.push(current);
    current = {
      index: turns.length + 1,
      speaker: match[1]!.startsWith('Jean') ? 'Tremblay' : match[1]!,
      text: match[6] ?? '',
    };
  } else if (current !== null) {
    current.text += (current.text === '' ? '' : ' ') + line;
  }
}
if (current !== null) turns.push(current);

if (process.argv.includes('--turns')) {
  console.log(`${key}: ${String(turns.length)} turns`);
  process.exit(0);
}

const pattern = new RegExp(needle, 'i');
let hits = 0;
for (const turn of turns) {
  if (!pattern.test(turn.text)) continue;
  hits += 1;
  console.log(`\n--- turn ${String(turn.index)} · ${turn.speaker} ---`);
  console.log(turn.text.length > 2200 ? `${turn.text.slice(0, 2200)}…` : turn.text);
}
console.log(`\n${String(hits)} turn(s) in ${key} match /${needle}/i of ${String(turns.length)} total.`);
